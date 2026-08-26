/* eslint-disable import-x/no-extraneous-dependencies */
import { userEvent } from '@vitest/browser/context';
import { createElement, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useForm } from 'react-hook-form';
import {
  afterEach, describe, expect, it,
} from 'vitest';

import useHookFormMask from './useHookFormMask';
import useMaskInput from './useMaskInput';
import withMask from './withMask';
import { getUnmaskedValue } from '../utils';

import type { ReactElement } from 'react';
import type { Root } from 'react-dom/client';
import type { Mask, UseMaskInputReturn } from '../types';

/**
 * `isComplete()` and `getUnmaskedValue()` driven by a keyboard, at the hook
 * level: partial, complete, cleared, mask switched off, element gone.
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

afterEach(() => {
  active?.root.unmount();
  active?.host.remove();
  active = null;
});

const nextFrame = () => new Promise((resolve) => { requestAnimationFrame(() => resolve(null)); });
async function focus(el: HTMLInputElement) { await userEvent.click(el); await nextFrame(); }

const CPF = '12345678901';

let api: UseMaskInputReturn | undefined;
let setMask: (mask: Mask) => void = () => {};

function renderHooked(initialMask: Mask = 'cpf') {
  function Field() {
    const [mask, set] = useState<Mask>(initialMask);
    setMask = (next) => flushSync(() => set(next));
    api = useMaskInput({ mask });
    return createElement('input', { ref: api });
  }
  return mount(createElement(Field));
}

describe('isComplete() through useMaskInput', () => {
  it('follows the keyboard: false, then true, then false again', async () => {
    const input = renderHooked();
    expect(api?.isComplete()).toBe(false);

    await focus(input);
    await userEvent.keyboard('12345');
    expect(api?.isComplete()).toBe(false);
    expect(api?.unmaskedValue()).toBe('12345');

    await userEvent.keyboard('678901');
    expect(api?.isComplete()).toBe(true);

    input.select();
    await userEvent.keyboard('{Delete}');
    expect(api?.isComplete()).toBe(false);
    expect(api?.unmaskedValue()).toBe('');
  });

  it('reads true once the mask is switched off, and false once the element is gone', async () => {
    const input = renderHooked();
    await focus(input);
    await userEvent.keyboard('123');

    setMask(null);
    expect(api?.isComplete()).toBe(true);
    // Upstream remove() writes the masked text back, placeholders included, and
    // with no instance left unmaskedValue() falls through to element.value.
    expect(api?.unmaskedValue()).toBe(input.value);
    expect(input.value).toBe('123.___.___-__');

    active?.root.unmount();
    expect(api?.isComplete()).toBe(false);
    expect(api?.unmaskedValue()).toBe('');
  });

  it('is true on an optional-tail mask as soon as the required part is in', async () => {
    const input = renderHooked('br-bank-agency');
    await focus(input);
    await userEvent.keyboard('1');
    expect(api?.isComplete()).toBe(true);
  });

  it('works the same through withMask', async () => {
    const ref = withMask('cpf');
    const input = mount(createElement('input', { ref }));
    await focus(input);
    await userEvent.keyboard(CPF);
    expect(ref.isComplete()).toBe(true);
  });
});

describe('getUnmaskedValue on event.target', () => {
  it('hands onChange the digits while the field shows the mask', async () => {
    const seen: string[] = [];
    function Field() {
      const ref = useMaskInput({ mask: 'cpf' });
      return createElement('input', {
        ref,
        onChange: (e: { target: HTMLInputElement }) => seen.push(getUnmaskedValue(e.target)),
      });
    }
    const input = mount(createElement(Field));
    await focus(input);
    await userEvent.keyboard('123');
    expect(seen.at(-1)).toBe('123');
    expect(input.value).toBe('123.___.___-__');
  });

  it('resolves a wrapper element down to the masked input inside it', async () => {
    const input = renderHooked();
    await focus(input);
    await userEvent.keyboard('123');
    expect(getUnmaskedValue(input.parentElement)).toBe('123');
  });
});

describe('the accessors do not leak into spread props', () => {
  it('keeps unmaskedValue and isComplete non-enumerable on the RHF result', () => {
    let keys: string[] = [];
    function Form() {
      const { register } = useForm<{ cpf: string }>();
      const registerWithMask = useHookFormMask(register);
      const field = registerWithMask('cpf', 'cpf');
      keys = Object.keys(field);
      expect(field.isComplete()).toBe(false);
      return createElement('input', field);
    }
    mount(createElement(Form));
    expect(keys).not.toContain('isComplete');
    expect(keys).not.toContain('unmaskedValue');
  });
});
