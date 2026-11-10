/**
 * The aliases `numeric`, `currency`, `decimal`, `integer`, `percentage` and
 * `indianns`.
 *
 * See `./base.ts` for the rules every alias module follows.
 */
import { escapeRegex } from '../escapeRegex';
import { trigger } from '../events';
import { extend } from '../extend';
import Inputmask from '../Inputmask';
import { keys } from '../keys';
import { looseEquals } from '../looseEquals';

import type {
  AliasRegistration,
  CaretPosition,
  CommandObject,
  Engine,
  MaskDefinition,
  MaskedElement,
  MaskSet,
  MaskTest,
  ResolvedOptions,
} from '../types';

/**
 * The options of a numeric mask: everything the `numeric` alias defines is
 * there, and the placeholder is text.
 *
 * `digits`, `min`, `max` and `step` hold a number or text. Inputmask hands
 * them to its arithmetic and comparisons as they are and lets the operators
 * convert them. The `as number` casts below keep it that way: they tell the
 * compiler to allow the operator and change no value.
 */
interface NumericOptions extends ResolvedOptions {
  placeholder: string;
  definitions: Record<string, MaskDefinition>;
  onUnMask: NonNullable<ResolvedOptions['onUnMask']>;
  _mask: NonNullable<ResolvedOptions['_mask']>;
  digits: number | string;
  digitsOptional: boolean;
  enforceDigitsOnBlur: boolean;
  allowMinus: boolean;
  negationSymbol: { front: string; back: string };
  prefix: string;
  suffix: string;
  /** Numbers once `parseMinMaxOptions` has run. */
  min: number | string | null;
  max: number | string | null;
  SetMaxOnOverflow: boolean;
  step: number | string;
  inputType: 'text' | 'number';
  unmaskAsNumber: boolean;
  roundingFN: (input: number) => number;
  shortcuts: Record<string, string> | null;
  stripLeadingZeroes: boolean;
  substituteRadixPoint: boolean;
}

type NativeValueGetter = NonNullable<Engine['__valueGet']>;
type NativeValueSetter = NonNullable<Engine['__valueSet']>;

/**
 * Radix for `parseInt` that leaves the choice to the text, as a call without
 * a radix does: 16 after a `0x` prefix, 10 otherwise.
 */
const RADIX_FROM_TEXT = 0;

// `isNaN` and `isFinite` convert what they are given to a number first.
// Inputmask counts on that for options and characters held as text, and
// TypeScript declares the two for numbers only.
const looseIsNaN = isNaN as (value: unknown) => boolean;
const looseIsFinite = isFinite as (value: unknown) => boolean;

/**
 * Escapes the characters of `txt` that the mask parser would read as a
 * definition or as mask syntax.
 *
 * @upstream extensions/inputmask.numeric.extensions.js autoEscape
 */
function autoEscape(txt: string, opts: NumericOptions): string {
  let escapedTxt = '';
  for (let i = 0; i < txt.length; i += 1) {
    const char = txt.charAt(i);
    if (
      Inputmask.prototype.definitions[char]
      || opts.definitions[char]
      || opts.optionalmarker[0] === char
      || opts.optionalmarker[1] === char
      || opts.quantifiermarker[0] === char
      || opts.quantifiermarker[1] === char
      || opts.groupmarker[0] === char
      || opts.groupmarker[1] === char
      || opts.alternatormarker === char
    ) {
      escapedTxt += `\\${char}`;
    } else {
      escapedTxt += char;
    }
  }
  return escapedTxt;
}

/**
 * Fills the decimal part of `buffer` with zeroes up to `digits`, adding the
 * radix point when it is missing. Changes `buffer` and returns it.
 *
 * @upstream extensions/inputmask.numeric.extensions.js alignDigits
 */
function alignDigits(
  buffer: (string | number)[],
  digits: number | string,
  opts: NumericOptions,
  force?: boolean,
): (string | number)[] {
  const aligned = buffer;
  // `'*'` and a `'min,max'` range compare as false and add nothing.
  const count = digits as number;
  let negationBack = false;

  if (aligned.length > 0 && count > 0 && (!opts.digitsOptional || force)) {
    let radixPosition = aligned.indexOf(opts.radixPoint);
    if (opts.negationSymbol.back === aligned[aligned.length - 1]) {
      negationBack = true;
      aligned.length -= 1;
    }

    if (radixPosition === -1) {
      aligned.push(opts.radixPoint);
      radixPosition = aligned.length - 1;
    }
    for (let i = 1; i <= count; i += 1) {
      if (!looseIsFinite(aligned[radixPosition + i])) {
        aligned[radixPosition + i] = '0';
      }
    }
  }

  if (negationBack) aligned.push(opts.negationSymbol.back);
  return aligned;
}

