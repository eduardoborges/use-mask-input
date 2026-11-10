/**
 * The `datetime` alias and the day, month and ordinal names it uses.
 *
 * See `./base.ts` for the rules every alias module follows. One of them bites
 * here: the format table needs the month names when this module is evaluated,
 * and `Inputmask.prototype.i18n` is still empty at that point. The table is
 * built from the names this module exports, and `Inputmask.prototype.i18n` is
 * read only inside the functions that run later.
 */
import { escapeRegex } from '../escapeRegex';
import { trigger } from '../events';
import Inputmask from '../Inputmask';
import { keys } from '../keys';
import { looseEquals } from '../looseEquals';

import type {
  AliasRegistration,
  CommandObject,
  DateParts,
  Engine,
  I18n,
  MaskSet,
  PlaceholderFunction,
  PlaceholderMap,
  ResolvedOptions,
  ValidationResult,
} from '../types';

/** A part of a date that a format code reads and writes. */
type DatePart =
  | 'day'
  | 'month'
  | 'year'
  | 'hours'
  | 'minutes'
  | 'seconds'
  | 'milliseconds'
  | 'ampm'
  | 'Z';

/** The same part as it was typed, placeholders included. */
type RawDatePart = `raw${DatePart}`;

/**
 * Reads or writes one part of a date. `this` is the date.
 *
 * They are declared as methods so the built-in setters of `Date` fit: those
 * are typed for a number, and the alias hands them the text it parsed.
 */
interface DateAccessors {
  set(this: Date, value: string | number): unknown;
  get(this: Date): string | number;
}

type DateSetter = DateAccessors['set'];
type DateGetter = DateAccessors['get'];

/**
 * One row of the format table: `[pattern, setter, part, getter, length]`.
 * Only the pattern is always there. In the `hx` and `Hx` rows the pattern and
 * the getter are functions of the digit count written in the format (`H2`).
 */
type FormatCode = [
  pattern: string | ((digits: string) => string),
  setter?: DateSetter,
  part?: DatePart,
  getter?: DateGetter | ((digits: string) => DateGetter),
  length?: number,
];

/** What `getTokenMatch` finds for a buffer position. */
interface TokenMatch {
  /** Buffer position at which the token starts. */
  targetMatchIndex: number;
  /** The token after it, or `null` when the format ends there. */
  nextMatch: RegExpExecArray | null;
  /** The format token that covers the position. */
  targetMatch: RegExpExecArray | undefined;
}

/** A date to render: a parsed one, or a bare `{ date }`. */
interface DateSource extends Partial<Record<RawDatePart, string>> {
  date: Date;
}

/**
 * Radix for `parseInt` that leaves the choice to the text, as a call without
 * a radix does: 16 after a `0x` prefix, 10 otherwise.
 */
const RADIX_FROM_TEXT = 0;

/** Short names first, then the full ones. */
const dayNames = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** Short names first, then the full ones. */
const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const ordinalSuffix = ['st', 'nd', 'rd', 'th'];

/** The names in use. They live on the prototype, where a caller can change them. */
function i18n(): I18n {
  return Inputmask.prototype.i18n as I18n;
}

const shortMonthNames = (): string[] => i18n().monthNames.slice(0, 12);
const fullMonthNames = (): string[] => i18n().monthNames.slice(12, 24);

/** Position of a month name in `names`, whatever its case. `-1` when it is not there. */
function monthIndex(names: string[], name: string): number {
  return names.findIndex((item) => name.toLowerCase() === item.toLowerCase());
}

const rawKey = (part: DatePart): RawDatePart => `raw${part}`;

/**
 * Pads with zeros, on the left unless `right` is set.
 *
 * @upstream extensions/inputmask.date.extensions.js pad
 */
function pad(val: string | number, len?: number | string, right?: boolean): string {
  let text = String(val);
  // A width read from the format (`H2`) arrives as text.
  const width = Number(len || 2);
  while (text.length < width) text = right ? `${text}0` : `0${text}`;
  return text;
}

/**
 * Moves the hours of a 12-hour clock into the half of the day `value` names.
 *
 * @upstream extensions/inputmask.date.extensions.js setAMPM
 */
function setAMPM(this: Date, value: string): void {
  const hours = this.getHours();
  if (value.toLowerCase().includes('p')) {
    this.setHours(hours + 12);
  } else if (value.toLowerCase().includes('a') && hours >= 12) {
    this.setHours(hours - 12);
  }
}

/**
 * Midnight counts as 12 here, so it reads `PM`.
 *
 * @upstream extensions/inputmask.date.extensions.js getAMPM
 */
function getAMPM(this: Date): string {
  const hours = this.getHours() || 12;
  return hours >= 12 ? 'PM' : 'AM';
}

/**
 * The zone name `Date` prints between parentheses, cut down to its initials
 * when it has more than one word.
 *
 * @upstream extensions/inputmask.date.extensions.js getTimeZoneAbbreviated
 */
function getTimeZoneAbbreviated(this: Date): string {
  // An invalid date prints no zone, and this throws.
  const zone = this.toString().match(/\((.+)\)/) as RegExpMatchArray;
  let tz = zone[1];
  if (tz.includes(' ')) {
    tz = tz.replace('-', ' ').toUpperCase();
    tz = tz
      .split(' ')
      .map(([first]) => first)
      .join('');
  }
  return tz;
}

/**
 * Turned on for good by the first date that carries a day, a month or a year,
 * and shared by every engine. Until then `isValidDate` accepts anything.
 */
