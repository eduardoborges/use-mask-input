/* eslint-disable import-x/no-extraneous-dependencies */
import { userEvent } from '@vitest/browser/context';
import { createElement, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import {
  afterEach, describe, expect, it,
} from 'vitest';

import useMaskInput from './useMaskInput';
import withMask from './withMask';

import type { ReactElement } from 'react';
import type { Root } from 'react-dom/client';
import type { Mask, Options } from '../types';

/**
 * The React counterpart of `src/vue/directive.browser.spec.ts`, and the parts
 * jsdom cannot prove.
 *
 * The `unit` project deliberately never simulates a keystroke — see the header
 * comments in core/optionsPassthrough.spec.ts and core/maxLength.spec.ts for
 * why. jsdom reports `ontouchstart`, so Inputmask takes its mobile path and
 * clears `maxlength` itself; caret and selection behaviour is approximate; and
 * simulated input does not round-trip through the engine the way a real browser
 * does. #191 is therefore covered there by calling `stripMaxLength` directly
 * rather than by symptom. Here it is the symptom.
 *
 * Mounting goes through `createRoot` rather than a testing library, mirroring
 * how the Vue specs hand-roll `createApp`: these tests drive real Chromium
 * events, and an `act` environment would only add warnings around them.
 */

let active: { root: Root; host: HTMLDivElement } | null = null;

function mount(element: ReactElement): HTMLInputElement {
  const host = document.createElement('div');
  document.body.appendChild(host);

  const root = createRoot(host);
  flushSync(() => { root.render(element); });
  active = { root, host };

  const input = host.querySelector('input');
  if (!input) throw new Error('no input rendered');

  return input;
}

function unmountActive(): void {
  active?.root.unmount();
  active?.host.remove();
  active = null;
}

afterEach(unmountActive);

/**
 * The text the user actually sees.
 *
 * Inputmask replaces the element's `value` property, and under `autoUnmask` its
 * getter returns the *unmasked* value. Reading the masked display therefore has
 * to go through the native descriptor.
 */
function displayed(el: HTMLInputElement): string {
  const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  return native?.get?.call(el) as string;
}

const nextFrame = () => new Promise((resolve) => {
  requestAnimationFrame(() => resolve(null));
});

/**
 * Inputmask repositions the caret when the field receives focus. Typing into
 * that gap lands the digits in the wrong section — on numeric and currency
 * masks they end up in the decimal part — and it looks exactly like a library
 * bug when it is not one. So: focus, then leave a beat.
 */
async function focus(el: HTMLInputElement) {
  await userEvent.click(el);
  await nextFrame();
}

function renderHooked(mask: Mask, options?: Options, props?: Record<string, unknown>) {
  function Field() {
    const ref = useMaskInput({ mask, options });
    return createElement('input', { ...props, ref });
  }

  return mount(createElement(Field));
}

describe('typing through a mask in a real browser', () => {
  it('formats a cpf alias as the user types', async () => {
    const input = renderHooked('cpf');

    await focus(input);
    await userEvent.type(input, '12345678901');

    expect(displayed(input)).toBe('123.456.789-01');
  });

  it('formats a raw pattern as the user types', async () => {
    const input = renderHooked('(99) 99999-9999');

    await focus(input);
    await userEvent.type(input, '11987654321');

    expect(displayed(input)).toBe('(11) 98765-4321');
  });

  it('matches the longer pattern from an array as input grows', async () => {
    const input = renderHooked(['999-999', '999-999-999']);

    await focus(input);
    await userEvent.type(input, '123456789');

    expect(displayed(input)).toBe('123-456-789');
  });

  it('formats through withMask, with no hook involved', async () => {
    const input = mount(createElement('input', { ref: withMask('cpf') }));

    await focus(input);
    await userEvent.type(input, '12345678901');

    expect(displayed(input)).toBe('123.456.789-01');
  });

  it('exposes the typed digits through unmaskedValue()', async () => {
    let ref: ReturnType<typeof useMaskInput> | undefined;

    function Field() {
      ref = useMaskInput({ mask: 'cpf' });
      return createElement('input', { ref });
    }

    const input = mount(createElement(Field));

    await focus(input);
    await userEvent.type(input, '12345678901');

    expect(displayed(input)).toBe('123.456.789-01');
    expect(ref?.unmaskedValue()).toBe('12345678901');
  });
});

describe('maxLength on a masked input (#191)', () => {
  it('does not block typing on a literal-bearing mask', async () => {
    // jsdom cannot show this: it reports ontouchstart, so Inputmask clears the
    // attribute itself there and the assertion proves nothing. Without the fix
    // the browser counts the mask placeholder against maxlength and refuses the
    // keystroke before Inputmask ever sees it.
    const input = renderHooked('cpf', undefined, { maxLength: 11 });

    await focus(input);
    await userEvent.type(input, '12345678901');

    expect(displayed(input)).toBe('123.456.789-01');
  });

  it('does not block typing when the mask comes from withMask', async () => {
    const input = mount(createElement('input', {
      maxLength: 11,
      ref: withMask('(99) 99999-9999'),
    }));

    await focus(input);
    await userEvent.type(input, '11987654321');

    expect(displayed(input)).toBe('(11) 98765-4321');
  });

  it('leaves maxlength alone for an open-ended mask', () => {
    const input = renderHooked('numeric', undefined, { maxLength: 5 });

    expect(input.getAttribute('maxlength')).toBe('5');
  });
});

describe('teardown when the ref detaches', () => {
  /**
   * jsdom can only show that `remove()` was called on a stub. What the leak
   * actually was, listeners still bound and the `value` property still pointing
   * at Inputmask's accessor instead of the native one, is only observable
   * against a real DOM.
   */
  it('gives the element its native value accessor back on unmount', async () => {
    const input = renderHooked('cpf');
    const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

    await focus(input);
    await userEvent.type(input, '12345678901');

    expect(input.inputmask).toBeDefined();
    expect(Object.getOwnPropertyDescriptor(input, 'value')?.get).not.toBe(native?.get);

    unmountActive();

    expect(input.inputmask).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(input, 'value')?.get).toBe(native?.get);
  });

  it('masks a fresh element after the previous one was torn down', async () => {
    const first = renderHooked('cpf');
    await focus(first);
    await userEvent.type(first, '12345678901');
    expect(displayed(first)).toBe('123.456.789-01');

    unmountActive();

    const second = renderHooked('cpf');
    await focus(second);
    await userEvent.type(second, '98765432100');

    expect(displayed(second)).toBe('987.654.321-00');
  });
});

