import { act, renderHook } from '@testing-library/react';
import inputmask from '../core/inputmask';
import {
  beforeEach,
  describe, expect, it, vi,
} from 'vitest';

import useTanStackFormMask from './useTanStackFormMask';

import type { TanStackFormInputProps } from '../types';

vi.mock('../core/inputmask', () => ({
  default: vi.fn((options) => ({
    mask: vi.fn(),
    options,
  })),
}));

function makeInputProps(name = 'cpf'): TanStackFormInputProps {
  return {
    name,
    ref: vi.fn(),
    onBlur: vi.fn(),
    onChange: vi.fn(),
    value: '',
  };
}

describe('useTanStackFormMask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a function', () => {
    const { result } = renderHook(() => useTanStackFormMask());
    expect(typeof result.current).toBe('function');
  });

  it('returns a stable function reference across renders', () => {
    const { result, rerender } = renderHook(() => useTanStackFormMask());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('produces masked input props with original handlers preserved', () => {
    const { result } = renderHook(() => useTanStackFormMask());
    const inputProps = makeInputProps('phone');

    const masked = result.current('(99) 99999-9999', inputProps);

    expect(masked.name).toBe('phone');
    expect(masked.onBlur).toBe(inputProps.onBlur);
    expect(masked.onChange).toBe(inputProps.onChange);
    expect(typeof masked.ref).toBe('function');
  });

  it('applies the mask when the ref callback receives an input element', () => {
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as any);

    const { result } = renderHook(() => useTanStackFormMask());
    const inputProps = makeInputProps();
    const input = document.createElement('input');

    const masked = result.current('cpf', inputProps);
    act(() => {
      masked.ref(input);
    });

    expect(maskFn).toHaveBeenCalledWith(input);
    expect(inputProps.ref).toHaveBeenCalledWith(input);
  });

  it('forwards options to inputmask', () => {
    const { result } = renderHook(() => useTanStackFormMask());
    const inputProps = makeInputProps();
    const input = document.createElement('input');
    const options = { placeholder: '_' };

    const masked = result.current('cpf', inputProps, options);
    masked.ref(input);

    expect(inputmask).toHaveBeenCalledWith(expect.objectContaining(options));
  });

  it('infers the onChange event type without an explicit annotation', () => {
    const { result } = renderHook(() => useTanStackFormMask());
    const handleChange = vi.fn();

    // Reproduces issue #183: the inline `event` parameter must be typed as a
    // ChangeEvent (not implicit `any`), so `event.target.value` is accessible.
    const masked = result.current('cpf', {
      name: 'cpf',
      value: '',
      onBlur: vi.fn(),
      onChange: (event) => handleChange(event.target.value),
    });

    const input = document.createElement('input');
    input.value = '12345';
    masked.onChange?.({ target: input } as never);

    expect(handleChange).toHaveBeenCalledWith('12345');
  });
});
