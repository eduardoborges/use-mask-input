import { act, render, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import inputmask from '../core/inputmask';
import {
  beforeEach,
  describe, expect, it, vi,
} from 'vitest';

import useMaskInput from './useMaskInput';
import * as core from '../core';

import type { Input, Mask } from '../types';

vi.mock('../core/inputmask', () => ({
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
    const { result } = renderHook(() => useMaskInput({ mask: '999-999' }));
    expect(typeof result.current).toBe('function');
    expect(typeof result.current.unmaskedValue).toBe('function');
  });

  it('handles null input', () => {
    const { result } = renderHook(() => useMaskInput({ mask: '999-999' }));

    act(() => {
      result.current(null);
    });

    expect(result.current).toBeDefined();
  });

  it('handles direct input element', () => {
    const input = document.createElement('input');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result, rerender } = renderHook(() => useMaskInput({ mask: '999-999' }));

    act(() => {
      result.current(input);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('exposes the unmasked value from the masked input', () => {
    const input = document.createElement('input');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result } = renderHook(() => useMaskInput({ mask: '999-999' }));

    act(() => {
      result.current(input);
    });

    input.inputmask = {
      unmaskedvalue: vi.fn(() => '2026-04-01'),
    } as any;

    expect(result.current.unmaskedValue()).toBe('2026-04-01');
  });

  it('handles ref object', () => {
    const input = document.createElement('input');
    const ref = { current: input };
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result, rerender } = renderHook(() => useMaskInput({ mask: '999-999' }));

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
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result, rerender } = renderHook(() => useMaskInput({ mask: '999-999' }));

    act(() => {
      result.current(wrapper);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('handles invalid element in ref', () => {
    const invalidRef = { current: 'not an element' };
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result } = renderHook(() => useMaskInput({ mask: '999-999' }));

    act(() => {
      result.current(invalidRef as unknown as Input);
    });

    expect(result.current).toBeDefined();
  });

  it('handles element that is not HTMLElement in useEffect', () => {
    vi.spyOn(core, 'isHTMLElement').mockReturnValueOnce(false);

    const invalidElement = { nodeType: 1 } as unknown as Input;
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result, rerender } = renderHook(() => useMaskInput({ mask: '999-999' }));

    act(() => {
      result.current(invalidElement as unknown as Input);
    });

    rerender();

    expect(result.current).toBeDefined();
  });

  it('handles wrapper without input inside', () => {
    const wrapper = document.createElement('div');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result, rerender } = renderHook(() => useMaskInput({ mask: '999-999' }));

    act(() => {
      result.current(wrapper);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('works with custom options', () => {
    const input = document.createElement('input');
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result, rerender } = renderHook(() => useMaskInput({
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
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result, rerender } = renderHook(() => useMaskInput({ mask: 'cpf' }));

    act(() => {
      result.current(input);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('calls register callback when provided', () => {
    const input = document.createElement('input');
    const register = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result, rerender } = renderHook(() => useMaskInput({
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
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result, rerender } = renderHook(() => useMaskInput({ mask: '999-999' }));

    act(() => {
      result.current(textarea);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });

  it('removes the mask when React detaches the ref', () => {
    const remove = vi.fn();
    vi.mocked(inputmask).mockReturnValue({
      mask: vi.fn((element: HTMLInputElement) => {
        const target = element;
        target.inputmask = { remove } as never;
      }),
    } as any);

    function Field() {
      const ref = useMaskInput({ mask: '99-99' });
      return createElement('input', { ref });
    }

    const { unmount } = render(createElement(Field));
    expect(remove).not.toHaveBeenCalled();

    unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('masks the new element after a teardown and remount', () => {
    const masked: HTMLElement[] = [];
    const remove = vi.fn();
    vi.mocked(inputmask).mockReturnValue({
      mask: vi.fn((element: HTMLInputElement) => {
        const target = element;
        masked.push(target);
        target.inputmask = { remove } as never;
      }),
    } as any);

    function Field() {
      const ref = useMaskInput({ mask: '999-99' });
      return createElement('input', { ref });
    }

    render(createElement(Field)).unmount();
    render(createElement(Field)).unmount();

    expect(masked).toHaveLength(2);
    expect(masked[0]).not.toBe(masked[1]);
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it('handles case where findInputElement returns valid element', () => {
    const wrapper = document.createElement('div');
    const input = document.createElement('input');
    wrapper.appendChild(input);
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);

    const { result, rerender } = renderHook(() => useMaskInput({ mask: '999-999' }));

    act(() => {
      result.current(wrapper);
    });

    rerender();

    expect(inputmask).toHaveBeenCalled();
  });
});

/**
 * The ref callback masks the element once, on attach, and its identity never
 * changes, so a `mask` that depends on state used to be frozen at whatever
 * rendered first: `useMaskInput({ mask: isCompany ? 'cnpj' : 'cpf' })` stayed on
 * one of them forever.
 *
 * What these can prove here is which options reached Inputmask and how often.
 * That the switched mask then formats the typed digits, and that an unchanged
 * mask leaves the caret alone, needs a real engine and a real caret, so it lives
 * in useMaskInput.browser.spec.ts.
 */
describe('useMaskInput reactivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inputmask).mockReturnValue({ mask: vi.fn() } as any);
  });

  it('re-applies the mask when the mask changes', () => {
    const input = document.createElement('input');

    const { result, rerender } = renderHook(
      ({ mask }) => useMaskInput({ mask }),
      { initialProps: { mask: 'cpf' as Mask } },
    );

    act(() => {
      result.current(input);
    });

    expect(inputmask).toHaveBeenCalledTimes(1);
    vi.mocked(inputmask).mockClear();

    rerender({ mask: 'cnpj' });

    expect(inputmask).toHaveBeenCalledTimes(1);
    expect(vi.mocked(inputmask).mock.calls[0][0]).toMatchObject({
      placeholder: '__.___.___/____-__',
    });
  });

  it('re-applies when only the options change', () => {
    const input = document.createElement('input');

    const { result, rerender } = renderHook(
      ({ prefix }) => useMaskInput({ mask: 'currency', options: { prefix } }),
      { initialProps: { prefix: '$ ' } },
    );

    act(() => {
      result.current(input);
    });

    vi.mocked(inputmask).mockClear();

    rerender({ prefix: 'R$ ' });

    expect(inputmask).toHaveBeenCalledTimes(1);
    expect(vi.mocked(inputmask).mock.calls[0][0]).toMatchObject({ prefix: 'R$ ' });
  });

  it('does not re-apply on an unrelated re-render', () => {
    const input = document.createElement('input');

    // The options literal is rebuilt every render, so identity comparison would
    // see a change here and re-mask. Only a structural compare stays quiet.
    const { result, rerender } = renderHook(
      ({ spare }) => ({ spare, ref: useMaskInput({ mask: 'cpf', options: { placeholder: '_' } }) }),
      { initialProps: { spare: 0 } },
    );

    act(() => {
      result.current.ref(input);
    });

    vi.mocked(inputmask).mockClear();

    rerender({ spare: 1 });
    rerender({ spare: 2 });

    expect(inputmask).not.toHaveBeenCalled();
  });

  it('does not re-apply on mount', () => {
    const input = document.createElement('input');

    const { result } = renderHook(() => useMaskInput({ mask: 'cpf' }));

    act(() => {
      result.current(input);
    });

    expect(inputmask).toHaveBeenCalledTimes(1);
  });

  it('removes the mask when the mask becomes null', () => {
    const input = document.createElement('input');
    const remove = vi.fn();

    const { result, rerender } = renderHook(
      ({ mask }) => useMaskInput({ mask }),
      { initialProps: { mask: 'cpf' as Mask } },
    );

    act(() => {
      result.current(input);
    });

    input.inputmask = { remove } as any;
    vi.mocked(inputmask).mockClear();

    rerender({ mask: null });

    expect(remove).toHaveBeenCalledTimes(1);
    expect(inputmask).not.toHaveBeenCalled();
  });

  it('masks a late-attached element with the current mask, not the mount-time one', () => {
    const input = document.createElement('input');

    const { result, rerender } = renderHook(
      ({ mask }) => useMaskInput({ mask }),
      { initialProps: { mask: 'cpf' as Mask } },
    );

    rerender({ mask: 'cnpj' });
    vi.mocked(inputmask).mockClear();

    act(() => {
      result.current(input);
    });

    expect(vi.mocked(inputmask).mock.calls[0][0]).toMatchObject({
      placeholder: '__.___.___/____-__',
    });
  });
});
