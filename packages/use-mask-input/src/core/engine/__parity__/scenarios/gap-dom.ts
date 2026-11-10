import {
  assign, blur, call, chars, checkValidity, click, cut, dispatch, focus, hook, hover, ime,
  interactive, mask, nativeInput, orphan, paste, press, remove, script, select, setValue, spy,
  submit, text, unhook, unhover,
} from '../scenario';

import type { ElementSetup, Scenario, ScenarioContext } from '../types';

/**
 * The DOM side of the engine that the rest of the corpus leaves out: elements
 * that are not text controls, an element that lost its instance, the hooks,
 * a page without touch support or on an iPhone, and the arms of the event
 * handlers that take an odd selection or an odd event to reach.
 */

const CODE = { mask: '99-99' };

const EDITING_HOST: ElementSetup = { tag: 'div', attrs: { contenteditable: 'true' } };
const PLAIN_ELEMENT: ElementSetup = { tag: 'div' };
const FOCUSABLE_ELEMENT: ElementSetup = { tag: 'div', attrs: { tabindex: '0' } };
const RTL: ElementSetup = { attrs: { dir: 'rtl' } };

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export const scenarios: Scenario[] = [
  // An editing host has no `value`: the engine defines one over its text, and
  // reads and sets the caret through the document's selection.
  interactive('gap/dom/editing-host/typing', CODE, [
    mask(), focus(), chars('1234'), press('Backspace'), blur(),
  ], { element: EDITING_HOST }),
  interactive('gap/dom/editing-host/click-and-erase', { mask: '999.999' }, [
    mask(), click(), chars('1234'), click(1), press('Delete'), select(2, 5), text('9'), blur(),
  ], { element: EDITING_HOST }),
  interactive('gap/dom/editing-host/initial-text', CODE, [
    mask(), focus(), press('Backspace'), assign('56'), setValue('7890'), remove(), blur(),
  ], { element: { ...EDITING_HOST, value: '1234' } }),
  interactive('gap/dom/editing-host/paste-and-cut', { mask: '999.999' }, [
    mask(), focus(), paste('123456'), select(1, 5), cut(), blur(),
  ], { element: EDITING_HOST }),
  interactive('gap/dom/editing-host/arrows-and-tab', CODE, [
    mask(), focus('tab'), chars('12'), press('ArrowLeft'), press('ArrowLeft', { shift: true }), text('9'),
    press('Tab'),
  ], { element: EDITING_HOST }),

  // Any other element is supported in part: a `value` and `setvalue`, no events.
  interactive('gap/dom/partial/set-value', CODE, [
    mask(), setValue('1234'), setValue('12'), assign('34'), call('unmaskedvalue'), focus(), text('5'), remove(),
  ], { element: PLAIN_ELEMENT }),
  interactive('gap/dom/partial/focusable', CODE, [
    mask(), focus(), setValue('12'), dispatch('setvalue', ['1234', 2]), click(1), blur(),
  ], { element: { ...FOCUSABLE_ELEMENT, value: '9' } }),
];
