import {
  blur, chars, click, focus, interactive, mask, press, select, setValue, staticCase, staticFamily,
  text, typingFamily,
} from '../scenario';

import type { MaskOptions, Scenario } from '../types';

/**
 * The datetime alias. In this upstream version `MM` is the month and `mm` the
 * minutes, so `dd/mm/yyyy` is day, minutes, year; it is here because this
 * library's own `date-br` alias is written that way.
 *
 * The harness pins the clock to 2030-06-15T12:00Z, which is what "this year"
 * and "today" mean below.
 */

const VALUES = [
  '',
  '1',
  '15',
  '1506',
  '15062024',
  '15/06/2024',
  '31/02/2024',
  '29/02/2024',
  '29/02/2023',
  '32/01/2024',
  '00/00/0000',
  '15/13/2024',
  '15/45/2024',
  '2024-06-15',
  '20240615',
  '1530',
  '15:30',
  '25:61',
  '0930PM',
  '09:30 PM',
  '150620',
  '15.06.24',
  'abc',
  '15 Jun 2024',
  'June 15, 2024',
  '1/1/2024',
  '2024-06-15T10:20:30',
  '15/06/2031',
  '15/06/2019',
  '1/6',
  '9',
];

const FORMATS: Record<string, MaskOptions> = {
  default: { alias: 'datetime' },
  'day-month-year': { alias: 'datetime', inputFormat: 'dd/MM/yyyy' },
  'month-day-year': { alias: 'datetime', inputFormat: 'MM/dd/yyyy' },
  'year-month-day': { alias: 'datetime', inputFormat: 'yyyy-MM-dd' },
  'short-year': { alias: 'datetime', inputFormat: 'dd.MM.yy' },
  unpadded: { alias: 'datetime', inputFormat: 'd/M/yyyy' },
  'month-abbreviation': { alias: 'datetime', inputFormat: 'dd MMM yyyy' },
  'month-name': { alias: 'datetime', inputFormat: 'MMMM dd, yyyy' },
  'hours-minutes': { alias: 'datetime', inputFormat: 'HH:mm' },
  'with-seconds': { alias: 'datetime', inputFormat: 'HH:mm:ss' },
  'unpadded-time': { alias: 'datetime', inputFormat: 'H:m' },
  'twelve-hour-upper': { alias: 'datetime', inputFormat: 'hh:mm TT' },
  'twelve-hour-lower': { alias: 'datetime', inputFormat: 'hh:mm t' },
  'date-and-time': { alias: 'datetime', inputFormat: 'dd/MM/yyyy HH:mm' },
  'iso-date': { alias: 'datetime', inputFormat: 'isoDate' },
  'iso-time': { alias: 'datetime', inputFormat: 'isoTime' },
  'iso-date-time': { alias: 'datetime', inputFormat: 'isoDateTime' },
  'uppercase-aliases': { alias: 'datetime', inputFormat: 'DD/MM/YYYY' },
  'minutes-as-month': { alias: 'datetime', inputFormat: 'dd/mm/yyyy' },
  milliseconds: { alias: 'datetime', inputFormat: 'HH:mm:ss.l' },
  'dynamic-hours': { alias: 'datetime', inputFormat: 'H3:mm' },
  'optional-seconds': { alias: 'datetime', inputFormat: 'HH:mm[:ss]' },
};

const OPTIONS: Record<string, MaskOptions> = {
  'min-max': {
    alias: 'datetime', inputFormat: 'dd/MM/yyyy', min: '01/01/2020', max: '31/12/2030',
  },
  'min-only': { alias: 'datetime', inputFormat: 'dd/MM/yyyy', min: '10/06/2024' },
  'max-only': { alias: 'datetime', inputFormat: 'dd/MM/yyyy', max: '20/06/2024' },
  'time-range': {
    alias: 'datetime', inputFormat: 'HH:mm', min: '08:00', max: '18:00',
  },
  'output-format': { alias: 'datetime', inputFormat: 'dd/MM/yyyy', outputFormat: 'yyyy-MM-dd' },
  'display-format': { alias: 'datetime', inputFormat: 'dd/MM/yyyy', displayFormat: 'dd MMM yyyy' },
  'placeholder-char': { alias: 'datetime', inputFormat: 'dd/MM/yyyy', placeholder: '_' },
  'placeholder-format': { alias: 'datetime', inputFormat: 'dd/MM/yyyy', placeholder: 'dd/mm/yyyy' },
  'no-prefill-year': { alias: 'datetime', inputFormat: 'dd/MM/yyyy', prefillYear: false },
  'repeat-2': { alias: 'datetime', inputFormat: 'HH:mm ', repeat: 2 },
  'jit-masking': { alias: 'datetime', inputFormat: 'dd/MM/yyyy', jitMasking: true },
  'auto-unmask': { alias: 'datetime', inputFormat: 'dd/MM/yyyy', autoUnmask: true },
  'clear-incomplete': { alias: 'datetime', inputFormat: 'dd/MM/yyyy', clearIncomplete: true },
};

