/**
 * Caret handling and the buffer: where the caret is and may go, which
 * positions take input, and the rendered mask kept on the maskset.
 */
import { activeElementOf } from '../environment';
import { extend } from '../extend';

import type {
  CaretPosition,
  CaretTarget,
  Engine,
  LastRequiredPosition,
  MaskedElement,
  MaskTest,
  MatchValidator,
  PositionCaretOnClick,
  ValidPosition,
} from '../types';

/** @upstream positioning.js caret */
function caret(
  this: Engine,
  input: MaskedElement,
  begin?: undefined,
  end?: undefined,
  notranslate?: boolean,
): CaretPosition;
function caret(
  this: Engine,
  input: MaskedElement,
  begin: CaretTarget,
  end?: number,
  notranslate?: boolean,
  isDelete?: boolean,
): void;
function caret(
  this: Engine,
  input: MaskedElement,
  begin?: CaretTarget,
  end?: number,
  notranslate?: boolean,
  isDelete?: boolean,
): CaretPosition | undefined {
  const { opts } = this;

  if (begin !== undefined) {
    let from: CaretTarget | undefined = begin;
    let to = end;

    if (Array.isArray(from)) {
      to = this.isRTL ? from[0] : from[1];
      from = this.isRTL ? from[1] : from[0];
    }
    // `begin` is read off whatever `from` holds by now. A number has none and
    // passes through; a missing value throws.
    const position = from as Partial<CaretPosition>;
    if (position.begin !== undefined) {
      to = this.isRTL ? position.begin : position.end;
      from = this.isRTL ? position.end : position.begin;
    }

    if (typeof from === 'number') {
      const element = input;
      const caretBegin = notranslate ? from : this.translatePosition(from);
      const translatedEnd = notranslate ? to : this.translatePosition(to);
      let caretEnd = typeof translatedEnd === 'number' ? translatedEnd : caretBegin;

      const view = element.ownerDocument.defaultView || window;
      const scrollCalc = parseInt(view.getComputedStyle(element, null).fontSize, 10) * caretEnd;
      element.scrollLeft = scrollCalc > element.scrollWidth ? scrollCalc : 0;

      // The caret is tracked on the engine the element points at right now. A
      // call left over from a timer may run on an older one, or find none and
      // fail here.
      const owner = element.inputmask as Engine;
      owner.caretPos = { begin: caretBegin, end: caretEnd };

      // Overwrite mode shows the caret as a selection of one character.
      if (
        opts.insertModeVisual
        && opts.insertMode === false
        && caretBegin === caretEnd
        && !isDelete
      ) {
        caretEnd += 1;
      }

      if (element === activeElementOf(element)) {
        if ('setSelectionRange' in element) {
          (element as HTMLInputElement).setSelectionRange(caretBegin, caretEnd);
        } else if (window.getSelection) {
          // A contenteditable host: the selection goes into its first node.
          const range = document.createRange();
          if (element.firstChild == null) {
            element.appendChild(document.createTextNode(''));
          }
          const firstChild = element.firstChild as ChildNode;
          const valueLength = owner._valueGet().length;
          range.setStart(firstChild, caretBegin < valueLength ? caretBegin : valueLength);
          range.setEnd(firstChild, caretEnd < valueLength ? caretEnd : valueLength);
          range.collapse(true);

          const selection = window.getSelection() as Selection;
          selection.removeAllRanges();
          selection.addRange(range);
        }

        if (owner.caretHook !== undefined) {
          owner.caretHook.call(this, { begin: caretBegin, end: caretEnd });
        }
      }
    }

    return undefined;
  }

  // A contenteditable host whose selection lies elsewhere reads nothing:
  // `begin` stays undefined and `end` keeps what the caller passed.
  let selectionBegin: number | null | undefined;
  let selectionEnd: number | null | undefined = end;

  if ('selectionStart' in input && 'selectionEnd' in input) {
    selectionBegin = input.selectionStart;
    selectionEnd = input.selectionEnd;
  } else if (window.getSelection) {
    const range = (window.getSelection() as Selection).getRangeAt(0);
    if (
      range.commonAncestorContainer.parentNode === input
      || range.commonAncestorContainer === input
    ) {
      selectionBegin = range.startOffset;
      selectionEnd = range.endOffset;
    }
  }

  // `selectionStart` is null on an input type without a selection. What was
  // read goes back as it is.
  return {
    begin: notranslate ? selectionBegin : this.translatePosition(selectionBegin as number),
    end: notranslate ? selectionEnd : this.translatePosition(selectionEnd as number),
  } as CaretPosition;
}

