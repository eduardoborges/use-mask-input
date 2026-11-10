import {
  assign, blur, chars, click, focus, hover, interactive, interactiveFamily, mask, press, unhover,
} from '../scenario';

import type { MaskOptions, Scenario } from '../types';

/**
 * Focus, blur, click and hover: when the mask shows, when it clears, where
 * the caret lands, and which events fire on the way out.
 */

const CODE = { mask: '99-99' };

const CARET_ON_CLICK: Record<string, MaskOptions> = {
  lvp: { mask: '(99) 9999-9999', positionCaretOnClick: 'lvp' },
  none: { mask: '(99) 9999-9999', positionCaretOnClick: 'none' },
  select: { mask: '(99) 9999-9999', positionCaretOnClick: 'select' },
  ignore: { mask: '(99) 9999-9999', positionCaretOnClick: 'ignore' },
  'radix-focus': {
    mask: '9{1,5}.99', positionCaretOnClick: 'radixFocus', radixPoint: '.', placeholder: '0',
  },
};

export const scenarios: Scenario[] = [
  interactive('focus/mask-shows-on-focus', CODE, [
    mask(), focus(), blur(), focus(), chars('12'), blur(), focus(), blur(),
  ]),
  interactive('focus/show-mask-on-focus-off', { ...CODE, showMaskOnFocus: false }, [
    mask(), focus(), chars('1'), blur(), focus(), blur(),
  ]),
  interactive('focus/mask-shows-on-hover', CODE, [
    mask(), hover(), unhover(), hover(), click(), unhover(), blur(), hover(), unhover(),
  ]),
  interactive('focus/show-mask-on-hover-off', { ...CODE, showMaskOnHover: false }, [
    mask(), hover(), unhover(), click(), blur(),
  ]),
  interactive('focus/hover-keeps-the-page-placeholder', CODE, [
    mask(), hover(), unhover(), focus(), blur(), hover(), unhover(),
  ], { element: { attrs: { placeholder: 'Enter the code' } } }),
  interactive('focus/hover-with-a-value', CODE, [
    mask(), hover(), unhover(), focus(), blur(),
  ], { element: { value: '12' } }),

  interactive('focus/clear-mask-on-lost-focus-off', { ...CODE, clearMaskOnLostFocus: false }, [
    mask(), focus(), blur(), focus(), chars('12'), blur(),
  ]),
  interactive('focus/clear-incomplete', { ...CODE, clearIncomplete: true }, [
    mask(), focus(), chars('123'), blur(), focus(), chars('1234'), blur(),
  ]),
  interactive('focus/clear-incomplete-keeps-the-template', {
    ...CODE, clearIncomplete: true, clearMaskOnLostFocus: false,
  }, [
    mask(), focus(), chars('123'), blur(), focus(), chars('1234'), blur(),
  ]),
  interactive('focus/optional-tail-clears-on-blur', { mask: '99[-99]' }, [
    mask(), focus(), chars('12'), blur(), focus(), chars('3'), blur(),
  ]),
  interactive('focus/nullable-off', { ...CODE, nullable: false }, [
    mask(), focus(), blur(), focus(), chars('1'), press('Backspace'), blur(),
  ]),
  interactive('focus/auto-unmask', { ...CODE, autoUnmask: true }, [
    mask(), focus(), chars('1234'), blur(), assign('5678'), focus(), blur(),
  ]),
  interactive('focus/complete-then-cleared', CODE, [
    mask(), focus(), chars('1234'), press('Backspace'), press('Backspace'), press('Backspace'),
    press('Backspace'), blur(),
  ]),
  interactive('focus/change-fires-once-per-edit', CODE, [
    mask(), focus(), chars('12'), blur(), focus(), blur(), focus(), chars('3'), blur(),
  ]),

  interactive('focus/click-lands-on-the-caret', { mask: '(99) 9999-9999' }, [
    mask(), click(), chars('123'), click(0), click(8), click(2), click(14), blur(),
  ]),
  ...interactiveFamily('focus/position-caret-on-click', CARET_ON_CLICK, [
    mask(), click(), chars('12'), click(0), click(8), click(), blur(), click(3), blur(),
  ]),
  interactive('focus/click-on-a-complete-value', CODE, [
    mask(), click(), chars('1234'), blur(), click(1), click(), blur(),
  ]),
  interactive('focus/repeated-clicks', CODE, [
    mask(), click(), click(), chars('1'), click(0), click(0), blur(),
  ]),

  interactive('focus/arriving-with-tab', CODE, [
    mask(), focus('tab'), chars('12'), press('Tab'), focus('tab'), press('Tab', { shift: true }),
  ]),
  interactive('focus/position-caret-on-tab-off', { ...CODE, positionCaretOnTab: false }, [
    mask(), focus('tab'), chars('12'), blur(), focus('tab'), blur(),
  ]),
  interactive('focus/tab-after-the-pointer-left', CODE, [
    mask(), hover(), unhover(), focus('tab'), chars('1'), blur(), focus('tab'), blur(),
  ]),

  interactive('focus/masked-while-focused', CODE, [
    focus(), mask(), chars('12'), blur(),
  ]),
  interactive('focus/masked-while-focused-with-a-value', CODE, [
    focus(), mask(), chars('9'), blur(),
  ], { element: { value: '12' } }),
  interactive('focus/credit-card-autocomplete-hides-the-mask', CODE, [
    mask(), focus(), chars('12'), blur(), focus(), blur(),
  ], { element: { attrs: { autocomplete: 'cc-number' } } }),
];