let useDateObject = false;

/** Read once, when the module is evaluated. */
const currentYear = new Date().getFullYear();

/**
 * Setter of the `M` and `MM` rows: the month by its number, 1 for January.
 *
 * @upstream extensions/inputmask.date.extensions.js formatCode
 */
function setMonthFromNumber(this: Date, val: string): number {
  let mval = val ? parseInt(val, RADIX_FROM_TEXT) : 0;
  if (mval > 0) mval -= 1;
  return Date.prototype.setMonth.call(this, mval);
}

// supported codes for formatting
// https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-time-string-format
// https://docs.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings?view=netframework-4.7
// https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
/** @upstream extensions/inputmask.date.extensions.js formatCode */
const formatCode: Record<string, FormatCode> = {
  // Day of the month as digits; no leading zero for single-digit days.
  d: ['[1-9]|[12][0-9]|3[01]', Date.prototype.setDate, 'day', Date.prototype.getDate],
  // Day of the month as digits; leading zero for single-digit days.
  dd: [
    '0[1-9]|[12][0-9]|3[01]',
    Date.prototype.setDate,
    'day',
    function (this: Date): string {
      return pad(Date.prototype.getDate.call(this), 2);
    },
  ],
  // Day of the week as a three-letter abbreviation.
  ddd: [''],
  // Day of the week as its full name.
  dddd: [''],
  // Month as digits; no leading zero for single-digit months.
  M: [
    '[1-9]|1[012]',
    setMonthFromNumber,
    'month',
    function (this: Date): number {
      return Date.prototype.getMonth.call(this) + 1;
    },
  ],
  // Month as digits; leading zero for single-digit months.
  MM: [
    '0[1-9]|1[012]',
    setMonthFromNumber,
    'month',
    function (this: Date): string {
      return pad(Date.prototype.getMonth.call(this) + 1, 2);
    },
  ],
  // Month as a three-letter abbreviation.
  MMM: [
    monthNames.slice(0, 12).join('|'),
    function (this: Date, val: string): number | false {
      const mval = monthIndex(shortMonthNames(), val);
      return mval !== -1 ? Date.prototype.setMonth.call(this, mval) : false;
    },
    'month',
    function (this: Date): string {
      return shortMonthNames()[Date.prototype.getMonth.call(this)];
    },
  ],
  // Month as its full name.
  MMMM: [
    monthNames.slice(12, 24).join('|'),
    function (this: Date, val: string): number | false {
      const mval = monthIndex(fullMonthNames(), val);
      return mval !== -1 ? Date.prototype.setMonth.call(this, mval) : false;
    },
    'month',
    function (this: Date): string {
      return fullMonthNames()[Date.prototype.getMonth.call(this)];
    },
  ],
  // Year as last two digits; leading zero for years less than 10.
  yy: [
    '[0-9]{2}',
    function (this: Date, val: string): void {
      const centuryPart = new Date().getFullYear().toString().slice(0, 2);
      Date.prototype.setFullYear.call(this, Number(`${centuryPart}${val}`));
    },
    'year',
    function (this: Date): string {
      return pad(Date.prototype.getFullYear.call(this), 2);
    },
    2,
  ],
  yyyy: [
    '[0-9]{4}',
    Date.prototype.setFullYear,
    'year',
    function (this: Date): string {
      return pad(Date.prototype.getFullYear.call(this), 4);
    },
    4,
  ],
  // Hours; no leading zero for single-digit hours (12-hour clock).
  h: ['[1-9]|1[0-2]', Date.prototype.setHours, 'hours', Date.prototype.getHours],
  // Hours; leading zero for single-digit hours (12-hour clock).
  hh: [
    '0[1-9]|1[0-2]',
    Date.prototype.setHours,
    'hours',
    function (this: Date): string {
      return pad(Date.prototype.getHours.call(this), 2);
    },
  ],
  // Hours; no limit; set maximum digits
  hx: [
    (digits) => `[0-9]{${digits}}`,
    Date.prototype.setHours,
    'hours',
    (_digits) => Date.prototype.getHours,
  ],
  // Hours; no leading zero for single-digit hours (24-hour clock).
  H: ['1?[0-9]|2[0-3]', Date.prototype.setHours, 'hours', Date.prototype.getHours],
  // Hours; leading zero for single-digit hours (24-hour clock).
  HH: [
    '0[0-9]|1[0-9]|2[0-3]',
    Date.prototype.setHours,
    'hours',
    function (this: Date): string {
      return pad(Date.prototype.getHours.call(this), 2);
    },
  ],
  // Hours; no limit; set maximum digits
  Hx: [
    (digits) => `[0-9]{${digits}}`,
    Date.prototype.setHours,
    'hours',
    (digits) => function (this: Date): string {
      return pad(Date.prototype.getHours.call(this), digits);
    },
  ],
  // Minutes; no leading zero for single-digit minutes.
  m: ['[1-5]?[0-9]', Date.prototype.setMinutes, 'minutes', Date.prototype.getMinutes],
  // Minutes; leading zero for single-digit minutes.
  mm: [
    '0[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]',
    Date.prototype.setMinutes,
    'minutes',
    function (this: Date): string {
      return pad(Date.prototype.getMinutes.call(this), 2);
    },
  ],
  // Seconds; no leading zero for single-digit seconds.
  s: ['[1-5]?[0-9]', Date.prototype.setSeconds, 'seconds', Date.prototype.getSeconds],
  // Seconds; leading zero for single-digit seconds.
  ss: [
    '0[0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]',
    Date.prototype.setSeconds,
    'seconds',
    function (this: Date): string {
      return pad(Date.prototype.getSeconds.call(this), 2);
    },
  ],
  // Milliseconds. 3 digits.
  l: [
    '[0-9]{3}',
    Date.prototype.setMilliseconds,
    'milliseconds',
    function (this: Date): string {
      return pad(Date.prototype.getMilliseconds.call(this), 3);
    },
    3,
  ],
  // Milliseconds. 2 digits.
  L: [
    '[0-9]{2}',
    Date.prototype.setMilliseconds,
    'milliseconds',
    function (this: Date): string {
      return pad(Date.prototype.getMilliseconds.call(this), 2);
    },
    2,
  ],
  // Lowercase, single-character time marker string: a or p.
  t: ['[ap]', setAMPM, 'ampm', getAMPM, 1],
  // two-character time marker string: am or pm.
  tt: ['[ap]m', setAMPM, 'ampm', getAMPM, 2],
  // single-character time marker string: A or P.
  T: ['[AP]', setAMPM, 'ampm', getAMPM, 1],
  // two-character time marker string: AM or PM.
  TT: ['[AP]M', setAMPM, 'ampm', getAMPM, 2],
  // US timezone abbreviation, e.g. EST or MDT. With non-US timezones the GMT/UTC offset is returned, e.g. GMT-0500
  Z: ['.*', undefined, 'Z', getTimeZoneAbbreviated],
  // GMT/UTC timezone offset, e.g. -0500 or +0230.
  o: [''],
  // The date's ordinal suffix (st, nd, rd, or th).
  S: [''],
};