const TYPED: Record<string, string> = {
  digits: '15062024',
  'with-separators': '15/06/2024',
  'day-overflow': '4506',
  'leap-day': '29022024',
  'not-a-leap-year': '29022023',
  'this-century': '150620',
  letters: '1a5b',
  'single-digits': '1/6/24',
};

const TYPING_MASKS: Record<string, MaskOptions> = {
  'day-month-year': FORMATS['day-month-year'],
  'month-day-year': FORMATS['month-day-year'],
  'year-month-day': FORMATS['year-month-day'],
  unpadded: FORMATS['unpadded'],
  'minutes-as-month': FORMATS['minutes-as-month'],
  'min-max': OPTIONS['min-max'],
  'no-prefill-year': OPTIONS['no-prefill-year'],
};

const TIMES: Record<string, string> = {
  digits: '0930',
  'hour-overflow': '2561',
  'with-colon': '9:5',
  afternoon: '1145p',
};

const TIME_MASKS: Record<string, MaskOptions> = {
  'hours-minutes': FORMATS['hours-minutes'],
  'unpadded-time': FORMATS['unpadded-time'],
  'twelve-hour-upper': FORMATS['twelve-hour-upper'],
  'with-seconds': FORMATS['with-seconds'],
  'time-range': OPTIONS['time-range'],
};

export const scenarios: Scenario[] = [
  ...staticFamily('datetime/static', FORMATS, VALUES),
  ...staticFamily('datetime/static', OPTIONS, VALUES),
  ...typingFamily('datetime/typing', TYPING_MASKS, TYPED),
  ...typingFamily('datetime/typing-time', TIME_MASKS, TIMES),

  // The alias keeps a module-level flag that the first parsed date turns on
  // for good. These run on a module nothing has touched yet, so they see a
  // time mask the way a page with no date mask does.
  staticCase('datetime/fresh/time-only-static', { alias: 'datetime', inputFormat: 'HH:mm' }, VALUES, { fresh: true }),
  interactive('datetime/fresh/time-only-typing', { alias: 'datetime', inputFormat: 'HH:mm' }, [
    mask(), focus(), chars('2561'), press('Backspace'), chars('9'), blur(),
  ], { fresh: true }),
  interactive('datetime/fresh/date-after-time', { alias: 'datetime', inputFormat: 'HH:mm' }, [
    mask(), focus(), chars('0930'), blur(),
    mask({ alias: 'datetime', inputFormat: 'dd/MM/yyyy' }), focus(), chars('31022024'), blur(),
    mask({ alias: 'datetime', inputFormat: 'HH:mm' }), focus(), chars('2561'), blur(),
  ], { fresh: true }),

  interactive('datetime/month-names', { alias: 'datetime', inputFormat: 'dd MMM yyyy' }, [
    mask(), focus(), chars('15jun2024'), blur(), focus(), select(3, 6), chars('dec'), blur(),
  ]),
  interactive('datetime/overwrite-mode', { alias: 'datetime', inputFormat: 'dd/MM/yyyy' }, [
    mask(), focus(), chars('15062024'), click(0), chars('31'), press('ArrowRight'), text('1'),
    press('ArrowLeft'), press('Backspace'), press('Delete'), blur(),
  ]),
  interactive('datetime/today-with-ctrl-right', { alias: 'datetime', inputFormat: 'dd/MM/yyyy' }, [
    mask(), focus(), press('ArrowRight', { ctrl: true }), blur(),
  ], { env: 'unit' }),
  interactive('datetime/set-value', { alias: 'datetime', inputFormat: 'dd/MM/yyyy', outputFormat: 'yyyy-MM-dd' }, [
    mask(), setValue('15/06/2024'), focus(), press('Backspace'), press('Backspace'), blur(), setValue('99/99/9999'), setValue(''),
  ]),
  interactive('datetime/year-prefill', { alias: 'datetime', inputFormat: 'dd/MM/yyyy' }, [
    mask(), focus(), chars('150620'), blur(), focus(), press('Backspace'), press('Backspace'), chars('19'), blur(),
  ]),
  interactive('datetime/min-max-rejects', {
    alias: 'datetime', inputFormat: 'dd/MM/yyyy', min: '10/06/2024', max: '20/06/2024',
  }, [
    mask(), focus(), chars('09062024'), blur(), focus(), select(0, 10), chars('15062024'), blur(),
    focus(), select(0, 2), chars('25'), blur(),
  ]),
  interactive('datetime/am-pm', { alias: 'datetime', inputFormat: 'hh:mm TT' }, [
    mask(), focus(), chars('0930'), text('p'), press('Backspace'), text('a'), text('x'), blur(),
  ]),
  interactive('datetime/display-format-on-blur', {
    alias: 'datetime', inputFormat: 'dd/MM/yyyy', displayFormat: 'dd MMM yyyy',
  }, [
    mask(), focus(), chars('15062024'), blur(), focus(), blur(),
  ]),
];