/** @upstream positioning.js determineLastRequiredPosition */
function determineLastRequiredPosition(this: Engine, returnDefinition: true): LastRequiredPosition;
function determineLastRequiredPosition(this: Engine, returnDefinition?: false): number;
function determineLastRequiredPosition(
  this: Engine,
  returnDefinition?: boolean,
): LastRequiredPosition | number {
  const { maskset } = this;
  const lvp = this.getLastValidPosition();
  const lvTest = maskset.validPositions[lvp];
  const buffer = this.getMaskTemplate(true, lvp, true, true);
  // The test of every position after the last input, by position.
  const positions: Partial<Record<number, MaskTest>> = {};
  let bl = buffer.length;
  let ndxIntlzr = lvTest !== undefined ? lvTest.locator.slice() : undefined;
  let pos: number;

  for (pos = lvp + 1; pos < buffer.length; pos += 1) {
    const testPos = this.getTestTemplate(pos, ndxIntlzr, pos - 1);
    ndxIntlzr = testPos.locator.slice();
    positions[pos] = extend(true, {}, testPos);
  }

  const alternation = lvTest ? lvTest.alternation : undefined;
  const lvTestAlt = lvTest && alternation !== undefined ? lvTest.locator[alternation] : undefined;

  // With an alternation behind the last input: an input position of another
  // alternative, or a static one of an alternative the last input shares.
  const isSparedByAlternation = (testPos: MaskTest, position: number): boolean => {
    if (!lvTestAlt || alternation === undefined) return false;

    const alternative = testPos.locator[alternation];
    if (testPos.match.static !== true) return lvTestAlt !== alternative;

    return Boolean(alternative)
      && this.checkAlternationMatch(
        alternative.toString().split(','),
        lvTestAlt.toString().split(','),
      )
      // `def` is never set on a test, so this holds. The call stays because it
      // resolves the tests of the position.
      && this.getTests(position)[0].def !== '';
  };

  // Walk back from the end over what can be left empty.
  for (pos = bl - 1; pos > lvp; pos -= 1) {
    const testPos = positions[pos] as MaskTest;
    if (
      (testPos.match.optionality
        || (testPos.match.optionalQuantifier && testPos.match.newBlockMarker)
        || isSparedByAlternation(testPos, pos))
      && buffer[pos] === this.getPlaceholder(pos, testPos.match)
    ) {
      bl -= 1;
      if (testPos.match.optionality) {
        // Stop at an optional block whose first position holds input.
        let prevPos = pos;
        while (prevPos > 0) {
          const test = this.getTest(prevPos);
          if (test.match.newBlockMarker === 'master' || test.match.newBlockMarker === true) {
            break;
          }
          prevPos -= 1;
        }
        if (maskset.validPositions[prevPos] !== undefined) {
          break;
        }
      }
    } else {
      break;
    }
  }

  // Nothing is required after the last input.
  if (pos === lvp) {
    bl = pos;
  }

  if (!returnDefinition) return bl;

  const lastRequired = positions[bl];
  return { l: bl, def: lastRequired ? lastRequired.match : undefined };
}

/** @upstream positioning.js translatePosition */
function translatePosition(this: Engine, pos: number): number;
function translatePosition(this: Engine, pos: number | undefined): number | undefined;
function translatePosition(this: Engine, pos: number | undefined): number | undefined {
  const { opts, el } = this;

  if (this.isRTL && typeof pos === 'number' && (!opts.greedy || opts.placeholder !== '') && el) {
    const translated = this._valueGet().length - pos;
    return translated < 0 ? 0 : translated;
  }
  return pos;
}