/** @upstream extensions/inputmask.date.extensions.js formatCodeAlias */
const formatCodeAlias: Record<string, string> = {
  D: 'd',
  DD: 'dd',
  DDD: 'ddd',
  DDDD: 'dddd',
  YY: 'yy',
  YYYY: 'yyyy',
  sss: 'L',
};

/** @upstream extensions/inputmask.date.extensions.js formatAlias */
const formatAlias: Record<string, string> = {
  isoDate: 'yyyy-MM-dd', // 2007-06-09
  isoTime: 'HH:mm:ss', // 17:46:21
  isoDateTime: 'yyyy-MM-dd\\THH:mm:ss', // 2007-06-09T17:46:21
  isoUtcDateTime: 'UTC:yyyy-MM-dd\\THH:mm:ss\\Z', // 2007-06-09T22:46:21Z
};

/**
 * The row of the format table for a token. For a token with a digit count
 * (`H2`) it is a copy of the `hx` or `Hx` row with the count applied.
 *
 * @upstream extensions/inputmask.date.extensions.js formatcode
 */
function formatcode(match: string): FormatCode | undefined {
  const fcMatch = formatCodeAlias[match] || match;
  const dynMatches = /\d+$/.exec(fcMatch);
  if (dynMatches) {
    // A digit that follows no `h` or `H` has no row to copy, and this throws.
    const fcode = formatCode[`${fcMatch[0]}x`].slice() as FormatCode;
    fcode[0] = (fcode[0] as (digits: string) => string)(dynMatches[0]);
    fcode[3] = (fcode[3] as (digits: string) => DateGetter)(dynMatches[0]);

    return fcode;
  }
  if (formatCode[fcMatch]) {
    return formatCode[fcMatch];
  }

  return undefined;
}

/** The pattern of a row that `formatcode` returned for a format token. */
const patternOf = (code: FormatCode): string => code[0] as string;

/**
 * The regex that splits a format into tokens. It is built once per options
 * object and kept there, `lastIndex` included: every loop over a format uses
 * that one object.
 *
 * @upstream extensions/inputmask.date.extensions.js getTokenizer
 */
function getTokenizer(opts: ResolvedOptions): RegExp {
  const options = opts;
  if (!options.tokenizer) {
    const tokens: string[] = [];
    const dyntokens: string[] = [];
    const formatCodeKeys = Object.keys(formatCode).concat(Object.keys(formatCodeAlias));

    for (const ndx of formatCodeKeys) {
      if (/\.*x$/.test(ndx)) {
        const dynToken = `${ndx[0]}\\d+`;
        if (dyntokens.indexOf(dynToken) === -1) {
          dyntokens.push(dynToken);
        }
      } else if (tokens.indexOf(ndx[0]) === -1) {
        tokens.push(ndx[0]);
      }
    }
    const dynamic = dyntokens.length > 0 ? `${dyntokens.join('|')}|` : '';
    options.tokenizer = new RegExp(`(${dynamic}${tokens.join('+|')}+)+?|.`, 'g');
  }

  return options.tokenizer;
}

/**
 * The format symbol a position stands for: its placeholder, or the symbol
 * `parse` recorded for it when a custom placeholder covers the mask.
 */
function symbolAt(
  inputmask: Engine,
  opts: ResolvedOptions,
  tokenIndex: number,
  pos: number,
): string | PlaceholderFunction | undefined {
  const placeholders = opts.placeholder as PlaceholderMap;

  return placeholders[`${tokenIndex}'${inputmask.getTest(pos).match.placeholder}`]
    || inputmask.getTest(pos).match.placeholder;
}

