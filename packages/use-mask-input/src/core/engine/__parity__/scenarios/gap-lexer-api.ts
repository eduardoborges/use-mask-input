import { staticFamily } from '../scenario';

import type { MaskOptions, Scenario } from '../types';

/**
 * Paths of the mask lexer and of the factory's public API that the rest of
 * the corpus leaves out.
 */

const GRAMMAR_INPUTS = [
  '',
  '1',
  '12',
  '123',
  '1234',
  '12345678',
  'a',
  'ab',
  'abc',
  'a1',
  '1a',
  '12-34',
  'a1b2c3',
  'x',
  ' ',
  '(12)',
  'aa-9',
];

// `'*'` and `'+'` wrap the mask in a quantified group; a number repeats its text.
const REPEAT: Record<string, MaskOptions> = {
  plus: { mask: '9', repeat: '+' },
  'plus-on-two-symbols': { mask: '9a', repeat: '+' },
  'star-with-a-literal': { mask: '99-', repeat: '*' },
  'plus-greedy': { mask: '9', repeat: '+', greedy: true },
  'star-greedy': { mask: '9', repeat: '*', greedy: true },
  'plus-with-numeric-input': { mask: '9', repeat: '+', numericInput: true },
  'star-with-a-group-marker': { mask: '9', repeat: '*', groupmarker: ['<', '>'] },
  'star-over-a-mask-array': { mask: ['9', 'a'], repeat: '*' },
  'plus-over-an-alternation': { mask: '9|a', repeat: '+' },
  'number-over-a-mask-array': { mask: ['9', 'a'], repeat: 3 },
  // A data attribute gives the number as text.
  'number-as-text': { mask: '9a', repeat: '2' },
  one: { mask: '9a', repeat: 1 },
  'with-keep-static': { mask: '9[9]', repeat: 2, keepStatic: true },
};

const ALTERNATIONS: Record<string, MaskOptions> = {
  'group-then-symbol': { mask: '(99)|a-9' },
  'group-then-symbol-in-a-group': { mask: '((99)|a)-9' },
  'group-then-symbol-in-an-optional': { mask: '[(99)|a]-9' },
  'in-an-optional': { mask: '[9|a]9' },
  'in-a-group': { mask: '(9|a)-9' },
  'three-in-a-group': { mask: '(9|a|-)9' },
  'three-inline': { mask: '9|a|*-9' },
  'after-an-inner-group': { mask: '(9(a)|9)-9' },
  // The quantifier and what it repeats become one branch.
  'after-a-quantifier': { mask: '9{2}|a{2}' },
  'after-a-quantified-group': { mask: '(99){2}|aa' },
  quantified: { mask: '(9|a){2}' },
  'quantified-range': { mask: '(9|a){1,3}-9' },
  'of-groups-quantified': { mask: '((99)|(aa)){2}' },
  'with-quantifiers-inside': { mask: '(9{2}|a{2})-9' },
  'one-or-more': { mask: '(9|a){+}' },
  'zero-or-more': { mask: '(9|a){*}' },
  'ending-the-mask': { mask: '9|' },
  'ending-the-mask-twice': { mask: '9|a|' },
  'in-an-unclosed-group': { mask: '(9|a' },
};

const MARKERS: Record<string, MaskOptions> = {
  // An unclosed group keeps its opening marker as a literal.
  'unclosed-group': { mask: '(99' },
  'unclosed-group-in-the-middle': { mask: '99(9-' },
  'unclosed-optional': { mask: '99[9' },
  'unclosed-optional-in-a-group': { mask: '9(9[9' },
  escaped: { mask: '\\(9\\)\\[9\\]\\{9\\}\\|9' },
  'escape-char-last': { mask: '99\\' },
  'escaped-escape-char': { mask: '9\\\\9' },
  // No token at all.
  'only-the-escape-char': { mask: '\\' },
  'regex-characters-are-literals': { mask: '$9^9.9?9*9+' },
};

const QUANTIFIERS: Record<string, MaskOptions> = {
  'plus-with-jit': { mask: '9{+|1}' },
  'star-with-jit': { mask: '9{*|1}' },
  // `*` in front of a number counts as one, not zero.
  'star-as-minimum': { mask: '9{*,3}' },
  'plus-as-minimum': { mask: '9{+,3}' },
  'plus-as-maximum': { mask: '9{2,+}' },
  'star-as-maximum': { mask: '9{2,*}' },
  'zero-to-two': { mask: '9{0,2}' },
  zero: { mask: '9{0}a' },
  one: { mask: '9{1}' },
  'maximum-below-minimum': { mask: '9{4,2}' },
  'on-an-optional': { mask: '[99]{2}' },
  'inside-a-group': { mask: '(9a{2})' },
  'on-a-group-in-a-quantified-group': { mask: '(9(a){2}){2}' },
  twice: { mask: '9{2}{3}' },
};

