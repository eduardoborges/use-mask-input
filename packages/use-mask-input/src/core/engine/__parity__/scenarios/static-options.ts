import { staticCase, staticFamily } from '../scenario';

import type { MaskOptions, OptionsSource, Scenario } from '../types';

/**
 * Options that change what the static helpers return: placeholder, jit
 * masking, greedy and repeat, casing, custom definitions, mask arrays with
 * and without keepStatic, regex masks, and the rest of the lexer options.
 */

const INPUTS = [
  '',
  '1',
  '12',
  '123',
  '1234',
  '123456',
  '12345678',
  '1234567890123',
  'ab',
  'abcd',
  'AbCd',
  'ab12',
  '12ab',
  '12/34',
  '12-34',
  'x',
  ' ',
];

const PLACEHOLDERS: Record<string, MaskOptions> = {
  character: { mask: '99/99', placeholder: '#' },
  space: { mask: '99/99', placeholder: ' ' },
  empty: { mask: '99/99', placeholder: '' },
  pattern: { mask: '99/99/9999', placeholder: 'dd/mm/yyyy' },
  'pattern-short': { mask: '99/99/9999', placeholder: 'dm' },
  'definition-level': {
    mask: 'hh:mm',
    definitions: {
      h: { validator: '[0-9]', placeholder: 'h' },
      m: { validator: '[0-9]', placeholder: 'm' },
    },
  },
};

const GROWTH: Record<string, MaskOptions> = {
  'jit-true': { mask: '99/99/9999', jitMasking: true },
  'jit-number': { mask: '99/99/9999', jitMasking: 2 },
  'jit-with-optional': { mask: '99[-99]', jitMasking: true },
  'greedy-true': { mask: '9[99]-a', greedy: true },
  'greedy-false': { mask: '9{1,5}', greedy: false },
  'repeat-number': { mask: '9a', repeat: 3 },
  'repeat-star': { mask: '9', repeat: '*', greedy: false },
  'repeat-greedy': { mask: '9-', repeat: 2, greedy: true },
  'repeat-single-nongreedy': { mask: 'a', repeat: 5, greedy: false },
};

const CASING: Record<string, OptionsSource> = {
  upper: { mask: 'aaa-***', casing: 'upper' },
  lower: { mask: 'AAA-***', casing: 'lower' },
  title: { mask: 'a{1,6} a{1,6}', casing: 'title' },
  callback: {
    mask: 'aaaa',
    casing: (character: string, _test: unknown, position: number) => (
      position % 2 === 0 ? character.toUpperCase() : character.toLowerCase()
    ),
  },
  'definition-over-option': {
    mask: 'XXXX',
    casing: 'upper',
    definitions: { X: { validator: '[A-Za-z]', casing: 'lower' } },
  },
};

const DEFINITIONS: Record<string, OptionsSource> = {
  ranges: {
    mask: 'XX-YY',
    definitions: {
      X: { validator: '[0-4]' },
      Y: { validator: '[A-Fa-f]', casing: 'upper' },
    },
  },
  'validator-function': {
    mask: 'ee',
    definitions: {
      e: { validator: (character: string) => /[02468]/.test(character) },
    },
  },
  'validator-command': {
    mask: 'tt:tt',
    definitions: {
      // Returns a command object: accept the character and pin the caret.
      t: {
        validator: (character: string, _maskset: unknown, position: number) => (
          /\d/.test(character) ? { pos: position, c: character } : false
        ),
      },
    },
  },
  'definition-symbol': {
    mask: 'X9|a',
    definitions: { X: { validator: '[xX]', definitionSymbol: '*' } },
  },
  'overrides-builtin': {
    mask: '99',
    definitions: { 9: { validator: '[1-3]' } },
  },
  'without-prototype': {
    mask: 'd9',
    usePrototypeDefinitions: false,
    definitions: { d: { validator: '[0-9]' } },
  },
  substitutes: { mask: '99.99', substitutes: { ',': '.', 'x': '1' } },
};

const ARRAYS: Record<string, OptionsSource> = {
  'default-keep-static': { mask: ['99-99', '999-999'] },
  'keep-static-true': { mask: ['99-99', '999-999'], keepStatic: true },
  'keep-static-false': { mask: ['99-99', '999-999'], keepStatic: false },
  phones: { mask: ['(99) 9999-9999', '(99) 99999-9999'] },
  'letters-or-digits': { mask: ['aa-99', '99-aa'] },
  'three-lengths': { mask: ['9', '99-9', '999-99-9'] },
  single: { mask: ['99-99'] },
  objects: { mask: [{ mask: '99-99', code: 'short' }, { mask: '999-999', code: 'long' }] },
  'one-object': { mask: { mask: '99-99', code: 'only' } },
  function: { mask: () => '99-99' },
  'function-array': { mask: () => ['9-9', '99-99'] },
  'keep-static-single': { mask: '99[9]-99', keepStatic: true },
};

const REGEX: Record<string, MaskOptions> = {
  digits: { regex: '[0-9]{3}-[0-9]{2}' },
  alternation: { regex: '(ab|cd)[0-9]+' },
  classes: { regex: '[A-Za-z]{2}\\d{2,4}' },
  anchored: { regex: '^[a-f0-9]{6}$' },
  optional: { regex: 'https?://[a-z]+' },
  casing: { regex: '[a-z]{3}', casing: 'upper' },
  'escaped-literals': { regex: '\\d{2}\\.\\d{2}' },
  'star-and-dot': { regex: '[0-9]*\\.?[0-9]*' },
  unicode: { regex: '\\p{L}{2}\\p{N}{2}' },
};

const MISCELLANEOUS: Record<string, MaskOptions> = {
  'numeric-input': { mask: '999-99', numericInput: true },
  'numeric-input-greedy': { mask: '9{1,6}', numericInput: true, greedy: false },
  'output-mask': { mask: '99-99', outputMask: '99/99' },
  'skip-optional-character': { mask: '99[99]-99', skipOptionalPartCharacter: '_' },
  'static-definition-symbol': { mask: '(99/99)|(aa/aa)', staticDefinitionSymbol: '*' },
  'nullable-false': { mask: '99-99', nullable: false },
  'auto-unmask': { mask: '99-99', autoUnmask: true },
  'clear-incomplete': { mask: '99-99', clearIncomplete: true },
  'insert-mode-off': { mask: '99-99', insertMode: false },
  'radix-and-group': { mask: '9{1,3}.9{2}', radixPoint: '.', groupSeparator: ',' },
};

export const scenarios: Scenario[] = [
  ...staticFamily('static/placeholder', PLACEHOLDERS, INPUTS),
  ...staticFamily('static/growth', GROWTH, INPUTS),
  ...staticFamily('static/casing', CASING, INPUTS),
  ...staticFamily('static/definitions', DEFINITIONS, INPUTS),
  ...staticFamily('static/array', ARRAYS, INPUTS),
  ...staticFamily('static/regex', REGEX, [...INPUTS, 'ab12', 'cd', 'http://abc', 'https://x', 'ff00aa', '12.34', 'éé12']),
  ...staticFamily('static/misc', MISCELLANEOUS, INPUTS),
  // No mask at all falls back to "anything goes".
  staticCase('static/no-mask', {}, INPUTS),
  staticCase('static/empty-mask', { mask: '' }, INPUTS),
  staticCase('static/unknown-alias', { alias: 'no-such-alias' }, INPUTS),
];
