import inputmask from '../core/inputmask';
import {
  beforeEach,
  describe, expect, it, vi,
} from 'vitest';

import withTanStackFormMask from './withTanStackFormMask';

import type { TanStackFormInputProps } from '../types';

vi.mock('../core/inputmask', () => ({
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

  it('returns different ref callbacks for different masks (cache key)', () => {
    const originalRef = vi.fn();
    const inputProps: TanStackFormInputProps = {
      name: 'doc',
      ref: originalRef,
      onBlur: vi.fn(),
      onChange: vi.fn(),
      value: '',
    };

    const first = withTanStackFormMask(inputProps, 'cpf');
    const second = withTanStackFormMask(inputProps, 'cnpj');

    expect(first.ref).not.toBe(second.ref);
  });

  it('exposes unmaskedValue() reading from the latest ref element', () => {
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as any);

    const input = document.createElement('input');
    input.value = '12345';
    const inputProps: TanStackFormInputProps = {
      name: 'cpf',
      ref: vi.fn(),
      onBlur: vi.fn(),
      onChange: vi.fn(),
      value: '',
    };

    const result = withTanStackFormMask(inputProps, 'cpf') as any;
    result.ref(input);

    expect(typeof result.unmaskedValue).toBe('function');
    expect(result.unmaskedValue()).toBe('12345');
  });

  it('attaches the original ref as non-enumerable prevRef', () => {
    const originalRef = vi.fn();
    const inputProps: TanStackFormInputProps = {
      name: 'cpf',
      ref: originalRef,
      onBlur: vi.fn(),
      onChange: vi.fn(),
      value: '',
    };

    const result = withTanStackFormMask(inputProps, 'cpf') as any;

    expect(result.prevRef).toBe(originalRef);
    expect(Object.keys(result)).not.toContain('prevRef');
  });

  describe('when inputProps has no ref', () => {
    it('returns a ref callback that applies the mask without forwarding', () => {
      const maskFn = vi.fn();
      vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as any);

      const input = document.createElement('input');
      const inputProps = {
        name: 'cpf',
        onBlur: vi.fn(),
        onChange: vi.fn(),
        value: '',
      } as unknown as TanStackFormInputProps;

      const result = withTanStackFormMask(inputProps, 'cpf');
      result.ref(input);

      expect(maskFn).toHaveBeenCalled();
      expect(typeof result.ref).toBe('function');
    });

    it('exposes unmaskedValue() that reads from the captured element', () => {
      vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

      const input = document.createElement('input');
      input.value = 'abc';
      const inputProps = {
        name: 'cpf',
        onBlur: vi.fn(),
        onChange: vi.fn(),
        value: '',
      } as unknown as TanStackFormInputProps;

      const result = withTanStackFormMask(inputProps, 'cpf') as any;
      result.ref(input);

      expect(result.unmaskedValue()).toBe('abc');
    });

    it('does not call applyMaskToElement when ref is invoked with null', () => {
      const maskFn = vi.fn();
      vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as any);

      const inputProps = {
        name: 'cpf',
        onBlur: vi.fn(),
        onChange: vi.fn(),
        value: '',
      } as unknown as TanStackFormInputProps;

      const result = withTanStackFormMask(inputProps, 'cpf');
      result.ref(null);

      expect(maskFn).not.toHaveBeenCalled();
    });

    it('sets prevRef to the undefined original ref', () => {
      const inputProps = {
        name: 'cpf',
        onBlur: vi.fn(),
        onChange: vi.fn(),
        value: '',
      } as unknown as TanStackFormInputProps;

      const result = withTanStackFormMask(inputProps, 'cpf') as any;

      expect(result.prevRef).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(result, 'prevRef')).toBe(true);
    });
  });
});