/**
 * The first position at or after the caret whose tests hold `symbol`.
 *
 * @upstream extensions/inputmask.numeric.extensions.js findValidator
 */
function findValidator(this: Engine, symbol: string, maskset: MaskSet): number {
  let posNdx = 0;
  if (symbol === '+') {
    posNdx = this.seekNext(maskset.validPositions.length - 1);
  }
  for (const key in maskset.tests) {
    if (parseInt(key, RADIX_FROM_TEXT) >= posNdx) {
      const tstNdx = parseInt(key, RADIX_FROM_TEXT);
      for (const test of maskset.tests[tstNdx] as MaskTest[]) {
        if (
          (maskset.validPositions[tstNdx] === undefined || symbol === '-')
          && test.match.def === symbol
        ) {
          return tstNdx + (maskset.validPositions[tstNdx] !== undefined && symbol !== '-' ? 1 : 0);
        }
      }
    }
  }
  return posNdx;
}

/**
 * The first valid position that holds `symbol`, or -1.
 *
 * @upstream extensions/inputmask.numeric.extensions.js findValid
 */
function findValid(symbol: string, maskset: MaskSet): number {
  for (let ndx = 0, vpl = maskset.validPositions.length; ndx < vpl; ndx += 1) {
    const tst = maskset.validPositions[ndx];
    if (tst && tst.match.def === symbol) return ndx;
  }
  return -1;
}

/**
 * Turns `min` and `max` into numbers, once per options object.
 *
 * @upstream extensions/inputmask.numeric.extensions.js parseMinMaxOptions
 */
function parseMinMaxOptions(options: NumericOptions): void {
  const opts = options;

  if (opts.parseMinMaxOptions === undefined) {
    if (opts.min !== null) {
      opts.min = opts.min
        .toString()
        .replace(new RegExp(escapeRegex(opts.groupSeparator), 'g'), '');
      if (opts.radixPoint === ',') opts.min = opts.min.replace(opts.radixPoint, '.');
      opts.min = looseIsFinite(opts.min) ? parseFloat(opts.min) : NaN;
      if (isNaN(opts.min)) opts.min = Number.MIN_VALUE;
    }
    if (opts.max !== null) {
      opts.max = opts.max
        .toString()
        .replace(new RegExp(escapeRegex(opts.groupSeparator), 'g'), '');
      if (opts.radixPoint === ',') opts.max = opts.max.replace(opts.radixPoint, '.');
      opts.max = looseIsFinite(opts.max) ? parseFloat(opts.max) : NaN;
      if (isNaN(opts.max)) opts.max = Number.MAX_VALUE;
    }
    opts.parseMinMaxOptions = 'done';
  }
}

/**
 * Builds the mask of a numeric alias from its options, and settles the
 * options that depend on one another on the way.
 *
 * @upstream extensions/inputmask.numeric.extensions.js genMask
 */
