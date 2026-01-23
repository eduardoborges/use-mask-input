import inputmask from 'inputmask';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import withMask from './withMask';

vi.mock('inputmask', () => ({
  default: vi.fn((options) => ({
    mask: vi.fn(),
    options,
  })),
}));

vi.mock('../utils/isServer', () => ({
  default: false,
}));

describe('withMask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a function', () => {
    const result = withMask('999-999');
    expect(typeof result).toBe('function');
  });

  it('applies mask to input element', () => {
    const input = document.createElement('input');
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const refCallback = withMask('999-999');
    refCallback(input);

    expect(maskFn).toHaveBeenCalledWith(input);
  });

  it('does nothing if input is null', () => {
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const refCallback = withMask('999-999');
    refCallback(null);

    expect(maskFn).not.toHaveBeenCalled();
  });

  it('does nothing if mask is null', () => {
    const input = document.createElement('input');
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const refCallback = withMask(null);
    refCallback(input);

    expect(maskFn).not.toHaveBeenCalled();
  });

  it('applies mask with custom options', () => {
    const input = document.createElement('input');
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const refCallback = withMask('999-999', { placeholder: '_' });
    refCallback(input);

    expect(maskFn).toHaveBeenCalledWith(input);
  });

  it('works with alias masks', () => {
    const input = document.createElement('input');
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const refCallback = withMask('cpf');
    refCallback(input);

    expect(maskFn).toHaveBeenCalledWith(input);
  });

  it('works with array masks', () => {
    const input = document.createElement('input');
    const maskFn = vi.fn();
    vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

    const refCallback = withMask(['999-999', '9999-9999']);
    refCallback(input);

    expect(maskFn).toHaveBeenCalledWith(input);
  });
});
