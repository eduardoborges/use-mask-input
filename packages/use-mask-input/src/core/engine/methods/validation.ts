/**
 * Decides whether a character fits a position, moves the input that follows
 * it, and switches alternation when the current branch cannot take it.
 */
import { createEvent } from '../events';
import { extend } from '../extend';
import { keys } from '../keys';
import { looseEquals } from '../looseEquals';

import type {
  CaretPosition,
  CommandObject,
  Engine,
  MaskedElement,
  MaskEvent,
  MaskTest,
  MatchValidator,
  ResolvedOptions,
  TestMatch,
  ValidationResult,
  ValidPosition,
} from '../types';

/**
 * The key the positions of a `remove` command are sorted by. Inputmask reads
 * a `pos` field there, and the entries are plain numbers, so the key is
 * `undefined`, every comparison is `NaN` and the sort leaves the order alone.
 */
function removalSortKey(position: number): number {
  return (position as unknown as { pos: number }).pos;
}

/**
 * Whether the static at `pos` stays in place while `selection` is removed. It
 * does when it is enclosed: a neighbour inside the selection has to be a
 * static as well, and a neighbour outside it only has to hold input.
 */
function isEnclosedStatic(
  pos: number,
  valids: (ValidPosition | undefined)[],
  selection: CaretPosition,
): boolean {
  const posMatch = valids[pos];
  if (
    posMatch !== undefined
    && posMatch.match.static === true
    && posMatch.match.optionality !== true
    && (valids[0] === undefined || valids[0].alternation === undefined)
  ) {
    const before = valids[pos - 1];
    const after = valids[pos + 1];
    const prevMatch = selection.begin <= pos - 1
      ? before && before.match.static === true && before
      : before;
    const nextMatch = selection.end > pos + 1
      ? after && after.match.static === true && after
      : after;
    return Boolean(prevMatch && nextMatch);
  }
  return false;
}

