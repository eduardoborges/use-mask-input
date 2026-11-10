import { typingFamily } from '../scenario';

import type { OptionsSource, Scenario } from '../types';

/**
 * Typing, one keystroke per step, through every shape of mask: mask, focus,
 * type, blur. Masks times texts, so either table grows the corpus by a line.
 */

const MASKS: Record<string, OptionsSource> = {
  static: { mask: '99-99' },
  letters: { mask: 'aa-99' },
  'literal-prefix': { mask: '+55 (99) 9999' },
  optional: { mask: '99[99]-9' },
  'optional-nested': { mask: '9[9[9]]' },
  quantifier: { mask: '9{1,4}-a' },
  'one-or-more': { mask: '9{+}' },
  group: { mask: '(99-){2}9' },
  alternator: { mask: '(99)|(aa)' },
  'alternator-lengths': { mask: '(9)|(99-99)' },
  'alternator-inline': { mask: 'a|9-99' },
  'array-keep-static': { mask: ['99-99', '999-999'] },
  'array-switching': { mask: ['99-99', '999-999'], keepStatic: false },
  'array-letters-or-digits': { mask: ['aa-99', '99-aa'] },
  jit: { mask: '99/99/9999', jitMasking: true },
  'jit-number': { mask: '99/99/9999', jitMasking: 2 },
  'placeholder-empty': { mask: '99-99', placeholder: '' },
  'placeholder-pattern': { mask: '99/99/9999', placeholder: 'dd/mm/yyyy' },
  greedy: { mask: '9[99]-a', greedy: true },
  'repeat-star': { mask: '9', repeat: '*', greedy: false },
  'repeat-number': { mask: '9a', repeat: 2 },
  regex: { regex: '[a-c]{2}[0-9]{2}' },
  'regex-alternation': { regex: '(ab|cd)[0-9]+' },
  'casing-upper': { mask: 'aa-**', casing: 'upper' },
  'casing-title': { mask: 'a{1,5} a{1,5}', casing: 'title' },
  'escaped-definition': { mask: '\\9-99' },
  'custom-definition': {
    mask: 'XX-99',
    definitions: { X: { validator: '[0-4a-c]', casing: 'upper' } },
  },
  substitutes: { mask: '99.99', substitutes: { ',': '.' } },
};

const TEXTS: Record<string, string> = {
  digits: '123456',
  letters: 'abcd',
  mixed: 'a1b2c3',
  separators: '12-3/4,5',
  spaces: '1 2 3',
};

export const scenarios: Scenario[] = typingFamily('typing', MASKS, TEXTS);
