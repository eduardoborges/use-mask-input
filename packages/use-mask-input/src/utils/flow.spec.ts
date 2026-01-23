import {
  describe, expect, it,
} from 'vitest';

import flow from './flow';

describe('flow', () => {
  it('returns a function', () => {
    const result = flow();
    expect(typeof result).toBe('function');
  });

  it('returns undefined value if no return function provided', () => {
    const result = flow(() => { });
    expect(result(42)).toBe(undefined);
  });

  it('throws an error if any argument is not a function', () => {
    // @ts-expect-error - null is not a function
    expect(() => flow(null)).toThrow(TypeError);
    // @ts-expect-error - null is not a function
    expect(() => flow(() => { }, null)).toThrow(TypeError);
    expect(() => {
      flow(1 as unknown as () => void, () => { });
    }).toThrow(TypeError);
  });

  it('returns the original value if no functions are provided', () => {
    const result = flow();
    expect(result(42)).toBe(42);
    expect(result('test')).toBe('test');
  });

  it('composes functions correctly', () => {
    const addOne = (x: number) => x + 1;
    const multiplyByTwo = (x: number) => x * 2;
    const subtractThree = (x: number) => x - 3;

    const composed = flow(addOne, multiplyByTwo, subtractThree);
    expect(composed(5)).toBe(9); // (5 + 1) * 2 - 3 = 9
  });

  it('works with single function', () => {
    const double = (x: number) => x * 2;
    const fn = flow(double);
    expect(fn(5)).toBe(10);
  });

  it('works with multiple functions', () => {
    const fn1 = (n: number) => n + 1;
    const fn2 = (n: number) => n * 2;
    const fn3 = (n: number) => n - 1;

    const composed = flow(fn1, fn2, fn3);
    expect(composed(5)).toBe(11); // ((5 + 1) * 2) - 1 = 11
  });
});