/**
 * Finds the format token that covers a buffer position. Without an engine it
 * counts the symbols of each token instead of the positions the mask gave it.
 *
 * @upstream extensions/inputmask.date.extensions.js getTokenMatch
 */
function getTokenMatch(
  inputmask: Engine | undefined,
  pos: number,
  opts: ResolvedOptions,
  maskset: MaskSet | undefined,
): TokenMatch {
  const tokenizer = getTokenizer(opts);
  const placeholders = opts.placeholder as PlaceholderMap;
  const format = opts.inputFormat as string;
  let calcPos = 0;
  let targetMatch: RegExpExecArray | undefined;
  let matchLength = 0;

  tokenizer.lastIndex = 0;
  let match = tokenizer.exec(format);
  while (match) {
    const token = match;
    const dynMatches = /\d+$/.exec(token[0]);
    if (dynMatches) {
      matchLength = parseInt(dynMatches[0], RADIX_FROM_TEXT);
    } else {
      const targetSymbol = token[0][0];
      let ndx = calcPos;
      if (inputmask) {
        while (symbolAt(inputmask, opts, token.index, ndx) === targetSymbol) ndx += 1;
      }
      matchLength = ndx - calcPos;
      if (matchLength === 0) matchLength = token[0].length;
    }

    calcPos += matchLength;

    if (calcPos >= pos + 1) {
      let masksetHint: string | PlaceholderFunction | undefined = '';
      const tests = maskset && maskset.tests[pos];
      if (tests) {
        const { placeholder } = tests[0].match;
        const tokenEnd = calcPos;
        const filteredPlaceholders = Object.keys(placeholders).filter((value) => {
          for (let i = token.index - 1; i < tokenEnd; i += 1) {
            if (value === `${i}'${placeholder}`) {
              return true;
            }
          }
          return false;
        });

        masksetHint = filteredPlaceholders.length > 0
          ? placeholders[filteredPlaceholders[0]]
          : placeholder;
      }
      if (token[0].indexOf(masksetHint as string) !== -1) {
        targetMatch = token;
        match = tokenizer.exec(format);
        break;
      }
    }
    match = tokenizer.exec(format);
  }

  return {
    targetMatchIndex: calcPos - matchLength,
    nextMatch: match,
    targetMatch,
  };
}

/**
 * A date split into the parts of a format, next to the `Date` built from
 * them.
 *
 * @upstream extensions/inputmask.date.extensions.js DateObject
 */
class DateObject implements DateParts {
  mask: string;

  format: string;

  opts: ResolvedOptions;

  inputmask: Engine | undefined;

  _date: Date | undefined;

  // The parts exist only once a format token has set them.
  declare day?: string;
  declare rawday?: string;
  declare month?: string;
  declare rawmonth?: string;
  declare year?: string;
  declare rawyear?: string;
  declare hours?: string;
  declare rawhours?: string;
  declare minutes?: string;
  declare rawminutes?: string;
  declare seconds?: string;
  declare rawseconds?: string;
  declare milliseconds?: string;
  declare rawmilliseconds?: string;
  declare ampm?: string;
  declare rawampm?: string;
  declare Z?: string;
  declare rawZ?: string;

  constructor(
    mask: string,
    format: string,
    opts: ResolvedOptions,
    inputmask: Engine | undefined,
  ) {
    this.mask = mask;
    this.format = format;
    this.opts = opts;
    this.inputmask = inputmask;
    this._date = new Date(1, 0, 1);
    this.initDateObject(mask, this.opts, this.inputmask);
  }

  get date(): Date {
    if (this._date === undefined) {
      this._date = new Date(1, 0, 1);
      this.initDateObject(undefined, this.opts, this.inputmask);
    }
    return this._date;
  }

  /**
   * Walks the format. With a mask it cuts the text into parts and stores
   * them; without one it applies the stored parts to the date again.
   */
  initDateObject(
    mask: string | undefined,
    opts: ResolvedOptions,
    inputmask: Engine | undefined,
  ): void {
    const tokenizer = getTokenizer(opts);
    let remaining = mask;
    let lastNdx = -1;

    tokenizer.lastIndex = 0;
    let match = tokenizer.exec(this.format);
    while (match) {
      if (match.index >= lastNdx) {
        const dynMatches = /\d+$/.exec(match[0]);
        const fcode = dynMatches ? `${match[0][0]}x` : match[0];
        let value: string | undefined;

        if (remaining !== undefined) {
          if (dynMatches) {
            // `getTokenMatch` walks the format with this same tokenizer.
            const { lastIndex } = tokenizer;
            const tokenMatch = getTokenMatch(
              inputmask,
              match.index,
              opts,
              inputmask && inputmask.maskset,
            );
            tokenizer.lastIndex = lastIndex;
            // Throws when the token is the last one of the format.
            const nextToken = (tokenMatch.nextMatch as RegExpExecArray)[0];
            value = remaining.slice(0, remaining.indexOf(nextToken));
          } else {
            const targetSymbol = match[0][0];
            let ndx = match.index;
            if (inputmask) {
              while (symbolAt(inputmask, opts, match.index, ndx) === targetSymbol) ndx += 1;
            }
            lastNdx = ndx;
            const targetMatchLength = ndx - match.index;
            value = remaining.slice(
              0,
              targetMatchLength || formatcode(fcode)?.[4] || fcode.length,
            );
          }
          remaining = remaining.slice(value.length);
        }

        if (Object.hasOwn(formatCode, fcode)) {
          const code = formatcode(fcode) as FormatCode;
          this.setValue(this, value, fcode, code[2], code[1]);
        }
      }
      match = tokenizer.exec(this.format);
    }
  }

