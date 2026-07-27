import { describe, expect, it } from 'vitest';

import { applyMaskToElement, createMaskInstance } from './maskEngine';
import withMask from '../api/withMask';

/**
 * Behavioral proof for issue #191: a `maxLength` on a masked input used to
 * block typing entirely. Runs the REAL engine — no mocks — because the bug
 * lives in how inputmask reads the attribute, not in our own code.
 *
 * Two independent layers did the blocking, and both are covered here:
 *   1. inputmask copies `el.maxLength` into its validator, which rejects any
 *      buffer longer than it. The buffer is always the full mask, so any
 *      `maxLength` below the masked length rejects every keystroke. That is
 *      the layer asserted below, via `setValue`.
 *   2. the browser counts the mask placeholder already sitting in `value`
 *      against `maxlength` and refuses the keystroke before inputmask sees it.
 *      jsdom does not enforce `maxlength`, so this one is covered by asserting
 *      the attribute is gone from the DOM.
 */
function maskedInput(apply: (el: HTMLInputElement) => void, maxLength = 11) {
  const input = document.createElement('input');
  input.setAttribute('maxlength', String(maxLength));
  document.body.appendChild(input);
  apply(input);
  return input;
}

/** Pushes a value through the engine's own validation, the layer that used to reject it. */
function setValue(input: HTMLInputElement, value: string) {
  (input as unknown as { inputmask: { setValue: (v: string) => void } })
    .inputmask.setValue(value);
  return input.value;
}

describe('maxLength on a masked input (issue #191)', () => {
  it('reproduces the block when the attribute survives (control)', () => {
    const input = document.createElement('input');
    input.setAttribute('maxlength', '11');
    document.body.appendChild(input);

    createMaskInstance('cpf').mask(input);

    // 11 digits render as 14 chars, so the validator rejects the whole value
    expect(setValue(input, '12345678901')).toBe('');
  });

  it('applyMaskToElement accepts a full value despite a short maxLength', () => {
    const input = maskedInput((el) => applyMaskToElement(el, 'cpf'));

    expect(input.getAttribute('maxlength')).toBeNull();
    expect(setValue(input, '12345678901')).toBe('123.456.789-01');
  });

  it('withMask accepts a full value despite a short maxLength', () => {
    const input = maskedInput((el) => withMask('999.999.999-99')(el));

    expect(input.getAttribute('maxlength')).toBeNull();
    expect(setValue(input, '12345678901')).toBe('123.456.789-01');
  });

  it('strips maxLength from the input inside a wrapper', () => {
    const wrapper = document.createElement('div');
    const input = document.createElement('input');
    input.setAttribute('maxlength', '11');
    wrapper.appendChild(input);
    document.body.appendChild(wrapper);

    applyMaskToElement(wrapper, 'cpf');

    expect(input.getAttribute('maxlength')).toBeNull();
    expect(setValue(input, '12345678901')).toBe('123.456.789-01');
  });

  it('leaves an input without maxLength alone', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    applyMaskToElement(input, 'cpf');

    expect(input.getAttribute('maxlength')).toBeNull();
    expect(setValue(input, '12345678901')).toBe('123.456.789-01');
  });
});
