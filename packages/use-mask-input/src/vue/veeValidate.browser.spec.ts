/* eslint-disable import-x/no-extraneous-dependencies */
import { userEvent } from '@vitest/browser/context';
import { useField, useForm } from 'vee-validate';
import { createApp, nextTick, ref } from 'vue';
import {
  afterEach, describe, expect, it,
} from 'vitest';

import vMaskInput from './directive';

import type { App } from 'vue';

type Field = ReturnType<typeof useField<string>>;

/**
 * These tests ARE the vee-validate spike.
 *
 * The design predicted no integration code is needed: Inputmask replaces the
 * element's `value` accessor, so `useField().value` bound with `v-model` reads
 * through the engine, and `autoUnmask: true` puts the raw value into field
 * state while the input keeps displaying the masked one.
 *
 * Green here means the deliverable is documentation and `useVeeValidateMask`
 * never exists. Any red scopes a helper to precisely what failed.
 */

const CPF_MASK = "{ mask: 'cpf', options: { autoUnmask: true } }";

let active: { app: App; host: HTMLDivElement } | null = null;

function render(options: Parameters<typeof createApp>[0]) {
  const host = document.createElement('div');
  document.body.appendChild(host);

  const app = createApp(options);
  app.directive('mask-input', vMaskInput);
  app.mount(host);
  active = { app, host };

  const input = host.querySelector('input');
  if (!input) throw new Error('no input rendered');

  return input;
}

/** The masked text the user sees; `el.value` returns unmasked under autoUnmask. */
function displayed(el: HTMLInputElement): string {
  const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  return native?.get?.call(el) as string;
}

const isCpf = (value?: string) => (value?.length === 11 ? true : 'CPF must have 11 digits');

afterEach(() => {
  active?.app.unmount();
  active?.host.remove();
  active = null;
});

describe('vee-validate field synchronisation', () => {
  it('puts the unmasked value into field state while displaying the masked one', async () => {
    let field: Field | undefined;

    const input = render({
      setup() {
        useForm();
        field = useField<string>('cpf');
        return { value: field.value };
      },
      template: `<input v-model="value" v-mask-input="${CPF_MASK}" />`,
    });

    await userEvent.click(input);
    await userEvent.type(input, '12345678901');

    expect(displayed(input)).toBe('123.456.789-01');
    expect(field?.value.value).toBe('12345678901');
  });

  it('marks the field dirty once the user types', async () => {
    let field: Field | undefined;

    const input = render({
      setup() {
        useForm();
        field = useField<string>('cpf');
        return { value: field.value };
      },
      template: `<input v-model="value" v-mask-input="${CPF_MASK}" />`,
    });

    expect(field?.meta.dirty).toBe(false);

    await userEvent.click(input);
    await userEvent.type(input, '123');

    await expect.poll(() => field?.meta.dirty).toBe(true);
  });
});

describe('vee-validate submission', () => {
  it('submits the unmasked value', async () => {
    const submitted = ref<Record<string, unknown>>();

    const input = render({
      setup() {
        const { handleSubmit } = useForm();
        const { value } = useField<string>('cpf');
        const onSubmit = handleSubmit((values) => { submitted.value = values; });
        return { value, onSubmit };
      },
      template: `<form @submit="onSubmit"><input v-model="value" v-mask-input="${CPF_MASK}" /><button type="submit">go</button></form>`,
    });

    await userEvent.click(input);
    await userEvent.type(input, '12345678901');

    const button = active?.host.querySelector('button');
    await userEvent.click(button as HTMLButtonElement);

    await expect.poll(() => submitted.value).toEqual({ cpf: '12345678901' });
    // the display never stopped being masked
    expect(displayed(input)).toBe('123.456.789-01');
  });

  it('runs a validation schema against the unmasked value', async () => {
    let field: Field | undefined;

    const input = render({
      setup() {
        useForm();
        field = useField<string>('cpf', isCpf);
        return { value: field.value };
      },
      template: `<input v-model="value" v-mask-input="${CPF_MASK}" />`,
    });

    await userEvent.click(input);
    await userEvent.type(input, '123');

    // 3 digits is not 11 — the rule saw the unmasked value, not '123.___.___-__'
    await expect.poll(() => field?.errorMessage.value).toBe('CPF must have 11 digits');

    await userEvent.type(input, '45678901');

    await expect.poll(() => field?.errorMessage.value).toBeFalsy();
  });
});

describe('vee-validate blur handling', () => {
  it('validates on blur without Inputmask suppressing the event', async () => {
    let field: Field | undefined;

    const input = render({
      setup() {
        useForm();
        field = useField<string>('cpf', isCpf, { validateOnValueUpdate: false });
        return { value: field.value, handleBlur: field.handleBlur };
      },
      template: `<input v-model="value" v-mask-input="${CPF_MASK}" @blur="handleBlur($event, true)" />`,
    });

    await userEvent.click(input);
    await userEvent.type(input, '123');
    expect(field?.errorMessage.value).toBeUndefined();

    input.blur();

    await expect.poll(() => field?.errorMessage.value).toBe('CPF must have 11 digits');
  });

  it('survives clearMaskOnLostFocus, which rewrites the value on blur', async () => {
    // The design flagged this as the most likely source of a real helper:
    // clearMaskOnLostFocus defaults to true and rewrites the element's value
    // on blur, the same event vee-validate validates on.
    let field: Field | undefined;

    const input = render({
      setup() {
        useForm();
        field = useField<string>('cpf');
        return { value: field.value, handleBlur: field.handleBlur };
      },
      template: `<input v-model="value" v-mask-input="${CPF_MASK}" @blur="handleBlur($event, true)" />`,
    });

    await userEvent.click(input);
    await userEvent.type(input, '12345678901');
    expect(field?.value.value).toBe('12345678901');

    input.blur();
    await nextTick();

    // a complete value must survive the blur intact in both directions
    await expect.poll(() => field?.value.value).toBe('12345678901');
    expect(displayed(input)).toBe('123.456.789-01');
  });
});

describe('vee-validate programmatic updates', () => {
  it('renders the masked display after setValue', async () => {
    let setValue: ((v: string) => void) | undefined;

    const input = render({
      setup() {
        useForm();
        const field = useField<string>('cpf');
        setValue = field.setValue;
        return { value: field.value };
      },
      template: `<input v-model="value" v-mask-input="${CPF_MASK}" />`,
    });

    setValue?.('12345678901');
    await nextTick();

    expect(displayed(input)).toBe('123.456.789-01');
  });

  it('restores the initial masked display after resetForm', async () => {
    let reset: (() => void) | undefined;

    const input = render({
      setup() {
        const form = useForm({ initialValues: { cpf: '12345678901' } });
        reset = form.resetForm;
        const { value } = useField<string>('cpf');
        return { value };
      },
      template: `<input v-model="value" v-mask-input="${CPF_MASK}" />`,
    });

    expect(displayed(input)).toBe('123.456.789-01');

    await userEvent.click(input);
    input.select();
    await userEvent.keyboard('{Delete}');
    await userEvent.type(input, '98765432100');
    expect(displayed(input)).toBe('987.654.321-00');

    reset?.();
    await nextTick();

    await expect.poll(() => displayed(input)).toBe('123.456.789-01');
  });
});
