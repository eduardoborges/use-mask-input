/**
 * Moves values between the element and the maskset: applying a value,
 * unmasking it and writing the buffer back.
 *
 * A method that is handed an element works on the engine that element holds
 * when the call starts, whatever engine it was called on. `this` counts only
 * when there is no element. That is how `format`, `unmaskedvalue(value)` and
 * `isValid` run `checkVal` and `writeBuffer` on an engine that masks nothing.
 */
import { createEvent, trigger } from '../events';
import { keys } from '../keys';
import { looseEquals } from '../looseEquals';

import type {
  CaretPosition,
  CommandObject,
  Engine,
  MaskedElement,
  MaskEvent,
  TestMatch,
  ValidationResult,
  ValidPosition,
} from '../types';

/**
 * The engine a call works on: the one the element holds, or the caller when
 * there is no element. An element whose mask was removed gives `undefined`,
 * and the first field read off the result throws for it. Keep those reads as
 * plain property reads, in the order they are in: the error is observable.
 */
function engineOf(input: MaskedElement | undefined, caller: Engine): Engine {
  return (input ? input.inputmask : caller) as Engine;
}

/**
 * The engine on the element right now. It is read again at each use, because
 * a callback or an `input` listener may have removed or replaced the mask
 * since the call started.
 */
function currentEngineOf(input: MaskedElement): Engine {
  return input.inputmask as Engine;
}

