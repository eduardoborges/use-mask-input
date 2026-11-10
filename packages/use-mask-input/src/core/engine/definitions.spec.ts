import { describe, expect, it } from 'vitest';

import { definitions } from './definitions';

describe('definitions', () => {
  it('starts with the digit, letter and alphanumeric symbols', () => {
    expect(definitions).toEqual({
      9: { validator: '\\p{N}', definitionSymbol: '*' },
      a: { validator: '\\p{L}', definitionSymbol: '*' },
      '*': { validator: '[\\p{L}\\p{N}]' },
    });
  });

  it('uses validators that compile with the unicode flag', () => {
    const digit = new RegExp(String(definitions[9].validator), 'u');
    const letter = new RegExp(String(definitions.a.validator), 'u');
    const any = new RegExp(String(definitions['*'].validator), 'u');

    expect(digit.test('7')).toBe(true);
    expect(digit.test('٧')).toBe(true);
    expect(digit.test('a')).toBe(false);

    expect(letter.test('a')).toBe(true);
    expect(letter.test('ç')).toBe(true);
    expect(letter.test('Ж')).toBe(true);
    expect(letter.test('7')).toBe(false);

    expect(any.test('a')).toBe(true);
    expect(any.test('7')).toBe(true);
    expect(any.test('-')).toBe(false);
    expect(any.test(' ')).toBe(false);
  });

  it('lets digits and letters stand in for the alphanumeric symbol', () => {
    expect(definitions[9].definitionSymbol).toBe('*');
    expect(definitions.a.definitionSymbol).toBe('*');
    expect(definitions['*'].definitionSymbol).toBeUndefined();
  });
});
