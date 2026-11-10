import {
  after, autofill, blur, chars, focus, ime, interactive, mask, mobileKey, nativeInput, press,
  select, text, typing,
} from '../scenario';

import type { Scenario } from '../types';

/**
 * Input that does not arrive as a usable keydown: the browser edits the value
 * and fires `input`, and the engine works out what changed. `inputEventOnly`
 * takes that road for every key; mobile keyboards, IMEs and autofill always do.
 */

const CODE = { mask: '99-99' };

export const scenarios: Scenario[] = [
  typing('native/input-event-only/typing', { ...CODE, inputEventOnly: true }, '1234'),
  typing('native/input-event-only/rejected-characters', { ...CODE, inputEventOnly: true }, '1a2b'),
  interactive('native/input-event-only/erasing', { ...CODE, inputEventOnly: true }, [
    mask(), focus(), chars('1234'), press('Backspace'), press('Backspace'), select(1), press('Delete'),
    text('9'), blur(),
  ]),
  interactive('native/input-event-only/selection', { mask: '999.999', inputEventOnly: true }, [
    mask(), focus(), chars('123456'), select(1, 5), text('9'), blur(),
  ]),
  typing('native/input-event-only/currency', { alias: 'currency', inputEventOnly: true }, '1234.5'),

  interactive('native/mobile-keyboard', CODE, [
    mask(), focus(), mobileKey('1'), mobileKey('2'), mobileKey('a'), mobileKey('3'),
    nativeInput({ inputType: 'deleteContentBackward', key: 'Unidentified' }), mobileKey('4'), blur(),
  ]),
  interactive('native/mobile-keyboard-several-characters', CODE, [
    mask(), focus(), nativeInput({ data: '12', key: 'Unidentified' }), nativeInput({ data: '34' }), blur(),
  ]),
  interactive('native/composition', CODE, [
    mask(), focus(), ime('1'), nativeInput({ data: '1', key: 'Process' }), ime('2'), ime('3'), blur(),
  ]),
  interactive('native/autofill', CODE, [
    mask(), autofill('1234'), focus(), autofill('56'), autofill('12-34'), autofill(''), blur(),
  ]),
  interactive('native/autofill-what-the-mask-rejects', CODE, [
    mask(), focus(), autofill('abcd'), autofill('1a2b'), blur(),
  ]),
  interactive('native/replace-in-the-middle', CODE, [
    mask(), focus(), chars('1234'), nativeInput({ value: '19-34', caret: 2, inputType: 'insertReplacementText' }), blur(),
  ]),
  interactive('native/forward-delete', CODE, [
    mask(), focus(), chars('1234'), select(1), nativeInput({ inputType: 'deleteContentForward' }), blur(),
  ]),

  // The engine drops a keydown that repeats the key of an `input` event it
  // saw less than 10ms before. `after(0, …)` is that close.
  interactive('native/keydown-right-after-the-same-input', CODE, [
    mask(), focus(), nativeInput({ data: '1' }), after(0, text('1')), text('1'), after(5, text('2')),
    nativeInput({ data: '3' }), after(20, text('3')), blur(),
  ]),

  // Outside the US layout the browser driver inserts the text instead of
  // pressing keys, so these arrive without a keydown there.
  typing('native/accented-letters', { mask: '**-**' }, 'é1ü2'),
  typing('native/unicode-digits', CODE, '١٢٣٤'),
  typing('native/cyrillic-uppercased', { mask: 'AA-AA' }, 'жяшь'),
];
