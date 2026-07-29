import { describe, expect, it } from 'vitest';

import applyMask, { normalizeBinding, sameBinding } from './applyMask';
import { formatWithMask } from '../core';

/**
 * The single implementation both Vue surfaces route through. Configuration is
 * asserted through the real engine via `formatWithMask`, matching how the rest
 * of this suite proves option handling without simulating keystrokes.
 */

describe('normalizeBinding', () => {
  it('treats a bare string as the mask', () => {
    expect(normalizeBinding('cpf')).toEqual({ mask: 'cpf' });
  });

  it('treats an array as the mask, not as a config object', () => {
    expect(normalizeBinding(['999-999', '999-999-999']))
      .toEqual({ mask: ['999-999', '999-999-999'] });
  });

  it('unpacks the object form', () => {
    expect(normalizeBinding({ mask: 'currency', options: { prefix: 'R$ ' } }))
      .toEqual({ mask: 'currency', options: { prefix: 'R$ ' } });
  });

  it('passes null through', () => {
    expect(normalizeBinding(null)).toEqual({ mask: null });
  });
});

describe('sameBinding', () => {
  it('matches equal masks across both binding shapes', () => {
    expect(sameBinding('cpf', 'cpf')).toBe(true);
    expect(sameBinding('cpf', { mask: 'cpf' })).toBe(true);
  });

  it('separates different masks', () => {
    expect(sameBinding('cpf', 'cnpj')).toBe(false);
  });

  it('compares array masks by content', () => {
    expect(sameBinding(['9-9', '99-9'], ['9-9', '99-9'])).toBe(true);
    expect(sameBinding(['9-9'], ['99-9'])).toBe(false);
  });

  it('matches structurally equal inline objects, which are fresh each render', () => {
    // The whole point of the guard: an inline `v-mask-input="{ mask: 'cpf' }"`
    // allocates a new object every render and would never be identity-equal.
    expect(sameBinding(
      { mask: 'currency', options: { prefix: 'R$ ' } },
      { mask: 'currency', options: { prefix: 'R$ ' } },
    )).toBe(true);
  });

  it('separates changed options', () => {
    expect(sameBinding(
      { mask: 'currency', options: { prefix: 'R$ ' } },
      { mask: 'currency', options: { prefix: 'US$ ' } },
    )).toBe(false);
  });

  it('separates added and removed options', () => {
    expect(sameBinding({ mask: 'cpf' }, { mask: 'cpf', options: { placeholder: '#' } }))
      .toBe(false);
    expect(sameBinding(
      { mask: 'cpf', options: { placeholder: '#' } },
      { mask: 'cpf', options: {} },
    )).toBe(false);
  });
});

describe('applyMask', () => {
  it('masks a native input', () => {
    const input = document.createElement('input');
    applyMask(input, 'cpf');

    expect(input.inputmask).toBeDefined();
  });

  it('does nothing for a null element', () => {
    expect(() => applyMask(null, 'cpf')).not.toThrow();
  });

  it('does nothing for a null mask', () => {
    const input = document.createElement('input');
    applyMask(input, null);

    expect(input.inputmask).toBeUndefined();
  });

  it('applies an alias through the real engine', () => {
    expect(formatWithMask('12345678901', 'cpf')).toBe('123.456.789-01');
  });

  it('lets user options override an alias default', () => {
    // brl-currency sets prefix 'R$ '; the user's prefix must win, while the
    // alias's radixPoint and groupSeparator survive.
    const formatted = formatWithMask('1234', 'brl-currency', { prefix: 'US$ ' });

    expect(formatted).toContain('US$ ');
    expect(formatted).not.toContain('R$ ');
    expect(formatted).toContain(',');
  });
});
