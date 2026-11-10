import {
  alias, assign, blur, call, chars, focus, interactive, interactiveFamily, mask, paste, press,
  select, setValue, staticCase, staticFamily, text,
} from '../scenario';

import type { MaskOptions, Scenario } from '../types';

/**
 * The numeric extension past what `aliases-numeric` reaches: the option
 * shapes `genMask` rewrites, the radix dance, the limits, and the keys the
 * alias handles on its own.
 */

/** Prefix and suffix characters that are mask symbols get escaped one by one. */
const ESCAPED: Record<string, MaskOptions> = {
  'prototype-definitions': { alias: 'numeric', prefix: '# ', suffix: ' Aa*&' },
  'numeric-definitions': { alias: 'currency', prefix: '+-', suffix: ' x10' },
  'group-markers': { alias: 'currency', suffix: ' (BRL)' },
  'optional-markers': { alias: 'numeric', prefix: '[R$] ' },
  'quantifier-markers-and-alternator': { alias: 'integer', suffix: ' {a|b}' },
  // The escape character itself is left alone, so it escapes what follows it.
  'escape-char-in-prefix': { alias: 'numeric', prefix: 'C:\\' },
  'escape-char-ends-suffix': { alias: 'numeric', suffix: ' \\' },
};

/** `min` and `max` as the strings a data attribute would hand over. */
const BOUNDS: Record<string, MaskOptions> = {
  'strings-comma-radix': {
    alias: 'numeric', radixPoint: ',', groupSeparator: '.', min: '1.000,5', max: '2.000,75',
  },
  'strings-dot-radix': {
    alias: 'numeric', groupSeparator: ',', min: '1,000.5', max: '2,000.75',
  },
  'garbage-min': { alias: 'numeric', min: 'abc' },
  'garbage-max': { alias: 'numeric', max: 'abc' },
  'empty-strings': { alias: 'numeric', min: '', max: '' },
  infinite: { alias: 'numeric', min: -Infinity, max: Infinity },
  'hex-and-exponent': { alias: 'numeric', min: '0x10', max: '1e3' },
  'min-above-max': { alias: 'numeric', min: 10, max: 5 },
  'negative-max': { alias: 'numeric', max: -5 },
  fractional: {
    alias: 'numeric', digits: 2, min: 0.5, max: 1.5,
  },
};

/** The group separator `genMask` picks when it collides with the radix point. */
const SEPARATORS: Record<string, MaskOptions> = {
  'both-dot': { alias: 'numeric', groupSeparator: '.', radixPoint: '.' },
  'both-comma': { alias: 'numeric', groupSeparator: ',', radixPoint: ',' },
  'both-space': { alias: 'numeric', groupSeparator: ' ', radixPoint: ' ' },
  'currency-with-comma-radix': { alias: 'currency', radixPoint: ',' },
  // Without decimals the two stay equal.
  'integer-with-dot-groups': { alias: 'integer', groupSeparator: '.' },
  'digits-string-zero': { alias: 'numeric', groupSeparator: '.', digits: '0' },
};

const DIGITS: Record<string, MaskOptions> = {
  'string-zero': { alias: 'numeric', digits: '0' },
  true: { alias: 'numeric', digits: true },
  negative: { alias: 'numeric', digits: -2 },
  null: { alias: 'numeric', digits: null },
  'range-from-zero': { alias: 'numeric', digits: '0,2' },
  'star-required': { alias: 'numeric', digitsOptional: false },
  'three-required': { alias: 'decimal', digits: 3, digitsOptional: false },
};

/** `numericInput: true` is the finance style: digits enter at the right. */
const FINANCE: Record<string, MaskOptions> = {
  'digits-star': { alias: 'numeric', numericInput: true },
  'digits-range': { alias: 'numeric', numericInput: true, digits: '3,5' },
  'digits-word': { alias: 'numeric', numericInput: true, digits: 'abc' },
  'no-radix': { alias: 'numeric', numericInput: true, radixPoint: '' },
  'comma-radix': { alias: 'currency', numericInput: true, radixPoint: ',' },
  'no-placeholder': {
    alias: 'numeric', numericInput: true, digits: 2, placeholder: '',
  },
  integer: { alias: 'integer', numericInput: true },
  percentage: { alias: 'percentage', numericInput: true, digits: 2 },
  indianns: { alias: 'indianns', numericInput: true },
};

const PARENTHESES = { front: '(', back: ')' };
const NO_SYMBOL = { front: '', back: '' };

