/**
 * Handlers for the events of a masked element.
 *
 * Calling convention, shared with `eventRuler.ts`:
 *
 * - A handler is an engine method. `this` is the engine, the element is
 *   `this.el`, and the event is the first argument.
 * - The ruler calls a handler as `handler.call(element.inputmask, event)`.
 *   Handlers also call each other directly, as in
 *   `this.keypressEvent(e, true, false, strict, pos)`, which is why some take
 *   arguments no DOM event supplies.
 * - `keypressEvent` runs without an element when `checkVal` replays a value
 *   for `format`, `unmaskedvalue(value)` or `isValid`. `this.el` is
 *   `undefined` there, and that path must not touch it.
 * - Events the engine builds itself come from `createEvent`, with `key` set
 *   by hand. Read keys through `MaskEvent`, not `KeyboardEvent`.
 * - User callbacks keep the `this` Inputmask calls them with, which is not
 *   always the engine: `onKeyDown` and `onKeyValidation` run on the element.
 *   `ResolvedOptions` types every callback with its `this`.
 * - Returning `false` makes the ruler call `preventDefault` and
 *   `stopPropagation` on the event.
 * - Deferred work stays deferred: where Inputmask uses `setTimeout(fn, 0)`,
 *   so does the handler, with an arrow function to keep `this`.
 * - The element can get another engine before a handler is done: a listener
 *   of an event the engine fires may mask it again, and so may anything that
 *   runs ahead of a timer. Inputmask keeps the instance it started with for
 *   most calls and reads `input.inputmask` again for the others. The handlers
 *   do the same, and `ownerOf(input)` marks the second kind.
 */
import { activeElementOf, environment } from '../environment';
import { createEvent, trigger } from '../events';
import { keys } from '../keys';
import { looseEquals } from '../looseEquals';

import type {
  CaretPosition,
  CommandObject,
  Engine,
  MaskedElement,
  MaskEvent,
  ResolvedOptions,
  SetValueEvent,
  ValidationResult,
} from '../types';

/** What `analyseChanges` makes of an edit that reached the element without a key event. */
interface InputChanges {
  /** The `inputType` the edit amounts to, or `''` when it fits none. */
  action: string;
  /** The characters that were typed. */
  data: string[];
  /** The caret it was given, adjusted to span what the edit replaces. */
  caret: CaretPosition;
}

/**
 * The engine the element has right now. An element left without one makes the
 * caller throw, as it does in Inputmask.
 */
function ownerOf(input: MaskedElement): Engine {
  return input.inputmask as Engine;
}

/** The buffer template in the order the element shows it. */
function displayedTemplate(engine: Engine): string[] {
  return engine.isRTL ? engine.getBufferTemplate().slice().reverse() : engine.getBufferTemplate();
}

/**
 * The position validation settled on. A result without one makes the read
 * throw. That is the bare `true` validation answers with when a hook leaves
 * `rewritePosition` on its result.
 */
function validatedPosition(result: true | CommandObject): number {
  const { pos } = result as { pos: number & Partial<CaretPosition> };
  return pos.begin ? pos.begin : pos;
}