const REGEX_INPUTS = [
  '',
  '1',
  '12',
  '123',
  '23',
  '25',
  '0912',
  'a',
  'ab',
  'abc',
  'cd',
  'ac',
  'a1',
  '1a',
  'ab12',
  'x',
  ' ',
  'AB',
  'a.b',
];

const REGEX: Record<string, MaskOptions> = {
  // Outside a group, the whole regex becomes the first branch.
  'top-level-alternation': { regex: '[01][0-9]|2[0-3]' },
  'top-level-alternation-of-three': { regex: 'a|b|c' },
  'top-level-alternation-of-literals': { regex: 'ab|cd' },
  'top-level-alternation-with-quantifiers': { regex: '[0-9]{2}|[a-z]{3}' },
  'top-level-alternation-then-a-group': { regex: 'a|(b|c)d' },
  'top-level-alternation-with-casing': { regex: 'ab|cd', casing: 'upper' },
  'top-level-alternation-ending-the-regex': { regex: 'a|' },
  'nested-alternations': { regex: '((a|b)c|d)1' },
  'non-capturing-group': { regex: '(?:ab|cd)[0-9]' },
  'non-capturing-group-quantified': { regex: '(?:[0-9]{2}-){2}[0-9]' },
  // Assertions are read as plain groups.
  lookahead: { regex: 'a(?=b)c' },
  'negative-lookahead': { regex: 'a(?!b)c' },
  // The tokenizer stops at `(?`, so `<=` and `<!` end up as literals.
  lookbehind: { regex: '(?<=a)b' },
  'negative-lookbehind': { regex: '(?<!a)b' },
  'unclosed-group': { regex: '(ab' },
  'unclosed-group-with-alternation': { regex: '[0-9](a|b' },
  // Both anchors are stripped up front; one alone reaches the lexer.
  'start-anchor-only': { regex: '^[0-9]{2}' },
  'end-anchor-only': { regex: '[0-9]{2}$' },
  'anchors-in-the-middle': { regex: '[0-9]^[0-9]$[0-9]' },
  'anchors-only': { regex: '^$' },
  'static-definition-symbol': { regex: 'ab[0-9]', staticDefinitionSymbol: '*' },
  'lazy-plus': { regex: '[0-9]+?a' },
  'lazy-star': { regex: '[0-9]*?a' },
  'lazy-optional': { regex: 'a??b' },
  'lazy-range': { regex: '[a-z]{2,3}?1' },
  'word-space-and-non-digit': { regex: '\\w\\s\\D' },
  // Any other escape keeps its last character only.
  'hex-and-unicode-escapes': { regex: '\\x41\\u0042' },
  'escaped-markers': { regex: '\\(\\)\\|\\[\\]\\{\\}' },
  'negated-class': { regex: '[^0-9]{2}' },
  'class-with-an-escaped-bracket': { regex: '[\\]a]{2}' },
  'unicode-property-in-a-class': { regex: '[\\p{L}]{2}' },
  'dot-quantified': { regex: '.{3}' },
  'numeric-input': { regex: '[0-9]{3}-[a-z]', numericInput: true },
  'jit-masking': { regex: '[0-9]{2}-[0-9]{2}', jitMasking: true },
  'keep-static': { regex: '(ab|cd)[0-9]', keepStatic: true },
  greedy: { regex: '[0-9]{1,3}', greedy: true },
  'ignored-next-to-a-mask': { mask: '99', regex: '[a-z]+' },
};

const BROKEN_REGEX: Record<string, MaskOptions> = {
  'alternator-first': { regex: '|a' },
  'quantifier-first': { regex: '+a' },
  'optional-first': { regex: '?a' },
  'group-closed-but-never-opened': { regex: ')a' },
  'unclosed-class': { regex: '[0-9' },
};

const DEFINITION_INPUTS = [
  '',
  '1',
  '12',
  '123',
  'a',
  'a1',
  '1a',
  '1a2',
  'a12',
  '12a',
  '1ab2',
  'A!-1',
  'x',
  ' ',
];

