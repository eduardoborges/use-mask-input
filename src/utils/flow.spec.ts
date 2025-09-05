/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import {
  describe, expect, it,
} from 'vitest';

import flow from './flow';

describe('flow', () => {
  it('returns a function', () => {
    const result = flow();
    expect(typeof result).toBe('function');
  });

  it('returns undefined value if no return funcion provided', () => {
    const result = flow(() => {})(42);
    expect(result).toBe(undefined);
  });

  it('throws an error if any argument is not a function', () => {
    // @ts-expect-error - null is not a function
    expect(() => flow(null)).toThrow(TypeError);
    // @ts-expect-error - null is not a function
    expect(() => flow(() => {}, null)).toThrow(TypeError);
  });

  it('returns the original value if no functions are provided', () => {
    const result = flow()(42);
    expect(result).toBe(42);
  });

  it.todo('binds the functions to the correct context', () => {
    const context = { value: 42 };
    const fn1 = function (this: { value: number }) {
      return this.value;
    };
    const fn2 = function (this: { value: number }, n: number) {
      return this.value + n;
    };
    const fn = flow(fn1, fn2).bind(context);
    const result = fn(10);
    expect(result).toBe(52);
  });

  it('should return a function', () => {
    const result = flow();
    expect(typeof result).toBe('function');
  });

  it('should throw an error if any argument is not a function', () => {
    expect(() => {
      flow(1 as unknown as Function, () => {});
    }).toThrow(TypeError);
  });

  it('should return the input argument if no functions are provided', () => {
    const input = 'test';
    const result = flow()(input);
    expect(result).toBe(input);
  });
});
