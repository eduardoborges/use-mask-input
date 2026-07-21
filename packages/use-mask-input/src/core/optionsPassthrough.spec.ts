import { describe, expect, it } from 'vitest';

import { applyMaskToElement, formatWithMask, unformatWithMask } from './maskEngine';

/**
 * Behavioral proof that user-facing inputmask options are actually honored
 * end-to-end (issue #192). Everything here runs the REAL engine — no mocks —
 * so a green test means the option changes what the user really sees.
 *
 * Assertions use the real engine output. Two known quirks of the static
 * `Inputmask.format`/`unmask` calls are worked around, NOT hidden:
 *   - the `decimal`/`numeric` aliases drop the integer part in static format,
 *     so those cases assert the decimal/separator shape, not the whole value;
 *   - `prefix`/`suffix` only apply on numeric-family aliases, not raw masks.
 *
 * Deliberately NOT covered (would test inputmask internals or need unreliable
 * keystroke/focus simulation in jsdom, not this library's passthrough):
 * callbacks (onKeyDown, postValidation, …), structural markers
 * (optionalmarker, escapeChar, quantifiermarker), and event-driven options
 * (min/max, shortcuts, clearMaskOnLostFocus, keepStatic).
 */
describe('option behavior via the real engine (issue #192)', () => {
  describe('display via formatWithMask', () => {
    it('mask: applies the pattern', () => {
      expect(formatWithMask('12345', '999-99')).toBe('123-45');
    });

    it('placeholder: fills unentered positions with the custom char', () => {
      expect(formatWithMask('12', '9999', { placeholder: '#' })).toBe('12##');
    });

    it('prefix: prepends on numeric-family aliases', () => {
      expect(formatWithMask('5', 'integer', { prefix: 'US ' })).toBe('US 5');
    });

    it('suffix: appends on numeric-family aliases', () => {
      expect(formatWithMask('5', 'integer', { suffix: ' kg' })).toBe('5 kg');
    });

    it('groupSeparator: groups thousands with the custom char', () => {
      expect(formatWithMask('1234567', 'integer', { groupSeparator: '.' })).toBe('1.234.567');
    });

    it('radixPoint: uses the custom decimal separator', () => {
      const withComma = formatWithMask('1234', 'decimal', { radixPoint: ',', digits: 2, digitsOptional: false });
      expect(withComma).toMatch(/,\d{2}$/);
      expect(withComma).not.toContain('.');
    });

    it('digits: renders exactly N decimal places', () => {
      expect(formatWithMask('12.5', 'decimal', { digits: 2, digitsOptional: false })).toMatch(/\.\d{2}$/);
      expect(formatWithMask('12.5', 'decimal', { digits: 4, digitsOptional: false })).toMatch(/\.\d{4}$/);
    });

    it('digitsOptional: true omits, false forces the decimal part', () => {
      expect(formatWithMask('12', 'decimal', { digits: 2, digitsOptional: true })).not.toContain('.');
      expect(formatWithMask('12', 'decimal', { digits: 2, digitsOptional: false })).toMatch(/\.\d{2}$/);
    });

    it('casing: upper/lower transform entered chars', () => {
      expect(formatWithMask('abc', 'AAA', { casing: 'upper' })).toBe('ABC');
      expect(formatWithMask('ABC', 'AAA', { casing: 'lower' })).toBe('abc');
    });

    it('repeat + greedy: repeats the definition N times', () => {
      expect(formatWithMask('123', '9', { repeat: 3, greedy: false })).toBe('123');
    });

    it('allowMinus + negationSymbol: control negative rendering', () => {
      expect(formatWithMask('-5', 'decimal', { allowMinus: true, digits: 0 })).toBe('-5');
      expect(
        formatWithMask('-5', 'decimal', { allowMinus: true, digits: 0, negationSymbol: { front: '(', back: ')' } }),
      ).toBe('(5)');
    });

    it('inputFormat: displays a datetime in the given layout', () => {
      expect(formatWithMask('24072026', 'datetime', { inputFormat: 'dd/mm/yyyy' })).toBe('24/07/2026');
    });
  });

  describe('unmasking via unformatWithMask', () => {
    it('outputFormat: unmasks a datetime into the given layout', () => {
      expect(
        unformatWithMask('24/07/2026', 'datetime', { inputFormat: 'dd/mm/yyyy', outputFormat: 'yyyy-mm-dd' }),
      ).toBe('2026-07-24');
    });

    it('unmaskAsNumber: returns a number, not a string', () => {
      const raw = unformatWithMask('1234', 'integer', { unmaskAsNumber: true });
      expect(typeof raw).toBe('number');
      expect(raw).toBe(1234);
    });
  });

  describe('DOM effects on a mounted input', () => {
    it('rightAlign: true right-aligns, false leaves default', () => {
      const aligned = document.createElement('input');
      applyMaskToElement(aligned, 'numeric', { rightAlign: true });
      expect(aligned.style.textAlign).toBe('right');

      const plain = document.createElement('input');
      applyMaskToElement(plain, 'numeric', { rightAlign: false });
      expect(plain.style.textAlign).not.toBe('right');
    });

    it('inputmode: sets the inputMode attribute on the element', () => {
      const input = document.createElement('input');
      applyMaskToElement(input, '999', { inputmode: 'numeric' });
      expect(input.inputMode).toBe('numeric');
    });
  });
});