/**
 * Whether a seek moves past `position`. With `newBlock`, it stops only at the
 * first input position of a block.
 */
function isPassedOver(
  engine: Engine,
  position: number,
  newBlock: boolean | undefined,
  fuzzy: boolean,
): boolean {
  if (newBlock === true) {
    return engine.getTest(position).match.newBlockMarker !== true
      || !engine.isMask(position, undefined, true);
  }
  return !engine.isMask(position, undefined, fuzzy);
}

export const positioningMethods = {
  caret,

  determineLastRequiredPosition,

  /** @upstream positioning.js determineNewCaretPosition */
  determineNewCaretPosition(
    this: Engine,
    selectedCaret: CaretPosition,
    tabbed?: boolean,
    positionCaretOnClick?: PositionCaretOnClick,
  ): CaretPosition | undefined {
    const { maskset, opts } = this;
    // The caller's object is updated in place and handed back, except by `select`.
    let selected = selectedCaret;

    const collapseTo = (position: number): void => {
      selected.begin = position;
      selected.end = position;
    };

    const doRadixFocus = (clickPos: number): boolean => {
      if (opts.radixPoint !== '' && opts.digits !== 0) {
        const vps = maskset.validPositions;
        const clicked = vps[clickPos];
        if (clicked === undefined || clicked.input === undefined) {
          if (clickPos < this.seekNext(-1)) return true;
          const radixPos = this.getBuffer().indexOf(opts.radixPoint);
          if (radixPos !== -1) {
            for (let vp = 0, vpl = vps.length; vp < vpl; vp += 1) {
              const valid = vps[vp];
              if (valid && radixPos < vp && valid.input !== this.getPlaceholder(vp)) {
                return false;
              }
            }
            return true;
          }
        }
      }
      return false;
    };

    // `lvp`: a click past the input lands on the first position still open.
    const lastValidCaret = (clickPosition: number): number => {
      const lvclickPosition = this.getLastValidPosition(clickPosition, true);
      // Both arms give the same position. `isMask(0)` stays for what it resolves.
      const lastPosition = this.seekNext(
        lvclickPosition === -1 && !this.isMask(0) ? -1 : lvclickPosition,
      );

      if (clickPosition <= lastPosition) {
        return !this.isMask(clickPosition, false, true)
          ? this.seekNext(clickPosition)
          : clickPosition;
      }

      const lvp = maskset.validPositions[lvclickPosition];
      const tt = this.getTestTemplate(lastPosition, lvp ? lvp.match.locator : undefined);
      const placeholder = this.getPlaceholder(lastPosition, tt.match);
      if (
        (placeholder !== ''
          && this.getBuffer()[lastPosition] !== placeholder
          && tt.match.optionalQuantifier !== true
          && tt.match.newBlockMarker !== true)
        || (!this.isMask(lastPosition, opts.keepStatic, true) && tt.match.def === placeholder)
      ) {
        const newPos = this.seekNext(lastPosition);
        if (clickPosition >= newPos || clickPosition === lastPosition) {
          return newPos;
        }
      }
      return lastPosition;
    };

    if (tabbed) {
      if (this.isRTL) {
        selected.end = selected.begin;
      } else {
        selected.begin = selected.end;
      }
    }
    if (selected.begin !== selected.end) return undefined;

    switch (positionCaretOnClick || opts.positionCaretOnClick) {
      case 'none':
        break;
      case 'select':
        selected = { begin: 0, end: this.getBuffer().length };
        break;
      case 'ignore':
        collapseTo(this.seekNext(this.getLastValidPosition()));
        break;
      case 'radixFocus':
        if (this.clicked > 1 && maskset.validPositions.length === 0) break;
        if (doRadixFocus(selected.begin)) {
          const radixPos = this.getBuffer().join('').indexOf(opts.radixPoint);
          collapseTo(opts.numericInput ? this.seekNext(radixPos) : radixPos);
        } else {
          collapseTo(lastValidCaret(selected.begin));
        }
        break;
      default:
        collapseTo(lastValidCaret(selected.begin));
    }

    return selected;
  },

  /** @upstream positioning.js getBuffer */
  getBuffer(this: Engine, noCache?: boolean): string[] {
    const { maskset } = this;

    if (maskset.buffer === undefined || noCache === true) {
      maskset.buffer = this.getMaskTemplate(true, this.getLastValidPosition(), true);
      if (maskset._buffer === undefined) maskset._buffer = maskset.buffer.slice();
    }
    return maskset.buffer;
  },

  /** @upstream positioning.js getBufferTemplate */
  getBufferTemplate(this: Engine): string[] {
    const { maskset } = this;

    if (maskset._buffer === undefined) {
      maskset._buffer = this.getMaskTemplate(false, 1);
      if (maskset.buffer === undefined) maskset.buffer = maskset._buffer.slice();
    }
    return maskset._buffer;
  },

  /** @upstream positioning.js getLastValidPosition */
  getLastValidPosition(
    this: Engine,
    closestTo?: number,
    strict?: boolean,
    validPositions?: (ValidPosition | undefined)[],
  ): number {
    const { maskset } = this;
    const valids = validPositions || maskset.validPositions;
    const target = closestTo === undefined ? -1 : closestTo;
    let before = -1;
    let after = -1;

    for (let psNdx = 0, vpl = valids.length; psNdx < vpl; psNdx += 1) {
      const valid = valids[psNdx];
      if (valid && (strict || valid.generatedInput !== true)) {
        if (psNdx <= target) before = psNdx;
        if (psNdx >= target) after = psNdx;
      }
    }

    if (before === -1 || before === target) return after;
    if (after === -1) return before;
    return target - before < after - target ? before : after;
  },

  /** @upstream positioning.js isMask */
  isMask(
    this: Engine,
    pos: number,
    strict?: boolean | number | null,
    fuzzy?: boolean,
  ): boolean | MatchValidator | null {
    const { maskset } = this;

    let test = this.getTestTemplate(pos).match;
    if (test.def === '') test = this.getTest(pos).match;

    if (test.static !== true) {
      return test.fn;
    }

    const validPosition = maskset.validPositions[pos];
    if (fuzzy === true && validPosition !== undefined && validPosition.generatedInput !== true) {
      return true;
    }

    if (strict !== true && pos > -1) {
      if (fuzzy) {
        // A static position that has other candidates can still take input.
        const tests = this.getTests(pos);
        return tests.length > 1 + (tests[tests.length - 1].match.def === '' ? 1 : 0);
      }
      const testTemplate = this.determineTestTemplate(pos, this.getTests(pos)) as MaskTest;
      const testPlaceHolder = this.getPlaceholder(pos, testTemplate.match);
      return testTemplate.match.def !== testPlaceHolder;
    }
    return false;
  },

  /** @upstream positioning.js resetMaskSet */
  resetMaskSet(this: Engine, soft?: boolean): void {
    const { maskset } = this;

    maskset.buffer = undefined;
    if (soft !== true) {
      maskset.validPositions = [];
      maskset.p = 0;
    }
    if (soft === false) {
      maskset.tests = {};
      maskset.jitOffset = {};
    }
  },

  /** @upstream positioning.js seekNext */
  seekNext(this: Engine, pos: number, newBlock?: boolean, fuzzy?: boolean): number {
    const isFuzzy = fuzzy === undefined ? true : fuzzy;
    let position = pos + 1;

    while (
      this.getTest(position).match.def !== ''
      && isPassedOver(this, position, newBlock, isFuzzy)
    ) {
      // `pos + 1` concatenates when a position arrives as text. From the
      // second step on it counts as a number.
      position = Number(position) + 1;
    }
    return position;
  },

  /** @upstream positioning.js seekPrevious */
  seekPrevious(this: Engine, pos: number, newBlock?: boolean): number {
    let position = pos - 1;
    if (pos <= 0) return 0;

    while (position > 0 && isPassedOver(this, position, newBlock, true)) {
      position -= 1;
    }
    return position;
  },

  translatePosition,
};

export type PositioningMethods = typeof positioningMethods;
