/* eslint-disable import-x/no-extraneous-dependencies */
import { userEvent } from '@vitest/browser/context';
import { Input } from 'antd';
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useForm } from 'react-hook-form';
import {
  afterEach, describe, expect, it,
} from 'vitest';

import useHookFormMaskAntd from './useHookFormMaskAntd';
import useMaskInputAntd from './useMaskInputAntd';

import type { ReactElement } from 'react';
import type { Root } from 'react-dom/client';
import type { UseFormReturn } from 'react-hook-form';

/**
 * Ant Design resolution, end to end.
 *
 * The `unit` project proves `resolveInputRef` picks the inner `<input>` out of
 * an `InputRef`, but it stops at the ref. What it cannot show is that the
 * element it picked is the one the user's keystrokes land on: with a `prefix`
 * or an addon, antd wraps the real input in a `<span>`, and masking the wrong
 * node fails silently — the ref assertion still passes and nothing formats.
 *
 * antd's Input is also internally controlled, so it owns `el.value` on every
 * render. Anything the mask writes has to survive that, which is a round trip
 * jsdom's approximate input handling cannot exercise.
 */

interface Values { cpf: string }

const CPF = '12345678901';

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

afterEach(() => {
  active?.root.unmount();
  active?.host.remove();
  active = null;
});

/** The masked text the user sees; `el.value` returns unmasked under autoUnmask. */
function displayed(el: HTMLInputElement): string {
  const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  return native?.get?.call(el) as string;
}

const nextFrame = () => new Promise((resolve) => {
  requestAnimationFrame(() => resolve(null));
});

/** Inputmask moves the caret on focus — typing into that gap misplaces digits. */
async function focus(el: HTMLInputElement) {
  await userEvent.click(el);
  await nextFrame();
}

describe('useMaskInputAntd', () => {
  it('masks the inner input, not the wrapper antd renders around it', async () => {
    function Field() {
      const ref = useMaskInputAntd({ mask: 'cpf' });
      // `prefix` makes antd render <span class="ant-input-affix-wrapper"> around
      // the real <input>, which is the case resolution has to get right.
      return createElement(Input, { ref, prefix: '#' });
    }

    const input = mount(createElement(Field));

    expect(input.parentElement?.tagName).toBe('SPAN');
    expect((input as HTMLInputElement & { inputmask?: unknown }).inputmask).toBeDefined();

    await focus(input);
    await userEvent.type(input, CPF);

    expect(displayed(input)).toBe('123.456.789-01');
  });

  it('formats through a plain antd Input as the user types', async () => {
    function Field() {
      const ref = useMaskInputAntd({ mask: '(99) 99999-9999' });
      return createElement(Input, { ref });
    }

    const input = mount(createElement(Field));

    await focus(input);
    await userEvent.type(input, '11987654321');

    expect(displayed(input)).toBe('(11) 98765-4321');
  });

  it('exposes the typed digits through unmaskedValue()', async () => {
    let ref: ReturnType<typeof useMaskInputAntd> | undefined;

    function Field() {
      ref = useMaskInputAntd({ mask: 'cpf', options: { autoUnmask: true } });
      return createElement(Input, { ref });
    }

    const input = mount(createElement(Field));

    await focus(input);
    await userEvent.type(input, CPF);

    expect(displayed(input)).toBe('123.456.789-01');
    expect(ref?.unmaskedValue()).toBe(CPF);
  });
});

describe('useHookFormMaskAntd', () => {
  it('round trips autoUnmask through an antd-wrapped field', async () => {
    let form: UseFormReturn<Values> | undefined;

    function Form() {
      const api = useForm<Values>({ defaultValues: { cpf: '' } });
      form = api;
      const registerWithMask = useHookFormMaskAntd(api.register);
      return createElement(Input, {
        ...registerWithMask('cpf', 'cpf', { autoUnmask: true }),
        prefix: '#',
      });
    }

    const input = mount(createElement(Form));

    await focus(input);
    await userEvent.type(input, CPF);

    expect(displayed(input)).toBe('123.456.789-01');
    expect(form?.getValues('cpf')).toBe(CPF);
  });

  it('registers the first delete after the user fills the field', async () => {
    // The plain-input version of this seeds the value from RHF's defaultValues
    // (see api/useHookFormMask.browser.spec.ts). That is not available here:
    // antd's Input is internally controlled and overwrites the value RHF writes
    // onto the DOM, mask or no mask. So the value gets there by typing.
    let form: UseFormReturn<Values> | undefined;

    function Form() {
      const api = useForm<Values>({ defaultValues: { cpf: '' } });
      form = api;
      const registerWithMask = useHookFormMaskAntd(api.register);
      return createElement(Input, registerWithMask('cpf', 'cpf', { autoUnmask: true }));
    }

    const input = mount(createElement(Form));

    await focus(input);
    await userEvent.type(input, CPF);
    expect(form?.getValues('cpf')).toBe(CPF);

    // select-all via the element rather than a chord: it is Meta+A on macOS and
    // Control+A elsewhere, and this spec has to pass on both.
    input.select();
    await userEvent.keyboard('{Delete}');
    await userEvent.type(input, '98765432100');

    expect(displayed(input)).toBe('987.654.321-00');
    expect(form?.getValues('cpf')).toBe('98765432100');
  });
});