  /** Stores a part when `value` is given, then applies the stored part to the date. */
  setValue(
    dateObj: DateObject,
    value: string | undefined,
    fcode: string,
    targetProp: DatePart | undefined,
    dateOperation: DateSetter | undefined,
  ): void {
    const parts = dateObj;
    // A row without a part name (`ddd`, `o`) still stores what it matched,
    // under the key `undefined`.
    const part = targetProp as DatePart;

    if (value !== undefined) {
      if (part === 'ampm') {
        parts[part] = value;
        parts[rawKey(part)] = value.replace(/\s/g, '_');
      } else if (part === 'month' && (fcode === 'MMM' || fcode === 'MMMM')) {
        const names = fcode === 'MMM' ? shortMonthNames() : fullMonthNames();
        const month = pad(monthIndex(names, value) + 1, 2);
        parts[part] = month === '00' ? '' : month;
        parts[rawKey(part)] = parts[part];
      } else {
        parts[part] = value.replace(/[^0-9]/g, '0');
        parts[rawKey(part)] = value.replace(/\s/g, '_');
      }
    }

    if (dateOperation !== undefined) {
      const date = parts._date as Date;
      let datavalue: string | number | undefined = parts[part];
      if (
        (part === 'day' && parseInt(String(datavalue), RADIX_FROM_TEXT) === 29)
        || (part === 'month' && parseInt(String(datavalue), RADIX_FROM_TEXT) === 2)
      ) {
        if (
          parseInt(String(parts.day), RADIX_FROM_TEXT) === 29
          && parseInt(String(parts.month), RADIX_FROM_TEXT) === 2
          && (parts.year === '' || parts.year === undefined)
        ) {
          // set temporary leap year in dateObj
          date.setFullYear(2012, 1, 29);
        }
      }
      if (part === 'day') {
        useDateObject = true;
        if (parseInt(String(datavalue), RADIX_FROM_TEXT) === 0) datavalue = 1;
      }
      if (part === 'month') useDateObject = true;
      if (part === 'year') {
        useDateObject = true;
        // Throws when the year was never stored.
        const typed = (datavalue as string).length;
        const length = (formatcode(fcode) as FormatCode)[4] as number;
        if (typed < length) datavalue = pad(datavalue as string, length, true);
      }
      if ((datavalue !== '' && !isNaN(Number(datavalue))) || part === 'ampm') {
        dateOperation.call(date, datavalue as string | number);
      }
    }
  }

  reset(): void {
    this._date = new Date(1, 0, 1);
  }

  reInit(): void {
    this._date = new Date(1, 0, 1);
    this.initDateObject(undefined, this.opts, this.inputmask);
  }
}

/**
 * Text becomes a `DateObject`. An object that already holds a `date` of its
 * own is taken as it is; a `DateObject` is not, its `date` being a getter.
 *
 * @upstream extensions/inputmask.date.extensions.js analyseMask
 */
function analyseMask(
  inputmask: Engine | undefined,
  mask: string,
  format: string,
  opts: ResolvedOptions,
): DateObject;
function analyseMask(
  inputmask: Engine | undefined,
  mask: unknown,
  format: string,
  opts: ResolvedOptions,
): DateParts | undefined;
function analyseMask(
  inputmask: Engine | undefined,
  mask: unknown,
  format: string,
  opts: ResolvedOptions,
): DateParts | undefined {
  if (typeof mask === 'string') {
    return new DateObject(mask, format, opts, inputmask);
  }
  if (mask && typeof mask === 'object' && Object.hasOwn(mask, 'date')) {
    return mask as DateParts;
  }
  return undefined;
}

/**
 * Parses a format. Without a date it returns the regex of the mask and
 * replaces `opts.placeholder` with the map of placeholders; with one it
 * returns that date written in the format.
 *
 * @upstream extensions/inputmask.date.extensions.js parse
 */
function parse(
  format: string,
  dateObjValue: DateSource | undefined,
  opts: ResolvedOptions,
): string {
  const options = opts;
  const tokenizer = getTokenizer(options);
  const placeHolder: PlaceholderMap = {};
  let mask = '';
  let ndx = 0;
  let escaped = false;

  tokenizer.lastIndex = 0;
  let match = tokenizer.exec(format);
  while (match) {
    const token = match[0];
    if (token === options.escapeChar) {
      escaped = true;
    } else {
      const fcode = escaped ? undefined : formatcode(token);
      if (dateObjValue === undefined) {
        if (fcode) {
          mask += `(${fcode[0]})`;
          // map placeholder to placeholder object and set placeholder mappings
          if (options.placeholder) {
            const placeholder = options.placeholder as string;
            const symbol = placeholder[match.index % placeholder.length];
            placeHolder[ndx] = symbol;
            // internal use of datetime alias
            placeHolder[`${match.index}'${symbol}`] = token.charAt(0);
          } else {
            placeHolder[ndx] = token.charAt(0);
          }
        } else {
          switch (token) {
            case '[':
              mask += '(';
              break;
            case ']':
              mask += ')?';
              break;
            default:
              mask += escapeRegex(token);
              placeHolder[ndx] = token.charAt(0);
          }
        }
      } else if (fcode) {
        if (fcode[3]) {
          const getFn = fcode[3] as DateGetter;
          mask += getFn.call(dateObjValue.date);
        } else if (fcode[2] && dateObjValue[rawKey(fcode[2])] !== undefined) {
          mask += dateObjValue[rawKey(fcode[2])];
        } else {
          mask += token;
        }
      } else {
        mask += token;
      }
      ndx += 1;
      escaped = false;
    }
    match = tokenizer.exec(format);
  }

  if (dateObjValue === undefined) {
    options.placeholder = placeHolder;
  }
  return mask;
}

