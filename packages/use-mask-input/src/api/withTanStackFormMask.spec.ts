import inputmask from 'inputmask';
import {
  beforeEach,
  describe, expect, it, vi,
} from 'vitest';

import withTanStackFormMask from './withTanStackFormMask';

import type { TanStackFormInputProps } from '../types';

vi.mock('inputmask', () => ({
  default: vi.fn((options) => ({
    mask: vi.fn(),
    options,
  })),
}));

describe('withTanStackFormMask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns masked input props with stable structure', () => {
    const inputProps: TanStackFormInputProps = {
      name: 'cpf',
      ref: vi.fn(),
      onBlur: vi.fn(),
      onChange: vi.fn(),
      value: '',
    };

    const result = withTanStackFormMask(inputProps, 'cpf');

    expect(typeof result.ref).toBe('function');
    expect(result.onBlur).toBe(inputProps.onBlur);
    expect(result.onChange).toBe(inputProps.onChange);
    expect(result.name).toBe('cpf');
  });

  it('applies mask when ref callback receives an input', () => {
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as any);

    const input = document.createElement('input');
    const originalRef = vi.fn();
    const inputProps: TanStackFormInputProps = {
      name: 'phone',
      ref: originalRef,
      onBlur: vi.fn(),
      onChange: vi.fn(),
      value: '',
    };

    const result = withTanStackFormMask(inputProps, '(99) 99999-9999');
    result.ref(input);

    expect(maskFn).toHaveBeenCalled();
    expect(originalRef).toHaveBeenCalledWith(input);
  });

  it('keeps ref cache stable for same ref and mask', () => {
    const originalRef = vi.fn();
    const inputProps: TanStackFormInputProps = {
      name: 'cpf',
      ref: originalRef,
      onBlur: vi.fn(),
      onChange: vi.fn(),
      value: '',
    };

    const first = withTanStackFormMask(inputProps, 'cpf');
    const second = withTanStackFormMask(inputProps, 'cpf');

    expect(first.ref).toBe(second.ref);
  });
});
