import inputmask from 'inputmask';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import { applyMaskToElement, createMaskInstance } from './maskEngine';

vi.mock('inputmask', () => ({
  default: vi.fn((options) => ({
    mask: vi.fn(),
    options,
  })),
}));

describe('maskEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMaskInstance', () => {
    it('creates mask instance with string mask', () => {
      const instance = createMaskInstance('999-999');
      expect(inputmask).toHaveBeenCalled();
      expect(instance).toBeDefined();
    });

    it('creates mask instance with alias', () => {
      const instance = createMaskInstance('cpf');
      expect(inputmask).toHaveBeenCalled();
      expect(instance).toBeDefined();
    });

    it('creates mask instance with options', () => {
      const instance = createMaskInstance('999-999', { placeholder: '_' });
      expect(inputmask).toHaveBeenCalled();
      expect(instance).toBeDefined();
    });

    it('creates mask instance with array mask', () => {
      const instance = createMaskInstance(['999-999', '9999-9999']);
      expect(inputmask).toHaveBeenCalled();
      expect(instance).toBeDefined();
    });
  });

  describe('applyMaskToElement', () => {
    it('applies mask to input element', () => {
      const input = document.createElement('input');
      const maskFn = vi.fn();
      vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

      applyMaskToElement(input, '999-999');

      expect(maskFn).toHaveBeenCalledWith(input);
    });

    it('applies mask to textarea element', () => {
      const textarea = document.createElement('textarea');
      const maskFn = vi.fn();
      vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

      applyMaskToElement(textarea, '999-999');

      expect(maskFn).toHaveBeenCalledWith(textarea);
    });

    it('finds and applies mask to input inside wrapper', () => {
      const wrapper = document.createElement('div');
      const input = document.createElement('input');
      wrapper.appendChild(input);
      const maskFn = vi.fn();
      vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

      applyMaskToElement(wrapper, '999-999');

      expect(maskFn).toHaveBeenCalledWith(input);
    });

    it('applies mask to wrapper if no input found inside', () => {
      const wrapper = document.createElement('div');
      const maskFn = vi.fn();
      vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

      applyMaskToElement(wrapper, '999-999');

      expect(maskFn).toHaveBeenCalledWith(wrapper);
    });

    it('does nothing if element is null', () => {
      const maskFn = vi.fn();
      vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

      applyMaskToElement(null as unknown as HTMLElement, '999-999');

      expect(maskFn).not.toHaveBeenCalled();
    });

    it('applies mask with custom options', () => {
      const input = document.createElement('input');
      const maskFn = vi.fn();
      vi.mocked(inputmask).mockReturnValue({ mask: maskFn } as unknown as Inputmask.Instance);

      applyMaskToElement(input, '999-999', { placeholder: '_' });

      expect(maskFn).toHaveBeenCalledWith(input);
    });
  });
});
