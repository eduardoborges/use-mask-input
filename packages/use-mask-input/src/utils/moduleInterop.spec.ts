import { describe, expect, it } from 'vitest';

import interopDefaultSync from './moduleInterop';

describe('interopDefaultSync', () => {
  it('returns module with default export', () => {
    const module = { default: 'test' };
    expect(interopDefaultSync(module)).toBe('test');
  });

  it('returns module without default export', () => {
    const module = { foo: 'bar' };
    expect(interopDefaultSync(module)).toBe(module);
  });

  it('returns non-object values as-is', () => {
    expect(interopDefaultSync('string')).toBe('string');
    expect(interopDefaultSync(123)).toBe(123);
    expect(interopDefaultSync(null)).toBe(null);
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    expect(interopDefaultSync(undefined)).toBe(undefined);
  });

  it('handles null module', () => {
    expect(interopDefaultSync(null)).toBe(null);
  });

  it('handles module with null default', () => {
    const module = { default: null };
    expect(interopDefaultSync(module)).toBe(null);
  });

  it('handles module with undefined default', () => {
    const module = { default: undefined };
    expect(interopDefaultSync(module)).toBe(undefined);
  });
});
