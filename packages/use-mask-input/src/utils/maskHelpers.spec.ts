import { describe, expect, it, vi } from 'vitest';

import { getUnmaskedValue, makeMaskCacheKey } from './maskHelpers';

describe('maskHelpers', () => {
  describe('makeMaskCacheKey', () => {
    it('joins field name and string mask', () => {
      expect(makeMaskCacheKey('cpf', '999.999.999-99')).toBe('cpf:999.999.999-99');
    });

    it('joins array masks with commas', () => {
      expect(makeMaskCacheKey('doc', ['cpf', 'cnpj'])).toBe('doc:cpf,cnpj');
    });
  });

  describe('getUnmaskedValue', () => {
    it('returns an empty string when there is no element', () => {
      expect(getUnmaskedValue(null)).toBe('');
    });

    it('reads from the inputmask instance attached to the element', () => {
      const input = document.createElement('input');
      input.value = '123.456.789-00';

      // The inputmask property comes from the ambient declaration in
      // src/@types/inputmask.d.ts; this assignment must type-check.
      input.inputmask = {
        unmaskedvalue: vi.fn(() => '12345678900'),
      };

      expect(getUnmaskedValue(input)).toBe('12345678900');
      expect(input.inputmask.unmaskedvalue).toHaveBeenCalledTimes(1);
    });

    it('works the same way for textarea elements', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'masked';
      textarea.inputmask = {
        unmaskedvalue: () => 'unmasked',
      };

      expect(getUnmaskedValue(textarea)).toBe('unmasked');
    });

    it('falls back to element.value when no inputmask instance is present', () => {
      const input = document.createElement('input');
      input.value = 'raw value';

      expect(input.inputmask).toBeUndefined();
      expect(getUnmaskedValue(input)).toBe('raw value');
    });

    it('falls back to element.value when inputmask has no unmaskedvalue fn', () => {
      const input = document.createElement('input');
      input.value = 'raw value';
      input.inputmask = {};

      expect(getUnmaskedValue(input)).toBe('raw value');
    });

    it('resolves the input from a React ref object before reading inputmask', () => {
      const input = document.createElement('input');
      input.inputmask = {
        unmaskedvalue: () => 'from-ref',
      };

      // resolveInputRef also accepts ref objects, which the public Input type
      // does not model, so the cast mirrors how internal callers pass refs.
      const ref = { current: input } as unknown as HTMLInputElement;
      expect(getUnmaskedValue(ref)).toBe('from-ref');
    });
  });
});
