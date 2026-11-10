import { staticFamily } from '../scenario';

import type { MaskOptions, Scenario } from '../types';

/**
 * The mask grammar through the static helpers: every definition, literals,
 * optional parts, quantifiers, groups, alternators and the escape character.
 * Each mask sees the same inputs, so a new mask costs one line.
 */

const INPUTS = [
  '',
  '1',
  '12',
  '123',
  '1234',
  '12345',
  '123456789012345678901',
  'a',
  'abc',
  'ABCdef',
  'a1b2c3',
  'A1-B2',
  '12-34',
  '(12) 34',
  ' ',
  '1 2 3',
  '!@#$',
  '9_9',
  'é',
  '١٢٣',
  'ff00AA',
];

const DEFINITIONS: Record<string, MaskOptions> = {
  digits: { mask: '9999' },
  letters: { mask: 'aaaa' },
  alphanumeric: { mask: '****' },
  'upper-letters': { mask: 'AAAA' },
  'upper-alphanumeric': { mask: '&&&&' },
  hexadecimal: { mask: '######' },
  mixed: { mask: 'a9*-A&#' },
};

const LITERALS: Record<string, MaskOptions> = {
  separators: { mask: '99-99/99' },
  prefix: { mask: '+55 (99) 9999' },
  suffix: { mask: '999 kg' },
  'only-literals': { mask: '--' },
  'escaped-definitions': { mask: '\\99\\a-99' },
  'escape-char-option': { mask: '!9!a99', escapeChar: '!' },
};

const OPTIONALS: Record<string, MaskOptions> = {
  tail: { mask: '99[99]' },
  middle: { mask: '99[-99]-99' },
  nested: { mask: '9[9[9[9]]]' },
  literal: { mask: '(99)[ ]9999' },
  leading: { mask: '[99-]9999' },
  'custom-marker': { mask: '99<99>', optionalmarker: ['<', '>'] },
};

const QUANTIFIERS: Record<string, MaskOptions> = {
  exact: { mask: '9{4}' },
  range: { mask: '9{2,4}' },
  'one-or-more': { mask: '9{+}' },
  'zero-or-more': { mask: '9{*}' },
  'open-ended': { mask: 'a{2,}' },
  letters: { mask: 'a{1,3}-9{2}' },
  group: { mask: '(99-){2}99' },
  'group-range': { mask: '(a9){1,3}' },
  'jit-marker': { mask: '9{1,5|2}' },
  // No custom `quantifiermarker` here: upstream's tokenizer hardcodes braces,
  // and with any other marker it recurses until the stack overflows.
};

const ALTERNATORS: Record<string, MaskOptions> = {
  groups: { mask: '(99)|(aa)' },
  three: { mask: '(999)|(aaa)|(***)' },
  inline: { mask: 'a|9-99' },
  'literal-branches': { mask: '(+1)|(+55) 9999' },
  nested: { mask: '((99)|(aa))-9' },
  'different-lengths': { mask: '(9)|(99-99)|(999-999-999)' },
  'with-optional': { mask: '(99[9])|(aa)' },
  'custom-marker': { mask: '(99)^(aa)', alternatormarker: '^' },
  'custom-group-marker': { mask: '<99->{2}99', groupmarker: ['<', '>'] },
};

export const scenarios: Scenario[] = [
  ...staticFamily('static/definition', DEFINITIONS, INPUTS),
  ...staticFamily('static/literal', LITERALS, INPUTS),
  ...staticFamily('static/optional', OPTIONALS, INPUTS),
  ...staticFamily('static/quantifier', QUANTIFIERS, INPUTS),
  ...staticFamily('static/alternator', ALTERNATORS, INPUTS),
];
