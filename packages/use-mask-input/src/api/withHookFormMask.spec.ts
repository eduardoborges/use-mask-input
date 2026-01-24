import inputmask from 'inputmask';
import {
  beforeEach,
  describe, expect, it, vi,
} from 'vitest';

import withHookFormMask from './withHookFormMask';

import type { RefCallback } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

vi.mock('inputmask', () => ({
  default: vi.fn((options) => ({
    mask: vi.fn(),
    options,
  })),
}));

describe('withHookFormMask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns register object with masked ref', () => {
    const originalRef = vi.fn();
    const register: UseFormRegisterReturn = {
      ref: originalRef,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    };
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const result = withHookFormMask(register, '999-999');

    expect(result.ref).toBeDefined();
    expect(typeof result.ref).toBe('function');
    expect(result.onChange).toBe(register.onChange);
    expect(result.onBlur).toBe(register.onBlur);
    expect(result.name).toBe(register.name);
  });

  it('applies mask when ref is called', () => {
    const input = document.createElement('input');
    const originalRef = vi.fn();
    const register: UseFormRegisterReturn = {
      ref: originalRef,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    };
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const result = withHookFormMask(register, '999-999');
    result.ref?.(input);

    expect(maskFn).toHaveBeenCalled();
  });

  it('calls original ref after applying mask', () => {
    const input = document.createElement('input');
    const originalRef = vi.fn();
    const register: UseFormRegisterReturn = {
      ref: originalRef,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    };
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const result = withHookFormMask(register, '999-999');
    result.ref?.(input);

    expect(originalRef).toHaveBeenCalled();
  });

  it('works with alias masks', () => {
    const input = document.createElement('input');
    const originalRef = vi.fn();
    const register: UseFormRegisterReturn = {
      ref: originalRef,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'cpf',
    };
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const result = withHookFormMask(register, 'cpf');
    result.ref?.(input);

    expect(maskFn).toHaveBeenCalled();
  });

  it('works with custom options', () => {
    const input = document.createElement('input');
    const originalRef = vi.fn();
    const register: UseFormRegisterReturn = {
      ref: originalRef,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    };
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const result = withHookFormMask(register, '999-999', { placeholder: '_' });
    result.ref?.(input);

    expect(maskFn).toHaveBeenCalled();
  });

  it('handles null ref gracefully', () => {
    const register: UseFormRegisterReturn = {
      ref: null as unknown as RefCallback<HTMLElement | null>,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    };

    const result = withHookFormMask(register, '999-999');

    expect(result.ref).toBeUndefined();
    expect(result.onChange).toBe(register.onChange);
    expect(result.onBlur).toBe(register.onBlur);
  });

  it('handles null input in ref callback', () => {
    const originalRef = vi.fn();
    const register: UseFormRegisterReturn = {
      ref: originalRef,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    };
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const result = withHookFormMask(register, '999-999');
    result.ref?.(null as unknown as HTMLElement);

    expect(maskFn).not.toHaveBeenCalled();
  });
});