function genMask(options: ResolvedOptions): string | string[] {
  const opts = options as NumericOptions;

  opts.repeat = 0;
  // the group separator cannot be the radix point
  if (
    opts.groupSeparator === opts.radixPoint
    && opts.digits
    && opts.digits !== '0'
  ) {
    if (opts.radixPoint === '.') {
      opts.groupSeparator = ',';
    } else if (opts.radixPoint === ',') {
      opts.groupSeparator = '.';
    } else {
      opts.groupSeparator = '';
    }
  }
  // a space would be taken for the character that skips an optional part
  if (opts.groupSeparator === ' ') {
    opts.skipOptionalPartCharacter = undefined;
  }

  // the placeholder is a single character
  if (opts.placeholder.length > 1) {
    opts.placeholder = opts.placeholder.charAt(0);
  }
  // radixFocus only works with a placeholder
  if (opts.positionCaretOnClick === 'radixFocus' && opts.placeholder === '') {
    opts.positionCaretOnClick = 'lvp';
  }

  let decimalDef = '0';
  let radixPointDef = opts.radixPoint;
  if (opts.numericInput === true && opts.__financeInput === undefined) {
    // finance style: digits come in at the right end and push the others left
    decimalDef = '1';
    opts.positionCaretOnClick = opts.positionCaretOnClick === 'radixFocus'
      ? 'lvp'
      : opts.positionCaretOnClick;
    opts.digitsOptional = false;
    if (looseIsNaN(opts.digits)) {
      // Text gets here: `'*'`, or a `'min,max'` range, which keeps its minimum.
      opts.digits = (opts.digits as string).indexOf(',') !== -1
        ? (opts.digits as string).split(',')[0]
        : 2;
    }
    opts._radixDance = false;
    radixPointDef = opts.radixPoint === ',' ? '?' : '!';
    if (opts.radixPoint !== '' && opts.definitions[radixPointDef] === undefined) {
      opts.definitions[radixPointDef] = {
        validator: `[${opts.radixPoint}]`,
        placeholder: opts.radixPoint,
        static: true,
        generated: true, // counts as generated input
      };
    }
  } else {
    // remembered, so masking the element again keeps the choice made here
    opts.__financeInput = false;
    opts.numericInput = true;
  }

  let mask = '[+]';
  let altMask: string | undefined;
  mask += autoEscape(opts.prefix, opts);
  if (opts.groupSeparator !== '') {
    if (opts.definitions[opts.groupSeparator] === undefined) {
      opts.definitions[opts.groupSeparator] = {
        validator: `[${opts.groupSeparator}]`,
        placeholder: opts.groupSeparator,
        static: true,
        generated: true, // counts as generated input
      };
    }
    mask += opts._mask(opts);
  } else {
    mask += '9{+}';
  }
  if (opts.digits !== undefined && opts.digits !== 0) {
    const dq = opts.digits.toString().split(',');
    if (looseIsFinite(dq[0]) && dq[1] && looseIsFinite(dq[1])) {
      mask += `${radixPointDef}${decimalDef}{${opts.digits}}`;
    } else if (
      looseIsNaN(opts.digits)
      || parseInt(String(opts.digits), RADIX_FROM_TEXT) > 0
    ) {
      if (opts.digitsOptional || opts.jitMasking) {
        altMask = `${mask}${radixPointDef}${decimalDef}{0,${opts.digits}}`;
        opts.keepStatic = true;
      } else {
        mask += `${radixPointDef}${decimalDef}{${opts.digits}}`;
      }
    }
  } else {
    opts.inputmode = 'numeric';
  }
  mask += autoEscape(opts.suffix, opts);
  mask += '[-]';

  const masks = altMask ? [`${altMask}${autoEscape(opts.suffix, opts)}[-]`, mask] : mask;

  opts.greedy = false;

  parseMinMaxOptions(opts);
  if (opts.radixPoint !== '' && opts.substituteRadixPoint) {
    opts.substitutes[looseEquals(opts.radixPoint, '.') ? ',' : '.'] = opts.radixPoint;
  }
  return masks;
}

/**
 * Moves a position one step back while the caret dances around the radix
 * point.
 *
 * @upstream extensions/inputmask.numeric.extensions.js handleRadixDance
 */
function handleRadixDance(
  pos: number,
  c: string,
  radixPos: number,
  maskset: MaskSet,
  opts: NumericOptions,
): number {
  if (opts._radixDance && opts.numericInput && c !== opts.negationSymbol.back) {
    const previous = maskset.validPositions[pos - 1];
    if (
      pos <= radixPos
      && (radixPos > 0 || looseEquals(c, opts.radixPoint))
      && (previous === undefined || previous.input !== opts.negationSymbol.back)
    ) {
      return pos - 1;
    }
  }
  return pos;
}

/**
 * Validator of the decimal positions. A digit that arrives while the radix
 * point is still a placeholder comes back with the command that inserts it.
 *
 * @upstream extensions/inputmask.numeric.extensions.js decimalValidator
 */
function decimalValidator(
  chrs: string,
  maskset: MaskSet,
  pos: number,
  strict: boolean,
  options: ResolvedOptions,
): boolean | CommandObject {
  const opts = options as NumericOptions;
  const radixPos = maskset.buffer ? maskset.buffer.indexOf(opts.radixPoint) : -1;
  const result = (radixPos !== -1 || (strict && opts.jitMasking))
    && new RegExp(opts.definitions['9'].validator as string).test(chrs);
  if (
    !strict
    && opts._radixDance
    && radixPos !== -1
    && result
    && maskset.validPositions[radixPos] == null
  ) {
    return {
      insert: {
        pos: radixPos === pos ? radixPos + 1 : radixPos,
        c: opts.radixPoint,
      },
      pos,
    };
  }

  // Not made a boolean: with `jitMasking: 0` this is `0`, and validation does
  // not take `0` for a rejection.
  return result as boolean;
}

