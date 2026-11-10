import { describe, expect, it } from 'vitest';

import { escapeRegex } from './escapeRegex';

describe('escapeRegex', () => {
  it('escapes every character with a meaning in a regex', () => {
    expect(escapeRegex('/.*+?|()[]{}\\$^')).toBe('\\/\\.\\*\\+\\?\\|\\(\\)\\[\\]\\{\\}\\\\\\$\\^');
  });

  it('leaves every other character alone', () => {
    const plain = 'abc XYZ 0123 -_,;:!@#%&=~`\'"<> çã ΩЖ\n\t';

    expect(escapeRegex(plain)).toBe(plain);
  });

  it('escapes each occurrence, not just the first', () => {
    expect(escapeRegex('1.000.000,00')).toBe('1\\.000\\.000,00');
    expect(escapeRegex('$ (USD)')).toBe('\\$ \\(USD\\)');
  });

  it('returns an empty string for an empty string', () => {
    expect(escapeRegex('')).toBe('');
  });

  it('gives the same answer on consecutive calls', () => {
    // A global regex keeps `lastIndex` between `test`/`exec` calls. `replace` must not.
    expect(escapeRegex('a.b')).toBe('a\\.b');
    expect(escapeRegex('a.b')).toBe('a\\.b');
    expect(escapeRegex('.')).toBe('\\.');
  });

  it('produces a source that matches the original text literally', () => {
    const text = '(R$ 1.000,00) [50%] {a|b} ^start$ a+b? c*d \\ /';

    expect(new RegExp(`^${escapeRegex(text)}$`).test(text)).toBe(true);
    expect(new RegExp(escapeRegex('.')).test('x')).toBe(false);
  });
});
