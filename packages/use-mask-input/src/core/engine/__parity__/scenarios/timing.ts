import {
  blur, burst, call, chars, checkValidity, click, flush, focus, interactive, mask, press, remove,
  reset, submit, text, unsettled,
} from '../scenario';

import type { Scenario } from '../types';

/**
 * What depends on when timers run. The engine defers a good part of its work
 * with `setTimeout(0)`; `unsettled(step)` leaves those timers pending so the
 * next step lands before them, and `burst` types faster than they can fire.
 */

const CODE = { mask: '99-99' };

export const scenarios: Scenario[] = [
  interactive('timing/steady-typing', CODE, [
    mask(), focus(), text('1234'), blur(),
  ]),
  interactive('timing/burst-typing', CODE, [
    mask(), focus(), burst('1234'), blur(),
  ]),
  interactive('timing/burst-typing-then-erasing', CODE, [
    mask(), focus(), burst('1234'), unsettled(press('Backspace')), unsettled(press('Backspace')), flush(), blur(),
  ]),
  interactive('timing/blur-before-the-complete-timer', CODE, [
    mask(), focus(), unsettled(text('1234')), blur(),
  ]),
  interactive('timing/typing-before-the-focus-timer', CODE, [
    mask(), unsettled(focus()), text('1'), text('2'), blur(),
  ]),
  interactive('timing/remove-before-the-focus-timer', CODE, [
    mask(), unsettled(focus()), remove(), flush(), blur(),
  ]),
  interactive('timing/typing-before-the-click-timer', { mask: '(99) 9999' }, [
    mask(), focus(), chars('12'), unsettled(click(0)), text('3'), flush(), blur(),
  ]),
  interactive('timing/enter-defers-change', CODE, [
    mask(), focus(), chars('12'), unsettled(press('Enter')), text('3'), flush(), blur(),
  ]),
  interactive('timing/reading-right-after-reset', CODE, [
    mask(), focus(), chars('5678'), unsettled(reset()), call('unmaskedvalue'), flush(), blur(),
  ], { element: { form: true, value: '1234' } }),
  interactive('timing/reset-then-typing', CODE, [
    mask(), focus(), chars('56'), unsettled(reset()), text('7'), flush(), blur(),
  ], { element: { form: true, value: '12' } }),
  interactive('timing/submit-puts-the-mask-back-later', { ...CODE, removeMaskOnSubmit: true }, [
    mask(), focus(), chars('1234'), unsettled(submit()), flush(), blur(),
  ], { element: { form: true } }),
  interactive('timing/invalid-then-click-refocuses-later', { ...CODE, validationEventTimeOut: 30 }, [
    mask(), checkValidity(), unsettled(click()), flush(), text('1'), blur(),
  ], { element: { form: true, attrs: { required: '' } } }),
  interactive('timing/invalid-then-focus', CODE, [
    mask(), checkValidity(), focus(), blur(),
  ], { element: { attrs: { required: '' } } }),
  interactive('timing/flush-with-nothing-pending', CODE, [
    mask(), flush(), focus(), flush(), flush(), blur(),
  ]),
  // Skips the reads that reach into the engine between steps (`el.value`,
  // `unmaskedvalue()`, `isComplete()`).
  interactive('timing/unobserved-engine', { mask: '9{1,5}.99', radixPoint: '.', autoUnmask: true }, [
    mask(), focus(), chars('1234'), press('Backspace'), text('.'), chars('56'), blur(),
  ], { passive: true }),
];