/**
 * Matches a rendered number in three groups: the sign and prefix, the number
 * itself, and the suffix and closing sign.
 */
function numberPartsPattern(opts: NumericOptions, hasFrontSign: boolean): RegExp {
  const front = hasFrontSign ? `${escapeRegex(opts.negationSymbol.front)}?` : '';
  const prefix = escapeRegex(opts.prefix);
  const suffix = escapeRegex(opts.suffix);
  const back = !looseEquals(opts.negationSymbol.back, '')
    ? `${escapeRegex(opts.negationSymbol.back)}?`
    : '';

  return new RegExp(`(^${front}${prefix})(.*)(${suffix}${back}$)`);
}

/**
 * The leading zeroes of the integer part when they can go, as the match that
 * found them. `buffer` is in mask order, the number reads from its end.
 *
 * @upstream extensions/inputmask.numeric.extensions.js checkForLeadingZeroes
 */
function checkForLeadingZeroes(buffer: string[], opts: NumericOptions): RegExpExecArray | false {
  const numberMatches = numberPartsPattern(opts, opts.negationSymbol.front !== '')
    .exec(buffer.slice().reverse().join(''));
  let number = numberMatches ? numberMatches[2] : '';
  let leadingzeroes: RegExpExecArray | null | false = false;
  if (number) {
    number = number.split(opts.radixPoint.charAt(0))[0];
    leadingzeroes = new RegExp(`^[0${opts.groupSeparator}]*`).exec(number);
  }
  return leadingzeroes
    && (leadingzeroes[0].length > 1
      || (leadingzeroes[0].length > 0 && leadingzeroes[0].length < number.length))
    ? leadingzeroes
    : false;
}

/**
 * Writes a number straight to the element, then has the mask take it in. The
 * native setter is called unguarded: an element without value patching has
 * none, and this throws.
 */
function writeNumber(input: MaskedElement, next: (current: number) => number): void {
  const inputmask = input.inputmask as Engine;

  (inputmask.__valueSet as NativeValueSetter).call(
    input,
    String(next(parseFloat(String(inputmask.unmaskedvalue())))),
  );
  trigger(input, 'setvalue');
}

