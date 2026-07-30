/* eslint-disable import-x/no-extraneous-dependencies */
import { userEvent } from '@vitest/browser/context';
import { createElement, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useForm } from 'react-hook-form';
import {
  afterEach, describe, expect, it,
} from 'vitest';

import useHookFormMask from './useHookFormMask';
import withHookFormMask from './withHookFormMask';

import type { ReactElement } from 'react';
import type { Root } from 'react-dom/client';
import type { UseFormReturn } from 'react-hook-form';

/**
 * #193 by symptom, in a real browser.
 *
 * The `unit` project proves the fix as call *ordering* — that RHF's ref runs
 * before the mask is applied — because jsdom cannot deliver the sequence that
 * actually broke: a predefined value, select all, delete, retype. Inputmask
 * initialised with an empty buffer while RHF wrote the field's value straight
 * onto the element, so its internal state and the DOM disagreed and the first
 * `onChange` after the delete was swallowed. That is a keyboard bug, and it
 * needs a keyboard.
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

interface Harness {
  input: HTMLInputElement;
  form: UseFormReturn<Values>;
  changes: string[];
}

/**
 * A single masked RHF field, plus every value `watch` has seen since mount.
 * `changes` is how "did onChange fire?" is asked without reaching into RHF's
 * internals: the subscription only receives a value when the field's change
 * handler ran.
 */
function renderForm(
  defaultValue: string,
  variant: 'hook' | 'with' = 'hook',
): Harness {
  const changes: string[] = [];
  let form: UseFormReturn<Values> | undefined;

  function Form() {
    const api = useForm<Values>({ defaultValues: { cpf: defaultValue } });
    form = api;

    const registerWithMask = useHookFormMask(api.register);

    useEffect(() => {
      const subscription = api.watch((values) => { changes.push(values.cpf as string); });
      return () => subscription.unsubscribe();
    }, [api]);

    const props = variant === 'hook'
      ? registerWithMask('cpf', 'cpf', { autoUnmask: true })
      : withHookFormMask(api.register('cpf'), 'cpf', { autoUnmask: true });

    return createElement('input', props);
  }

  const input = mount(createElement(Form));

  return { input, form: form as UseFormReturn<Values>, changes };
}

describe('react-hook-form with a predefined value (#193)', () => {
  it('masks the value RHF writes on mount', () => {
    const { input } = renderForm(CPF);

    expect(displayed(input)).toBe('123.456.789-01');
  });

  it('fires onChange on the very first delete', async () => {
    const { input, changes } = renderForm(CPF);

    await focus(input);
    // select-all via the element rather than a chord: it is Meta+A on macOS and
    // Control+A elsewhere, and this spec has to pass on both.
    input.select();
    await userEvent.keyboard('{Delete}');

    // Before the fix this array stayed empty: Inputmask's buffer had never seen
    // RHF's value, so the delete produced no change RHF could observe.
    expect(changes.length).toBeGreaterThan(0);
    expect(changes[0]).not.toBe(CPF);
  });

  it('retypes cleanly after the delete', async () => {
    const { input, form } = renderForm(CPF);

    await focus(input);
    input.select();
    await userEvent.keyboard('{Delete}');
    await userEvent.type(input, '98765432100');

    expect(displayed(input)).toBe('987.654.321-00');
    expect(form.getValues('cpf')).toBe('98765432100');
  });
});

describe('react-hook-form autoUnmask round trip', () => {
  it('keeps the display masked and the form value raw', async () => {
    const { input, form } = renderForm('');

    await focus(input);
    await userEvent.type(input, CPF);

    expect(displayed(input)).toBe('123.456.789-01');
    expect(form.getValues('cpf')).toBe(CPF);
  });

  it('submits the raw value', async () => {
    const { input, form } = renderForm('');

    await focus(input);
    await userEvent.type(input, CPF);

    let submitted: Values | undefined;
    await form.handleSubmit((values) => { submitted = values; })();

    expect(submitted).toEqual({ cpf: CPF });
    // the display never stopped being masked
    expect(displayed(input)).toBe('123.456.789-01');
  });

  it('round trips the same way through withHookFormMask', async () => {
    const { input, form } = renderForm('', 'with');

    await focus(input);
    await userEvent.type(input, CPF);

    expect(displayed(input)).toBe('123.456.789-01');
    expect(form.getValues('cpf')).toBe(CPF);
  });
});
