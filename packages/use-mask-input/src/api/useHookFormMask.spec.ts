import inputmask from 'inputmask';
import {
  beforeEach,
  describe, expect, it, vi,
} from 'vitest';

import useHookFormMask from './useHookFormMask';

import type { FieldValues, UseFormRegister } from 'react-hook-form';

vi.mock('inputmask', () => ({
  default: vi.fn((options) => ({
    mask: vi.fn(),
    options,
  })),
}));

describe('useHookFormMask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a function', () => {
    const registerFn = vi.fn(() => ({
      ref: vi.fn(),
      prevRef: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'test',
    }));

    const maskedRegister = useHookFormMask(registerFn as UseFormRegister<FieldValues>);
    expect(typeof maskedRegister).toBe('function');
  });

  it('registers field with mask', () => {
    const input = document.createElement('input');
    const refCallback = vi.fn();
    const registerFn = vi.fn(() => ({
      ref: refCallback,
      prevRef: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    }));
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const maskedRegister = useHookFormMask(registerFn as UseFormRegister<FieldValues>);
    const result = maskedRegister('phone', '999-999');

    expect(registerFn).toHaveBeenCalledWith('phone', undefined);
    expect(result.ref).toBeDefined();
    expect(typeof result.ref).toBe('function');

    // call the ref callback
    result.ref?.(input);

    expect(maskFn).toHaveBeenCalled();
  });

  it('merges register options with mask options', () => {
    const registerFn = vi.fn(() => ({
      ref: vi.fn(),
      prevRef: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    }));
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const maskedRegister = useHookFormMask(registerFn as UseFormRegister<FieldValues>);
    maskedRegister('phone', '999-999', { required: true });

    expect(registerFn).toHaveBeenCalledWith('phone', { required: true });
  });

  it('works with alias masks', () => {
    const registerFn = vi.fn(() => ({
      ref: vi.fn(),
      prevRef: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'cpf',
    }));
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const maskedRegister = useHookFormMask(registerFn as UseFormRegister<FieldValues>);
    const result = maskedRegister('cpf', 'cpf');

    expect(result.ref).toBeDefined();
  });

  it('works with array masks', () => {
    const registerFn = vi.fn(() => ({
      ref: vi.fn(),
      prevRef: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    }));
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const maskedRegister = useHookFormMask(registerFn as UseFormRegister<FieldValues>);
    const result = maskedRegister('phone', ['999-999', '9999-9999']);

    expect(result.ref).toBeDefined();
  });

  it('preserves all register return properties', () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const registerFn = vi.fn(() => ({
      ref: vi.fn(),
      prevRef: vi.fn(),
      onChange,
      onBlur,
      name: 'phone',
    }));

    const maskedRegister = useHookFormMask(registerFn as UseFormRegister<FieldValues>);
    const result = maskedRegister('phone', '999-999');

    expect(result.onChange).toBe(onChange);
    expect(result.onBlur).toBe(onBlur);
    expect(result.name).toBe('phone');
  });

  it('handles null ref from register', () => {
    const registerFn = vi.fn(() => ({
      ref: undefined,
      prevRef: vi.fn(),
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'phone',
    }));

    const maskedRegister = useHookFormMask(registerFn as unknown as UseFormRegister<FieldValues>);
    const result = maskedRegister('phone', '999-999');

    expect(result.ref).toBeDefined();
  });
});
