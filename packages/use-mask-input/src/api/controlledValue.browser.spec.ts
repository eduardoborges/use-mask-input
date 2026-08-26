/* eslint-disable import-x/no-extraneous-dependencies */
import { userEvent } from '@vitest/browser/context';
import { createElement, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useController, useForm } from 'react-hook-form';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

import useHookFormMask from './useHookFormMask';
import useMaskInput from './useMaskInput';

import type { ReactElement } from 'react';
import type { Root } from 'react-dom/client';
import type { UseFormReturn } from 'react-hook-form';
import type { Options } from '../types';

/**
 * Programmatic value changes, in a real browser.
 *
 * Five issues (#62, #77, #128, #165, #193) reported the same family of symptom:
 * a value that arrives from React state, RHF `reset()`/`setValue()`, or a
 * `<Controller>` rather than from the keyboard, and a mask that either did not
 * apply to it or lost the caret/selection afterwards. Each was fixed on its own.
 * This spec pins the whole family so a change to the ref lifecycle cannot
 * quietly reopen one of them.
 *
 * One thing here is a contract, not a bug: without `autoUnmask`, RHF's store
 * keeps whatever `setValue` was given, raw or masked. The mask only owns the
 * display. Apps that want the store raw set `autoUnmask: true`.
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

function displayed(el: HTMLInputElement): string {
  const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  return native?.get?.call(el) as string;
}

const nextFrame = () => new Promise((resolve) => { requestAnimationFrame(() => resolve(null)); });
async function focus(el: HTMLInputElement) { await userEvent.click(el); await nextFrame(); }

const CPF = '12345678901';
const MASKED = '123.456.789-01';

let setExternal: (v: string) => void = () => {};
let lastState = '';

function renderControlled(options?: Options, initial = '') {
  function Field() {
    const [value, setValue] = useState(initial);
    lastState = value;
    setExternal = (v) => flushSync(() => setValue(v));
    const ref = useMaskInput({ mask: 'cpf', options });
    return createElement('input', { ref, value, onChange: (e: { target: HTMLInputElement }) => setValue(e.target.value) });
  }
  return mount(createElement(Field));
}

describe('controlled input via useState', () => {
  it('typing keeps display masked and caret at the end', async () => {
    const input = renderControlled();
    await focus(input);
    await userEvent.keyboard(CPF);
    expect(displayed(input)).toBe(MASKED);
    expect(lastState).toBe(MASKED);
    expect(input.selectionStart).toBe(MASKED.length);
  });

  it('external setState with raw digits shows masked', async () => {
    const input = renderControlled();
    setExternal(CPF);
    await nextFrame();
    expect(displayed(input)).toBe(MASKED);
  });

  it('external setState then typing continues from the synced buffer', async () => {
    const input = renderControlled();
    setExternal('123456');
    await nextFrame();
    expect(displayed(input)).toBe('123.456.___-__');
    await focus(input);
    await userEvent.keyboard('78901');
    expect(displayed(input)).toBe(MASKED);
  });

  it('external clear empties the field', async () => {
    const input = renderControlled();
    await focus(input);
    await userEvent.keyboard(CPF);
    setExternal('');
    await nextFrame();
    expect(displayed(input)).toBe('');
  });

  it('autoUnmask: state holds digits, external digits display masked', async () => {
    const input = renderControlled({ autoUnmask: true });
    await focus(input);
    await userEvent.keyboard('12345');
    expect(lastState).toBe('12345');
    setExternal(CPF);
    await nextFrame();
    expect(displayed(input)).toBe(MASKED);
    expect(input.value).toBe(CPF);
  });

  it('initial state value renders masked on mount', () => {
    const input = renderControlled(undefined, CPF);
    expect(displayed(input)).toBe(MASKED);
  });
});

interface Values { cpf: string }
let form: UseFormReturn<Values>;

describe('react-hook-form programmatic value changes', () => {
  function renderRHF(defaults?: Partial<Values>, options?: Options) {
    function Form() {
      const f = useForm<Values>({ defaultValues: { cpf: '', ...defaults } });
      const registerWithMask = useHookFormMask(f.register);
      useEffect(() => { form = f; }, [f]);
      return createElement('input', registerWithMask('cpf', 'cpf', options));
    }
    return mount(createElement(Form));
  }

  it('defaultValues render masked', () => {
    const input = renderRHF({ cpf: CPF });
    expect(displayed(input)).toBe(MASKED);
  });

  it('setValue shows masked and the store keeps what it was given', async () => {
    const input = renderRHF();
    flushSync(() => form.setValue('cpf', CPF));
    await nextFrame();
    expect(displayed(input)).toBe(MASKED);
    expect(form.getValues('cpf')).toBe(CPF);
  });

  it('setValue with autoUnmask keeps the store raw', async () => {
    const input = renderRHF(undefined, { autoUnmask: true });
    flushSync(() => form.setValue('cpf', CPF));
    await nextFrame();
    expect(displayed(input)).toBe(MASKED);
    expect(form.getValues('cpf')).toBe(CPF);
  });

  it('reset() shows masked', async () => {
    const input = renderRHF();
    flushSync(() => form.reset({ cpf: CPF }));
    await nextFrame();
    expect(displayed(input)).toBe(MASKED);
  });

  it('reset() to empty clears the display after typing', async () => {
    const input = renderRHF();
    await focus(input);
    await userEvent.keyboard(CPF);
    flushSync(() => form.reset({ cpf: '' }));
    await nextFrame();
    expect(displayed(input)).toBe('');
    expect(form.getValues('cpf')).toBe('');
  });
});

describe('useController + useMaskInput with a predefined value (#193 follow-up)', () => {
  it('select-all + delete fires onChange on the first attempt', async () => {
    const onChange = vi.fn();
    function Form() {
      const f = useForm<Values>({ defaultValues: { cpf: CPF } });
      const { field } = useController({ name: 'cpf', control: f.control });
      const ref = useMaskInput({ mask: 'cpf' });
      return createElement('input', {
        ...field,
        ref,
        onChange: (e: { target: HTMLInputElement }) => { onChange(e.target.value); field.onChange(e); },
      });
    }
    const input = mount(createElement(Form));
    expect(displayed(input)).toBe(MASKED);
    await focus(input);
    input.select();
    await userEvent.keyboard('{Delete}');
    expect(onChange).toHaveBeenCalled();
    expect(input.inputmask?.unmaskedvalue?.()).toBe('');
  });
});
