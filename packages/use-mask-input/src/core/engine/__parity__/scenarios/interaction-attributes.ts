import {
  blur, chars, click, focus, interactive, mask, paste, press, setValue,
} from '../scenario';

import type { ElementSetup, Scenario, Step } from '../types';

/**
 * What the element itself brings: maxlength, readonly, disabled, inputmode,
 * a placeholder, its type, and whether it is an input at all.
 */

const CODE = { mask: '99-99' };

const TYPE_AND_LEAVE: Step[] = [mask(), focus(), ...chars('1234'), blur()];

function withAttrs(attrs: Record<string, string>): { element: ElementSetup } {
  return { element: { attrs } };
}

function ofType(type: string): { element: ElementSetup } {
  return { element: { type } };
}

export const scenarios: Scenario[] = [
  interactive('attributes/maxlength-shorter-than-the-mask', CODE, TYPE_AND_LEAVE, withAttrs({ maxlength: '3' })),
  interactive('attributes/maxlength-that-fits', CODE, TYPE_AND_LEAVE, withAttrs({ maxlength: '5' })),
  interactive('attributes/maxlength-on-an-open-ended-mask', { alias: 'integer' }, [
    mask(), focus(), chars('1234567'), blur(),
  ], withAttrs({ maxlength: '5' })),
  interactive('attributes/maxlength-with-input-event-only', { ...CODE, inputEventOnly: true }, TYPE_AND_LEAVE, withAttrs({ maxlength: '5' })),
  interactive('attributes/maxlength-with-a-selection', CODE, [
    mask(), focus(), chars('1234'), paste('99'), blur(),
  ], withAttrs({ maxlength: '5' })),

  interactive('attributes/read-only', CODE, [
    mask(), focus(), chars('12'), press('Backspace'), paste('34'), press('Tab'), setValue('56'),
  ], withAttrs({ readonly: '' })),
  interactive('attributes/read-only-with-tab-through', { ...CODE, tabThrough: true }, [
    mask(), setValue('1234'), focus(), press('Tab'), press('Tab'), blur(),
  ], withAttrs({ readonly: '' })),
  interactive('attributes/disabled', CODE, [
    mask(), click(), chars('12'), setValue('34'), focus(), blur(),
  ], withAttrs({ disabled: '' })),

  interactive('attributes/inputmode-from-the-page-is-kept', CODE, TYPE_AND_LEAVE, withAttrs({ inputmode: 'tel' })),
  interactive('attributes/inputmode-from-the-options', { ...CODE, inputmode: 'numeric' }, TYPE_AND_LEAVE),
  interactive('attributes/inputmode-from-an-alias', { alias: 'email' }, [mask(), focus(), blur()]),
  interactive('attributes/placeholder-comes-back', CODE, [
    mask(), focus(), chars('12'), blur(), focus(), press('Backspace'), press('Backspace'), blur(),
  ], withAttrs({ placeholder: '00-00' })),

  interactive('attributes/type-tel', CODE, TYPE_AND_LEAVE, ofType('tel')),
  interactive('attributes/type-password', CODE, TYPE_AND_LEAVE, ofType('password')),
  interactive('attributes/type-search', CODE, TYPE_AND_LEAVE, ofType('search')),
  interactive('attributes/type-url', { alias: 'url' }, [mask(), focus(), ...chars('a.io'), blur()], ofType('url')),
  interactive('attributes/type-text', CODE, TYPE_AND_LEAVE, ofType('text')),
  interactive('attributes/type-email-is-not-masked', CODE, TYPE_AND_LEAVE, ofType('email')),
  interactive('attributes/type-number-is-not-masked', CODE, TYPE_AND_LEAVE, ofType('number')),
  interactive('attributes/type-unknown-falls-back-to-text', CODE, TYPE_AND_LEAVE, ofType('made-up')),
  interactive('attributes/type-allowed-by-the-options', { ...CODE, supportsInputType: ['email'] }, [
    mask(), focus(), blur(),
  ], ofType('email')),

  interactive('attributes/textarea', CODE, [
    mask(), focus(), chars('1234'), press('Enter'), press('Backspace'), blur(),
  ], { element: { tag: 'textarea' } }),
  interactive('attributes/textarea-click-and-paste', { mask: '999.999' }, [
    mask(), click(), paste('123456'), click(2), chars('9'), blur(),
  ], { element: { tag: 'textarea' } }),
];
