import inputmask from '../core/inputmask';
import {
  beforeEach,
  describe, expect, it, vi,
} from 'vitest';

import withHookFormMask from './withHookFormMask';

import type { RefCallback } from 'react';
import type { FieldValues } from 'react-hook-form';

import type { UseHookFormMaskReturn } from '../types';

vi.mock('../core/inputmask', () => ({
  default: vi.fn((options) => ({
    mask: vi.fn(),
    options,
  })),
}));

const createRegister = (
  overrides: Partial<UseHookFormMaskReturn<FieldValues>> = {},
): UseHookFormMaskReturn<FieldValues> => ({
  prevRef: vi.fn(),
  ref: vi.fn(),
  onChange: vi.fn(),
  onBlur: vi.fn(),
  name: 'phone',
  unmaskedValue: vi.fn(() => ''),
  ...overrides,
});

describe('withHookFormMask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns register object with masked ref', () => {
    const originalRef = vi.fn();
    const register = createRegister({ ref: originalRef });
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as any);

    const result = withHookFormMask(register, '999-999');

    expect(result.ref).toBeDefined();
    expect(typeof result.ref).toBe('function');
    expect(result.onChange).toBe(register.onChange);
    expect(result.onBlur).toBe(register.onBlur);
    expect(result.name).toBe(register.name);
    expect(typeof result.unmaskedValue).toBe('function');
  });

  it('applies mask when ref is called', () => {
    const input = document.createElement('input');
    const originalRef = vi.fn();
    const register = createRegister({ ref: originalRef });
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as any);

    const result = withHookFormMask(register, '999-999');
    result.ref?.(input);

    expect(maskFn).toHaveBeenCalled();
  });

  it('exposes the unmasked value from the masked input', () => {
    const input = document.createElement('input');
    const originalRef = vi.fn();
    const register = createRegister({ ref: originalRef });
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as any);

    const result = withHookFormMask(register, '999-999');
    result.ref?.(input);

    input.inputmask = {
      unmaskedvalue: vi.fn(() => '2026-04-01'),
    } as any;

    expect(result.unmaskedValue()).toBe('2026-04-01');
  });

  it('calls original ref after applying mask', () => {
    const input = document.createElement('input');
    const originalRef = vi.fn();
    const register = createRegister({ ref: originalRef });
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as any);

    const result = withHookFormMask(register, '999-999');
    result.ref?.(input);

    expect(originalRef).toHaveBeenCalled();
  });

  it('works with alias masks', () => {
    const input = document.createElement('input');
    const originalRef = vi.fn();
    const register = createRegister({ ref: originalRef, name: 'cpf' });
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as any);

    const result = withHookFormMask(register, 'cpf');
    result.ref?.(input);

    expect(maskFn).toHaveBeenCalled();
  });

  it('works with custom options', () => {
    const input = document.createElement('input');
    const originalRef = vi.fn();
    const register = createRegister({ ref: originalRef });
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as any);

    const result = withHookFormMask(register, '999-999', { placeholder: '_' });
    result.ref?.(input);

    expect(maskFn).toHaveBeenCalled();
  });

  it('handles null ref gracefully', () => {
    const register = createRegister({
      prevRef: null as unknown as RefCallback<HTMLElement | null>,
      ref: null as unknown as RefCallback<HTMLElement | null>,
    });

    const result = withHookFormMask(register, '999-999');
    expect(result.ref).toBeNull();
    expect(result.onChange).toBe(register.onChange);
    expect(result.onBlur).toBe(register.onBlur);
  });

  it('handles null input in ref callback', () => {
    const originalRef = vi.fn();
    const register = createRegister({ ref: originalRef });
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as any);

    const result = withHookFormMask(register, '999-999');
    result.ref?.(null as unknown as HTMLElement);

    expect(maskFn).not.toHaveBeenCalled();
  });

  it('returns the same ref callback reference across multiple calls (stable identity)', () => {
    const originalRef = vi.fn();
    const register = createRegister({ ref: originalRef });

    const first = withHookFormMask(register, '999-999');
    const second = withHookFormMask(register, '999-999');

    expect(first.ref).toBe(second.ref);
  });

  it('returns different ref callbacks for different field/mask combinations', () => {
    const originalRef = vi.fn();
    const registerPhone = createRegister({ ref: originalRef, name: 'phone' });
    const registerCpf = createRegister({ ref: originalRef, name: 'cpf' });

    const phone = withHookFormMask(registerPhone, '999-999');
    const cpf = withHookFormMask(registerCpf, 'cpf');

    expect(phone.ref).not.toBe(cpf.ref);
  });

  it('returns a new ref callback when the original ref changes', () => {
    const ref1 = vi.fn();
    const ref2 = vi.fn();
    const register1 = createRegister({ prevRef: vi.fn(), ref: ref1 });
    const register2 = createRegister({ prevRef: vi.fn(), ref: ref2 });

    const result1 = withHookFormMask(register1, '999-999');
    const result2 = withHookFormMask(register2, '999-999');

    expect(result1.ref).not.toBe(result2.ref);
  });
});