/** @upstream extensions/inputmask.date.extensions.js importDate */
function importDate(dateObj: Date, opts: ResolvedOptions): string {
  return parse(opts.inputFormat as string, { date: dateObj }, opts);
}

/**
 * Completes a year that starts like the current one, once its first two
 * digits are typed.
 *
 * @upstream extensions/inputmask.date.extensions.js prefillYear
 */
function prefillYear(
  dateParts: DateObject,
  currentResult: CommandObject,
  opts: ResolvedOptions,
): CommandObject {
  const parts = dateParts;
  const result = currentResult;

  if (parts.year !== parts.rawyear) {
    const crrntyear = currentYear.toString();
    const enteredPart = (parts.rawyear as string).replace(/[^0-9]/g, '');
    const currentYearPart = crrntyear.slice(0, enteredPart.length);
    const currentYearNextPart = crrntyear.slice(enteredPart.length);
    if (enteredPart.length === 2 && enteredPart === currentYearPart) {
      const entryCurrentYear = new Date(currentYear, Number(parts.month) - 1, Number(parts.day));
      const max = opts.max as DateParts | null | undefined;
      if (
        looseEquals(parts.day, entryCurrentYear.getDate())
        && (!max || max.date.getTime() >= entryCurrentYear.getTime())
      ) {
        // update dateParts
        parts.date.setFullYear(currentYear);
        parts.year = crrntyear;
        // update result
        const pos = result.pos as number;
        result.insert = [
          {
            pos: pos + 1,
            c: currentYearNextPart[0],
          },
          {
            pos: pos + 2,
            c: currentYearNextPart[1],
          },
        ];
      }
    }
  }

  return result;
}

/**
 * Whether the day exists in its month. A 29th of February with an unfinished
 * year, and a 30th typed over February, are corrected instead of rejected.
 *
 * @upstream extensions/inputmask.date.extensions.js isValidDate
 */
function isValidDate(
  inputmask: Engine,
  dateParts: DateObject,
  currentResult: CommandObject,
  opts: ResolvedOptions,
): CommandObject | boolean {
  if (!useDateObject) return true;

  const parts = dateParts;
  const result = currentResult;
  const lastDayOfMonth = (): number => new Date(
    parts.date.getFullYear(),
    isFinite(Number(parts.rawmonth)) ? Number(parts.month) : parts.date.getMonth() + 1,
    0,
  ).getDate();

  if (
    parts.rawday === undefined
    || (!isFinite(Number(parts.rawday)) && lastDayOfMonth() >= Number(parts.day))
    || (looseEquals(parts.day, '29')
      && (!isFinite(Number(parts.rawyear))
        || parts.rawyear === undefined
        || parts.rawyear === ''))
    || lastDayOfMonth() >= Number(parts.day)
  ) {
    return result;
  }

  // take corrective action if possible
  const pos = result.pos as number;
  if (looseEquals(parts.day, '29')) {
    const tokenMatch = getTokenMatch(inputmask, pos, opts, inputmask.maskset);
    if (
      tokenMatch.targetMatch
      && ['yyyy', 'YYYY'].includes(tokenMatch.targetMatch[0])
      && pos - tokenMatch.targetMatchIndex === 2
    ) {
      result.remove = pos + 1;
      return result;
    }
  } else if (
    parts.date.getMonth() === 2
    && looseEquals(parts.day, '30')
    && result.c !== undefined
  ) {
    parts.day = '03';
    parts.date.setDate(3);
    parts.date.setMonth(1);
    result.insert = [
      { pos, c: '0' },
      { pos: pos + 1, c: result.c },
    ];
    result.caret = inputmask.seekNext(pos + 1);
    return result;
  }
  return false;
}

/**
 * Whether the date lies between `min` and `max`. Against `min` the parts not
 * typed yet are filled in from it, so a date that can still reach the range
 * passes.
 *
 * @upstream extensions/inputmask.date.extensions.js isDateInRange
 */
