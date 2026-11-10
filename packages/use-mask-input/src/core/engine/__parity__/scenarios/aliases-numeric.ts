import {
  blur, chars, click, focus, interactive, mask, paste, press, select, setValue, staticFamily,
  text, typingFamily,
} from '../scenario';

import type { MaskOptions, Scenario } from '../types';

/**
 * The numeric family: numeric, decimal, integer, currency, percentage and
 * indianns, with the options that shape them.
 */

const VALUES = [
  '',
  '0',
  '1',
  '12',
  '123',
  '1234',
  '1234567',
  '1234.5',
  '1234.56',
  '1234.567',
  '0.5',
  '.5',
  '5.',
  '-1',
  '-1234.56',
  '--5',
  '1-',
  '-',
  '1,234.56',
  '1.234,56',
  '1 234',
  '00012',
  '0.0',
  'abc',
  '1a2b3',
  '99999999999999999999',
  '1e5',
  '50%',
  '$ 100',
  '100 %',
  '12k',
  '2m',
  '-0',
  '(15)',
];

const ALIASES: Record<string, MaskOptions> = {
  numeric: { alias: 'numeric' },
  decimal: { alias: 'decimal' },
  integer: { alias: 'integer' },
  currency: { alias: 'currency' },
  percentage: { alias: 'percentage' },
  indianns: { alias: 'indianns' },
};

const OPTIONS: Record<string, MaskOptions> = {
  'prefix-suffix': { alias: 'numeric', prefix: '$ ', suffix: ' USD' },
  'group-comma': { alias: 'numeric', groupSeparator: ',' },
  'group-dot-radix-comma': { alias: 'numeric', groupSeparator: '.', radixPoint: ',' },
  'group-space': { alias: 'numeric', groupSeparator: ' ' },
  'digits-2': { alias: 'numeric', digits: 2 },
  'digits-2-required': { alias: 'numeric', digits: 2, digitsOptional: false },
  'digits-range': { alias: 'numeric', digits: '2,4' },
  'digits-0': { alias: 'numeric', digits: 0 },
  'no-radix': { alias: 'numeric', radixPoint: '' },
  'min-max': { alias: 'numeric', min: 10, max: 500 },
  'max-on-overflow': { alias: 'numeric', max: 100, SetMaxOnOverflow: true },
  'min-negative': { alias: 'numeric', min: -50, max: 50 },
  'no-minus': { alias: 'numeric', allowMinus: false },
  'negation-parentheses': { alias: 'numeric', negationSymbol: { front: '(', back: ')' } },
  'numeric-input': {
    alias: 'numeric', numericInput: true, digits: 2, digitsOptional: false,
  },
  'right-align-off': { alias: 'numeric', rightAlign: false },
  'unmask-as-number': { alias: 'numeric', unmaskAsNumber: true },
  'input-type-number': { alias: 'numeric', inputType: 'number', radixPoint: ',' },
  'rounding-floor': { alias: 'numeric', digits: 2, roundingFN: Math.floor },
  'placeholder-empty': { alias: 'numeric', placeholder: '' },
  'no-shortcuts': { alias: 'numeric', shortcuts: null },
  'keep-leading-zeroes': { alias: 'numeric', stripLeadingZeroes: false },
  'no-radix-substitute': { alias: 'numeric', substituteRadixPoint: false },
  'currency-auto-unmask': { alias: 'currency', autoUnmask: true },
  'currency-euro': {
    alias: 'currency', prefix: '€ ', groupSeparator: '.', radixPoint: ',',
  },
  'percentage-digits': { alias: 'percentage', digits: 2, max: 100 },
  'integer-grouped': { alias: 'integer', groupSeparator: ',' },
};

const TYPED: Record<string, string> = {
  integer: '1234567',
  decimal: '1234.56',
  negative: '-12.5',
  'leading-zeroes': '007',
  'minus-last': '12-',
  'radix-first': '.5',
  letters: '1a2',
  comma: '1,5',
};

const TYPING_MASKS: Record<string, MaskOptions> = {
  numeric: ALIASES.numeric,
  integer: ALIASES.integer,
  currency: ALIASES.currency,
  percentage: ALIASES.percentage,
  indianns: ALIASES.indianns,
  'group-dot-radix-comma': OPTIONS['group-dot-radix-comma'],
  'digits-2-required': OPTIONS['digits-2-required'],
  'numeric-input': OPTIONS['numeric-input'],
  'negation-parentheses': OPTIONS['negation-parentheses'],
  'min-max': OPTIONS['min-max'],
};

