import { act, renderHook } from '@testing-library/react';
import inputmask from 'inputmask';
import {
  beforeEach,
  describe, expect, it, vi,
} from 'vitest';

import useInputMask from './useInputMask';
import * as core from '../core';

import type { Input } from '../types';

vi.mock('inputmask', () => ({
  default: vi.fn((options) => ({
    mask: vi.fn(),
    options,
  })),
}));

vi.mock('../utils/isServer', () => ({
  default: false,
}));

describe('useMaskInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a ref callback function', () => {
    const { result } = renderHook(() => useInputMask({ mask: '999-999' }));
    expect(typeof result.current).toBe('function');
  });

  it('handles null input', () => {
    const { result } = renderHook(() => useInputMask({ mask: '999-999' }));

    act(() => {
      result.current(null);
    });

    expect(result.current).toBeDefined();
  });

  it('handles direct input element', () => {
    const input = document.createElement('input');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as unknown as Inputmask.Instance);

    const { result, rerender } = renderHook(() => useInputMask({ mask: '999-999' }));

    act(() => {
      result.current(input);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('handles ref object', () => {
    const input = document.createElement('input');
    const ref = { current: input };
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as unknown as Inputmask.Instance);

    const { result, rerender } = renderHook(() => useInputMask({ mask: '999-999' }));

    act(() => {
      result.current(ref as unknown as Input);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('handles wrapper element with input inside', () => {
    const wrapper = document.createElement('div');
    const input = document.createElement('input');
    wrapper.appendChild(input);
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as unknown as Inputmask.Instance);

    const { result, rerender } = renderHook(() => useInputMask({ mask: '999-999' }));

    act(() => {
      result.current(wrapper);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('handles invalid element in ref', () => {
    const invalidRef = { current: 'not an element' };
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as unknown as Inputmask.Instance);

    const { result } = renderHook(() => useInputMask({ mask: '999-999' }));

    act(() => {
      result.current(invalidRef as unknown as Input);
    });

    expect(result.current).toBeDefined();
  });

  it('handles element that is not HTMLElement in useEffect', () => {
    vi.spyOn(core, 'isHTMLElement').mockReturnValueOnce(false);

    const invalidElement = { nodeType: 1 } as unknown as Input;
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as unknown as Inputmask.Instance);

    const { result, rerender } = renderHook(() => useInputMask({ mask: '999-999' }));

    act(() => {
      result.current(invalidElement as unknown as Input);
    });

    rerender();

    expect(result.current).toBeDefined();
  });

  it('handles wrapper without input inside', () => {
    const wrapper = document.createElement('div');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as unknown as Inputmask.Instance);

    const { result, rerender } = renderHook(() => useInputMask({ mask: '999-999' }));

    act(() => {
      result.current(wrapper);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('works with custom options', () => {
    const input = document.createElement('input');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as unknown as Inputmask.Instance);

    const { result, rerender } = renderHook(() => useInputMask({
      mask: '999-999',
      options: { placeholder: '_' },
    }));

    act(() => {
      result.current(input);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('works with alias masks', () => {
    const input = document.createElement('input');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as unknown as Inputmask.Instance);

    const { result, rerender } = renderHook(() => useInputMask({ mask: 'cpf' }));

    act(() => {
      result.current(input);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('calls register callback when provided', () => {
    const input = document.createElement('input');
    const register = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as unknown as Inputmask.Instance);

    const { result, rerender } = renderHook(() => useInputMask({
      mask: '999-999',
      register,
    }));

    act(() => {
      result.current(input);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('handles textarea element', () => {
    const textarea = document.createElement('textarea');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as unknown as Inputmask.Instance);

    const { result, rerender } = renderHook(() => useInputMask({ mask: '999-999' }));

    act(() => {
      result.current(textarea);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('handles case where findInputElement returns valid element', () => {
    const wrapper = document.createElement('div');
    const input = document.createElement('input');
    wrapper.appendChild(input);
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as unknown as Inputmask.Instance);

    const { result, rerender } = renderHook(() => useInputMask({ mask: '999-999' }));

    act(() => {
      result.current(wrapper);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });
});