export const inputHandlingMethods = {
  /** @upstream inputHandling.js applyInputValue */
  applyInputValue(
    this: Engine,
    input: MaskedElement,
    value: string | null | undefined,
    initialEvent?: MaskEvent,
    strict?: boolean,
  ): void {
    const inputmask = engineOf(input, this);
    const opts = inputmask.opts;
    let inputValue = value;

    currentEngineOf(input).refreshValue = false;
    if (strict !== true && typeof opts.onBeforeMask === 'function') {
      inputValue = opts.onBeforeMask.call(inputmask, inputValue as string, opts) || inputValue;
    }
    // A script can assign a number (`el.value = 5`), hence `toString`.
    const characters = (inputValue || '').toString().split('');
    inputmask.checkVal(input, true, false, characters, initialEvent);
    inputmask.undoValue = inputmask._valueGet(true);
    if (
      (opts.clearMaskOnLostFocus || opts.clearIncomplete)
      && currentEngineOf(input)._valueGet() === inputmask.getBufferTemplate().join('')
      && inputmask.getLastValidPosition() === -1
    ) {
      currentEngineOf(input)._valueSet('');
    }
  },

  /** @upstream inputHandling.js clearOptionalTail */
  clearOptionalTail(this: Engine, buffer: string[]): string[] {
    const target = buffer;

    target.length = 0;
    const template = this.getMaskTemplate(true, 0, true, undefined, true);
    // The template has `undefined` at the first optional position that holds
    // nothing typed. The copy stops there, and that is what drops the tail.
    let lmnt = template.shift();
    while (lmnt !== undefined) {
      target.push(lmnt);
      lmnt = template.shift();
    }
    return target;
  },

  /** @upstream inputHandling.js checkVal */
  checkVal(
    this: Engine,
    input: MaskedElement | undefined,
    writeOut: boolean,
    strict: boolean,
    nptvl: string[],
    initiatingEvent?: MaskEvent,
  ): void {
    const inputmask = engineOf(input, this);
    const maskset = inputmask.maskset;
    const opts = inputmask.opts;

    const inputValue = nptvl.slice();
    let charCodes = '';
    let result: ValidationResult | undefined;
    const skipOptionalPartCharacter = opts.skipOptionalPartCharacter;
    // No character skips an optional part while a value is replayed. The
    // option is put back at the end, but not when something in between throws.
    opts.skipOptionalPartCharacter = '';

    const matchAt = (pos: number): TestMatch => inputmask.getTest(pos).match;

    /**
     * Whether the characters typed so far spell the static text at `ndx`, so
     * they can be taken as the mask's own text instead of as input.
     */
    const isTemplateMatch = (ndx: number, typed: string): boolean => {
      const targetTemplate = inputmask.getMaskTemplate(true, 0)
        .slice(ndx, inputmask.seekNext(ndx, false, false))
        .join('')
        .replace(/'/g, '');
      let charCodeNdx = targetTemplate.indexOf(typed);
      // Spaces right before the match count as part of it.
      while (charCodeNdx > 0 && targetTemplate[charCodeNdx - 1] === ' ') charCodeNdx -= 1;

      const firstChar = typed.charAt(0);
      const match = charCodeNdx === 0
        && !inputmask.isMask(ndx)
        && (matchAt(ndx).nativeDef === firstChar
          || (matchAt(ndx).static === true && matchAt(ndx).nativeDef === `'${firstChar}`)
          || (matchAt(ndx).nativeDef === ' '
            && (matchAt(ndx + 1).nativeDef === firstChar
              || (matchAt(ndx + 1).static === true
                && matchAt(ndx + 1).nativeDef === `'${firstChar}`))));

      if (!match && charCodeNdx > 0 && !inputmask.isMask(ndx, false, true)) {
        const nextPos = inputmask.seekNext(ndx);
        if (inputmask.caretPos.begin < nextPos) {
          inputmask.caretPos = { begin: nextPos };
        }
      }
      return match;
    };

    inputmask.resetMaskSet(false);
    // `determineNewCaretPosition` looks at the click count for `radixFocus`.
    inputmask.clicked = 0;
    let initialNdx = opts.radixPoint
      ? (inputmask.determineNewCaretPosition(
        { begin: 0, end: 0 },
        false,
        opts.__financeInput === false ? 'radixFocus' : undefined,
      ) as CaretPosition).begin
      : 0;
    maskset.p = initialNdx;
    inputmask.caretPos = { begin: initialNdx };

    const staticMatches: number[] = [];
    let prevCaretPos = inputmask.caretPos;
    inputValue.forEach((charCode, ndx) => {
      // The list is typed as strings, but a caller can still leave `undefined` in it.
      if (charCode === undefined) return;

      const keypress: MaskEvent = createEvent('_checkval');
      keypress.key = charCode;
      charCodes += charCode;
      const lvp = inputmask.getLastValidPosition(undefined, true);
      if (!isTemplateMatch(initialNdx, charCodes)) {
        result = inputmask.keypressEvent(keypress, true, false, strict, inputmask.caretPos.begin);

        if (result) {
          initialNdx = inputmask.caretPos.begin + 1;
          charCodes = '';
        }
      } else {
        result = matchAt(ndx).static === true
          ? inputmask.keypressEvent(keypress, true, false, strict, lvp + 1)
          : false;
      }

      if (result) {
        // With `checkval` on, `keypressEvent` answers with a command object or `false`.
        const command = result as CommandObject;
        if (command.pos !== undefined) {
          const validPos = maskset.validPositions[command.pos];
          if (validPos && validPos.match.static === true && validPos.alternation === undefined) {
            staticMatches.push(command.pos);
            if (!inputmask.isRTL) {
              command.forwardPosition = command.pos + 1;
            }
          }
        }
        // There is no element to write to: the call only runs `onBeforeWrite`.
        inputmask.writeBuffer(
          undefined,
          inputmask.getBuffer(),
          command.forwardPosition,
          keypress,
          false,
        );
        inputmask.caretPos = {
          begin: command.forwardPosition as number,
          end: command.forwardPosition,
        };
        prevCaretPos = inputmask.caretPos;
      } else if (
        maskset.validPositions[ndx] === undefined
        && inputValue[ndx] === inputmask.getPlaceholder(ndx)
        && inputmask.isMask(ndx, true)
      ) {
        inputmask.caretPos.begin += 1;
      } else {
        // Back to where the caret was before the validation failed.
        inputmask.caretPos = prevCaretPos;
      }
    });

    if (staticMatches.length > 0) {
      const nextValid = inputmask.seekNext(-1, undefined, false);
      if (
        (!inputmask.isBufferComplete(inputmask.getBuffer()) && staticMatches.length <= nextValid)
        || (inputmask.isBufferComplete(inputmask.getBuffer())
          && staticMatches.length > 0
          && staticMatches.length !== nextValid
          && staticMatches[0] === 0)
      ) {
        // The characters that landed on the leading statics were input after
        // all: type them again, starting at the first position that takes input.
        let nextSndx = nextValid;
        let sndx = staticMatches.shift();
        while (sndx !== undefined) {
          if (sndx < nextSndx) {
            const keypress: MaskEvent = createEvent('_checkval');
            const validPos = maskset.validPositions[sndx] as ValidPosition;
            validPos.generatedInput = true;
            keypress.key = validPos.input;
            result = inputmask.keypressEvent(keypress, true, false, strict, nextSndx);
            if (!result) break;

            const command = result as CommandObject;
            if (command.pos !== undefined && command.pos !== sndx) {
              const landedOn = maskset.validPositions[command.pos];
              if (landedOn && landedOn.match.static === true) {
                staticMatches.push(command.pos);
              }
            }
            nextSndx += 1;
          }
          sndx = staticMatches.shift();
        }
      } else {
        // Drop every static match with nothing after it. Position 0 is falsy,
        // so it ends the loop and a match there stays.
        let sndx = staticMatches.pop();
        while (sndx) {
          const validPos = maskset.validPositions[sndx];
          if (validPos && maskset.validPositions[sndx + 1] === undefined) {
            delete maskset.validPositions[sndx];
          }
          sndx = staticMatches.pop();
        }
      }
    }

    if (writeOut) {
      inputmask.writeBuffer(
        input,
        inputmask.getBuffer(),
        result ? (result as CommandObject).forwardPosition : inputmask.caretPos.begin,
        initiatingEvent || createEvent('checkval'),
        initiatingEvent
          && ((initiatingEvent.type === 'input'
            && inputmask.undoValue !== inputmask.getBuffer().join(''))
            || initiatingEvent.type === 'paste'),
      );
    }
    opts.skipOptionalPartCharacter = skipOptionalPartCharacter;
  },

  /** @upstream inputHandling.js HandleNativePlaceholder */
  HandleNativePlaceholder(this: Engine, npt: MaskedElement, value: string | undefined): void {
    const element = npt;

    if (element.placeholder !== value) {
      element.placeholder = value as string;
      if (element.placeholder === '') element.removeAttribute('placeholder');
    }
  },

  /** @upstream inputHandling.js unmaskedvalue */
  unmaskedValueOf(this: Engine, input?: MaskedElement): string | number {
    const inputmask = engineOf(input, this);
    const opts = inputmask.opts;
    const maskset = inputmask.maskset;

    if (input) {
      // Never taken: without an engine the reads above have thrown already.
      if (input.inputmask === undefined) {
        return input.value;
      }
      if (input.inputmask && input.inputmask.refreshValue) {
        // The form was reset: take the value the element holds now.
        inputmask.applyInputValue(input, input.inputmask._valueGet(true));
      }
    }

    const umValue: string[] = [];
    const vps = maskset.validPositions;
    for (let pndx = 0, vpl = vps.length; pndx < vpl; pndx += 1) {
      const vp = vps[pndx];
      if (
        vp
        && vp.match
        && (!looseEquals(vp.match.static, true)
          // A list of masks without `keepStatic`: the statics the user typed
          // tell the masks apart, so they belong to the value.
          || (opts.keepStatic !== true
            && Array.isArray(maskset.metadata)
            && vp.generatedInput !== true))
      ) {
        umValue.push(vp.input);
      }
    }

    let unmaskedValue: string | number = '';
    if (umValue.length !== 0) {
      unmaskedValue = (inputmask.isRTL ? umValue.reverse() : umValue).join('');
    }
    if (typeof opts.onUnMask === 'function') {
      const bufferValue = (
        inputmask.isRTL
          ? inputmask.getBuffer().slice().reverse()
          : inputmask.getBuffer()
      ).join('');
      unmaskedValue = opts.onUnMask.call(inputmask, bufferValue, unmaskedValue, opts);
    }

    // `onUnMask` can answer with a number, which has no length and is returned as is.
    if (opts.outputMask && (unmaskedValue as string).length > 0) {
      return inputmask.Inputmask.format(unmaskedValue as string, {
        ...opts,
        mask: opts.outputMask,
        alias: null,
      });
    }

    return unmaskedValue;
  },

  /** @upstream inputHandling.js writeBuffer */
  writeBuffer(
    this: Engine,
    input: MaskedElement | undefined,
    buffer: string[],
    caretPos?: number,
    event?: MaskEvent,
    triggerEvents?: boolean,
  ): void {
    const inputmask = engineOf(input, this);
    const opts = inputmask.opts;
    let written = buffer;
    let position = caretPos;

    if (event && typeof opts.onBeforeWrite === 'function') {
      // The callback gets the buffer itself, not a copy, and may change it.
      const result = opts.onBeforeWrite.call(inputmask, event, written, position, opts);
      if (result) {
        if (result.refreshFromBuffer) {
          const refresh = result.refreshFromBuffer;
          inputmask.refreshFromBuffer(
            refresh === true ? refresh : refresh.start,
            refresh === true ? undefined : refresh.end,
            result.buffer || written,
          );
          written = inputmask.getBuffer(true);
        }
        if (position !== undefined) {
          position = result.caret !== undefined ? result.caret : position;
        }
      }
    }

    if (input !== undefined) {
      currentEngineOf(input)._valueSet(written.join(''));
      if (position !== undefined && (event === undefined || event.type !== 'blur')) {
        inputmask.caret(
          input,
          position,
          undefined,
          undefined,
          event !== undefined
            && event.type === 'keydown'
            && (event.key === keys.Delete || event.key === keys.Backspace),
        );
      }

      const hookOwner = currentEngineOf(input);
      if (hookOwner.writeBufferHook !== undefined) hookOwner.writeBufferHook(position);

      if (triggerEvents === true) {
        const nptVal = currentEngineOf(input)._valueGet();
        currentEngineOf(input).skipInputEvent = true;
        trigger(input, 'input');
        setTimeout(() => {
          if (nptVal === inputmask.getBufferTemplate().join('')) {
            trigger(input, 'cleared');
          } else if (inputmask.isBufferComplete(written) === true) {
            trigger(input, 'complete');
          }
        }, 0);
      }
    }
  },
};

export type InputHandlingMethods = typeof inputHandlingMethods;