export const validationMethods = {
  /** @upstream validation.js alternate */
  alternate(
    this: Engine,
    maskPos: number | true,
    c?: string,
    strict?: boolean,
    fromIsValid?: boolean,
    rAltPos?: number,
    selection?: number | CaretPosition,
  ): ValidationResult {
    // `maskPos === true` generalises: the input is replayed with no alternative ruled out.
    const { opts, maskset } = this;

    if (!this.hasAlternator) return false;

    const validPsClone = extend(true, [], maskset.validPositions);
    const tstClone = extend(true, {}, maskset.tests);
    let lastAlt: number | undefined;
    let alternation: number | undefined;
    let isValidRslt: ValidationResult = false;
    let returnRslt: ValidationResult = false;
    let prevAltPos: MaskTest | undefined;
    let decisionPos: number | undefined;
    let lAltPos = rAltPos !== undefined ? rAltPos : this.getLastValidPosition();
    // Kept across the retries below: the next retry starts from where the last one stopped.
    let nextPos: number | undefined;
    let begin: number | undefined;
    let end: number | undefined;

    if (selection) {
      // A numeric selection has neither field, so both stay undefined.
      const range = selection as CaretPosition;
      begin = range.begin;
      end = range.end;
      if (range.begin > range.end) {
        begin = range.end;
        end = range.begin;
      }
    }

    if (lAltPos === -1 && rAltPos === undefined) {
      // do not recurse when already passed the beginning
      lastAlt = 0;
      prevAltPos = this.getTest(lastAlt);
      alternation = prevAltPos.alternation;
    } else {
      // find last modified alternation
      for (; lAltPos >= 0; lAltPos -= 1) {
        const altPos = lAltPos === 0 ? this.getTest(0) : maskset.validPositions[lAltPos];
        if (altPos && altPos.alternation !== undefined) {
          if (
            // `true` counts as position 1 here.
            lAltPos <= Number(maskPos || 0)
            && prevAltPos
            && prevAltPos.locator[altPos.alternation] !== altPos.locator[altPos.alternation]
          ) {
            break;
          }
          lastAlt = lAltPos;
          alternation = altPos.alternation;
          prevAltPos = altPos;
        }
      }
    }

    if (alternation !== undefined) {
      // Set together with `alternation`.
      const decidingTest = prevAltPos as MaskTest;
      decisionPos = parseInt(String(lastAlt), 10);
      const ruledOut = maskset.excludes[decisionPos] || [];
      maskset.excludes[decisionPos] = ruledOut;
      // generalize
      if (maskPos !== true) {
        ruledOut.push(`${this.getDecisionTaker(decidingTest)}:${decidingTest.alternation}`);
      }

      const validInputs: string[] = [];
      let resultPos = -1;
      for (
        let i = decisionPos;
        decisionPos < this.getLastValidPosition(undefined, true) + 1;
        i += 1
      ) {
        if (resultPos === -1 && Number(maskPos) <= i && c !== undefined) {
          validInputs.push(c);
          resultPos = validInputs.length - 1;
        }
        const validPos = maskset.validPositions[decisionPos];
        if (
          validPos
          && validPos.generatedInput !== true
          && (decisionPos !== 0 || validPos.input !== opts.skipOptionalPartCharacter)
          // With a numeric selection both bounds are undefined and nothing passes.
          && (selection === undefined || i < (begin as number) || i >= (end as number))
        ) {
          validInputs.push(validPos.input);
        }
        maskset.validPositions.splice(decisionPos, 1);
      }
      if (resultPos === -1 && c !== undefined) {
        validInputs.push(c);
        resultPos = validInputs.length - 1;
      }

      while (
        maskset.excludes[decisionPos] !== undefined
        && (maskset.excludes[decisionPos] as string[]).length < 10
      ) {
        maskset.tests = {}; // clear all
        this.resetMaskSet(true); // clear getbuffer
        isValidRslt = true;
        for (let i = 0; i < validInputs.length; i += 1) {
          // A boolean result has no `caret`.
          nextPos = (isValidRslt as CommandObject).caret
            || (looseEquals(opts.insertMode, false) && nextPos != null)
            ? this.seekNext(nextPos as number)
            : this.getLastValidPosition(undefined, true) + 1;
          const input = validInputs[i];
          isValidRslt = this.isValidPosition(nextPos, input, false, fromIsValid, true);
          if (!isValidRslt) {
            if (this.isBufferComplete(this.getBuffer())) {
              isValidRslt = returnRslt; // keep previous result if any
            }
            break;
          }
          if (i === resultPos) {
            returnRslt = isValidRslt;
          }
          // Loose on purpose: position 1 equals `true` too.
          if (looseEquals(maskPos, true) && isValidRslt) {
            // return validposition on generalise
            returnRslt = { caretPos: i };
          }
        }
        if (isValidRslt) break;

        this.resetMaskSet();
        // The alternative to rule out next. It has to be read before the valid positions come back.
        const failedTest = this.getTest(decisionPos);
        // reset & revert
        maskset.validPositions = extend(true, [], validPsClone);
        maskset.tests = extend(true, {}, tstClone); // refresh tests after possible alternating
        returnRslt = false;
        const tried = maskset.excludes[decisionPos];
        if (tried) {
          if (failedTest.alternation != null) {
            const decisionTaker = this.getDecisionTaker(failedTest);
            if (tried.indexOf(`${decisionTaker}:${failedTest.alternation}`) !== -1) {
              returnRslt = this.alternate(
                maskPos,
                c,
                strict,
                fromIsValid,
                decisionPos - 1,
                selection,
              );
              break;
            }
            tried.push(`${decisionTaker}:${failedTest.alternation}`);
            for (
              let i = decisionPos;
              i < this.getLastValidPosition(undefined, true) + 1;
              i += 1
            ) {
              // No delete count: everything from the decision on goes at once.
              maskset.validPositions.splice(decisionPos);
            }
          } else {
            delete maskset.excludes[decisionPos];
          }
        } else {
          // latest alternation
          returnRslt = this.alternate(maskPos, c, strict, fromIsValid, decisionPos - 1, selection);
          break;
        }
      }
    }

    // reset alternation excludes
    if (!returnRslt || opts.keepStatic !== false) {
      // Without an alternation there is no decision position and this removes nothing.
      delete maskset.excludes[decisionPos as number];
    }
    return returnRslt;
  },

  /** @upstream validation.js casing */
  casing(this: Engine, elem: string, test: TestMatch, pos: number): string {
    const { opts, maskset } = this;

    switch (opts.casing || test.casing) {
      case 'upper':
        return elem.toLocaleUpperCase();
      case 'lower':
        return elem.toLocaleLowerCase();
      case 'title': {
        const posBefore = maskset.validPositions[pos - 1];
        return pos === 0 || (posBefore && posBefore.input === keys.Space)
          ? elem.toLocaleUpperCase()
          : elem.toLocaleLowerCase();
      }
      default:
        return typeof opts.casing === 'function'
          ? opts.casing.call(this, elem, test, pos, maskset.validPositions)
          : elem;
    }
  },

  /** @upstream validation.js checkAlternationMatch */
  checkAlternationMatch(this: Engine, altArr1: string[], altArr2: string[], na?: string): boolean {
    const { opts } = this;
    // The caller's list loses the entries named in `na`.
    const alternatives = altArr1;
    const altArrC = opts.greedy ? altArr2 : altArr2.slice(0, 1);
    const naArr = na !== undefined ? na.split(',') : [];

    // remove no alternate indexes from alternation array
    for (const noAlternate of naArr) {
      const naNdx = alternatives.indexOf(noAlternate);
      if (naNdx !== -1) {
        alternatives.splice(naNdx, 1);
      }
    }

    for (const alternative of alternatives) {
      if (altArrC.includes(alternative)) return true;
    }
    return false;
  },

  /** @upstream validation.js handleRemove */
  handleRemove(
    this: Engine,
    _input: MaskedElement,
    c: string,
    pos: CaretPosition,
    strict?: boolean,
    _fromIsValid?: boolean,
  ): void {
    const { maskset, opts } = this;
    // The caller's object is updated in place.
    const position = pos;
    let key = c;

    if (opts.numericInput || this.isRTL) {
      if (key === keys.Backspace) {
        key = keys.Delete;
      } else if (key === keys.Delete) {
        key = keys.Backspace;
      }

      if (this.isRTL) {
        const pend = position.end;
        position.end = position.begin;
        position.begin = pend;
      }
    }

    const lvp = this.getLastValidPosition(undefined, true);
    if (position.end >= this.getBuffer().length && lvp >= position.end) {
      // handle numeric negate symbol offset, due to dynamic jit masking
      position.end = lvp + 1;
    }

    if (key === keys.Backspace) {
      if (position.end - position.begin < 1) {
        position.begin = this.seekPrevious(position.begin);
      }
    } else if (key === keys.Delete) {
      if (position.begin === position.end) {
        position.end = this.isMask(position.end, true, true)
          ? position.end + 1
          : this.seekNext(position.end) + 1;
      }
    }

    const offset = this.revalidateMask(position);
    if (offset === false) return;

    if (
      (strict !== true && opts.keepStatic !== false)
      || (opts.regex !== null && this.getTest(position.begin).match.def.indexOf('|') !== -1)
    ) {
      // A `|` in a regex mask does not mean the position alternates, but it is treated as if it did.
      this.alternate(true);
    }

    if (strict !== true) {
      maskset.p = key === keys.Delete ? position.begin + offset : position.begin;
      maskset.p = (this.determineNewCaretPosition(
        { begin: maskset.p, end: maskset.p },
        false,
        opts.insertMode === false && key === keys.Backspace ? 'none' : undefined,
      ) as CaretPosition).begin;
    }
  },

  /** @upstream validation.js isComplete */
  isBufferComplete(this: Engine, buffer: string[]): boolean | undefined {
    const { opts, maskset } = this;

    if (typeof opts.isComplete === 'function') return opts.isComplete(buffer, opts);
    // A mask that repeats without end is neither complete nor incomplete.
    if (opts.repeat === '*') return undefined;

    const lrp = this.determineLastRequiredPosition(true);
    const aml = lrp.l;

    if (
      lrp.def === undefined
      || lrp.def.newBlockMarker
      || lrp.def.optionality
      || lrp.def.optionalQuantifier
    ) {
      for (let i = 0; i <= aml; i += 1) {
        const test = this.getTestTemplate(i).match;
        if (
          (test.static !== true
            && maskset.validPositions[i] === undefined
            && (test.optionality === false
              || test.optionality === undefined
              || (test.optionality && looseEquals(test.newBlockMarker, false)))
            && (test.optionalQuantifier === false || test.optionalQuantifier === undefined))
          || (test.static === true
            && !looseEquals(test.def, '')
            && buffer[i] !== this.getPlaceholder(i, test))
        ) {
          return false;
        }
      }
      return true;
    }

    return false;
  },

  /** @upstream validation.js isSelection */
  isSelection(this: Engine, posObj: number | CaretPosition): boolean {
    const { opts } = this;
    const insertModeOffset = opts.insertMode ? 0 : 1;
    // A number has no `begin` or `end`: the difference is `NaN` and the answer `false`.
    const range = posObj as CaretPosition;

    return this.isRTL
      ? range.begin - range.end > insertModeOffset
      : range.end - range.begin > insertModeOffset;
  },

  /** @upstream validation.js isValid */
  isValidPosition(
    this: Engine,
    pos: number | CaretPosition,
    c: string,
    strict?: boolean,
    fromIsValid?: boolean,
    fromAlternate?: boolean,
    validateOnly?: boolean,
    fromCheckval?: boolean,
  ): ValidationResult {
    const { opts, maskset } = this;

    // Strict means no correction and no autofill. The aliases get a real boolean.
    const isStrict = strict === true;
    let isFromAlternate = fromAlternate;

    // A number has no `begin` or `end`: reading them tells a position from a selection.
    const range = pos as CaretPosition;

    /** `pos` as one position: where a selection starts, in typing order. */
    const startOfPos = (): number => {
      if (range.begin === undefined) return pos as number;
      // A position object comes from typing over a selection, which deletes it.
      return this.isRTL ? range.end : range.begin;
    };

    let maskPos = startOfPos();

    /**
     * Runs the commands a result carries and clears them on it, so the same
     * object can come through here again. A `rewritePosition` moves `maskPos`
     * and turns the result into `true`.
     */
    const processCommandObject = (
      commandObj: ValidationResult | undefined,
    ): ValidationResult | undefined => {
      if (commandObj === undefined) return commandObj;

      // A boolean has none of these fields, so it passes through untouched.
      const command = commandObj as CommandObject;

      if (command.remove !== undefined) {
        // remove position(s)
        if (!Array.isArray(command.remove)) command.remove = [command.remove];
        command.remove
          .sort((a, b) => (
            this.isRTL
              ? removalSortKey(a) - removalSortKey(b)
              : removalSortKey(b) - removalSortKey(a)
          ))
          .forEach((lmnt) => {
            this.revalidateMask({ begin: lmnt, end: lmnt + 1 });
          });
        command.remove = undefined;
      }
      if (command.insert !== undefined) {
        // insert position(s)
        if (!Array.isArray(command.insert)) command.insert = [command.insert];
        command.insert
          .sort((a, b) => (this.isRTL ? b.pos - a.pos : a.pos - b.pos))
          .forEach((lmnt) => {
            if (lmnt.c !== '') {
              this.isValidPosition(
                lmnt.pos,
                lmnt.c,
                lmnt.strict !== undefined ? lmnt.strict : true,
                lmnt.fromIsValid !== undefined ? lmnt.fromIsValid : fromIsValid,
              );
            }
          });
        command.insert = undefined;
      }

      if (command.refreshFromBuffer && command.buffer) {
        const refresh = command.refreshFromBuffer;
        this.refreshFromBuffer(
          refresh === true ? refresh : refresh.start,
          refresh === true ? undefined : refresh.end,
          command.buffer,
        );
        command.refreshFromBuffer = undefined;
      }

      if (command.rewritePosition !== undefined) {
        maskPos = command.rewritePosition;
        return true; // see the preValidation call below
      }
      return commandObj;
    };

    /** Tries the tests of `position` in order and stores the first that takes `chr`. */
    const validateAt = (position: number, chr: string, strictly: boolean): ValidationResult => {
      let rslt: ValidationResult = false;

      this.getTests(position).every((tst) => {
        const test = tst.match;
        // make sure the buffer is set and correct
        this.getBuffer(true);

        // false, true, or a command object such as { pos, c }
        let verdict: ValidationResult;
        if (test.jit && maskset.validPositions[this.seekPrevious(position)] === undefined) {
          // ignore if jit is not desirable
          verdict = false;
        } else if (test.fn != null) {
          verdict = test.fn.test(chr, maskset, position, strictly, opts, this.isSelection(pos));
        } else if (
          (chr === test.def || chr === opts.skipOptionalPartCharacter)
          && test.def !== ''
        ) {
          // non mask
          verdict = {
            c: this.getPlaceholder(position, test, true) || test.def,
            pos: position,
          };
        } else {
          verdict = false;
        }
        rslt = verdict;
        if (verdict === false) return true;

        // `true` has no fields.
        const given = verdict as CommandObject;
        let elem = given.c !== undefined ? given.c : chr;
        let validatedPos = position;
        if (elem === opts.skipOptionalPartCharacter && test.static === true) {
          elem = this.getPlaceholder(position, test, true) || test.def;
        }

        const processed = processCommandObject(verdict) as true | CommandObject;
        rslt = processed;

        if (processed !== true && processed.pos !== undefined && processed.pos !== position) {
          // there is a position offset
          validatedPos = processed.pos;
        }

        if (processed !== true && processed.pos === undefined && processed.c === undefined) {
          return false; // breakout if nothing to insert
        }

        if (
          this.revalidateMask(
            pos,
            extend({}, tst, { input: this.casing(elem, test, validatedPos) }),
            fromIsValid,
            validatedPos,
          ) === false
        ) {
          rslt = false;
        }
        return false; // break from loop
      });

      return rslt;
    };

    let result: ValidationResult | undefined = true;
    // the current positions, to revert to
    const positionsClone = extend(true, [], maskset.validPositions);

    if (
      opts.keepStatic === false
      && maskset.excludes[maskPos] !== undefined
      && fromAlternate !== true
      && fromIsValid !== true
    ) {
      for (let i = maskPos; i < (this.isRTL ? range.begin : range.end); i += 1) {
        if (maskset.excludes[i] !== undefined) {
          maskset.excludes[i] = undefined;
          delete maskset.tests[i];
        }
      }
    }

    if (
      typeof opts.preValidation === 'function'
      && fromIsValid !== true
      && validateOnly !== true
    ) {
      result = opts.preValidation.call(
        this,
        this.getBuffer(),
        maskPos,
        c,
        this.isSelection(pos),
        opts,
        maskset,
        pos,
        isStrict || fromAlternate,
      );
      result = processCommandObject(result);
    }
    if (result === true) {
      // preValidation result
      result = validateAt(maskPos, c, isStrict);
      if ((!isStrict || fromIsValid === true) && result === false && validateOnly !== true) {
        const currentPosValid = maskset.validPositions[maskPos];
        if (
          currentPosValid
          && currentPosValid.match.static === true
          && (currentPosValid.match.def === c || c === opts.skipOptionalPartCharacter)
        ) {
          result = { caret: this.seekNext(maskPos) };
        } else if (
          opts.insertMode
          || maskset.validPositions[this.seekNext(maskPos)] === undefined
          || range.end > maskPos
        ) {
          // does the input match on a further position?
          let skip = false;
          if (
            maskset.jitOffset[maskPos]
            && maskset.validPositions[this.seekNext(maskPos)] === undefined
          ) {
            // Read again: resolving the tests above can change the offset.
            result = this.isValidPosition(
              maskPos + (maskset.jitOffset[maskPos] as number),
              c,
              true,
              true,
            );
            if (result !== false) {
              if (fromAlternate !== true) (result as CommandObject).caret = maskPos;
              skip = true;
            }
          }
          if (range.end > maskPos) {
            maskset.validPositions[maskPos] = undefined;
          }
          if (!skip && !this.isMask(maskPos, (opts.keepStatic && maskPos === 0) as boolean)) {
            const snPos = this.seekNext(maskPos, false, maskPos !== 0);
            for (let nPos = maskPos + 1; nPos <= snPos; nPos += 1) {
              result = validateAt(nPos, c, isStrict);
              if (result !== false) {
                const validated = result as CommandObject;
                result = this.trackbackPositions(
                  maskPos,
                  validated.pos !== undefined ? validated.pos : nPos,
                ) || result;
                maskPos = nPos;
                break;
              }
            }
          }
        }
      }

      if (this.hasAlternator && isFromAlternate !== true && !isStrict) {
        isFromAlternate = true; // stop possible loop
        if (result === false) {
          // try alternating when the validation fails
          if (
            opts.keepStatic === true
            || (Number.isFinite(parseInt(String(opts.keepStatic), 10))
              && maskPos >= (opts.keepStatic as number))
          ) {
            result = this.alternate(maskPos, c, isStrict, fromIsValid, undefined, pos);
          }
        } else if (result === true) {
          // try alternating when the validation succeeds
          const choices = maskset.tests[maskPos];
          if (this.isSelection(pos) && choices && choices.length > 1 && opts.keepStatic) {
            // selection clears an alternated keepstatic mask ~ #2189
            result = this.alternate(true) || result;
          } else if (
            opts.numericInput !== true
            && choices
            && choices.length > 1
            && this.getLastValidPosition(undefined, true) > maskPos
          ) {
            // alternate by adding extra input in between
            result = this.alternate(true) || result;
          }
        }
      }

      if (result === true) {
        result = { pos: maskPos };
      }

      if (
        typeof opts.postValidation === 'function'
        && fromIsValid !== true
        && validateOnly !== true
      ) {
        const postResult = opts.postValidation.call(
          this,
          this.getBuffer(true),
          startOfPos(),
          c,
          result as false | CommandObject,
          opts,
          maskset,
          isStrict,
          fromCheckval,
          isFromAlternate,
        );
        if (postResult !== undefined) {
          result = postResult === true ? result : postResult;
        }
      }
    }

    if (result && (result as CommandObject).pos === undefined) {
      (result as CommandObject).pos = maskPos;
    }

    if (result === false || validateOnly === true) {
      this.resetMaskSet(true);
      maskset.validPositions = extend(true, [], positionsClone); // revert validation changes
    } else {
      this.trackbackPositions(undefined, maskPos, true);
    }

    let endResult = processCommandObject(result);
    if (this.maxLength !== undefined) {
      const buffer = this.getBuffer();
      if (buffer.length > this.maxLength && !fromIsValid) {
        this.resetMaskSet(true);
        maskset.validPositions = extend(true, [], positionsClone); // revert validation changes
        endResult = false;
      }
    }
    return endResult as ValidationResult;
  },

  /** @upstream validation.js positionCanMatchDefinition */
  positionCanMatchDefinition(
    this: Engine,
    pos: number,
    testDefinition: ValidPosition,
    opts: ResolvedOptions,
  ): boolean | undefined {
    const { maskset } = this;

    for (const tst of this.getTests(pos)) {
      if (
        tst.match
        && ((tst.match.nativeDef
          === (opts.shiftPositions ? testDefinition.match.def : testDefinition.match.nativeDef)
          && (!opts.shiftPositions || !testDefinition.match.static))
          || tst.match.nativeDef === testDefinition.match.nativeDef
          || (opts.regex
            && !tst.match.static
            && (tst.match.fn as MatchValidator).test(
              testDefinition.input,
              maskset,
              pos,
              false,
              opts,
            )))
      ) {
        return true;
      }
      if (tst.match && tst.match.def === testDefinition.match.nativeDef) {
        return undefined;
      }
    }

    if (maskset.jitOffset[pos] !== undefined) {
      return this.positionCanMatchDefinition(
        pos + (maskset.jitOffset[pos] as number),
        testDefinition,
        opts,
      );
    }
    return false;
  },

  /** @upstream validation.js refreshFromBuffer */
  refreshFromBuffer(
    this: Engine,
    start: number | true,
    end: number | undefined,
    buffer: (string | number)[],
  ): void {
    const { maskset, opts } = this;
    const { skipOptionalPartCharacter } = opts;
    const bffr = this.isRTL ? buffer.slice().reverse() : buffer;
    let from: number;
    let to: number | undefined;
    let p: number | undefined;

    opts.skipOptionalPartCharacter = '';
    if (start === true) {
      this.resetMaskSet(false);
      from = 0;
      to = buffer.length;
      p = (this.determineNewCaretPosition({ begin: 0, end: 0 }, false) as CaretPosition).begin;
    } else {
      from = start;
      to = end;
      for (let i = from; i < (to as number); i += 1) {
        delete maskset.validPositions[i];
      }
      p = start;
    }

    const keypress: MaskEvent = createEvent('keypress');
    for (let i = from; i < (to as number); i += 1) {
      keypress.key = bffr[i].toString();
      this.ignorable = false; // make sure ignorable is ignored ;-)
      const valResult = this.keypressEvent(keypress, true, false, false, p);
      if (valResult !== false && valResult !== undefined) {
        p = (valResult as CommandObject).forwardPosition;
      }
    }

    opts.skipOptionalPartCharacter = skipOptionalPartCharacter;
  },

  /** @upstream validation.js trackbackPositions */
  trackbackPositions(
    this: Engine,
    originalPos: number | undefined,
    newPos: number,
    fillOnly?: boolean,
  ): ValidationResult | undefined {
    // fill in best positions according the current input
    const { maskset } = this;

    let firstPos = originalPos;
    if (firstPos === undefined) {
      // find previous valid
      for (firstPos = newPos - 1; firstPos > 0; firstPos -= 1) {
        if (maskset.validPositions[firstPos]) break;
      }
    }

    for (let ps = firstPos; ps < newPos; ps += 1) {
      if (maskset.validPositions[ps] === undefined && !this.isMask(ps, false)) {
        const vp = looseEquals(ps, 0) ? this.getTest(ps) : maskset.validPositions[ps - 1];
        if (vp) {
          const tests = this.getTests(ps).slice();
          if (tests[tests.length - 1].match.def === '') tests.pop();
          const bestMatch = this.determineTestTemplate(ps, tests);
          const np = maskset.validPositions[ps + 1];
          if (
            bestMatch
            && (bestMatch.match.jit !== true
              || (bestMatch.match.newBlockMarker === 'master'
                && np
                && np.match.optionalQuantifier === true))
          ) {
            const filler: ValidPosition = extend({}, bestMatch, {
              input: this.getPlaceholder(ps, bestMatch.match, true) || bestMatch.match.def,
            });
            filler.generatedInput = true;
            this.revalidateMask(ps, filler, true);

            if (fillOnly !== true) {
              // revalidate the new position to update the locator value
              const cvpInput = (maskset.validPositions[newPos] as ValidPosition).input;
              maskset.validPositions[newPos] = undefined;
              return this.isValidPosition(newPos, cvpInput, true, true);
            }
          }
        }
      }
    }
    return undefined;
  },

  /** @upstream validation.js revalidateMask */
  revalidateMask(
    this: Engine,
    pos: number | CaretPosition,
    validTest?: ValidPosition,
    fromIsValid?: boolean,
    validatedPos?: number,
  ): number | false {
    const { maskset, opts } = this;
    // A number has no `begin` or `end`: every read of them gives undefined.
    const range = pos as CaretPosition;

    let offset = 0;
    let begin = range.begin !== undefined ? range.begin : (pos as number);
    let end = range.end !== undefined ? range.end : (pos as number);
    let valid = true;
    if (range.begin > range.end) {
      begin = range.end;
      end = range.begin;
    }

    const validatedAt = validatedPos !== undefined ? validatedPos : begin;
    if (
      fromIsValid === undefined
      && (begin !== end
        || (opts.insertMode && maskset.validPositions[validatedAt] !== undefined)
        || validTest === undefined
        || validTest.match.optionalQuantifier
        || validTest.match.optionality)
    ) {
      // reposition & revalidate others
      const positionsClone = extend(true, [], maskset.validPositions);
      const lvp = this.getLastValidPosition(undefined, true);
      maskset.p = begin; // needed for alternated position after overtype selection

      const clearpos = this.isSelection(pos) ? begin : validatedAt;
      for (let i = lvp; i >= clearpos; i -= 1) {
        maskset.validPositions.splice(i, 1);
        if (validTest === undefined) delete maskset.tests[i + 1];
      }

      let j = validatedAt;
      let posMatch = j;

      if (validTest) {
        maskset.validPositions[validatedAt] = extend(true, {}, validTest);
        posMatch += 1;
        j += 1;
      }

      if (positionsClone[end] == null && maskset.jitOffset[end]) {
        end += (maskset.jitOffset[end] as number) + 1;
      }
      for (let i = validTest ? end : end - 1; i <= lvp; i += 1) {
        const t = positionsClone[i];
        if (
          t !== undefined
          && t.generatedInput !== true
          && (i >= end || (i >= begin && isEnclosedStatic(i, positionsClone, { begin, end })))
        ) {
          // loop needed to match further positions
          while (this.getTest(posMatch).match.def !== '') {
            const canMatch = this.positionCanMatchDefinition(posMatch, t, opts);
            if (canMatch !== false || t.match.def === '+') {
              // validated match; the + validator of the numeric alias still needs some hackery
              if (t.match.def === '+') this.getBuffer(true);
              const result = this.isValidPosition(posMatch, t.input, t.match.def !== '+', true);
              valid = result !== false;
              // `false` has no `pos`.
              j = ((result as CommandObject).pos || posMatch) + 1;
              if (!valid && canMatch) break;
            } else {
              valid = false;
            }
            if (valid) {
              if (validTest === undefined && t.match.static && i === range.begin) offset += 1;
              break;
            }
            // Building the buffer sets `maskLength`, which is read next.
            this.getBuffer();
            if (posMatch > (maskset.maskLength as number)) break;
            posMatch += 1;
          }
          if (looseEquals(this.getTest(posMatch).match.def, '')) {
            valid = false;
          }
          // restore position
          posMatch = j;
        }
        if (!valid) break;
      }
      if (!valid) {
        maskset.validPositions = extend(true, [], positionsClone);
        this.resetMaskSet(true);
        return false;
      }
    } else if (validTest && this.getTest(validatedAt).match.cd === validTest.match.cd) {
      maskset.validPositions[validatedAt] = extend(true, {}, validTest);
    }

    this.resetMaskSet(true);
    return offset;
  },
};

export type ValidationMethods = typeof validationMethods;