export const scenarios: Scenario[] = [
  ...staticFamily('numeric/static', ALIASES, VALUES),
  ...staticFamily('numeric/static', OPTIONS, VALUES),
  ...typingFamily('numeric/typing', TYPING_MASKS, TYPED),

  interactive('numeric/currency/backspace-through-radix', { alias: 'currency' }, [
    mask(), focus(), chars('1234.56'), press('Backspace'), press('Backspace'), press('Backspace'),
    press('Backspace'), press('Backspace'), blur(),
  ]),
  interactive('numeric/currency/delete-from-start', { alias: 'currency', prefix: '$ ' }, [
    mask(), focus(), chars('98765'), press('Home'), press('Delete'), press('Delete'), press('Delete'), blur(),
  ]),
  interactive('numeric/currency/edit-in-the-middle', { alias: 'currency' }, [
    mask(), focus(), chars('123456'), select(3), text('9'), press('Backspace'), press('Backspace'), blur(),
  ]),
  interactive('numeric/minus-toggles', { alias: 'numeric' }, [
    mask(), focus(), chars('42'), text('-'), text('-'), text('-'), press('Backspace'), blur(),
  ]),
  interactive('numeric/minus-parentheses', { alias: 'numeric', negationSymbol: { front: '(', back: ')' } }, [
    mask(), focus(), chars('42'), text('-'), press('Delete'), press('Backspace'), press('Backspace'), blur(),
  ]),
  interactive('numeric/step-with-ctrl-arrows', { alias: 'numeric', step: 5 }, [
    mask(), focus(), chars('10'), press('ArrowUp', { ctrl: true }), press('ArrowUp', { ctrl: true }),
    press('ArrowDown', { ctrl: true }), blur(),
  ]),
  interactive('numeric/shortcuts', { alias: 'numeric' }, [
    mask(), focus(), chars('2'), text('k'), text('m'), blur(),
  ]),
  interactive('numeric/blur-enforces-digits', { alias: 'numeric', digits: 2, enforceDigitsOnBlur: true }, [
    mask(), focus(), chars('7'), blur(), focus(), chars('.5'), blur(),
  ]),
  interactive('numeric/blur-strips-trailing-radix', { alias: 'numeric' }, [
    mask(), focus(), chars('12.'), blur(), focus(), chars('-'), blur(),
  ]),
  interactive('numeric/blur-applies-min-max', { alias: 'numeric', min: 10, max: 500 }, [
    mask(), focus(), chars('5'), blur(), focus(), press('Backspace'), press('Backspace'), chars('900'), blur(),
  ]),
  interactive('numeric/radix-focus-on-click', { alias: 'currency' }, [
    mask(), click(), chars('12'), click(0), chars('3'), click(), click(), blur(),
  ]),
  interactive('numeric/select-all-and-replace', { alias: 'currency', prefix: 'R$ ' }, [
    mask(), focus(), chars('1234'), select(0, 99), text('5'), select(0, 99), press('Delete'), blur(),
  ]),
  interactive('numeric/paste-formatted', { alias: 'currency', groupSeparator: '.', radixPoint: ',' }, [
    mask(), focus(), paste('1.234,56'), paste('-7'), blur(),
  ]),
  interactive('numeric/set-value-number-type', { alias: 'numeric', inputType: 'number', radixPoint: ',', digits: 2 }, [
    mask(), setValue('1234.5'), focus(), chars('6'), blur(),
  ]),
  interactive('numeric/initial-value', { alias: 'currency' }, [
    mask(), focus(), press('End'), chars('9'), blur(),
  ], { element: { value: '1234.5' } }),
  interactive('numeric/numeric-input/typing-and-erasing', {
    alias: 'numeric', numericInput: true, digits: 2, digitsOptional: false, groupSeparator: ',',
  }, [
    mask(), focus(), chars('123456'), press('Backspace'), press('Backspace'), press('Delete'), blur(),
  ]),
  interactive('numeric/percentage/caps-at-max', { alias: 'percentage' }, [
    mask(), focus(), chars('150'), blur(), focus(), press('Backspace'), blur(),
  ]),
  interactive('numeric/integer/rejects-radix', { alias: 'integer' }, [
    mask(), focus(), chars('12.5'), text(','), blur(),
  ]),
];
