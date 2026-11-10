import { describe, expect, it } from 'vitest';

import { looseEquals } from './looseEquals';

describe('looseEquals', () => {
  it('treats a number and its numeric string as equal', () => {
    expect(looseEquals(1, '1')).toBe(true);
    expect(looseEquals('01', 1)).toBe(true);
    expect(looseEquals(0, '')).toBe(true);
    expect(looseEquals(2, '1')).toBe(false);
    expect(looseEquals(1, '1,2')).toBe(false);
  });

  it('compares two strings as text', () => {
    expect(looseEquals('1', '1')).toBe(true);
    expect(looseEquals('01', '1')).toBe(false);
    expect(looseEquals('a', 'A')).toBe(false);
  });

  it('treats null and undefined as equal to each other only', () => {
    expect(looseEquals(null, undefined)).toBe(true);
    expect(looseEquals(undefined, undefined)).toBe(true);
    expect(looseEquals(null, 0)).toBe(false);
    expect(looseEquals(undefined, '')).toBe(false);
    expect(looseEquals(undefined, false)).toBe(false);
  });

  it('compares a boolean as a number', () => {
    expect(looseEquals(true, 1)).toBe(true);
    expect(looseEquals(false, 0)).toBe(true);
    expect(looseEquals(false, '')).toBe(true);
    expect(looseEquals(true, 2)).toBe(false);
    expect(looseEquals(true, 'true')).toBe(false);
  });

  it('converts an array to its joined text', () => {
    expect(looseEquals([1], 1)).toBe(true);
    expect(looseEquals([1, 2], '1,2')).toBe(true);
    expect(looseEquals([], '')).toBe(true);
  });

  it('compares two objects by identity', () => {
    const list = [1];
    expect(looseEquals(list, list)).toBe(true);
    expect(looseEquals([1], [1])).toBe(false);
  });
});