const OPTIONAL_LETTER = { validator: '[a-z]', optional: true };

const DEFINITIONS: Record<string, MaskOptions> = {
  // Anything is accepted where a definition names no validator.
  'without-a-validator': { mask: 'XX-9', definitions: { X: { casing: 'upper' } } },
  'optional-in-the-middle': { mask: '9X9', definitions: { X: OPTIONAL_LETTER } },
  'optional-first': { mask: 'X99', definitions: { X: OPTIONAL_LETTER } },
  'optional-last': { mask: '99X', definitions: { X: OPTIONAL_LETTER } },
  'optional-twice': { mask: '9XX9', definitions: { X: OPTIONAL_LETTER } },
  'optional-alone': { mask: 'X', definitions: { X: OPTIONAL_LETTER } },
  'optional-quantified': { mask: '9X{2}9', definitions: { X: OPTIONAL_LETTER } },
  'optional-without-a-validator': { mask: '9X9', definitions: { X: { optional: true } } },
  'optional-greedy': { mask: '9X9', definitions: { X: OPTIONAL_LETTER }, greedy: true },
  // Every character is a literal.
  'none-at-all': { mask: '99-aa', usePrototypeDefinitions: false },
};

const MASK_VALUES: Record<string, MaskOptions> = {
  // The JSON of a data attribute can hand the lexer a number.
  number: { mask: 9999 },
  // Repeating a number adds it up: 99 twice is the mask "198".
  'number-repeated': { mask: 99, repeat: 2 },
  // The empty first entry is dropped, and the group that is left is literal.
  'array-starting-with-an-empty-mask': { mask: ['', '99'] },
};

// Only a string `mask` is read from an object. Otherwise the object itself
// is the mask text, "[object Object]", which is slow to walk: few inputs.
const MASK_OBJECTS: Record<string, MaskOptions> = {
  'in-an-array-with-a-function-for-mask': { mask: [{ mask: () => '99' }, '9'] },
  'with-a-function-for-mask': { mask: { mask: () => '99' } },
};

const RIGHT_TO_LEFT: Record<string, MaskOptions> = {
  // Without an element nothing sets `isRTL`, so the array keeps its order.
  'mask-array-with-numeric-input': { mask: ['99-99', '999-999'], numericInput: true },
  // `mask()` sets the flag on a right-to-left element. Given as an option, it reverses the array as well.
  'mask-array-with-the-rtl-flag': { mask: ['99-99', '999-999'], isRTL: true },
  'group-and-optional': { mask: '(99)[-99]', numericInput: true },
  'quantified-group': { mask: '(9-){2}9', numericInput: true },
  alternation: { mask: '(99)|(aa)-9', numericInput: true },
};

// A marker with nothing to act on: the lexer reads a property of `undefined`.
const BROKEN_MASKS: Record<string, MaskOptions> = {
  'alternator-first': { mask: '|99' },
  'group-closed-but-never-opened': { mask: '99)' },
  'optional-closed-but-never-opened': { mask: '9]9' },
  'quantifier-first': { mask: '{2}99' },
  'quantifier-opening-a-group': { mask: '({2}9)' },
  'empty-mask-array': { mask: [] },
};

export const scenarios: Scenario[] = [
  ...staticFamily('gap/lexer-api/repeat', REPEAT, GRAMMAR_INPUTS),
  ...staticFamily('gap/lexer-api/alternation', ALTERNATIONS, GRAMMAR_INPUTS),
  ...staticFamily('gap/lexer-api/marker', MARKERS, GRAMMAR_INPUTS),
  ...staticFamily('gap/lexer-api/quantifier', QUANTIFIERS, GRAMMAR_INPUTS),
  ...staticFamily('gap/lexer-api/broken-mask', BROKEN_MASKS, ['', '12']),
  ...staticFamily('gap/lexer-api/definition', DEFINITIONS, DEFINITION_INPUTS),
  ...staticFamily('gap/lexer-api/mask-value', MASK_VALUES, GRAMMAR_INPUTS),
  ...staticFamily('gap/lexer-api/mask-object', MASK_OBJECTS, ['', '1', 'ab']),
  ...staticFamily('gap/lexer-api/right-to-left', RIGHT_TO_LEFT, GRAMMAR_INPUTS),
  ...staticFamily('gap/lexer-api/regex', REGEX, REGEX_INPUTS),
  ...staticFamily('gap/lexer-api/broken-regex', BROKEN_REGEX, ['', 'a1']),
];
