import {
  assign, attr, blur, call, chars, focus, hover, interactive, mask, option, press, remove, reset,
  setValue, submit, text, unhover,
} from '../scenario';

import type { Scenario } from '../types';

/**
 * The programmatic side: setValue, `el.value`, an initial value, masking
 * again, `option()`, `remove()`, the other instance methods, and forms.
 */

const CODE = { mask: '99-99' };
const IN_A_FORM = { form: true };

export const scenarios: Scenario[] = [
  interactive('value/set-value', CODE, [
    mask(), setValue('1234'), setValue('12'), setValue(''), setValue('abc'), setValue('12-34'), setValue('987654'),
  ]),
  interactive('value/set-value-through-the-static', CODE, [
    mask(), setValue('1234', 'static'), setValue('', 'static'),
  ]),
  interactive('value/set-value-while-focused', CODE, [
    mask(), focus(), setValue('12'), text('3'), setValue('9'), blur(),
  ]),
  interactive('value/set-value-on-an-unmasked-element', CODE, [
    setValue('1234', 'static'), setValue('1234'),
  ]),

  interactive('value/assign', CODE, [
    mask(), assign('1234'), assign('12'), assign(''), assign('zz'), focus(), assign('56'), text('7'), blur(),
  ]),
  interactive('value/assign-with-auto-unmask', { ...CODE, autoUnmask: true }, [
    mask(), assign('1234'), assign('12-34'), focus(), blur(),
  ]),
  interactive('value/assign-without-value-patching', { ...CODE, noValuePatching: true }, [
    mask(), assign('1234'), hover(), unhover(), focus(), text('5'), blur(), assign('12'), focus(), blur(),
  ]),

  interactive('value/initial-value-complete', CODE, [
    mask(), focus(), press('Backspace'), blur(),
  ], { element: { value: '1234' } }),
  interactive('value/initial-value-partial', CODE, [
    mask(), focus(), text('9'), blur(),
  ], { element: { value: '12' } }),
  interactive('value/initial-value-already-masked', CODE, [
    mask(), focus(), blur(),
  ], { element: { value: '12-34' } }),
  interactive('value/initial-value-rejected', CODE, [
    mask(), focus(), blur(),
  ], { element: { value: 'ab' } }),
  interactive('value/initial-value-cleared-when-incomplete', { ...CODE, clearIncomplete: true }, [
    mask(), focus(), blur(),
  ], { element: { value: '123' } }),
  interactive('value/initial-value-in-a-textarea', CODE, [
    mask(), focus(), press('Backspace'), blur(),
  ], { element: { tag: 'textarea', value: '1234' } }),

  interactive('value/mask-again-with-another-mask', CODE, [
    mask(), focus(), chars('1234'), mask({ mask: '9-9-9-9' }), text('5'), mask({ mask: 'aa' }), blur(),
  ]),
  interactive('value/mask-again-with-the-same-mask', CODE, [
    mask(), focus(), chars('12'), mask(), chars('34'), blur(),
  ]),
  interactive('value/mask-again-reuses-the-cached-mask', { mask: 'aa-99', casing: 'upper' }, [
    mask(), focus(), chars('ab12'), mask({ mask: 'aa-99' }), blur(), mask({ mask: 'aa-99', placeholder: '#' }), focus(), blur(),
  ]),

  interactive('value/option-updates-and-remasks', CODE, [
    mask(), focus(), chars('12'), option({ placeholder: '#' }), text('3'), option({ mask: '999-999' }),
    chars('456'), option({ clearIncomplete: true }, true), blur(),
  ]),
  interactive('value/option-reads-a-setting', CODE, [
    mask(), call('option', 'mask'), call('option', 'placeholder'), call('option', 'clearMaskOnLostFocus'),
    call('option', 'nope'), call('option', 42),
  ]),

  interactive('value/remove', CODE, [
    mask(), focus(), chars('12'), remove(), chars('34'), blur(),
  ]),
  interactive('value/remove-through-the-static', CODE, [
    mask(), assign('1234'), remove('static'), assign('56'),
  ]),
  interactive('value/remove-with-auto-unmask', { ...CODE, autoUnmask: true }, [
    mask(), focus(), chars('1234'), remove(), blur(),
  ]),
  interactive('value/remove-an-empty-mask', CODE, [
    mask(), focus(), remove(), blur(),
  ]),
  interactive('value/remove-twice', CODE, [
    mask(), remove(), remove(), remove('static'),
  ]),
  interactive('value/remove-then-mask-again', CODE, [
    mask(), focus(), chars('12'), remove(), mask(), chars('34'), blur(),
  ]),

  interactive('value/instance-methods', CODE, [
    mask(), setValue('12'), call('unmaskedvalue'), call('isComplete'), call('getemptymask'), call('getmetadata'),
    call('hasMaskedValue'), call('isValid'), call('isValid', '12-34'), call('format', '9999'),
    call('format', '11', true), call('unmaskedvalue', '56-78'), call('mask', 'no-such-element'),
  ]),
  interactive('value/instance-methods-on-a-mask-array', { mask: [{ mask: '99-99', code: 'short' }, { mask: '999-999', code: 'long' }] }, [
    mask(), call('getmetadata'), setValue('1234'), call('getmetadata'), setValue('123456'), call('getmetadata'),
    call('getemptymask'),
  ]),

  interactive('value/submit-removes-the-mask', { ...CODE, removeMaskOnSubmit: true }, [
    mask(), focus(), chars('1234'), submit(), blur(),
  ], { element: IN_A_FORM }),
  interactive('value/submit-keeps-the-mask', CODE, [
    mask(), focus(), chars('1234'), submit(), blur(),
  ], { element: IN_A_FORM }),
  interactive('value/submit-an-empty-mask', CODE, [
    mask(), focus(), submit(), blur(),
  ], { element: IN_A_FORM }),
  interactive('value/submit-clears-an-incomplete-value', { ...CODE, clearIncomplete: true }, [
    mask(), focus(), chars('12'), submit(), blur(),
  ], { element: IN_A_FORM }),
  interactive('value/submit-with-auto-unmask', { ...CODE, autoUnmask: true, removeMaskOnSubmit: true }, [
    mask(), focus(), chars('1234'), submit(), blur(),
  ], { element: IN_A_FORM }),
  interactive('value/reset-restores-the-default', CODE, [
    mask(), focus(), chars('5678'), reset(), blur(),
  ], { element: { form: true, value: '1234' } }),
  interactive('value/reset-to-empty', CODE, [
    mask(), focus(), chars('12'), reset(), blur(),
  ], { element: IN_A_FORM }),
  interactive('value/submit-and-reset-without-a-form', CODE, [
    mask(), submit(), reset(),
  ]),

  interactive('value/read-only-toggled', CODE, [
    mask(), focus(), chars('12'), attr('readonly', ''), chars('34'), press('Backspace'), attr('readonly', null),
    chars('56'), blur(),
  ]),
  interactive('value/data-attribute-options', {}, [
    mask(), focus(), chars('1234'), blur(),
  ], { element: { attrs: { 'data-inputmask': "'mask': '99-99', 'placeholder': '#'" } } }),
  interactive('value/data-attribute-per-option', {}, [
    mask(), focus(), chars('19216811'), blur(),
  ], { element: { attrs: { 'data-inputmask-alias': 'ip' } } }),
  interactive('value/data-attributes-ignored', { mask: '99-99', importDataAttributes: false }, [
    mask(), focus(), chars('1234'), blur(),
  ], { element: { attrs: { 'data-inputmask': "'mask': 'aa-aa'" } } }),
  interactive('value/no-options-and-no-attributes', {}, [
    mask(), focus(), chars('12'), blur(),
  ]),
];
