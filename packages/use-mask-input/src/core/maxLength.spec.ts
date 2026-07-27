import { describe, expect, it } from 'vitest';

import { applyMaskToElement, createMaskInstance, stripMaxLength } from './maskEngine';
import withMask from '../api/withMask';

/**
 * Behavioral proof for issue #191: a `maxLength` on a masked input used to block
 * typing entirely. Runs the REAL engine — no mocks — because the bug lives in how
 * inputmask reads the attribute, not in our own code.
 *
 * Two layers did the blocking:
 *   1. the browser counts the mask placeholder already sitting in `value` against
 *      `maxlength` and refuses the keystroke before inputmask sees it;
 *   2. inputmask copies `el.maxLength` into its own validator, which rejects any
 *      buffer longer than it. The buffer is always the full mask, so any
 *      `maxLength` below the masked length rejects every keystroke.
 *
 * jsdom reports `ontouchstart`, so inputmask considers it mobile and clears the
 * attribute itself at the end of `mask()`. Asserting on the attribute after
 * masking therefore proves nothing here — it is gone either way. Layer 1 is
 * covered by testing `stripMaxLength` directly, layer 2 behaviorally through
 * `setValue`. That mobile path is also the one inputmask gets wrong on its own:
 * it removes the attribute only after reading it into the validator.
 */

function maskedInput(apply: (el: HTMLInputElement) => void, maxLength: number) {
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

function inputWithMaxLength(maxLength: number) {
  const input = document.createElement('input');
  input.setAttribute('maxlength', String(maxLength));
  return input;
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

  describe('stripMaxLength', () => {
    it('removes the attribute for a mask that renders literals', () => {
      const input = inputWithMaxLength(11);

      stripMaxLength(input, 'cpf');

      expect(input.hasAttribute('maxlength')).toBe(false);
    });

    it('removes it for a mask that renders a prefix', () => {
      const input = inputWithMaxLength(3);

      stripMaxLength(input, 'currency');

      expect(input.hasAttribute('maxlength')).toBe(false);
    });

    it.each(['numeric', 'integer', 'decimal'])('keeps it for the open-ended %s mask', (mask) => {
      const input = inputWithMaxLength(3);

      stripMaxLength(input, mask);

      expect(input.getAttribute('maxlength')).toBe('3');
    });

    it('ignores an element that never had the attribute', () => {
      const input = document.createElement('input');

      stripMaxLength(input, 'cpf');

      expect(input.hasAttribute('maxlength')).toBe(false);
    });

    it('ignores a non-element', () => {
      expect(() => stripMaxLength(null, 'cpf')).not.toThrow();
    });
  });

  describe('a fixed mask accepts its full value despite a short maxLength', () => {
    it('via applyMaskToElement', () => {
      const input = maskedInput((el) => applyMaskToElement(el, 'cpf'), 11);

      expect(setValue(input, '12345678901')).toBe('123.456.789-01');
    });

    it('via withMask', () => {
      const input = maskedInput((el) => withMask('999.999.999-99')(el), 11);

      expect(setValue(input, '12345678901')).toBe('123.456.789-01');
    });

    it('for an input inside a wrapper', () => {
      const wrapper = document.createElement('div');
      const input = document.createElement('input');
      input.setAttribute('maxlength', '11');
      wrapper.appendChild(input);
      document.body.appendChild(wrapper);

      applyMaskToElement(wrapper, 'cpf');

      expect(setValue(input, '12345678901')).toBe('123.456.789-01');
    });

    it('when no maxLength was set at all', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      applyMaskToElement(input, 'cpf');

      expect(setValue(input, '12345678901')).toBe('123.456.789-01');
    });
  });

  /**
   * An open-ended mask renders nothing while empty, so its value only ever holds
   * what the user typed and `maxLength` caps exactly what it claims to. Stripping
   * it there would throw away a limit that works.
   */
  describe('an open-ended mask still honors its maxLength', () => {
    it.each(['numeric', 'integer', 'decimal'])('%s caps the value', (mask) => {
      const input = maskedInput((el) => applyMaskToElement(el, mask), 3);

      expect(setValue(input, '1234')).toBe('123');
    });

    it('via withMask too', () => {
      const input = maskedInput((el) => withMask('numeric')(el), 3);

      expect(setValue(input, '1234')).toBe('123');
    });
  });
});