const NEGATION: Record<string, MaskOptions> = {
  'no-symbol': { alias: 'numeric', negationSymbol: NO_SYMBOL },
  word: { alias: 'numeric', negationSymbol: { front: 'CR ', back: '' } },
  'unicode-minus': { alias: 'numeric', negationSymbol: { front: '\u2212', back: '' } },
  // A trailing minus sends upstream into endless recursion as soon as a value is negative.
  'back-only': { alias: 'numeric', negationSymbol: { front: '', back: '-' } },
};

/** Backspace right after the negation symbol, which the alias removes on its own. */
const ERASE_THE_MINUS: Record<string, MaskOptions> = {
  numeric: { alias: 'numeric' },
  parentheses: { alias: 'currency', negationSymbol: PARENTHESES },
  finance: { alias: 'numeric', numericInput: true, digits: 2 },
  'library-currency': alias('currency'),
  'library-brl-currency': alias('brl-currency'),
};

/** The first key in an empty field whose mask is not shown yet. */
const HIDDEN_MASK: Record<string, MaskOptions> = {
  currency: { alias: 'currency', showMaskOnHover: false, showMaskOnFocus: false },
  'hover-only': { alias: 'currency', showMaskOnHover: false },
  'optional-digits': { alias: 'numeric', showMaskOnHover: false, showMaskOnFocus: false },
  'no-digits': {
    alias: 'integer', digitsOptional: false, showMaskOnHover: false, showMaskOnFocus: false,
  },
  'library-brl-currency': alias('brl-currency', { showMaskOnHover: false, showMaskOnFocus: false }),
};

const CTRL = { ctrl: true };

/**
 * `min` is checked on every key only when the mask has no alternation, which
 * leaves out every mask with optional digits.
 */
const MINIMUM: Record<string, MaskOptions> = {
  'optional-digits': { alias: 'numeric', min: 10 },
  currency: { alias: 'currency', min: 10 },
  indianns: { alias: 'indianns', min: 10 },
  'library-currency': alias('currency', { min: 10 }),
  'no-placeholder': { alias: 'currency', placeholder: '', min: 10 },
  finance: {
    alias: 'numeric', numericInput: true, digits: 2, min: 1,
  },
};

const NUMBERS = [
  '',
  '0',
  '5',
  '12',
  '-5',
  '12.5',
  '1500',
  '1500,25',
  '1234567.891',
  '3000',
  '0.05',
];