describe('caret behaviour', () => {
  it('keeps the caret with the inserted character mid-value', async () => {
    const input = renderHooked('cpf');

    await focus(input);
    await userEvent.type(input, '12345678');
    expect(displayed(input)).toBe('123.456.78_-__');

    // between the first group's separator and the second group
    input.setSelectionRange(4, 4);
    await userEvent.type(input, '9');

    expect(displayed(input)).toBe('123.945.678-__');
    expect(input.selectionStart).toBe(5);
  });

  it('keeps value and caret when a re-render leaves the mask unchanged', async () => {
    let bump: (() => void) | undefined;

    function Field() {
      const [spare, setSpare] = useState(0);
      const ref = useMaskInput({ mask: 'cpf' });
      bump = () => setSpare((n) => n + 1);
      return createElement('div', null, spare, createElement('input', { ref }));
    }

    const input = mount(createElement(Field));

    await focus(input);
    await userEvent.type(input, '12345678');

    const valueBefore = displayed(input);
    input.setSelectionRange(4, 4);

    flushSync(() => { bump?.(); });
    await nextFrame();

    expect(displayed(input)).toBe(valueBefore);
    expect(input.selectionStart).toBe(4);
  });

  it('keeps the caret when the options object is rebuilt with the same values', async () => {
    let bump: (() => void) | undefined;

    function Field() {
      const [spare, setSpare] = useState(0);
      // Fresh literal every render. Identity comparison would re-mask here.
      const ref = useMaskInput({ mask: 'cpf', options: { placeholder: '_' } });
      bump = () => setSpare((n) => n + 1);
      return createElement('div', null, spare, createElement('input', { ref }));
    }

    const input = mount(createElement(Field));

    await focus(input);
    await userEvent.type(input, '12345678');

    const valueBefore = displayed(input);
    input.setSelectionRange(4, 4);

    flushSync(() => { bump?.(); });
    await nextFrame();

    expect(displayed(input)).toBe(valueBefore);
    expect(input.selectionStart).toBe(4);
  });
});

/**
 * The React counterpart of the Vue directive's `updated` hook. jsdom can only
 * count calls into a mocked engine; formatting through the *new* mask needs the
 * real one.
 */
describe('changing the mask after mount', () => {
  function reactiveField(initial: Mask) {
    let setMask: ((next: Mask) => void) | undefined;

    function Field() {
      const [mask, set] = useState<Mask>(initial);
      const ref = useMaskInput({ mask });
      setMask = set;
      return createElement('input', { ref });
    }

    const input = mount(createElement(Field));

    return {
      input,
      swap: (next: Mask) => {
        flushSync(() => { setMask?.(next); });
      },
    };
  }

  it('formats through the new mask', async () => {
    const { input, swap } = reactiveField('cpf');

    swap('cnpj');
    await nextFrame();

    await focus(input);
    await userEvent.type(input, '12345678000199');

    // Still on cpf, this would stop after 11 digits as '123.456.780-00'.
    expect(displayed(input)).toBe('12.345.678/0001-99');
  });

  it('stops masking when the mask becomes null', async () => {
    const { input, swap } = reactiveField('cpf');

    swap(null);
    await nextFrame();

    await focus(input);
    await userEvent.type(input, 'hello');

    // Under cpf the engine rejects every one of those characters.
    expect(displayed(input)).toBe('hello');
  });
});
