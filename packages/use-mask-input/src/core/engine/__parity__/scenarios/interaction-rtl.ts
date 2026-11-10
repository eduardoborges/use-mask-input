import {
  blur, chars, click, cut, focus, interactive, interactiveFamily, mask, paste, press, select,
  setValue,
} from '../scenario';

import type { MaskOptions, Scenario } from '../types';

/**
 * Right to left: an element with `dir="rtl"`, and `numericInput`, which
 * fills the mask from its last position while the caret stays put.
 */

const RTL = { attrs: { dir: 'rtl' } };

const MASKS: Record<string, MaskOptions> = {
  static: { mask: '99-99' },
  'numeric-input': { mask: '999-99', numericInput: true },
  'numeric-input-no-placeholder': { mask: '999-99', numericInput: true, placeholder: '' },
  'numeric-input-open-ended': { mask: '9{1,6}', numericInput: true, greedy: false },
  'right-align': { mask: '99-99', rightAlign: true },
  'right-align-off-for-numeric': { alias: 'numeric', rightAlign: false },
};

export const scenarios: Scenario[] = [
  ...interactiveFamily('rtl/typing', MASKS, [
    mask(), focus(), chars('1234'), press('Backspace'), press('Delete'), blur(),
  ]),
  interactive('rtl/dir-attribute/typing', { mask: '99-99' }, [
    mask(), focus(), chars('1234'), press('Backspace'), blur(),
  ], { element: RTL }),
  interactive('rtl/dir-attribute/long-mask', { mask: '(99) 9999-9999' }, [
    mask(), focus(), chars('1234567'), press('Home'), press('End'), press('Backspace'), blur(),
  ], { element: RTL }),
  interactive('rtl/dir-attribute/no-placeholder-greedy', { mask: '9{1,6}', placeholder: '', greedy: true }, [
    mask(), focus(), chars('1234'), press('Backspace'), blur(),
  ], { element: RTL }),
  interactive('rtl/dir-attribute/clicks', { mask: '99-99-99' }, [
    mask(), click(), chars('12'), click(0), click(4), click(8), blur(),
  ], { element: RTL }),
  interactive('rtl/dir-attribute/paste-and-cut', { mask: '99-99-99' }, [
    mask(), focus(), paste('123456'), select(2, 5), cut(), paste('99'), blur(),
  ], { element: RTL }),
  interactive('rtl/dir-attribute/set-value', { mask: '99-99-99' }, [
    mask(), setValue('123456'), setValue('12'), focus(), blur(),
  ], { element: RTL }),
  interactive('rtl/dir-attribute/arrows', { mask: '99-99' }, [
    mask(), focus(), chars('12'), press('ArrowLeft'), press('ArrowRight'), chars('3'), blur(),
  ], { element: RTL }),
  interactive('rtl/dir-attribute/initial-value', { mask: '99-99' }, [
    mask(), focus(), press('Backspace'), blur(),
  ], { element: { ...RTL, value: '1234' } }),
  interactive('rtl/numeric-input/paste-and-set-value', { mask: '999-99', numericInput: true }, [
    mask(), focus(), paste('1234'), blur(), setValue('99'), setValue('12345'),
  ]),
  interactive('rtl/numeric-input/currency', {
    alias: 'currency', numericInput: true, groupSeparator: '.', radixPoint: ',',
  }, [
    mask(), click(), chars('123456'), press('Backspace'), click(0), chars('9'), blur(),
  ]),
];