export const scenarios: Scenario[] = [
  ...staticFamily('gap/numeric/auto-escape', ESCAPED, ['', '12', '-12.5', '12 x10', '+-7']),
  ...staticFamily('gap/numeric/bounds', BOUNDS, NUMBERS),
  ...staticFamily('gap/numeric/separator-from-radix', SEPARATORS, [...NUMBERS, '1.234,5', '1,234.5', '1234 5']),
  ...staticFamily('gap/numeric/digits', DIGITS, NUMBERS),
  ...staticFamily('gap/numeric/finance', FINANCE, NUMBERS),
  ...staticFamily('gap/numeric/negation', NEGATION, ['', '5', '-5', '(5)', '5-', 'CR 5', '\u22125', '007']),

  interactive('gap/numeric/negation-back/digits-enforced-on-blur', {
    alias: 'numeric', digits: 2, enforceDigitsOnBlur: true, negationSymbol: PARENTHESES,
  }, [
    mask(), focus(), chars('12'), text('-'), blur(), focus(), text('-'), blur(),
  ]),
  interactive('gap/numeric/negation-back/erase-next-to-the-radix', { alias: 'currency', negationSymbol: PARENTHESES }, [
    mask(), focus(), chars('12'), text('-'), select(6), press('Backspace'), select(3), press('Delete'), blur(),
  ]),
  interactive('gap/numeric/negation-back/typing-the-symbols', { alias: 'numeric', negationSymbol: PARENTHESES }, [
    mask(), focus(), text('5'), text('('), text('('), text(')'), text('-'), text(')'), blur(),
  ]),
  interactive('gap/numeric/negation/word-symbol-typing', { alias: 'numeric', negationSymbol: { front: 'CR ', back: '' } }, [
    mask(), focus(), text('5'), text('-'), text('1'), press('Backspace'), text('-'), blur(),
  ]),
  interactive('gap/numeric/negation/unicode-minus-typing', { alias: 'numeric', negationSymbol: { front: '\u2212', back: '' } }, [
    mask(), focus(), text('5'), text('-'), text('\u2212'), text('\u2212'), blur(),
  ]),
  interactive('gap/numeric/negation/no-symbol-typing', { alias: 'numeric', negationSymbol: NO_SYMBOL }, [
    mask(), focus(), text('5'), text('-'), text('-'), blur(),
  ]),
  // With no symbol and no placeholder, an empty slot of the buffer passes for the symbol.
  interactive('gap/numeric/negation/no-symbol-empty-slot-on-blur', {
    alias: 'currency', placeholder: '', negationSymbol: NO_SYMBOL,
  }, [
    mask(), focus(), text('0'), blur(), focus(), text('7'), blur(),
  ]),
  interactive('gap/numeric/negation/no-symbol-empty-slot-on-mask', {
    alias: 'numeric', placeholder: '', negationSymbol: NO_SYMBOL, clearMaskOnLostFocus: false,
  }, [
    mask(), focus(), text('5'), blur(),
  ]),
  interactive('gap/numeric/negation/no-symbol-empty-slot-on-backspace', {
    alias: 'numeric', placeholder: '', negationSymbol: NO_SYMBOL,
  }, [
    mask(), focus(), press('Backspace'), text('5'), text('-'), press('Backspace'), blur(),
  ]),

  ...interactiveFamily('gap/numeric/erase-the-minus', ERASE_THE_MINUS, [
    mask(), focus(), text('5'), text('-'), select(1), press('Backspace'), blur(),
  ]),
  interactive('gap/numeric/erase-the-minus/selected', { alias: 'currency' }, [
    mask(), focus(), chars('-12'), select(0, 1), press('Backspace'), text('-'), select(0, 1), press('Delete'), blur(),
  ]),
  // Any character equal to the symbol counts, also one that belongs to the suffix.
  interactive('gap/numeric/erase-the-minus/same-character-in-the-suffix', { alias: 'numeric', suffix: '-pts' }, [
    mask(), focus(), text('5'), select(1), press('Delete'), text('7'), select(2), press('Backspace'), blur(),
  ]),

  interactive('gap/numeric/radix-dance/type-over-selection/optional-digits', { alias: 'numeric' }, [
    mask(), focus(), chars('1234'), select(1, 3), text('9'), select(0, 3), text('.'), text('5'), select(0, 2), text('7'), blur(),
  ]),
  interactive('gap/numeric/radix-dance/type-over-selection/radix-across-the-radix', { alias: 'currency' }, [
    mask(), focus(), chars('12.34'), select(1, 4), text('.'), blur(),
  ]),
  interactive('gap/numeric/radix-dance/type-over-selection/digit-across-the-radix', { alias: 'currency' }, [
    mask(), focus(), chars('12.34'), select(1, 4), text('7'), blur(),
  ]),
  interactive('gap/numeric/radix-dance/type-over-selection/inside-the-decimals', { alias: 'currency' }, [
    mask(), focus(), chars('12.34'), select(4, 5), text('9'), select(3, 5), text('7'), blur(),
  ]),
  interactive('gap/numeric/radix-dance/type-over-selection/inside-the-integer', { alias: 'currency' }, [
    mask(), focus(), chars('1234.5'), select(0, 1), text('9'), select(2, 5), text('7'), blur(),
  ]),
  interactive('gap/numeric/radix-dance/radix-key-on-either-side', { alias: 'currency' }, [
    mask(), focus(), chars('12'), select(3), text('.'), text('.'), text('.'), select(5), text('.'), select(0), text('.'), blur(),
  ]),
  interactive('gap/numeric/radix-dance/radix-key-with-optional-digits', { alias: 'numeric' }, [
    mask(), focus(), chars('12.5'), select(1), text('.'), select(4), text('.'), select(3), text('.'), blur(),
  ]),
  ...interactiveFamily('gap/numeric/radix-dance/hidden-mask', HIDDEN_MASK, [
    mask(), focus(), chars('12'), blur(),
  ]),
  // No element, so the alias reads the native value getter of nothing.
  staticCase('gap/numeric/radix-dance/hidden-mask/static', HIDDEN_MASK.currency, ['', '1', '12.5']),

  ...interactiveFamily('gap/numeric/min-while-typing', MINIMUM, [
    mask(), focus(), text('5'), text('.'), text('5'), text('5'), text('-'), blur(),
  ]),
  interactive('gap/numeric/min-while-typing/minus-below-zero', { alias: 'currency', min: 0 }, [
    mask(), focus(), text('5'), text('-'), blur(),
  ]),
  // The longer text of a value below `min` is what gets a key refused.
  interactive('gap/numeric/min-while-typing/longer-than-min', { alias: 'currency', min: 100 }, [
    mask(), focus(), chars('55'), text('.'), text('5'), select(2), text('5'), text('.'), text('5'), blur(),
  ]),
  interactive('gap/numeric/min-while-typing/library-brl-currency-string-bounds', alias('brl-currency', { min: '1,5', max: '9,5' }), [
    mask(), focus(), text('1'), text(','), text('2'), blur(), focus(), chars('99'), blur(),
  ]),

  interactive('gap/numeric/max/set-on-overflow', { alias: 'numeric', max: 100, SetMaxOnOverflow: true }, [
    mask(), focus(), chars('150'), text('.'), text('5'), blur(),
  ]),
  interactive('gap/numeric/max/set-on-overflow-aligns-digits', { alias: 'currency', max: 99.5, SetMaxOnOverflow: true }, [
    mask(), focus(), chars('100'), blur(),
  ]),
  interactive('gap/numeric/max/set-on-overflow-percentage', { alias: 'percentage', SetMaxOnOverflow: true }, [
    mask(), focus(), chars('150'), blur(),
  ]),
  // The dot of a fractional number is taken for the group separator: 1000.5 becomes 10005.
  interactive('gap/numeric/max/library-brl-currency-fractional-number', alias('brl-currency', { max: 1000.5, SetMaxOnOverflow: true }), [
    mask(), focus(), chars('15000'), blur(),
  ]),
  interactive('gap/numeric/max/refuses-a-decimal', { alias: 'currency', max: 99.5 }, [
    mask(), focus(), chars('99.6'), select(4), text('4'), blur(),
  ]),
  // A negative `max` is not checked while typing, only on blur.
  interactive('gap/numeric/max/negative-applies-on-blur', { alias: 'numeric', max: -5 }, [
    mask(), focus(), text('3'), blur(), focus(), text('-'), text('9'), blur(),
  ]),
  interactive('gap/numeric/max/negative-with-min', { alias: 'currency', min: -10, max: -5 }, [
    mask(), focus(), text('3'), blur(), focus(), chars('20'), text('-'), blur(),
  ]),
  interactive('gap/numeric/max/paste-and-set-value', { alias: 'numeric', min: 10, max: 500 }, [
    mask(), focus(), paste('900'), setValue('3'), setValue('-7'), setValue('250.5'), blur(),
  ]),

  // A negative value that the prefix or suffix makes unreadable is reset to zero.
  interactive('gap/numeric/blur/negative-with-group-separator-in-prefix', { alias: 'currency', prefix: '$ ', groupSeparator: ' ' }, [
    mask(), focus(), chars('1234'), text('-'), blur(),
  ]),
  interactive('gap/numeric/blur/negative-with-radix-in-suffix', { alias: 'numeric', suffix: ' p.a.' }, [
    mask(), focus(), text('5'), text('-'), blur(),
  ]),
  interactive('gap/numeric/blur/negative-zero', { alias: 'currency' }, [
    mask(), focus(), text('-'), blur(), focus(), text('0'), text('-'), blur(),
  ]),
  interactive('gap/numeric/blur/trailing-radix-before-a-suffix', { alias: 'numeric', suffix: ' USD' }, [
    mask(), focus(), chars('12.'), blur(),
  ]),
  interactive('gap/numeric/blur/trailing-radix-percentage', { alias: 'percentage', digits: 2 }, [
    mask(), focus(), chars('12.'), blur(),
  ]),
  // The radix and the zeros are appended after the suffix, and the value is lost.
  interactive('gap/numeric/blur/enforced-digits-after-a-suffix', {
    alias: 'numeric', digits: 2, suffix: ' %', enforceDigitsOnBlur: true,
  }, [
    mask(), focus(), text('1'), blur(), focus(), text('.'), text('5'), blur(),
  ]),
  interactive('gap/numeric/blur/enforced-digits-percentage', { alias: 'percentage', digits: 2, enforceDigitsOnBlur: true }, [
    mask(), focus(), text('7'), blur(),
  ]),
  interactive('gap/numeric/blur/enforced-digits-star', { alias: 'numeric', enforceDigitsOnBlur: true }, [
    mask(), focus(), text('7'), blur(), focus(), chars('.5'), blur(),
  ]),
  interactive('gap/numeric/blur/enforced-digits-range', { alias: 'numeric', digits: '2,4', enforceDigitsOnBlur: true }, [
    mask(), focus(), text('7'), blur(), focus(), chars('.5'), blur(),
  ]),
  interactive('gap/numeric/blur/enforced-digits-comma-radix', {
    alias: 'numeric', digits: 2, enforceDigitsOnBlur: true, radixPoint: ',', groupSeparator: '.',
  }, [
    mask(), focus(), chars('1234'), blur(), focus(), text('-'), blur(),
  ]),

  // `format`, `unmaskedvalue` and `isValid` hand the alias whatever they are given.
  interactive('gap/numeric/before-mask/numbers-and-nothing', { alias: 'currency' }, [
    mask(), call('format', 1234.5), call('format', -0.129), call('format', 1e21), call('unmaskedvalue', 5),
    call('isValid', 12.5), call('format', null), call('unmaskedvalue', null), call('format'),
  ]),
  // A number has its dot turned into the radix point; the same digits as text do not.
  interactive('gap/numeric/before-mask/library-brl-currency-number-or-text', alias('brl-currency'), [
    mask(), call('format', 1234.5), call('format', '1234.5'), call('unmaskedvalue', -0.5), call('isValid', 1234.5),
  ]),
  // `setValue` skips the alias, and a zero counts as no value at all.
  interactive('gap/numeric/before-mask/set-value-with-numbers', { alias: 'currency' }, [
    mask(), call('setValue', 1234.5), call('setValue', 0), call('setValue', -0.129), call('setValue', null),
  ]),
  interactive('gap/numeric/before-mask/input-type-number', {
    alias: 'currency', inputType: 'number', radixPoint: ',', groupSeparator: '.',
  }, [
    mask(), assign('1234.56'), setValue('1234.56'), focus(), select(0, 99), paste('1.234,56'), blur(),
  ], { element: { value: '0.5' } }),
  staticCase('gap/numeric/before-mask/integer-keeps-the-radix', { alias: 'integer' }, [
    '--1.5', '1500000000000000000000.5', '-.5', '.', '1.5', '2.5', '-2.5', '0.4', '1e3',
  ]),
  staticCase('gap/numeric/before-mask/percentage-keeps-the-radix', { alias: 'percentage' }, [
    '--1.5', '1500000000000000000000.5', '49.5', '99.5',
  ]),
  // Only a comma survives the conversion to a number; any other radix drops the decimals.
  staticCase('gap/numeric/before-mask/radix-slash', { alias: 'currency', radixPoint: '/' }, ['', '1234', '12/5', '/5']),
  staticCase('gap/numeric/before-mask/radix-slash-integer', { alias: 'integer', radixPoint: '/' }, ['/5', '1/5', '12']),
  staticCase('gap/numeric/before-mask/integer-rounding-floor', { alias: 'integer', roundingFN: Math.floor }, ['1.9', '1.5', '-1.5', '1.49', '1.04']),
  staticCase('gap/numeric/before-mask/integer-rounding-ceil', { alias: 'integer', roundingFN: Math.ceil }, ['1.01', '1.5', '-1.5', '1.49']),

  interactive('gap/numeric/keys/delete-around-the-radix', { alias: 'currency' }, [
    mask(), focus(), chars('12.34'), select(2), press('Delete'), select(3), press('Delete'), select(4), press('Delete'),
    select(0), press('Delete'), blur(),
  ]),
  interactive('gap/numeric/keys/backspace-around-the-radix', { alias: 'currency' }, [
    mask(), focus(), chars('12.34'), select(3), press('Backspace'), press('Backspace'), select(4), press('Backspace'),
    select(1), press('Backspace'), blur(),
  ]),
  // With Shift the alias stands aside and the core erases.
  interactive('gap/numeric/keys/shift-skips-the-alias', { alias: 'currency' }, [
    mask(), focus(), chars('12.34'), select(4), press('Backspace', { shift: true }), select(2), press('Delete', { shift: true }), blur(),
  ]),
  interactive('gap/numeric/keys/selection-to-the-end/backspace', { alias: 'currency' }, [
    mask(), focus(), chars('123.45'), select(1, 6), press('Backspace'), blur(),
  ]),
  interactive('gap/numeric/keys/selection-to-the-end/delete', { alias: 'currency' }, [
    mask(), focus(), chars('123.45'), select(1, 6), press('Delete'), blur(),
  ]),
  interactive('gap/numeric/keys/selection-inside-the-decimals', { alias: 'currency' }, [
    mask(), focus(), chars('123.45'), select(4, 6), press('Backspace'), chars('67'), select(4, 6), press('Delete'), blur(),
  ]),
  interactive('gap/numeric/keys/selection-across-the-radix/backspace', { alias: 'currency' }, [
    mask(), focus(), chars('123.45'), select(2, 5), press('Backspace'), blur(),
  ]),
  interactive('gap/numeric/keys/selection-across-the-radix/delete', { alias: 'currency' }, [
    mask(), focus(), chars('123.45'), select(2, 5), press('Delete'), blur(),
  ]),
  interactive('gap/numeric/keys/selection-inside-the-integer', { alias: 'currency' }, [
    mask(), focus(), chars('1234.5'), select(0, 2), press('Backspace'), select(0, 1), press('Delete'), blur(),
  ]),
  interactive('gap/numeric/keys/trailing-radix', { alias: 'numeric' }, [
    mask(), focus(), chars('12.'), press('Backspace'), text('.'), select(1), press('Backspace'), text('.'),
    select(2), press('Delete'), blur(),
  ]),
  interactive('gap/numeric/keys/trailing-radix-library-decimal', alias('decimal'), [
    mask(), focus(), chars('12.'), press('Backspace'), text('.'), select(1), press('Backspace'), blur(),
  ]),
  // The key name only Safari on iOS reports: the alias takes it, the core does not.
  interactive('gap/numeric/keys/safari-backspace', { alias: 'currency' }, [
    mask(), focus(), chars('12.34'), press('BACKSPACE_SAFARI'), select(1), press('BACKSPACE_SAFARI'), blur(),
  ], { env: 'unit' }),

  interactive('gap/numeric/shortcuts/custom', { alias: 'numeric', shortcuts: { h: '100', x: '5', K: '1000' } }, [
    mask(), focus(), text('h'), text('2'), text('h'), text('x'), text('k'), text('K'), blur(),
  ]),
  interactive('gap/numeric/shortcuts/none', { alias: 'numeric', shortcuts: null }, [
    mask(), focus(), text('2'), text('k'), blur(),
  ]),
  // `parseFloat` stops at the comma, so the decimals are gone before the multiplication.
  interactive('gap/numeric/shortcuts/library-brl-currency', alias('brl-currency'), [
    mask(), focus(), chars('1,5'), text('k'), blur(),
  ]),
  // A numpad key has `location` 3 and is no shortcut. jsdom cannot press one.
  interactive('gap/numeric/shortcuts/numpad-key', { alias: 'numeric', shortcuts: { '*': '100' } }, [
    mask(), focus(), text('5'), press('NumpadMultiply'), text('*'), blur(),
  ], { env: 'browser' }),

  interactive('gap/numeric/step/from-an-empty-field', { alias: 'numeric' }, [
    mask(), focus(), press('ArrowUp', CTRL), text('5'), press('ArrowUp', CTRL), press('ArrowDown', CTRL), blur(),
  ]),
  interactive('gap/numeric/step/fraction-as-text', { alias: 'currency', step: '2.5' }, [
    mask(), focus(), chars('1.5'), press('ArrowUp', CTRL), press('ArrowDown', CTRL), press('ArrowDown', CTRL), blur(),
  ]),
  interactive('gap/numeric/step/not-a-number', { alias: 'numeric', step: 'abc' }, [
    mask(), focus(), text('5'), press('ArrowUp', CTRL), blur(),
  ]),
  interactive('gap/numeric/step/percentage-at-max', { alias: 'percentage' }, [
    mask(), focus(), chars('99'), press('ArrowUp', CTRL), press('ArrowUp', CTRL), press('ArrowDown', CTRL), blur(),
  ]),
  interactive('gap/numeric/step/library-brl-currency', alias('brl-currency'), [
    mask(), focus(), chars('1,5'), press('ArrowUp', CTRL), press('ArrowDown', CTRL), press('ArrowDown', CTRL),
    press('ArrowDown', CTRL), blur(),
  ]),
  interactive('gap/numeric/step/unmasked-as-number', { alias: 'numeric', unmaskAsNumber: true, autoUnmask: true }, [
    mask(), focus(), chars('1.5'), press('ArrowUp', CTRL), text('k'), blur(),
  ]),
];
