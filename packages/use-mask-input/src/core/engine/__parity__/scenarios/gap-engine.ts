import {
  blur, call, chars, click, dispatch, flush, focus, hook, ime, interactive, mask, nativeInput, orphan,
  press, script, select, staticCase, text, unhook, unsettled,
} from '../scenario';

import type { ElementSetup, Scenario } from '../types';

/**
 * Engine statements the rest of the corpus leaves unreached: the hooks, an
 * element that lost its engine, odd carets and events, alternations that
 * merge or retry, and the corrections of the datetime alias.
 */

const CODE = { mask: '99-99' };
const DATE = { alias: 'datetime', inputFormat: 'dd/MM/yyyy' };

const RTL: ElementSetup = { attrs: { dir: 'rtl' } };
const EDITING_HOST: ElementSetup = { tag: 'div', attrs: { contenteditable: 'true' } };

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

/** Any digit except a 5 in front, so shifting a 5 to the front fails. */
const NO_LEADING_FIVE = {
  validator: (chr: string, _maskset: unknown, pos: number) => /[0-9]/.test(chr) && !(pos === 0 && chr === '5'),
};

export const scenarios: Scenario[] = [
  // --- hooks -----------------------------------------------------------------
  interactive('gap/engine/hook/apply-mask', CODE, [
    hook('applyMaskHook', 'prototype'), mask(), focus(), text('1'), blur(),
  ]),
  interactive('gap/engine/hook/caret-key-event-write-buffer', CODE, [
    mask(), hook('caretHook'), hook('keyEventHook'), hook('writeBufferHook'), focus(), text('1'),
    press('ArrowLeft'), unhook('caretHook'), unhook('keyEventHook'), unhook('writeBufferHook'), text('2'), blur(),
  ]),

  // --- event ruler and events ------------------------------------------------
  // The first event after the engine is gone masks the element again from the stored options.
  interactive('gap/engine/ruler/orphan-masks-again', CODE, [
    mask(), focus(), chars('12'), orphan(), text('3'), text('4'), blur(),
  ]),
  // An element of another frame is no `Element` of this window: it gets no listeners.
  interactive('gap/engine/events/element-of-another-frame', CODE, [
    script('masks an input of an iframe, sets its value and removes the mask', ({ engine }) => {
      const frame = document.createElement('iframe');
      document.body.append(frame);
      try {
        const doc = frame.contentDocument as Document;
        const input = doc.createElement('input');
        doc.body.append(input);
        engine({ mask: '99-99' }).mask(input);
        const instance = Reflect.get(input, 'inputmask') as { setValue(value: string): void; remove(): void };
        instance.setValue('1234');
        const afterSetValue = input.value;
        input.value = '5678';
        const afterAssign = input.value;
        instance.remove();
        return [afterSetValue, afterAssign, input.value, Reflect.get(input, 'inputmask') === undefined];
      } finally {
        frame.remove();
      }
    }),
  ]),
  // Without `InputEvent` the engine builds its `input` event with `createEvent`.
  interactive('gap/engine/events/input-event-unavailable', CODE, [
    mask(), focus(),
    script('types 5 while InputEvent throws', ({ dispatch: send }) => {
      const original = globalThis.InputEvent;
      Reflect.set(globalThis, 'InputEvent', function Unavailable() {
        throw new TypeError('InputEvent is not available');
      });
      try {
        send(new KeyboardEvent('keydown', { key: '5', bubbles: true, cancelable: true }));
      } finally {
        Reflect.set(globalThis, 'InputEvent', original);
      }
    }),
    blur(),
  ]),

  // --- keys and native input -------------------------------------------------
  interactive('gap/engine/keys/keydown-without-a-key', CODE, [
    mask(), focus(), text('1'),
    script('dispatches a keydown with an empty key', ({ dispatch: send }) => {
      send(new KeyboardEvent('keydown', { bubbles: true, cancelable: true }));
    }),
    blur(),
  ]),
  interactive('gap/engine/keys/overwrite-mode-arrow-left-rtl', { ...CODE, insertMode: false }, [
    mask(), focus(), chars('12'), press('ArrowLeft'), press('ArrowLeft'), text('3'), blur(),
  ], { element: RTL }),
  interactive('gap/engine/keys/iphone-overwrite-mode', { ...CODE, insertMode: false }, [
    mask(), focus(), chars('123'), press('ArrowLeft'), press('BACKSPACE_SAFARI'), blur(),
  ], { environment: { userAgent: IPHONE }, watch: ['autocorrect'] }),
  // A character inserted before the last one, with the caret left at the end.
  interactive('gap/engine/native/insert-before-the-last-character', { mask: '9{*}' }, [
    mask(), focus(), chars('12'), nativeInput({ value: '132' }), blur(),
  ]),
  // An emptied editing host can be left holding only line breaks, with the caret after them.
  interactive('gap/engine/native/editing-host-left-with-line-breaks', CODE, [
    mask(), focus(),
    script('leaves two line breaks with the caret after them and fires input', ({ element, dispatch: send }) => {
      element.replaceChildren(document.createElement('br'), document.createElement('br'));
      document.getSelection()?.setBaseAndExtent(element, 2, element, 2);
      send(new InputEvent('input', { inputType: 'deleteContentBackward', bubbles: true }));
    }),
    text('5'), blur(),
  ], { element: EDITING_HOST }),
  // A desktop browser drops the plain insert that repeats a composition.
  interactive('gap/engine/native/composition-repeated-as-insert', CODE, [
    mask(), focus(), ime('1'), nativeInput({ data: '2' }), blur(),
  ], { environment: { touch: false } }),
  interactive('gap/engine/native/composition-repeated-as-insert/browser', CODE, [
    mask(), focus(), ime('1'), nativeInput({ data: '2' }), blur(),
  ], { env: 'browser' }),

  // --- caret and clicks ------------------------------------------------------
  interactive('gap/engine/caret/setvalue-with-an-array', CODE, [
    mask(), focus(), dispatch('setvalue', ['1234', [1, 3]]), blur(),
  ]),
  interactive('gap/engine/caret/setvalue-with-an-array-rtl', CODE, [
    mask(), focus(), dispatch('setvalue', ['1234', [1, 3]]), blur(),
  ], { element: RTL }),
  interactive('gap/engine/caret/empty-editing-host', { ...CODE, showMaskOnFocus: false, showMaskOnHover: false }, [
    mask(), click(), text('1'), blur(),
  ], { element: EDITING_HOST }),
  interactive('gap/engine/caret/click-over-a-selection', CODE, [
    mask(), focus(), chars('123'), unsettled(click(1)), select(0, 2), flush(), blur(),
  ]),
  // The mask is shown already, so focusing does not move the caret off the clicked 0.
  interactive('gap/engine/caret/radix-focus-before-the-first-position', {
    mask: '(999) 99.99', radixPoint: '.', positionCaretOnClick: 'radixFocus', clearMaskOnLostFocus: false,
  }, [
    mask(), click(0), click(0), text('5'), blur(),
  ]),

  // --- check-val and validation ----------------------------------------------
  // `onBeforeMask` may answer with anything that has a `split`.
  staticCase('gap/engine/check-val/split-with-holes', {
    mask: '9-9-9', onBeforeMask: () => ({ split: () => ['1', undefined, '2'] }),
  }, ['x']),
  // Characters typed on the leading statics are typed again, and one lands on a static further on.
  staticCase('gap/engine/check-val/static-matches-typed-again', { mask: '[-((-|9)){2}]-' }, [
    '', '1', '12', '123', '-', '--', '---', '-1', '1-', '-1-', '1-2', '-12-', 'a',
  ]),
  staticCase('gap/engine/tests/negative-max-test-pos', { mask: '99', _maxTestPos: -1 }, ['', '12']),
  interactive('gap/engine/validation/keep-static-without-an-alternation', { ...CODE, keepStatic: true }, [
    mask(), focus(), chars('123'), press('Backspace'), blur(),
  ]),
  staticCase('gap/engine/validation/pre-validation-answers-nothing', {
    mask: '99-99', preValidation: () => undefined,
  }, ['', '12', '1234']),
  // A typed x removes the character before it.
  staticCase('gap/engine/validation/pre-validation-removes-one-position', {
    mask: '99-99', preValidation: (_buffer: string[], pos: number, c: string) => (c === 'x' ? { remove: pos - 1 } : true),
  }, ['1x', '12x3', '1234x']),
  // A 0 typed in front lands on the position after it.
  staticCase('gap/engine/validation/validator-moves-the-position', {
    mask: 'XX-XX',
    definitions: {
      X: { validator: (chr: string, _maskset: unknown, pos: number) => (chr === '0' && pos === 0 ? { pos: 1, c: '0' } : /[0-9]/.test(chr)) },
    },
  }, ['0', '01', '012', '10']),
  interactive('gap/engine/validation/space-on-a-space-literal', { mask: '99 99' }, [
    mask(), focus(), chars('12'), select(2), text(' '), blur(),
  ]),
  interactive('gap/engine/validation/separator-over-a-full-mask', CODE, [
    mask(), focus(), chars('1234'), select(2), text('-'), blur(),
  ]),
  interactive('gap/engine/validation/erase-that-cannot-shift', { mask: 'XXX', definitions: { X: NO_LEADING_FIVE } }, [
    mask(), focus(), chars('152'), select(0), press('Delete'), blur(),
  ]),
  // The insert at 0 leaves an empty exclusion list there, which typing over a selection clears.
  interactive('gap/engine/validation/excludes-cleared-over-a-selection', { mask: '(9|a)(9|a)(9|a)' }, [
    mask(), focus(), chars('12'), select(0), text('3'), select(0, 2), text('a'), blur(),
  ]),
  staticCase('gap/engine/validation/complete-with-an-alternation-left', { mask: '((a|(aa|-))){2}' }, [
    '', 'a', 'aa', 'a-', '-a', 'aaa', 'aaaa', '--', 'a1',
  ]),

  // --- alternations ----------------------------------------------------------
  // A definition without a validator takes any character, so `9` is a subset of it.
  staticCase('gap/engine/alternation/subset-of-anything', {
    mask: '(X|9)-9', definitions: { X: { casing: 'upper' } },
  }, ['', '1', 'a', '1-2', 'a-2']),
  staticCase('gap/engine/alternation/merge-below-the-alternation', { mask: '((a|9)(a|9))|(999)' }, [
    '', '1', '12', '123', 'a', 'ab', '1a', 'a1', '9a9',
  ]),
  staticCase('gap/engine/alternation/nested-three-deep', { mask: '(9|(a|(b|9)))-9' }, [
    '', '1', '12', 'a', 'a1', 'b', 'b1', '9a9',
  ]),
  staticCase('gap/engine/alternation/nested-same-first-definition', { mask: '(c|(9a|9b))-9' }, [
    '', '1', '1a', '1b', '1a2', 'c', 'c1', '9c2',
  ]),
  staticCase('gap/engine/alternation/optional-against-required', { mask: '(a|[a]b)' }, [
    '', 'a', 'b', 'ab', 'aa', '1',
  ]),
  // The retry fails on an alternative already ruled out, so the engine retries from the position before.
  interactive('gap/engine/alternation/retry-at-an-earlier-decision', {
    mask: '(a|(99|[9]a)a)', keepStatic: 2, insertMode: false,
  }, [
    mask(), focus(), press('Delete'), chars('11-'), press('Backspace'), blur(),
  ]),
  interactive('gap/engine/alternation/retry-without-an-alternation-left', { mask: '((a){2}|a)', keepStatic: 2 }, [
    mask(), focus(), chars('99a9b9'), blur(),
  ]),
  // The optional static 0 can stand for the 9 of the other branch: the engine sets `keepStatic` there.
  interactive('gap/engine/alternation/optional-static-against-a-definition', { mask: '([0]9)|(9a)' }, [
    mask(), focus(), chars('05'), blur(), focus(), select(0, 2), chars('5a'), blur(),
  ]),

  // --- datetime --------------------------------------------------------------
  staticCase('gap/engine/datetime/twelve-am', { alias: 'datetime', inputFormat: 'hh:mm TT' }, ['1230AM', '1230PM']),
  staticCase('gap/engine/datetime/hours-with-a-digit-count', { alias: 'datetime', inputFormat: 'h3:mm' }, ['', '012:30', '1230']),
  staticCase('gap/engine/datetime/milliseconds-of-two-digits', { alias: 'datetime', inputFormat: 'ss.L' }, ['12.34']),
  staticCase('gap/engine/datetime/day-name-in-the-output', { ...DATE, outputFormat: 'ddd dd' }, ['15/06/2021']),
  staticCase('gap/engine/datetime/min-as-a-date-object', () => ({
    ...DATE,
    min: {
      date: new Date(2020, 0, 1), day: '01', month: '01', year: '2020',
    },
  }), ['15/06/2021', '15/06/2019']),
  staticCase('gap/engine/datetime/am-pm-between-min-and-max', {
    alias: 'datetime', inputFormat: 'TT hh:mm', min: 'PM 02:00', max: 'AM 11:00',
  }, ['A', 'P', 'AM01', 'PM03']),
  interactive('gap/engine/datetime/value-is-a-date', DATE, [
    mask(), call('format', new Date(2021, 4, 6)), call('isValid', new Date(2021, 4, 6)),
  ]),
  // A year placeholder of digits completes the year, and 2010 has no 29 February.
  interactive('gap/engine/datetime/29-february-loses-its-leap-year', { ...DATE, placeholder: '__/__/0000' }, [
    mask(), focus(), chars('29012020'), select(4), text('2'), select(8), text('1'), blur(),
  ]),
  // Erasing the 1 of 01 shifts the year's 2 into the month, which skips validation.
  interactive('gap/engine/datetime/30-february-after-a-shift', DATE, [
    mask(), focus(), chars('30012020'), select(4), press('Delete'), select(5), text('/'), blur(),
  ]),
  // Inserting into a full date fails, so the alias makes the typed 3 the day 30.
  interactive('gap/engine/datetime/digit-that-fits-with-a-zero', { ...DATE, insertMode: true }, [
    mask(), focus(), chars('15122020'), select(0), text('3'), blur(),
  ]),
  interactive('gap/engine/datetime/insert-into-a-full-month', { ...DATE, insertMode: true }, [
    mask(), focus(), chars('15122020'), select(3), text('1'), blur(),
  ]),
  interactive('gap/engine/datetime/letter-before-am-pm', { alias: 'datetime', inputFormat: 'hh:mm TT' }, [
    mask(), focus(), chars('1230'), select(5), text('x'), blur(),
  ]),
];
