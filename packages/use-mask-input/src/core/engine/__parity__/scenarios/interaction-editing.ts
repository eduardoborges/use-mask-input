import {
  blur, chars, focus, interactive, mask, press, select, text,
} from '../scenario';

import type { KeyStep, Scenario } from '../types';

/**
 * Editing what is already there: Backspace and Delete, selections, insert and
 * overwrite mode, the caret keys, Escape, Tab through the mask, Enter.
 */

const PHONE = { mask: '(99) 9999-9999' };
const CODE = { mask: '99-99-99' };

function times(count: number, key: string): KeyStep[] {
  return Array.from({ length: count }, () => press(key));
}

export const scenarios: Scenario[] = [
  interactive('edit/backspace-from-the-end', PHONE, [
    mask(), focus(), chars('1234567890'), times(11, 'Backspace'), blur(),
  ]),
  interactive('edit/delete-from-the-start', PHONE, [
    mask(), focus(), chars('1234567890'), press('Home'), times(11, 'Delete'), blur(),
  ]),
  interactive('edit/backspace-over-a-literal', CODE, [
    mask(), focus(), chars('1234'), times(3, 'Backspace'), chars('9'), blur(),
  ]),
  interactive('edit/delete-in-the-middle', CODE, [
    mask(), focus(), chars('123456'), select(2), times(3, 'Delete'), blur(),
  ]),
  interactive('edit/backspace-in-the-middle', CODE, [
    mask(), focus(), chars('123456'), select(4), times(3, 'Backspace'), blur(),
  ]),
  interactive('edit/modifiers-on-backspace-and-delete', CODE, [
    mask(), focus(), chars('123456'), press('Backspace', { ctrl: true }), press('Backspace', { shift: true }),
    press('Home'), press('Delete', { ctrl: true }), press('Delete', { shift: true }), blur(),
  ]),
  interactive('edit/type-over-a-selection', PHONE, [
    mask(), focus(), chars('1234567890'), select(1, 6), text('9'), select(0, 14), text('5'), blur(),
  ]),
  interactive('edit/erase-a-selection', PHONE, [
    mask(), focus(), chars('1234567890'), select(5, 9), press('Backspace'), select(0, 4), press('Delete'), blur(),
  ]),
  interactive('edit/insert-in-the-middle', { mask: '9999-9999' }, [
    mask(), focus(), chars('123456'), select(2), chars('99'), blur(),
  ]),
  interactive('edit/insert-into-a-full-mask', { mask: '9999' }, [
    mask(), focus(), chars('1234'), select(1), chars('9'), blur(),
  ]),
  interactive('edit/shift-positions-off', { mask: '99-99-99', shiftPositions: false }, [
    mask(), focus(), chars('123456'), select(1), press('Delete'), press('Backspace'), text('9'), blur(),
  ]),

  interactive('edit/overwrite-mode', { mask: '9999-9999', insertMode: false }, [
    mask(), focus(), chars('12345678'), select(2), chars('99'), press('Backspace'), press('Delete'), blur(),
  ]),
  interactive('edit/overwrite-mode-arrows', { mask: '9999', insertMode: false }, [
    mask(), focus(), chars('1234'), press('ArrowLeft'), press('ArrowLeft'), text('9'), press('ArrowRight'),
    press('Home'), text('8'), press('End'), blur(),
  ]),
  interactive('edit/overwrite-mode-without-visual', { mask: '9999', insertMode: false, insertModeVisual: false }, [
    mask(), focus(), chars('1234'), press('ArrowLeft'), press('ArrowLeft'), text('9'), blur(),
  ]),
  interactive('edit/insert-key-toggles-the-mode', { mask: '9999-9999' }, [
    mask(), focus(), chars('1234'), select(1), press('Insert'), chars('99'), press('Insert'), chars('7'), blur(),
  ]),
  interactive('edit/insert-key-with-a-selection', { mask: '9999-9999' }, [
    mask(), focus(), chars('1234'), select(1, 3), press('Insert'), text('9'), blur(),
  ]),
  interactive('edit/insert-key-ignored-when-the-option-is-set', { mask: '9999', insertMode: true }, [
    mask(), focus(), chars('1234'), select(1), press('Insert'), text('9'), blur(),
  ]),

  interactive('edit/home-end-and-page-keys', PHONE, [
    mask(), focus(), chars('12345'), press('Home'), press('End'), press('PageUp'), press('PageDown'),
    press('Home', { shift: true }), press('End', { shift: true }), press('PageUp', { shift: true }), blur(),
  ]),
  interactive('edit/arrows-move-the-caret', PHONE, [
    mask(), focus(), chars('123'), press('ArrowLeft'), press('ArrowLeft'), text('9'), press('ArrowRight'),
    text('8'), press('ArrowLeft', { shift: true }), press('ArrowLeft', { shift: true }), text('7'), blur(),
  ]),

  interactive('edit/escape-restores-the-focused-value', PHONE, [
    mask(), focus(), chars('1234'), press('Escape'), chars('56'), blur(), focus(), chars('78'),
    press('Escape'), blur(),
  ]),
  interactive('edit/escape-with-undo-disabled', { ...PHONE, undoOnEscape: false }, [
    mask(), focus(), chars('1234'), press('Escape'), blur(),
  ]),
  interactive('edit/escape-with-alt', PHONE, [
    mask(), focus(), chars('1234'), press('Escape', { alt: true }), blur(),
  ]),

  interactive('edit/tab-through-the-parts', { mask: '99-99-99', tabThrough: true }, [
    mask(), focus(), chars('1234'), press('Home'), press('Tab'), press('Tab'), press('Tab', { shift: true }),
    press('Tab'), press('Tab'), press('Tab'), blur(),
  ]),
  interactive('edit/tab-leaves-without-tab-through', CODE, [
    mask(), focus(), chars('12'), press('Tab'), focus(), press('Tab', { shift: true }),
  ]),

  interactive('edit/enter-fires-change', CODE, [
    mask(), focus(), chars('12'), press('Enter'), text('3'), press('Enter'), press('Enter'), blur(),
  ]),
  interactive('edit/enter-submits-the-form', CODE, [
    mask(), focus(), chars('1234'), press('Enter'), chars('56'), press('Enter'), blur(),
  ], { element: { form: true } }),

  interactive('edit/space-skips-an-optional-part', { mask: '99[99]-99' }, [
    mask(), focus(), chars('12'), text(' '), chars('34'), blur(),
  ]),
  interactive('edit/array-shrinks-back', { mask: ['99-99', '999-999'] }, [
    mask(), focus(), chars('123456'), times(3, 'Backspace'), text('9'), blur(),
  ]),
  interactive('edit/alternation-switches-branch', { mask: '(99-99)|(aa-aa)' }, [
    mask(), focus(), chars('12'), times(2, 'Backspace'), chars('ab'), select(0, 5), text('7'), blur(),
  ]),
  interactive('edit/jit-masking-erase', { mask: '99/99/9999', jitMasking: true }, [
    mask(), focus(), chars('1234'), times(2, 'Backspace'), text('5'), blur(),
  ]),
  interactive('edit/quantifier-grows-and-shrinks', { mask: '9{1,5}-a' }, [
    mask(), focus(), chars('123'), text('x'), times(2, 'Backspace'), chars('45x'), blur(),
  ]),

  // What Ctrl does natively differs per platform, so these stay out of the browser.
  interactive('edit/ctrl-shortcuts', PHONE, [
    mask(), focus(), chars('1234'), press('a', { ctrl: true }), text('5'), press('z', { ctrl: true }),
    press('a', { meta: true }), press('c', { ctrl: true }), press('x', { ctrl: true }), press('v', { ctrl: true }), blur(),
  ], { env: 'unit' }),
  interactive('edit/vertical-arrows', PHONE, [
    mask(), focus(), chars('123'), press('ArrowUp'), text('9'), press('ArrowDown'), text('8'),
    press('ArrowUp', { shift: true }), blur(),
  ], { env: 'unit' }),
];
