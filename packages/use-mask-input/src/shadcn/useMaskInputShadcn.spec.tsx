import { act, renderHook } from '@testing-library/react';
import inputmask from '../core/inputmask';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import useMaskInputShadcn from './useMaskInputShadcn';

vi.mock('../core/inputmask', () => ({
  default: vi.fn((options) => ({
    mask: vi.fn(),
    options,
  })),
}));

vi.mock('../utils/isServer', () => ({
  default: false,
}));

describe('useMaskInputShadcn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a ref callback function with unmaskedValue', () => {
    const { result } = renderHook(() => useMaskInputShadcn({ mask: '999-999' }));
    expect(typeof result.current).toBe('function');
    expect(typeof result.current.unmaskedValue).toBe('function');
  });

  it('handles null input', () => {
    const { result } = renderHook(() => useMaskInputShadcn({ mask: '999-999' }));

    act(() => {
      result.current(null);
    });

    expect(result.current).toBeDefined();
  });

  it('applies mask to the input element', () => {
    const inputElement = document.createElement('input');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result, rerender } = renderHook(() => useMaskInputShadcn({ mask: '999-999' }));

    act(() => {
      result.current(inputElement);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('exposes the unmasked value', () => {
    const inputElement = document.createElement('input');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result } = renderHook(() => useMaskInputShadcn({ mask: '999-999' }));

    act(() => {
      result.current(inputElement);
    });

    inputElement.inputmask = {
      unmaskedvalue: vi.fn(() => '123456'),
    } as any;

    expect(result.current.unmaskedValue()).toBe('123456');
  });

  it('does not re-apply mask to the same element', () => {
    const inputElement = document.createElement('input');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result } = renderHook(() => useMaskInputShadcn({ mask: '999-999' }));

    act(() => {
      result.current(inputElement);
    });
    act(() => {
      result.current(inputElement);
    });

    expect(inputmask).toHaveBeenCalledTimes(1);
  });

  it('works with custom options', () => {
    const inputElement = document.createElement('input');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result, rerender } = renderHook(() =>
      useMaskInputShadcn({ mask: '999-999', options: { placeholder: '_' } }),
    );

    act(() => {
      result.current(inputElement);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('accepts register option and applies mask', () => {
    const inputElement = document.createElement('input');
    const register = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result, rerender } = renderHook(() =>
      useMaskInputShadcn({ mask: '999-999', register }),
    );

    act(() => {
      result.current(inputElement);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });
});
