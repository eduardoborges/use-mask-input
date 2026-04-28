import { act, renderHook } from '@testing-library/react';
import inputmask from 'inputmask';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import useMaskInputAntd from './useMaskInputAntd';

import type { InputRef } from 'antd';

vi.mock('inputmask', () => ({
  default: vi.fn((options) => ({
    mask: vi.fn(),
    options,
  })),
}));

vi.mock('../utils/isServer', () => ({
  default: false,
}));

describe('useMaskInputAntd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a ref callback function', () => {
    const { result } = renderHook(() => useMaskInputAntd({ mask: '999-999' }));
    expect(typeof result.current).toBe('function');
    expect(typeof result.current.unmaskedValue).toBe('function');
  });

  it('handles null input ref', () => {
    const { result } = renderHook(() => useMaskInputAntd({ mask: '999-999' }));

    act(() => {
      result.current(null);
    });

    expect(result.current).toBeDefined();
  });

  it('applies mask to element when given InputRef with input element', () => {
    const inputElement = document.createElement('input');
    vi.mocked(inputmask).mockReturnValue({
      mask: vi.fn(),
    } as any);

    const { result, rerender } = renderHook(
      () => useMaskInputAntd({ mask: '999-999' }),
    );

    act(() => {
      result.current({ input: inputElement } as unknown as InputRef);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('exposes the unmasked value from the masked Ant Design input', () => {
    const inputElement = document.createElement('input');
    vi.mocked(inputmask).mockReturnValue({
      mask: vi.fn(),
    } as any);

    const { result } = renderHook(
      () => useMaskInputAntd({ mask: '999-999' }),
    );

    act(() => {
      result.current({ input: inputElement } as unknown as InputRef);
    });

    inputElement.inputmask = {
      unmaskedvalue: vi.fn(() => '2026-04-01'),
    } as any;

    expect(result.current.unmaskedValue()).toBe('2026-04-01');
  });

  it('works with custom options', () => {
    const inputElement = document.createElement('input');
    vi.mocked(inputmask).mockReturnValue({
      mask: vi.fn(),
    } as any);

    const { result, rerender } = renderHook(
      () => useMaskInputAntd({
        mask: '999-999',
        options: { placeholder: '_' },
      }),
    );

    act(() => {
      result.current({ input: inputElement } as unknown as InputRef);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('accepts register option and applies mask', () => {
    const inputElement = document.createElement('input');
    const register = vi.fn();
    vi.mocked(inputmask).mockReturnValue({
      mask: vi.fn(),
    } as any);

    const { result, rerender } = renderHook(
      () => useMaskInputAntd({
        mask: '999-999',
        register,
      }),
    );

    act(() => {
      result.current({ input: inputElement } as unknown as InputRef);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });
});