/** @upstream extensions/inputmask.numeric.extensions.js */
export const numericAliases: AliasRegistration = {
  aliases: {
    numeric: {
      mask: genMask,
      _mask(opts) {
        return `(${opts.groupSeparator}999){+|1}`;
      },
      // number of fractional digits, `'*'` for any
      digits: '*',
      digitsOptional: true,
      enforceDigitsOnBlur: false,
      radixPoint: '.',
      positionCaretOnClick: 'radixFocus',
      _radixDance: true,
      groupSeparator: '',
      allowMinus: true,
      negationSymbol: {
        front: '-',
        back: '',
      },
      prefix: '',
      suffix: '',
      min: null,
      max: null,
      SetMaxOnOverflow: false,
      step: 1,
      // `'number'`: values set from script use `.` as the radix point
      inputType: 'text',
      unmaskAsNumber: false,
      roundingFN: Math.round,
      inputmode: 'decimal',
      shortcuts: { k: '1000', m: '1000000' },
      placeholder: '0',
      greedy: false,
      rightAlign: true,
      insertMode: true,
      autoUnmask: false,
      skipOptionalPartCharacter: '',
      usePrototypeDefinitions: false,
      stripLeadingZeroes: true,
      substituteRadixPoint: true,
      definitions: {
        0: {
          validator: decimalValidator,
        },
        1: {
          validator: decimalValidator,
          definitionSymbol: '9',
        },
        9: {
          // ASCII, full-width, Arabic-Indic and Persian digits
          validator: '[0-9\uFF10-\uFF19\u0660-\u0669\u06F0-\u06F9]',
          definitionSymbol: '*',
        },
        '+': {
          validator(chrs, _maskset, _pos, _strict, options) {
            const opts = options as NumericOptions;
            return opts.allowMinus && (chrs === '-' || chrs === opts.negationSymbol.front);
          },
        },
        '-': {
          validator(chrs, _maskset, _pos, _strict, options) {
            const opts = options as NumericOptions;
            return opts.allowMinus && chrs === opts.negationSymbol.back;
          },
        },
      },
      preValidation(buffer, pos, c, isSelection, options, maskset, caretPos, strict) {
        const opts = options as NumericOptions;

        if (opts.__financeInput !== false && c === opts.radixPoint) return false;
        const radixPos = buffer.indexOf(opts.radixPoint);
        const initPos = pos;
        const dancedPos = handleRadixDance(pos, c, radixPos, maskset, opts);
        if (c === '-' || c === opts.negationSymbol.front) {
          if (opts.allowMinus !== true) return false;
          let isNegative: number[] | false = false;
          const front = findValid('+', maskset);
          const back = findValid('-', maskset);
          if (front !== -1) {
            isNegative = [front];
            if (back !== -1) isNegative.push(back);
          }

          return isNegative !== false
            ? {
              remove: isNegative,
              caret: initPos - opts.negationSymbol.back.length,
            }
            : {
              insert: [
                {
                  pos: findValidator.call(this, '+', maskset),
                  c: opts.negationSymbol.front,
                  fromIsValid: true,
                },
                {
                  pos: findValidator.call(this, '-', maskset),
                  c: opts.negationSymbol.back,
                  fromIsValid: undefined,
                },
              ],
              caret: initPos + opts.negationSymbol.back.length,
            };
        }

        if (c === opts.groupSeparator) {
          return { caret: initPos };
        }

        if (strict) return true;
        if (
          radixPos !== -1
          && opts._radixDance === true
          && isSelection === false
          && c === opts.radixPoint
          && opts.digits !== undefined
          && (looseIsNaN(opts.digits)
            || parseInt(String(opts.digits), RADIX_FROM_TEXT) > 0)
          && radixPos !== dancedPos
        ) {
          const radixValidPosition = maskset.validPositions[
            findValidator.call(this, opts.radixPoint, maskset)
          ];
          if (radixValidPosition) {
            radixValidPosition.generatedInput = radixValidPosition.generated || false;
          }
          return {
            caret: opts._radixDance && dancedPos === radixPos - 1 ? radixPos + 1 : radixPos,
          };
        }
        if (opts.__financeInput === false) {
          if (isSelection) {
            // A selection always arrives as a caret object.
            const selection = caretPos as CaretPosition;
            if (opts.digitsOptional) {
              return { rewritePosition: selection.end };
            }
            if (selection.begin > radixPos && selection.end <= radixPos) {
              if (c === opts.radixPoint) {
                return {
                  insert: { pos: radixPos + 1, c: '0', fromIsValid: true },
                  rewritePosition: radixPos,
                };
              }
              return { rewritePosition: radixPos + 1 };
            }
            if (selection.begin < radixPos) {
              return { rewritePosition: selection.begin - 1 };
            }
          } else if (
            !opts.showMaskOnHover
            && !opts.showMaskOnFocus
            && !opts.digitsOptional
            && (opts.digits as number) > 0
            // Unguarded: an engine without an element has no native getter, and this throws.
            && (this.__valueGet as NativeValueGetter).call(this.el as MaskedElement) === ''
          ) {
            return { rewritePosition: radixPos };
          }
        }
        return { rewritePosition: dancedPos };
      },
      postValidation(
        buffer,
        _pos,
        _c,
        currentResult,
        options,
        _maskset,
        strict,
        _fromCheckval,
        fromAlternate,
      ) {
        const opts = options as NumericOptions;

        if (currentResult === false) return currentResult;
        if (strict) return true;
        if (opts.min !== null || opts.max !== null) {
          const unmasked = opts.onUnMask(
            buffer.slice().reverse().join(''),
            undefined,
            extend({}, opts, {
              unmaskAsNumber: true,
            }),
          ) as number;
          if (
            opts.min !== null
            && unmasked < (opts.min as number)
            && fromAlternate !== true
            // `>` and not `>=`: a number that is still too short can grow past the minimum
            && (unmasked.toString().length > opts.min.toString().length
              // no radix point while the value is below the minimum
              || buffer[0] === opts.radixPoint
              || unmasked < 0)
          ) {
            return false;
          }

          if (
            opts.max !== null
            && (opts.max as number) >= 0
            && unmasked > (opts.max as number)
          ) {
            return opts.SetMaxOnOverflow
              ? {
                refreshFromBuffer: true,
                buffer: alignDigits(
                  opts.max.toString().replace('.', opts.radixPoint).split(''),
                  opts.digits,
                  opts,
                ).reverse(),
              }
              : false;
          }
        }

        return currentResult;
      },
      onUnMask(maskedValue, unmaskedValue, options) {
        const opts = options as NumericOptions;

        if (unmaskedValue === '' && opts.nullable === true) {
          return unmaskedValue;
        }
        let processValue = maskedValue.replace(opts.prefix, '');
        processValue = processValue.replace(opts.suffix, '');
        processValue = processValue.replace(
          new RegExp(escapeRegex(opts.groupSeparator), 'g'),
          '',
        );
        if (opts.placeholder.charAt(0) !== '') {
          processValue = processValue.replace(
            new RegExp(opts.placeholder.charAt(0), 'g'),
            '0',
          );
        }
        if (opts.unmaskAsNumber) {
          if (opts.radixPoint !== '' && processValue.indexOf(opts.radixPoint) !== -1) {
            // The escaped radix point is searched for as text, so only one
            // that needs no escaping (`,`) is found and replaced.
            processValue = processValue.replace(escapeRegex(opts.radixPoint), '.');
          }
          processValue = processValue.replace(
            new RegExp(`^${escapeRegex(opts.negationSymbol.front)}`),
            '-',
          );
          processValue = processValue.replace(
            new RegExp(`${escapeRegex(opts.negationSymbol.back)}$`),
            '',
          );
          return Number(processValue);
        }
        return processValue;
      },
      isComplete(buffer, options) {
        const opts = options as NumericOptions;

        let maskedValue = (opts.numericInput ? buffer.slice().reverse() : buffer).join('');
        maskedValue = maskedValue.replace(
          new RegExp(`^${escapeRegex(opts.negationSymbol.front)}`),
          '-',
        );
        maskedValue = maskedValue.replace(
          new RegExp(`${escapeRegex(opts.negationSymbol.back)}$`),
          '',
        );
        maskedValue = maskedValue.replace(opts.prefix, '');
        maskedValue = maskedValue.replace(opts.suffix, '');
        maskedValue = maskedValue.replace(
          new RegExp(`${escapeRegex(opts.groupSeparator)}([0-9]{3})`, 'g'),
          '$1',
        );
        if (opts.radixPoint === ',') {
          maskedValue = maskedValue.replace(escapeRegex(opts.radixPoint), '.');
        }
        return looseIsFinite(maskedValue);
      },
      onBeforeMask(value: string | number | null | undefined, options) {
        const opts = options as NumericOptions;

        const given = value ?? '';
        const radixPoint = opts.radixPoint || ',';
        if (looseIsFinite(opts.digits)) {
          opts.digits = parseInt(String(opts.digits), RADIX_FROM_TEXT);
        }

        let initialValue = (typeof given === 'number' || opts.inputType === 'number') && radixPoint !== ''
          ? given.toString().replace('.', radixPoint)
          : (given as string);
        const isNegative = initialValue.charAt(0) === '-'
          || initialValue.charAt(0) === opts.negationSymbol.front;
        const valueParts = initialValue.split(radixPoint);
        const integerPart = valueParts[0].replace(/[^\-0-9]/g, '');
        const decimalPart = valueParts.length > 1 ? valueParts[1].replace(/[^0-9]/g, '') : '';
        const forceDigits = valueParts.length > 1;

        initialValue = integerPart + (decimalPart !== '' ? radixPoint + decimalPart : decimalPart);

        let digits: number | string = 0;
        if (radixPoint !== '') {
          if (!opts.digitsOptional) {
            digits = opts.digits;
          } else if ((opts.digits as number) < decimalPart.length) {
            digits = opts.digits;
          } else {
            digits = decimalPart.length;
          }
          if (decimalPart !== '' || !opts.digitsOptional) {
            const digitsFactor = 10 ** ((digits || 1) as number);

            // make the value a number `parseFloat` can read
            initialValue = initialValue.replace(escapeRegex(radixPoint), '.');
            if (!isNaN(parseFloat(initialValue))) {
              initialValue = (
                opts.roundingFN(parseFloat(initialValue) * digitsFactor) / digitsFactor
              ).toFixed(digits as number);
            }
            initialValue = initialValue.toString().replace('.', radixPoint);
          }
        }
        // cut here and not while splitting, so the value is rounded first
        if (opts.digits === 0 && initialValue.indexOf(radixPoint) !== -1) {
          initialValue = initialValue.substring(0, initialValue.indexOf(radixPoint));
        }

        if (initialValue !== '' && (opts.min !== null || opts.max !== null)) {
          // Compared as it is: against a number as a number, against text as text.
          const numberValue: unknown = initialValue.toString().replace(radixPoint, '.');
          if (opts.min !== null && (numberValue as number) < (opts.min as number)) {
            initialValue = opts.min.toString().replace('.', radixPoint);
          } else if (opts.max !== null && (numberValue as number) > (opts.max as number)) {
            initialValue = opts.max.toString().replace('.', radixPoint);
          }
        }

        if (isNegative && initialValue.charAt(0) !== '-') {
          initialValue = `-${initialValue}`;
        }
        return alignDigits(initialValue.toString().split(''), digits, opts, forceDigits).join('');
      },
      onBeforeWrite(e, buffer, _caretPos, options) {
        const opts = options as NumericOptions;
        // The caller's own array: what is removed here is removed for the caller too.
        const written = buffer;

        const stripBuffer = (target: string[], stripRadix?: boolean): string[] => {
          if (opts.__financeInput !== false || stripRadix) {
            const position = target.indexOf(opts.radixPoint);
            if (position !== -1) {
              target.splice(position, 1);
            }
          }
          if (opts.groupSeparator !== '') {
            let position = target.indexOf(opts.groupSeparator);
            while (position !== -1) {
              target.splice(position, 1);
              position = target.indexOf(opts.groupSeparator);
            }
          }

          return target;
        };

        let result: CommandObject | undefined;
        const leadingzeroes = opts.stripLeadingZeroes
          && checkForLeadingZeroes(written, opts);
        if (leadingzeroes) {
          const zeroes = leadingzeroes[0];
          const onlyZeroes = zeroes === leadingzeroes.input;
          const caretNdx = written.join('').lastIndexOf(zeroes.split('').reverse().join(''))
            - (onlyZeroes ? 0 : 1);
          const offset = onlyZeroes ? 1 : 0;
          for (let i = zeroes.length - offset; i > 0; i -= 1) {
            this.maskset.validPositions.splice(caretNdx + i, 1);
            delete written[caretNdx + i];
          }
        }

        if (e && (e.type === 'blur' || e.type === 'checkval')) {
          if (opts.min !== null || opts.max !== null) {
            const unmasked = opts.onUnMask(
              written.slice().reverse().join(''),
              undefined,
              extend({}, opts, {
                unmaskAsNumber: true,
              }),
            ) as number;
            // `join()` separates with commas, so only an empty buffer gives `''`.
            if (
              opts.min !== null
              && unmasked < (opts.min as number)
              && written.join() !== ''
            ) {
              return {
                refreshFromBuffer: true,
                buffer: alignDigits(
                  opts.min.toString().replace('.', opts.radixPoint).split(''),
                  opts.digits,
                  opts,
                ).reverse(),
              };
            }
            if (opts.max !== null && unmasked > (opts.max as number)) {
              return {
                refreshFromBuffer: true,
                buffer: alignDigits(
                  opts.max.toString().replace('.', opts.radixPoint).split(''),
                  opts.digits,
                  opts,
                ).reverse(),
              };
            }
          }
          if (written[written.length - 1] === opts.negationSymbol.front) {
            // drop the sign when the value is zero
            const nmbrMtchs = numberPartsPattern(
              opts,
              !looseEquals(opts.negationSymbol.front, ''),
            ).exec(stripBuffer(written.slice(), true).reverse().join(''));
            const number = nmbrMtchs ? nmbrMtchs[2] : '';
            if (looseEquals(number, 0)) {
              result = { refreshFromBuffer: true, buffer: [0] };
            }
          } else if (opts.radixPoint !== '') {
            // drop the radix point when nothing follows it
            const radixNDX = written.indexOf(opts.radixPoint);
            if (radixNDX === opts.suffix.length) {
              written.splice(0, 1 + opts.suffix.length);
              result = {
                refreshFromBuffer: true,
                buffer: stripBuffer(written),
              };
            }
          }

          if (opts.enforceDigitsOnBlur) {
            result = result || {};
            const bffr = (result.buffer || written).slice().reverse();
            result.refreshFromBuffer = true;
            result.buffer = alignDigits(bffr, opts.digits, opts, true).reverse();
          }
        }

        return result;
      },
      onKeyDown(e, buffer, caretPos, options) {
        const opts = options as NumericOptions;
        // The caller's own object until a copy takes its place further down.
        let caret = caretPos;

        if (!looseEquals(e.location, 3)) {
          const pattern = opts.shortcuts && opts.shortcuts[e.key as string];
          if (pattern && pattern.length > 1) {
            writeNumber(this, (current) => current * parseInt(pattern, RADIX_FROM_TEXT));
            return false;
          }
        }
        if (e.ctrlKey) {
          if (e.key === keys.ArrowUp) {
            writeNumber(
              this,
              (current) => current + parseInt(String(opts.step), RADIX_FROM_TEXT),
            );
            return false;
          }
          if (e.key === keys.ArrowDown) {
            writeNumber(
              this,
              (current) => current - parseInt(String(opts.step), RADIX_FROM_TEXT),
            );
            return false;
          }
        }
        if (
          !e.shiftKey
          && (e.key === keys.Delete
            || e.key === keys.Backspace
            || e.key === keys.BACKSPACE_SAFARI)
          && caret.begin !== buffer.length
        ) {
          if (
            buffer[e.key === keys.Delete ? caret.begin - 1 : caret.end]
            === opts.negationSymbol.front
          ) {
            const bffr = buffer.slice().reverse();
            if (opts.negationSymbol.front !== '') bffr.shift();
            if (opts.negationSymbol.back !== '') bffr.pop();
            trigger(this, 'setvalue', [bffr.join(''), caret.begin]);
            return false;
          }
          if (opts._radixDance === true) {
            const radixPos = buffer.indexOf(opts.radixPoint);
            if (!opts.digitsOptional) {
              if (
                radixPos !== -1
                && (caret.begin < radixPos
                  || caret.end < radixPos
                  || (e.key === keys.Delete
                    && (caret.begin === radixPos || caret.begin - 1 === radixPos)))
              ) {
                let restoreCaretPos: CaretPosition | undefined;
                if (caret.begin === caret.end) {
                  // only adjust when not a selection
                  if (e.key === keys.Backspace || e.key === keys.BACKSPACE_SAFARI) {
                    caret.begin += 1;
                  } else if (e.key === keys.Delete && caret.begin - 1 === radixPos) {
                    restoreCaretPos = extend({}, caret);
                    caret.begin -= 1;
                    caret.end -= 1;
                  }
                }
                const bffr = buffer.slice().reverse();
                bffr.splice(bffr.length - caret.begin, caret.begin - caret.end || 1);
                if (e.key === keys.Backspace || e.key === keys.BACKSPACE_SAFARI) {
                  bffr.splice(bffr.length - caret.end + 1, 0, '0');
                }
                const value = alignDigits(bffr, opts.digits, opts).join('');
                if (restoreCaretPos) {
                  caret = restoreCaretPos;
                }
                trigger(this, 'setvalue', [
                  value,
                  caret.begin >= value.length ? radixPos + 1 : caret.begin,
                ]);
                return false;
              }
            } else if (radixPos === 0) {
              const bffr = buffer.slice().reverse();
              bffr.pop();
              trigger(this, 'setvalue', [
                bffr.join(''),
                caret.begin >= bffr.length ? bffr.length : caret.begin,
              ]);
              return false;
            }
          }
        }
        return undefined;
      },
    },
    currency: {
      prefix: '',
      groupSeparator: ',',
      alias: 'numeric',
      digits: 2,
      digitsOptional: false,
    },
    decimal: {
      alias: 'numeric',
    },
    integer: {
      alias: 'numeric',
      inputmode: 'numeric',
      digits: 0,
    },
    percentage: {
      alias: 'numeric',
      min: 0,
      max: 100,
      suffix: ' %',
      digits: 0,
      allowMinus: false,
    },
    // Indian numbering system
    indianns: {
      alias: 'numeric',
      _mask(opts) {
        return `(${opts.groupSeparator}99){*|1}(${opts.groupSeparator}999){1|1}`;
      },
      groupSeparator: ',',
      radixPoint: '.',
      placeholder: '0',
      digits: 2,
      digitsOptional: false,
    },
  },
};
