/* eslint-disable import-x/no-extraneous-dependencies */
import { userEvent } from '@vitest/browser/context';
import { useForm } from '@tanstack/react-form';
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import {
  afterEach, describe, expect, it,
} from 'vitest';

import useTanStackFormMask from './useTanStackFormMask';
import withTanStackFormMask from './withTanStackFormMask';

import type { ChangeEvent, ReactElement } from 'react';
import type { Root } from 'react-dom/client';

/**
 * The TanStack Form integration against the real library, in a real browser.
 *
 * The `unit` project drives these helpers with a hand-built `inputProps` object
 * and a mocked engine, which proves the ref plumbing but not the loop that
 * matters: TanStack owns `value` as a controlled prop, so every keystroke sends
 * the value out through `onChange` and back in through a re-render. Under
 * `autoUnmask` those two directions carry *different* strings — raw out, raw
 * back into a masked display — and only a real engine round trip can show they
 * agree.
 */

interface Values { cpf: string }

const CPF = '12345678901';

/** The public shape of a TanStack field, narrowed to what these specs touch. */
interface FieldLike {
  name: string;
  state: { value: string };
  handleBlur: () => void;
  handleChange: (value: string) => void;
}

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
  values: () => Values;
  submit: () => Promise<void>;
  submitted: () => Values | undefined;
}

/**
 * One masked field wired the way `apps/tanstack-form-project` wires it: the
 * hook variant memoises across renders, the `with*` variant is the escape hatch
 * for `React.memo` children.
 */
function renderForm(variant: 'hook' | 'with' = 'hook'): Harness {
  let submitted: Values | undefined;
  let read: (() => Values) | undefined;
  let submit: (() => Promise<void>) | undefined;

  function Form() {
    const maskField = useTanStackFormMask();
    const form = useForm({
      defaultValues: { cpf: '' } as Values,
      onSubmit: ({ value }) => { submitted = value; },
    });

    read = () => form.state.values;
    submit = () => form.handleSubmit();

    // `children` goes in the props object, not as createElement's third
    // argument: TanStack types Field's render prop as a *required prop*, and
    // createElement's variadic-children overload only accepts a ReactNode, not
    // a render function. Identical at runtime — React writes the third argument
    // to props.children anyway.
    return createElement(form.Field, {
      name: 'cpf' as const,
      // eslint-disable-next-line react/no-children-prop
      children: (field: FieldLike) => {
        const inputProps = {
          name: field.name,
          value: field.state.value,
          onBlur: field.handleBlur,
          onChange: (event: ChangeEvent<HTMLInputElement>) => {
            field.handleChange(event.target.value);
          },
        };

        return createElement('input', variant === 'hook'
          ? maskField('cpf', inputProps, { autoUnmask: true })
          : withTanStackFormMask(inputProps, 'cpf', { autoUnmask: true }));
      },
    });
  }

  const input = mount(createElement(Form));

  return {
    input,
    values: () => (read as () => Values)(),
    submit: () => (submit as () => Promise<void>)(),
    submitted: () => submitted,
  };
}

describe('tanstack form autoUnmask round trip', () => {
  it('keeps the display masked and the field value raw', async () => {
    const { input, values } = renderForm();

    await focus(input);
    await userEvent.type(input, CPF);

    expect(displayed(input)).toBe('123.456.789-01');
    await expect.poll(() => values().cpf).toBe(CPF);
  });

  it('survives the controlled re-render each keystroke triggers', async () => {
    // TanStack writes `value` back as a prop. React compares it against the
    // element's getter, which returns the unmasked value under autoUnmask, so
    // the two agree and the masked buffer is never clobbered mid-typing.
    const { input, values } = renderForm();

    await focus(input);
    await userEvent.type(input, '123');
    expect(displayed(input)).toBe('123.___.___-__');

    await userEvent.type(input, '45678901');

    expect(displayed(input)).toBe('123.456.789-01');
    await expect.poll(() => values().cpf).toBe(CPF);
  });

  it('submits the raw value', async () => {
    const {
      input, submit, submitted,
    } = renderForm();

    await focus(input);
    await userEvent.type(input, CPF);
    await submit();

    await expect.poll(() => submitted()).toEqual({ cpf: CPF });
    // the display never stopped being masked
    expect(displayed(input)).toBe('123.456.789-01');
  });

  it('round trips the same way through withTanStackFormMask', async () => {
    const { input, values } = renderForm('with');

    await focus(input);
    await userEvent.type(input, CPF);

    expect(displayed(input)).toBe('123.456.789-01');
    await expect.poll(() => values().cpf).toBe(CPF);
  });
});
