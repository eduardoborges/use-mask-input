import { act, renderHook } from '@testing-library/react';
import inputmask from 'inputmask';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

vi.mock('inputmask', () => ({
  default: vi.fn((options) => ({
    mask: vi.fn(),
    options,
  })),
}));

vi.mock('../utils/isServer', () => ({
  default: false,
}));

import useMaskInputAntd from './useMaskInputAntd';

describe('useMaskInputAntd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a ref callback function', () => {
    const { result } = renderHook(() => useMaskInputAntd({ mask: '999-999' }));
    expect(typeof result.current).toBe('function');
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
    } as unknown as Inputmask.Instance);

    const { result, rerender } = renderHook(
      () => useMaskInputAntd({ mask: '999-999' }),
    );

    act(() => {
      result.current({ input: inputElement } as unknown as { input: HTMLElement });
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('works with custom options', () => {
    const inputElement = document.createElement('input');
    vi.mocked(inputmask).mockReturnValue({
      mask: vi.fn(),
    } as unknown as Inputmask.Instance);

    const { result, rerender } = renderHook(
      () => useMaskInputAntd({
        mask: '999-999',
        options: { placeholder: '_' },
      }),
    );

    act(() => {
      result.current({ input: inputElement } as unknown as { input: HTMLElement });
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('accepts register option and applies mask', () => {
    const inputElement = document.createElement('input');
    const register = vi.fn();
    vi.mocked(inputmask).mockReturnValue({
      mask: vi.fn(),
    } as unknown as Inputmask.Instance);

    const { result, rerender } = renderHook(
      () => useMaskInputAntd({
        mask: '999-999',
        register,
      }),
    );

    act(() => {
      result.current({ input: inputElement } as unknown as { input: HTMLElement });
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });
});