export const eventHandlerMethods = {
  /** @upstream eventhandlers.js EventHandlers.keyEvent */
  keyEvent(
    this: Engine,
    e: MaskEvent,
    checkval?: boolean,
    writeOut?: boolean,
    strict?: boolean,
    ndx?: number,
  ): unknown {
    const { opts, maskset } = this;
    const input = this.el as MaskedElement;
    const c = e.key;
    const pos = this.caret(input);
    const kdResult = opts.onKeyDown.call(input, e, this.getBuffer(), pos, opts);
    if (kdResult !== undefined) return kdResult;

    if (
      c === keys.Backspace
      || c === keys.Delete
      || (environment().iphone && c === keys.BACKSPACE_SAFARI)
      || (e.ctrlKey && c === keys.x && !('oncut' in input))
    ) {
      // Only the default action is stopped. The event still propagates.
      e.preventDefault();
      this.handleRemove(input, c, pos);
      ownerOf(input).writeBuffer(
        input,
        this.getBuffer(true),
        maskset.p,
        e,
        ownerOf(input)._valueGet() !== this.getBuffer().join(''),
      );
    } else if (c === keys.End || c === keys.PageDown) {
      e.preventDefault();
      const caretPos = this.seekNext(this.getLastValidPosition());
      this.caret(input, e.shiftKey ? pos.begin : caretPos, caretPos, true);
    } else if ((c === keys.Home && !e.shiftKey) || c === keys.PageUp) {
      e.preventDefault();
      this.caret(input, 0, e.shiftKey ? pos.begin : 0, true);
    } else if (opts.undoOnEscape && c === keys.Escape && e.altKey !== true) {
      ownerOf(input).checkVal(input, true, false, (this.undoValue as string).split(''));
      trigger(input, 'click');
    } else if (
      c === keys.Insert
      && !(e.shiftKey || e.ctrlKey)
      && this.userOptions.insertMode === undefined
    ) {
      // The selection is judged in the mode that is being left.
      const hasSelection = this.isSelection(pos);
      opts.insertMode = !opts.insertMode;
      if (!hasSelection) this.caret(input, pos.begin, pos.begin);
    } else if (opts.tabThrough === true && c === keys.Tab) {
      if (e.shiftKey === true) {
        pos.end = this.seekPrevious(pos.end, true);
        if (this.getTest(pos.end - 1).match.static === true) {
          pos.end -= 1;
        }
        pos.begin = this.seekPrevious(pos.end, true);
        if (pos.begin >= 0 && pos.end > 0) {
          e.preventDefault();
          this.caret(input, pos.begin, pos.end);
        }
      } else {
        pos.begin = this.seekNext(pos.begin, true);
        pos.end = this.seekNext(pos.begin, true);
        if (pos.end < (maskset.maskLength as number)) pos.end -= 1;
        if (pos.begin <= (maskset.maskLength as number)) {
          e.preventDefault();
          this.caret(input, pos.begin, pos.end);
        }
      }
    } else if (!e.shiftKey) {
      if (opts.insertModeVisual && opts.insertMode === false) {
        // In overwrite mode the caret is drawn as a one-character selection,
        // which the browser collapses when an arrow key moves it. Both
        // timers draw it again once the browser has moved the caret.
        if (c === keys.ArrowRight) {
          setTimeout(() => {
            const caretPos = this.caret(input);
            this.caret(input, caretPos.begin);
          }, 0);
        } else if (c === keys.ArrowLeft) {
          setTimeout(() => {
            const tracked = ownerOf(input).caretPos;
            const caretPos = {
              begin: this.translatePosition(tracked.begin),
              end: this.translatePosition(tracked.end),
            };
            if (this.isRTL) {
              this.caret(
                input,
                caretPos.begin + (caretPos.begin === maskset.maskLength ? 0 : 1),
              );
            } else {
              this.caret(input, caretPos.begin - (caretPos.begin === 0 ? 0 : 1));
            }
          }, 0);
        }
      } else if (this.keyEventHook !== undefined) {
        this.keyEventHook(e);
      }
    }

    this.isComposing = c === keys.Process || c === keys.Unidentified;

    this.ignorable = c === undefined || c.length > 1;
    return this.keypressEvent(e, checkval, writeOut, strict, ndx);
  },

  /** @upstream eventhandlers.js EventHandlers.keypressEvent */
  keypressEvent(
    this: Engine,
    e: MaskEvent,
    checkval?: boolean,
    writeOut?: boolean,
    strict?: boolean,
    ndx?: number,
  ): ValidationResult | undefined {
    const { opts, maskset } = this;
    const input = this.el;
    const key = e.key;

    if (
      checkval !== true
      && !(e.ctrlKey && e.altKey && !this.ignorable)
      && (e.ctrlKey || e.metaKey || this.ignorable)
    ) {
      if (key === keys.Enter && this.undoValue !== this._valueGet(true)) {
        this.undoValue = this._valueGet(true);
        setTimeout(() => {
          trigger(input, 'change');
        }, 0);
      }
      return undefined;
    }
    if (!key) return undefined;

    const pos = checkval
      ? { begin: ndx as number, end: ndx as number }
      : this.caret(input as MaskedElement);
    let forwardPosition: number | undefined;

    // A replayed value is taken as it is. Only typed keys are substituted.
    const c = checkval ? key : opts.substitutes[key] || key;
    maskset.writeOutBuffer = true;
    const valResult = this.isValidPosition(
      pos,
      c,
      strict,
      undefined,
      undefined,
      undefined,
      checkval,
    );
    // A boolean result is read like an object. Every field is then `undefined`.
    const command = valResult as CommandObject;
    if (valResult !== false) {
      this.resetMaskSet(true);
      forwardPosition = command.caret !== undefined
        ? command.caret
        : this.seekNext(validatedPosition(valResult));
      // `checkVal` reads the position of the next character from here.
      maskset.p = forwardPosition;
    }

    if (opts.numericInput && command.caret === undefined) {
      forwardPosition = this.seekPrevious(forwardPosition as number);
    }
    if (writeOut !== false) {
      setTimeout(() => {
        opts.onKeyValidation.call(input as MaskedElement, c, valResult);
      }, 0);
      if (maskset.writeOutBuffer && valResult !== false) {
        const buffer = this.getBuffer();
        ownerOf(input as MaskedElement).writeBuffer(
          input,
          buffer,
          forwardPosition,
          e,
          checkval !== true,
        );
      }
    }

    e.preventDefault();

    if (checkval) {
      if (valResult !== false) command.forwardPosition = forwardPosition;
      return valResult;
    }
    return undefined;
  },

  /** @upstream eventhandlers.js EventHandlers.pasteEvent */
  async pasteEvent(this: Engine, e: ClipboardEvent): Promise<void> {
    const { opts } = this;
    const input = this.el as MaskedElement;
    const inputValue = this._valueGet(true);

    const handlePaste = (
      clipboardText: string | undefined,
      onBeforePaste: ResolvedOptions['onBeforePaste'],
    ): void => {
      const caretPos = this.caret(input, undefined, undefined, true);
      let valueBeforeCaret = inputValue.substr(0, caretPos.begin);
      let valueAfterCaret = inputValue.substr(caretPos.end, inputValue.length);

      // Text around the caret that is only the empty mask is not pasted again.
      if (valueBeforeCaret === displayedTemplate(this).slice(0, caretPos.begin).join('')) {
        valueBeforeCaret = '';
      }
      if (valueAfterCaret === displayedTemplate(this).slice(caretPos.end).join('')) {
        valueAfterCaret = '';
      }

      // An event without clipboard data pastes the text "undefined".
      let pastedValue = valueBeforeCaret + clipboardText + valueAfterCaret;
      if (this.isRTL && opts.numericInput !== true) {
        const characters = pastedValue.split('');
        for (const templateCharacter of this.getBufferTemplate()) {
          if (characters[0] === templateCharacter) characters.shift();
        }
        pastedValue = characters.reverse().join('');
      }

      let pasteValue: string | false | null | undefined = pastedValue;
      if (typeof onBeforePaste === 'function') {
        pasteValue = onBeforePaste.call(this, pastedValue, opts);
        if (pasteValue === false) return;
        if (!pasteValue) pasteValue = inputValue;
      }
      ownerOf(input).checkVal(input, true, false, pasteValue.toString().split(''), e);
    };

    this.skipInputEvent = true;
    let clipboardText: string | undefined;
    if (e.clipboardData && e.clipboardData.getData) {
      clipboardText = e.clipboardData.getData('text/plain');
    }
    handlePaste(clipboardText, opts.onBeforePaste);
    e.preventDefault();
  },

  /** @upstream eventhandlers.js EventHandlers.inputFallBackEvent */
  inputFallBackEvent(this: Engine, e: InputEvent): false | undefined {
    const { opts } = this;
    const input = this.el as MaskedElement;

    /**
     * Works out what the browser did to the value by comparing it with the
     * buffer, both split at the caret. Moves `caretPos` to cover the edit.
     */
    const analyseChanges = (
      inputValue: string,
      buffer: string,
      caretPos: CaretPosition,
    ): InputChanges => {
      const caret = caretPos;
      const frontPart = inputValue.substr(0, caret.begin).split('');
      const backPart = inputValue.substr(caret.begin).split('');
      const frontBufferPart = buffer.substr(0, caret.begin).split('');
      const backBufferPart = buffer.substr(caret.begin).split('');
      const fpl = frontPart.length >= frontBufferPart.length
        ? frontPart.length
        : frontBufferPart.length;
      const bpl = backPart.length >= backBufferPart.length
        ? backPart.length
        : backBufferPart.length;
      let action = '';
      const data: string[] = [];
      const marker = '~';

      // Pad both sides so the old and the new value line up around the caret.
      while (frontPart.length < fpl) frontPart.push(marker);
      while (frontBufferPart.length < fpl) frontBufferPart.push(marker);
      while (backPart.length < bpl) backPart.unshift(marker);
      while (backBufferPart.length < bpl) backBufferPart.unshift(marker);

      const newBuffer = frontPart.concat(backPart);
      const oldBuffer = frontBufferPart.concat(backBufferPart);

      const bl = newBuffer.length;
      // Setting `i` to `bl` ends the loop from inside the `switch`.
      for (let i = 0; i < bl; i += 1) {
        const placeholder = this.getPlaceholder(this.translatePosition(i));
        switch (action) {
          case 'insertText':
            if (
              oldBuffer[i - 1] === newBuffer[i]
              && looseEquals(caret.begin, newBuffer.length - 1)
            ) {
              data.push(newBuffer[i]);
            }
            i = bl;
            break;
          case 'insertReplacementText':
          case 'deleteContentBackward':
            if (newBuffer[i] === marker) {
              // The selection grows over what was removed.
              caret.end += 1;
            } else {
              i = bl;
            }
            break;
          default:
            if (newBuffer[i] !== oldBuffer[i]) {
              if (
                (newBuffer[i + 1] === marker
                  || newBuffer[i + 1] === placeholder
                  || newBuffer[i + 1] === undefined)
                && ((oldBuffer[i] === placeholder && oldBuffer[i + 1] === marker)
                  || oldBuffer[i] === marker)
              ) {
                // A character typed at the end of the input.
                action = 'insertText';
                data.push(newBuffer[i]);
                caret.begin -= 1;
                caret.end -= 1;
              } else if (oldBuffer[i + 1] === marker && oldBuffer[i] === newBuffer[i + 1]) {
                // A character typed between two others.
                action = 'insertText';
                data.push(newBuffer[i]);
                caret.begin -= 1;
                caret.end -= 1;
              } else if (
                newBuffer[i] !== placeholder
                && newBuffer[i] !== marker
                && (newBuffer[i + 1] === marker
                  || (oldBuffer[i] !== newBuffer[i] && oldBuffer[i + 1] === newBuffer[i + 1]))
              ) {
                // A character typed over a selection, or over a single one.
                action = 'insertReplacementText';
                data.push(newBuffer[i]);
                caret.begin -= 1;
              } else if (newBuffer[i] === marker) {
                action = 'deleteContentBackward';
                if (
                  this.isMask(this.translatePosition(i), true)
                  || oldBuffer[i] === opts.radixPoint
                ) {
                  caret.end += 1;
                }
              } else {
                i = bl;
              }
            }
            break;
        }
      }

      return { action, data, caret };
    };

    const inputValue = ownerOf(input)._valueGet(true);
    const buffer = (this.isRTL ? this.getBuffer().slice().reverse() : this.getBuffer()).join('');
    const caretPos = this.caret(input, undefined, undefined, true);

    if (buffer !== inputValue) {
      const changes = analyseChanges(inputValue, buffer, caretPos);
      if (activeElementOf(input) !== input) {
        input.focus();
      }
      ownerOf(input).writeBuffer(input, this.getBuffer());
      this.caret(input, caretPos.begin, caretPos.end, true);

      // A Japanese IME reports the composed text a second time as plain
      // `insertText`. That repeat is dropped (Inputmask issue #2662).
      if (
        !environment().mobile
        && this.skipNextInsert
        && e.inputType === 'insertText'
        && changes.action === 'insertText'
        && this.isComposing
      ) {
        return false;
      }
      if (
        e.inputType === 'insertCompositionText'
        && changes.action === 'insertText'
        && this.isComposing
      ) {
        this.skipNextInsert = true;
      } else {
        this.skipNextInsert = false;
      }

      switch (changes.action) {
        case 'insertText':
        case 'insertReplacementText':
          changes.data.forEach((entry) => {
            const keypress: MaskEvent = createEvent('keypress');
            keypress.key = entry;
            // The last `keydown` may have marked its key as one without a character.
            this.ignorable = false;
            ownerOf(input).keypressEvent(keypress);
          });
          setTimeout(() => {
            // Other libraries follow changes through `keyup` (Inputmask issue #2195).
            trigger(this.el, 'keyup');
          }, 0);
          break;
        case 'deleteContentBackward': {
          const keydown: MaskEvent = createEvent('keydown');
          keydown.key = keys.Backspace;
          ownerOf(input).keyEvent(keydown);
          break;
        }
        default:
          ownerOf(input).applyInputValue(input, inputValue);
          this.caret(input, caretPos.begin, caretPos.end, true);
          break;
      }

      e.preventDefault();
    }
    return undefined;
  },

  /** @upstream eventhandlers.js EventHandlers.setValueEvent */
  setValueEvent(this: Engine, e: SetValueEvent): void {
    const input = this.el as MaskedElement;
    const given = e && e.detail ? e.detail[0] : undefined;
    const value = given === undefined ? ownerOf(input)._valueGet(true) : given;

    // A value that was passed in is applied as it is, without `onBeforeMask`.
    ownerOf(input).applyInputValue(input, value, createEvent('input'), given !== undefined);

    if (e.detail && e.detail[1] !== undefined) {
      this.caret(input, e.detail[1]);
    }
  },

  /** @upstream eventhandlers.js EventHandlers.focusEvent */
  focusEvent(this: Engine, e: FocusEvent): void {
    const { opts } = this;
    const input = this.el as MaskedElement;
    const nptValue = this._valueGet();

    if (opts.showMaskOnFocus && nptValue !== this.getBuffer().join('')) {
      ownerOf(input).writeBuffer(
        input,
        this.getBuffer(),
        this.seekNext(this.getLastValidPosition()),
      );
    }
    if (
      opts.positionCaretOnTab === true
      && this.mouseEnter === false
      && (!this.isBufferComplete(this.getBuffer()) || this.getLastValidPosition() === -1)
    ) {
      ownerOf(input).clickEvent(e, true);
    }
    this.undoValue = this._valueGet(true);
  },

  /** @upstream eventhandlers.js EventHandlers.invalidEvent */
  invalidEvent(this: Engine, _e: Event): void {
    this.validationEvent = true;
  },

  /** @upstream eventhandlers.js EventHandlers.mouseleaveEvent */
  mouseleaveEvent(this: Engine): void {
    const { opts } = this;
    const input = this.el as MaskedElement;
    this.mouseEnter = false;
    if (opts.clearMaskOnLostFocus && activeElementOf(input) !== input) {
      ownerOf(input).HandleNativePlaceholder(input, this.originalPlaceholder);
    }
  },

  /** @upstream eventhandlers.js EventHandlers.clickEvent */
  clickEvent(this: Engine, _e: Event, tabbed?: boolean): void {
    this.clicked += 1;

    const input = this.el as MaskedElement;
    if (activeElementOf(input) === input) {
      const newCaretPosition = this.determineNewCaretPosition(this.caret(input), tabbed);
      if (newCaretPosition !== undefined) {
        this.caret(input, newCaretPosition);
      }
    }
  },

  /** @upstream eventhandlers.js EventHandlers.cutEvent */
  cutEvent(this: Engine, e: ClipboardEvent): void {
    const { maskset } = this;
    const input = this.el as MaskedElement;
    const pos = this.caret(input);
    const clipData = this.isRTL
      ? this.getBuffer().slice(pos.end, pos.begin)
      : this.getBuffer().slice(pos.begin, pos.end);
    const clipDataText = this.isRTL ? clipData.reverse().join('') : clipData.join('');
    if (window.navigator && window.navigator.clipboard) {
      window.navigator.clipboard.writeText(clipDataText);
    }
    this.handleRemove(input, keys.Delete, pos);
    ownerOf(input).writeBuffer(
      input,
      this.getBuffer(),
      maskset.p,
      e,
      this.undoValue !== this._valueGet(true),
    );
  },

  /** @upstream eventhandlers.js EventHandlers.blurEvent */
  blurEvent(this: Engine, e: FocusEvent): void {
    const { opts } = this;
    this.clicked = 0;

    const input = this.el as MaskedElement;
    if (!input.inputmask) return;

    ownerOf(input).HandleNativePlaceholder(input, this.originalPlaceholder);
    let nptValue = ownerOf(input)._valueGet();
    let buffer = this.getBuffer().slice();

    if (nptValue !== '') {
      if (opts.clearMaskOnLostFocus) {
        if (
          this.getLastValidPosition() === -1
          && nptValue === this.getBufferTemplate().join('')
        ) {
          buffer = [];
        } else {
          this.clearOptionalTail(buffer);
        }
      }
      if (this.isBufferComplete(buffer) === false) {
        setTimeout(() => {
          trigger(input, 'incomplete');
        }, 0);
        if (opts.clearIncomplete) {
          this.resetMaskSet(false);
          if (opts.clearMaskOnLostFocus) {
            buffer = [];
          } else {
            buffer = this.getBufferTemplate().slice();
          }
        }
      }

      ownerOf(input).writeBuffer(input, buffer, undefined, e);
    }

    nptValue = this._valueGet(true);
    if (this.undoValue !== nptValue) {
      const bufferTemplateStr = displayedTemplate(this).join('');

      if (
        nptValue !== ''
        || this.undoValue !== bufferTemplateStr
        || (this.undoValue === bufferTemplateStr && this.maskset.validPositions.length > 0)
      ) {
        this.undoValue = nptValue;
        trigger(input, 'change');
      }
    }
  },

  /** @upstream eventhandlers.js EventHandlers.mouseenterEvent */
  mouseenterEvent(this: Engine): void {
    const { showMaskOnHover } = this.opts;
    const input = this.el as MaskedElement;
    this.mouseEnter = true;
    if (activeElementOf(input) !== input) {
      // Built before the option is looked at: reading the template fills the buffers.
      const bufferTemplate = displayedTemplate(this).join('');
      if (showMaskOnHover) {
        ownerOf(input).HandleNativePlaceholder(input, bufferTemplate);
      }
    }
  },

  /** @upstream eventhandlers.js EventHandlers.submitEvent */
  submitEvent(this: Engine): void {
    const { opts } = this;

    if (this.undoValue !== this._valueGet(true)) {
      trigger(this.el, 'change');
    }
    if (
      this.getLastValidPosition() === -1
      && this._valueGet
      && this._valueGet() === this.getBufferTemplate().join('')
    ) {
      // A focused element still shows the empty mask. It must not be submitted.
      this._valueSet('');
    }
    if (opts.clearIncomplete && this.isBufferComplete(this.getBuffer()) === false) {
      this._valueSet('');
    }
    if (opts.removeMaskOnSubmit) {
      // With `unmaskAsNumber` the value is a number, and it is written as it comes.
      this._valueSet(this.unmaskedvalue() as string, true);
      setTimeout(() => {
        const input = this.el as MaskedElement;
        const buffer = this.getBuffer();
        ownerOf(input).writeBuffer(input, buffer);
      }, 0);
    }
  },

  /** @upstream eventhandlers.js EventHandlers.resetEvent */
  resetEvent(this: Engine): void {
    // Anything that reads the value before the timer runs has to reread it first.
    this.refreshValue = true;
    setTimeout(() => {
      const input = this.el as MaskedElement;
      const value = this._valueGet(true);
      ownerOf(input).applyInputValue(input, value);
    }, 0);
  },
};

export type EventHandlerMethods = typeof eventHandlerMethods;