function isDateInRange(
  dateParts: DateObject,
  result: ValidationResult,
  opts: ResolvedOptions,
  maskset: MaskSet,
  _fromCheckval: boolean | undefined,
): ValidationResult {
  if (!result) return result;

  const min = opts.min as DateParts | null | undefined;
  const max = opts.max as DateParts | null | undefined;
  let inRange: ValidationResult = result;

  if (min) {
    if (!isNaN(min.date.getTime())) {
      const tokenizer = getTokenizer(opts);
      const format = opts.inputFormat as string;

      dateParts.reset();
      tokenizer.lastIndex = 0;
      let match = tokenizer.exec(format);
      while (match) {
        const fcode = formatcode(match[0]);
        if (fcode && fcode[3]) {
          // Read without guards: a part that `min` or the typed date lacks throws below.
          const setFn = fcode[1] as DateSetter;
          const part = fcode[2] as DatePart;
          const current = dateParts[part] as string;
          const minVal = min[part] as string;
          const maxVal = max ? max[part] : minVal + 1;
          let curVal: string[] = [];
          let forceCurrentValue = false;
          for (let i = 0; i < minVal.length; i += 1) {
            if (maskset.validPositions[i + match.index] === undefined && !forceCurrentValue) {
              if (i + match.index === 0 && current[i] < minVal[i]) {
                curVal[i] = current[i];
                forceCurrentValue = true;
              } else {
                curVal[i] = minVal[i];
              }
              // ADD +1 to whole
              if (part === 'year' && current.length - 1 === i && !looseEquals(minVal, maxVal)) {
                curVal = (parseInt(curVal.join(''), RADIX_FROM_TEXT) + 1).toString().split('');
              }
              if (
                part === 'ampm'
                && !looseEquals(minVal, maxVal)
                && min.date.getTime() > dateParts.date.getTime()
              ) {
                curVal[i] = (maxVal as string)[i];
              }
            } else {
              curVal[i] = current[i];
              forceCurrentValue = forceCurrentValue || current[i] > minVal[i];
            }
          }

          setFn.call(dateParts._date as Date, curVal.join(''));
        }
        match = tokenizer.exec(format);
      }

      inRange = min.date.getTime() <= dateParts.date.getTime();
      dateParts.reInit();
    }
  }

  if (inRange && max) {
    if (!isNaN(max.date.getTime())) {
      inRange = max.date.getTime() >= dateParts.date.getTime();
    }
  }
  return inRange;
}

/**
 * The row of a token of two symbols or more that starts at `index`, when the
 * match found one there.
 */
function codeStartingAt(tokenMatch: TokenMatch, index: number): FormatCode | undefined {
  const { targetMatch, targetMatchIndex } = tokenMatch;

  return targetMatch && targetMatchIndex === index && targetMatch[0].length > 1
    ? formatcode(targetMatch[0])
    : undefined;
}

/**
 * What a whole row of the format table accepts when it is used as a regex.
 * Inputmask does that in one place: it hands `RegExp` the row, which is first
 * joined into text, the source of its functions included. Three things can
 * come out of it:
 *
 * - a row that is only a pattern stays that pattern;
 * - the AM/PM rows accept anything, because the `||` in the source of their
 *   getter reads as an empty alternative;
 * - any other row loses the last alternative of its pattern, which now runs
 *   on into the source of the setter.
 *
 * The outcome is spelled out here because the source of a function does not
 * survive a build.
 */
function entryPattern(code: FormatCode): string {
  if (code.length === 1) return patternOf(code);
  if (code[3] === getAMPM) return '';

  return `${patternOf(code)},(?!)`;
}

// Hooks declare every parameter Inputmask's own have, used or not, so their
// `length` is the same.

