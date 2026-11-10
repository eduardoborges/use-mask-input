import {
  blur, chars, cut, focus, interactive, mask, paste, press, remove, select,
} from '../scenario';

import type { Scenario } from '../types';

/** Paste and cut: into an empty mask, over a selection, past the end, and after the mask is gone. */

const CPF = { mask: '999.999.999-99' };

export const scenarios: Scenario[] = [
  interactive('clipboard/paste-into-an-empty-mask', CPF, [
    mask(), focus(), paste('12345678901'), blur(),
  ]),
  interactive('clipboard/paste-an-already-masked-value', CPF, [
    mask(), focus(), paste('123.456.789-01'), blur(),
  ]),
  interactive('clipboard/paste-a-partial-value', CPF, [
    mask(), focus(), paste('123'), paste('45'), blur(),
  ]),
  interactive('clipboard/paste-over-a-selection', CPF, [
    mask(), focus(), chars('11111111111'), select(4, 7), paste('999'), blur(),
  ]),
  interactive('clipboard/paste-in-the-middle', CPF, [
    mask(), focus(), chars('1234'), select(2), paste('99'), blur(),
  ]),
  interactive('clipboard/paste-what-the-mask-rejects', CPF, [
    mask(), focus(), paste('abc'), paste(''), paste('a1b2'), blur(),
  ]),
  interactive('clipboard/paste-more-than-fits', CPF, [
    mask(), focus(), paste('123456789012345'), blur(),
  ]),
  interactive('clipboard/paste-with-surrounding-spaces', CPF, [
    mask(), focus(), paste(' 123 456 '), blur(),
  ]),
  interactive('clipboard/paste-into-a-mask-array', { mask: ['99-99', '999-999'] }, [
    mask(), focus(), paste('1234'), select(0, 5), paste('123456'), blur(),
  ]),
  interactive('clipboard/paste-with-jit-masking', { mask: '99/99/9999', jitMasking: true }, [
    mask(), focus(), paste('1206'), paste('2024'), blur(),
  ]),
  interactive('clipboard/paste-into-currency', { alias: 'currency' }, [
    mask(), focus(), paste('1,234.56'), select(0, 99), paste('-7.5'), blur(),
  ]),
  interactive('clipboard/paste-into-a-read-only-field', CPF, [
    mask(), focus(), paste('12345678901'), blur(),
  ], { element: { attrs: { readonly: '' } } }),

  interactive('clipboard/cut-a-selection', CPF, [
    mask(), focus(), chars('12345678901'), select(4, 7), cut(), blur(),
  ]),
  interactive('clipboard/cut-everything', CPF, [
    mask(), focus(), chars('12345678901'), select(0, 14), cut(), blur(),
  ]),
  interactive('clipboard/cut-with-nothing-selected', CPF, [
    mask(), focus(), chars('123'), cut(), blur(),
  ]),
  interactive('clipboard/cut-across-literals', CPF, [
    mask(), focus(), chars('12345678901'), select(2, 9), cut(), blur(),
  ]),
  interactive('clipboard/cut-in-overwrite-mode', { ...CPF, insertMode: false }, [
    mask(), focus(), chars('123456'), select(1, 3), cut(), blur(),
  ]),
  interactive('clipboard/cut-then-paste-back', CPF, [
    mask(), focus(), chars('12345678901'), select(0, 7), cut(), press('End'), paste('123.456'), blur(),
  ]),

  // Without the mask the browser pastes and cuts by itself.
  interactive('clipboard/paste-after-remove', CPF, [
    mask(), focus(), chars('123'), remove(), paste('abc'), blur(),
  ]),
  interactive('clipboard/cut-after-remove', CPF, [
    mask(), focus(), chars('123456'), remove(), select(1, 3), cut(), blur(),
  ]),
];
