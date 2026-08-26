import inputmask from './inputmask';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import {
  applyMaskToElement, createMaskInstance, formatWithMask, isValidWithMask, unformatWithMask,
} from './maskEngine';

type MaskInstance = ReturnType<typeof createMaskInstance>;

function stubMaskInstance(maskFn: ReturnType<typeof vi.fn>): MaskInstance {
  return { mask: maskFn } as unknown as MaskInstance;
}

vi.mock('./inputmask', () => {
  const mockInputmask = vi.fn((options) => ({
    mask: vi.fn(),
    options,
  }));
  return { default: Object.assign(mockInputmask, { format: vi.fn(), unmask: vi.fn(), isValid: vi.fn() }) };
});

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
      vi.mocked(inputmask).mockImplementation(() => stubMaskInstance(maskFn));

      applyMaskToElement(input, '999-999');

      expect(maskFn).toHaveBeenCalledWith(input);
    });

    it('applies mask to textarea element', () => {
      const textarea = document.createElement('textarea');
      const maskFn = vi.fn();
      vi.mocked(inputmask).mockImplementation(() => stubMaskInstance(maskFn));

      applyMaskToElement(textarea, '999-999');

      expect(maskFn).toHaveBeenCalledWith(textarea);
    });

    it('finds and applies mask to input inside wrapper', () => {
      const wrapper = document.createElement('div');
      const input = document.createElement('input');
      wrapper.appendChild(input);
      const maskFn = vi.fn();
      vi.mocked(inputmask).mockImplementation(() => stubMaskInstance(maskFn));

      applyMaskToElement(wrapper, '999-999');

      expect(maskFn).toHaveBeenCalledWith(input);
    });

    it('applies mask to wrapper if no input found inside', () => {
      const wrapper = document.createElement('div');
      const maskFn = vi.fn();
      vi.mocked(inputmask).mockImplementation(() => stubMaskInstance(maskFn));

      applyMaskToElement(wrapper, '999-999');

      expect(maskFn).toHaveBeenCalledWith(wrapper);
    });

    it('does nothing if element is null', () => {
      const maskFn = vi.fn();
      vi.mocked(inputmask).mockImplementation(() => stubMaskInstance(maskFn));

      applyMaskToElement(null as unknown as HTMLElement, '999-999');

      expect(maskFn).not.toHaveBeenCalled();
    });

    it('applies mask with custom options', () => {
      const input = document.createElement('input');
      const maskFn = vi.fn();
      vi.mocked(inputmask).mockImplementation(() => stubMaskInstance(maskFn));

      applyMaskToElement(input, '999-999', { placeholder: '_' });

      expect(maskFn).toHaveBeenCalledWith(input);
    });
  });

  describe('formatWithMask', () => {
    it('formats a raw value using the given mask', () => {
      const formatFn = vi.fn().mockReturnValue('999-999');
      vi.mocked(inputmask).format = formatFn;

      const result = formatWithMask('999999', '999-999');

      expect(formatFn).toHaveBeenCalledWith('999999', expect.objectContaining({ mask: '999-999' }));
      expect(result).toBe('999-999');
    });

    it('formats a raw value using an alias', () => {
      const formatFn = vi.fn().mockReturnValue('123.456.789-00');
      vi.mocked(inputmask).format = formatFn;

      const result = formatWithMask('12345678900', 'cpf');

      expect(formatFn).toHaveBeenCalledWith(
        '12345678900',
        expect.objectContaining({ mask: '999.999.999-99' }),
      );
      expect(result).toBe('123.456.789-00');
    });

    it('formats a raw value with custom options', () => {
      const formatFn = vi.fn().mockReturnValue('999-999');
      vi.mocked(inputmask).format = formatFn;

      formatWithMask('999999', '999-999', { placeholder: '_' });

      expect(formatFn).toHaveBeenCalledWith(
        '999999',
        expect.objectContaining({ mask: '999-999', placeholder: '_' }),
      );
    });
  });

  describe('isValidWithMask', () => {
    it('delegates to Inputmask.isValid with the resolved alias options', () => {
      const isValidFn = vi.fn().mockReturnValue(true);
      vi.mocked(inputmask).isValid = isValidFn;

      expect(isValidWithMask('123.456.789-00', 'cpf')).toBe(true);
      expect(isValidFn).toHaveBeenCalledWith(
        '123.456.789-00',
        expect.objectContaining({ mask: '999.999.999-99' }),
      );
    });

    it('coerces a non-boolean engine result to false', () => {
      vi.mocked(inputmask).isValid = vi.fn().mockReturnValue(undefined);
      expect(isValidWithMask('12', 'cpf')).toBe(false);
    });
  });

  describe('unformatWithMask', () => {
    it('unformats a masked value using the given mask', () => {
      const unmaskFn = vi.fn().mockReturnValue('999999');
      vi.mocked(inputmask).unmask = unmaskFn;

      const result = unformatWithMask('999-999', '999-999');

      expect(unmaskFn).toHaveBeenCalledWith('999-999', expect.objectContaining({ mask: '999-999' }));
      expect(result).toBe('999999');
    });

    it('unformats a masked value using an alias', () => {
      const unmaskFn = vi.fn().mockReturnValue('12345678900');
      vi.mocked(inputmask).unmask = unmaskFn;

      const result = unformatWithMask('123.456.789-00', 'cpf');

      expect(unmaskFn).toHaveBeenCalledWith(
        '123.456.789-00',
        expect.objectContaining({ mask: '999.999.999-99' }),
      );
      expect(result).toBe('12345678900');
    });
  });
});