/** @upstream extensions/inputmask.date.extensions.js, extensions/inputmask.date.i18n.js */
export const datetimeAliases: AliasRegistration = {
  i18n: {
    dayNames,
    monthNames,
    ordinalSuffix,
  },
  aliases: {
    datetime: {
      mask(opts) {
        const options = opts;
        // do not allow numeric input in datetime alias
        options.numericInput = false;

        // localize
        // The joined names take the place of the row, so every later read of
        // the `S` row by index yields one character of that text.
        formatCode.S = i18n().ordinalSuffix.join('|') as unknown as FormatCode;

        // resolve possible formatAlias
        options.inputFormat = formatAlias[options.inputFormat as string] || options.inputFormat;
        if (options.repeat) {
          options.repeat = parseInt(options.repeat.toString(), RADIX_FROM_TEXT);
          if (options.repeat > 0) {
            let inputFormat = '';
            for (let i = 0; i < options.repeat; i += 1) {
              inputFormat += options.inputFormat;
            }
            options.inputFormat = inputFormat;
            options.repeat = 0;
          }
        }
        options.displayFormat = formatAlias[options.displayFormat as string]
          || options.displayFormat
          || options.inputFormat;
        options.outputFormat = formatAlias[options.outputFormat as string]
          || options.outputFormat
          || options.inputFormat;
        options.regex = parse(options.inputFormat as string, undefined, options);
        options.min = analyseMask(undefined, options.min, options.inputFormat as string, options);
        options.max = analyseMask(undefined, options.max, options.inputFormat as string, options);
        return null; // migrate to regex mask
      },
      placeholder: '', // set default as none (~ auto); when a custom placeholder is passed it will be used
      inputFormat: 'isoDateTime', // format used to input the date
      displayFormat: null, // visual format when the input looses focus
      outputFormat: null, // unmasking format
      min: null, // needs to be in the same format as the inputfornat
      max: null, // needs to be in the same format as the inputfornat,
      skipOptionalPartCharacter: '',
      preValidation(buffer, pos, c, _isSelection, opts, maskset, _caretPos, strict) {
        if (strict) return true;

        const chars = buffer;
        if (isNaN(Number(c)) && chars[pos] !== c) {
          const tokenMatch = getTokenMatch(this, pos, opts, maskset);
          if (
            tokenMatch.nextMatch
            && tokenMatch.nextMatch[0] === c
            && (tokenMatch.targetMatch as RegExpExecArray)[0].length > 1
          ) {
            // A separator typed after one digit: the digit moves right and a zero goes in front.
            const targetToken = (tokenMatch.targetMatch as RegExpExecArray)[0];
            const validator = patternOf(formatcode(targetToken) as FormatCode);
            if (new RegExp(validator).test(`0${chars[pos - 1]}`)) {
              chars[pos] = chars[pos - 1];
              chars[pos - 1] = '0';
              return {
                fuzzy: true,
                buffer: chars,
                refreshFromBuffer: { start: pos - 1, end: pos + 1 },
                pos: pos + 1,
              };
            }
          }
        }
        return true;
      },
      postValidation(buffer, pos, c, currentResult, opts, maskset, strict, fromCheckval) {
        if (strict) return true;

        const set = maskset;
        let chars = buffer;
        let position = pos;
        let current = currentResult;
        let tokenMatch: TokenMatch;

        if (current === false) {
          // try some shifting
          let validator: string | undefined;
          tokenMatch = getTokenMatch(this, position + 1, opts, set);
          let code = codeStartingAt(tokenMatch, position);
          if (code !== undefined) {
            validator = patternOf(code);
          } else {
            tokenMatch = getTokenMatch(this, position + 2, opts, set);
            code = codeStartingAt(tokenMatch, position + 1);
            if (code !== undefined) validator = entryPattern(code);
          }
          if (validator !== undefined) {
            // correct position ~ pos in front of shifted targetMatch
            position = tokenMatch.targetMatchIndex;
            if (
              set.validPositions[position + 1] !== undefined
              && new RegExp(validator).test(`${c}0`)
            ) {
              chars[position] = c;
              chars[position + 1] = '0';
              current = {
                pos: position + 2, // this will trigger a refreshfrombuffer
                caret: position + 1,
              };
            } else if (new RegExp(validator).test(`0${c}`)) {
              chars[position] = '0';
              chars[position + 1] = c;
              current = {
                pos: position + 2, // this will trigger a refreshfrombuffer
              };
            }
          }

          if (current === false) return current;
        }

        if (current.fuzzy) {
          chars = current.buffer as string[];
          position = current.pos as number;
        }

        // full validate target
        tokenMatch = getTokenMatch(this, position, opts, set);
        const target = tokenMatch.targetMatch;
        const targetCode = target && target[0] ? formatcode(target[0]) : undefined;
        if (target && targetCode !== undefined) {
          const start = tokenMatch.targetMatchIndex;
          const typed = chars.slice(start, start + target[0].length);
          const first = set.validPositions[start];
          const second = set.validPositions[start + 1];
          if (
            new RegExp(patternOf(targetCode)).test(typed.join('')) === false
            && target[0].length === 2
            && first
            && second
          ) {
            second.input = '0';
          }
          if (looseEquals(targetCode[2], 'year')) {
            const template = this.getMaskTemplate(false, 1, undefined, true);
            for (let i = position + 1; i < chars.length; i += 1) {
              chars[i] = template[i];
              set.validPositions.splice(position + 1, 1);
            }
          }
        }

        let result: ValidationResult = current;
        const dateParts = analyseMask(this, chars.join(''), opts.inputFormat as string, opts);
        if (result && !isNaN(dateParts.date.getTime())) {
          // check for a valid date ~ an invalid date returns NaN which isn't equal
          if (opts.prefillYear) result = prefillYear(dateParts, result, opts);
          result = isValidDate(this, dateParts, result, opts);
          result = isDateInRange(dateParts, result, opts, set, fromCheckval);
        }

        // A fuzzy result can come without a position.
        if (position !== undefined && result && current.pos !== position) {
          return {
            buffer: parse(opts.inputFormat as string, dateParts, opts).split(''),
            refreshFromBuffer: { start: position, end: current.pos as number },
            // correct caret position
            pos: current.caret !== undefined ? current.caret : current.pos,
          };
        }

        return result;
      },
      onKeyDown(e, _buffer, _caretPos, opts) {
        if (e.ctrlKey && e.key === keys.ArrowRight) {
          (this.inputmask as Engine)._valueSet(importDate(new Date(), opts));
          trigger(this, 'setvalue');
        }
      },
      onUnMask(maskedValue, unmaskedValue, opts) {
        // The numeric alias calls its own `onUnMask` on the options. This one
        // only ever runs on the engine.
        return unmaskedValue
          ? parse(
            opts.outputFormat as string,
            analyseMask(this as Engine, maskedValue, opts.inputFormat as string, opts),
            opts,
          )
          : (unmaskedValue as string);
      },
      casing(elem, test, pos, _validPositions) {
        const nativeDef = test.nativeDef as string;
        if (nativeDef.indexOf('[ap]') === 0) return elem.toLowerCase();
        if (nativeDef.indexOf('[AP]') === 0) return elem.toUpperCase();

        // Inputmask passes the position wrapped in an array. Property lookups
        // still resolve it, but the test resolver never matches it.
        const posBefore = this.getTest([pos - 1] as unknown as number);
        if (posBefore.match.def.indexOf('[AP]') === 0) return elem.toUpperCase();

        if (
          pos === 0
          || posBefore.input === keys.Space
          || posBefore.match.def === keys.Space
        ) {
          return elem.toUpperCase();
        }

        if (test.static && test.def === test.def.toUpperCase()) return elem.toUpperCase();

        return elem.toLowerCase();
      },
      onBeforeMask(initialValue: string | Date, opts) {
        if (Object.prototype.toString.call(initialValue) === '[object Date]') {
          return importDate(initialValue as Date, opts);
        }

        return initialValue as string;
      },
      insertMode: false,
      insertModeVisual: false,
      shiftPositions: false,
      keepStatic: false,
      inputmode: 'numeric',
      prefillYear: true, // Allows to disable prefill for datetime year.
    },
  },
};
