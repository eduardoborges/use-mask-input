import {
  describe, expect, it, vi,
} from 'vitest';

import { extend } from './extend';

describe('extend', () => {
  describe('shallow', () => {
    it('copies the properties of the source onto the target and returns the target', () => {
      const target = { a: 1 };
      const result = extend(target, { b: 2 });

      expect(result).toBe(target);
      expect(target).toEqual({ a: 1, b: 2 });
    });

    it('lets later sources win', () => {
      expect(extend({}, { a: 1, b: 1 }, { a: 2 })).toEqual({ a: 2, b: 1 });
    });

    it('replaces nested objects instead of merging them', () => {
      const nested = { y: 2 };
      const result = extend({ a: { x: 1 } }, { a: nested });

      expect(result.a).toBe(nested);
      expect(result).toEqual({ a: { y: 2 } });
    });

    it('skips undefined values and copies null', () => {
      expect(extend({ a: 1, b: 2 }, { a: undefined, b: null })).toEqual({ a: 1, b: null });
    });

    it('copies falsy values that are not undefined', () => {
      expect(extend({ a: 1, b: 1, c: 1 }, { a: 0, b: '', c: false })).toEqual({ a: 0, b: '', c: false });
    });

    it('ignores null and undefined sources', () => {
      expect(extend({ a: 1 }, null, { b: 2 })).toEqual({ a: 1, b: 2 });
      expect(extend({ a: 1 }, undefined)).toEqual({ a: 1 });
    });

    it('leaves the sources untouched', () => {
      const source = { a: { x: 1 } };
      extend({}, source, { a: { y: 2 } });

      expect(source).toEqual({ a: { x: 1 } });
    });
  });

  describe('deep', () => {
    it('merges nested plain objects', () => {
      expect(extend(true, { a: { x: 1 } }, { a: { y: 2 } })).toEqual({ a: { x: 1, y: 2 } });
    });

    it('merges into the nested object the target already holds', () => {
      const nested = { x: 1 };
      const result = extend(true, { a: nested }, { a: { y: 2 } });

      expect(result.a).toBe(nested);
      expect(nested).toEqual({ x: 1, y: 2 });
    });

    it('clones nested objects of the source, so the copy can change on its own', () => {
      const source = { a: { list: [1, { deep: true }] } };
      const copy = extend(true, {}, source);

      expect(copy).toEqual(source);
      expect(copy.a).not.toBe(source.a);
      expect(copy.a.list).not.toBe(source.a.list);
      expect(copy.a.list[1]).not.toBe(source.a.list[1]);
    });

    it('merges arrays index by index', () => {
      expect(extend(true, { a: [9, 9, 9, 9] }, { a: [1, undefined, 3] })).toEqual({ a: [1, 9, 3, 9] });
    });

    it('replaces a value of another kind with a fresh object or array', () => {
      expect(extend(true, { a: 'text' }, { a: { deep: true } })).toEqual({ a: { deep: true } });
      expect(extend(true, { a: { deep: true } }, { a: 'text' })).toEqual({ a: 'text' });
      expect(extend(true, { a: [1] }, { a: { 0: 'x' } })).toEqual({ a: { 0: 'x' } });
      expect(extend(true, { a: { 0: 'x' } }, { a: [1] })).toEqual({ a: [1] });
    });

    it('copies dates, regexes and functions by reference', () => {
      const date = new Date(0);
      const regex = /x/g;
      const copy = extend(true, {}, { date, regex, fn: Math.round });

      expect(copy.date).toBe(date);
      expect(copy.regex).toBe(regex);
      expect(copy.fn).toBe(Math.round);
    });

    it('turns a class instance into a plain copy of its own properties', () => {
      class Sample {
        own = 1;

        get accessor(): number { return 2; }

        method(): number { return this.own; }
      }
      const instance = new Sample();
      const copy = extend(true, {}, { instance });

      expect(copy.instance).not.toBe(instance);
      expect(copy.instance).toEqual({ own: 1 });
      expect(copy.instance instanceof Sample).toBe(false);
      expect(Object.keys(copy.instance)).toEqual(['own']);
    });

    it('deep-clones an array with `extend(true, [], list)`', () => {
      const list = [{ a: 1 }, { a: 2 }];
      const copy = extend(true, [], list);

      expect(copy).toEqual(list);
      expect(copy).not.toBe(list);
      expect(copy[0]).not.toBe(list[0]);
    });

    it('keeps the holes of a sparse array', () => {
      const sparse: (string | undefined)[] = [];
      sparse[2] = 'x';
      sparse[5] = undefined;
      const copy = extend(true, [], sparse);

      expect(copy.length).toBe(3);
      expect(Object.keys(copy)).toEqual(['2']);
      expect(0 in copy).toBe(false);
    });

    it('skips a value that is the target itself', () => {
      const target: Record<string, unknown> = {};
      extend(true, target, { self: target, other: 1 });

      expect(Object.keys(target)).toEqual(['other']);
    });

    it('has no other cycle guard: a cycle through a nested object overflows the stack, as in Inputmask', () => {
      const options: Record<string, unknown> = { inputFormat: 'dd/mm/yyyy' };
      options.min = { opts: options };

      expect(() => extend(true, {}, options)).toThrow(RangeError);
    });

    it('merges two sources in order', () => {
      const result = extend(true, {}, { a: { x: 1, list: [1, 2] } }, { a: { y: 2, list: [9] } });

      expect(result).toEqual({ a: { x: 1, y: 2, list: [9, 2] } });
    });
  });

  describe('inherited properties', () => {
    it('copies enumerable properties the source inherits', () => {
      const parent = { inherited: 'yes' };
      const source = Object.create(parent);
      source.own = 1;

      expect(extend({}, source)).toEqual({ own: 1, inherited: 'yes' });
      expect(Object.keys(extend(true, {}, source))).toEqual(['own', 'inherited']);
    });
  });

  describe('target handling', () => {
    it('creates a target when it is missing', () => {
      const untyped = extend as (...args: unknown[]) => unknown;

      expect(untyped(null, { a: 1 })).toEqual({ a: 1 });
      expect(untyped(undefined, { a: 1 })).toEqual({ a: 1 });
      expect(untyped(true)).toEqual({});
      expect(untyped(true, null, { a: 1 })).toEqual({ a: 1 });
    });

    it('replaces a primitive target with a new object', () => {
      const untyped = extend as (...args: unknown[]) => unknown;

      expect(untyped('text', { a: 1 })).toEqual({ a: 1 });
      expect(untyped(5, { a: 1 })).toEqual({ a: 1 });
      expect(untyped(true, 'text', { a: 1 })).toEqual({ a: 1 });
    });

    it('accepts a function as the target', () => {
      const target = vi.fn();
      const result = extend(target, { a: 1 });

      expect(result).toBe(target);
      expect(result.a).toBe(1);
    });

    it('treats a leading false as a missing target, not as a flag', () => {
      const untyped = extend as (...args: unknown[]) => unknown;
      const intended = { a: { x: 1 } };
      const result = untyped(false, intended, { a: { y: 2 } });

      expect(result).not.toBe(intended);
      expect(result).toEqual({ a: { y: 2 } });
      expect(intended).toEqual({ a: { x: 1 } });
    });

    it('copies the characters of a string source by index', () => {
      const untyped = extend as (...args: unknown[]) => unknown;

      expect(untyped({ a: 1 }, 'ab')).toEqual({ a: 1, 0: 'a', 1: 'b' });
      expect(untyped({ a: 1 }, 7, true)).toEqual({ a: 1 });
    });
  });

  describe('types', () => {
    it('types a deep clone as its source', () => {
      const source = { a: 1, nested: { list: ['x'] } };
      const copy: typeof source = extend(true, {}, source);
      const list: { a: number }[] = extend(true, [], [{ a: 1 }]);

      expect(copy.nested.list[0]).toBe('x');
      expect(list[0].a).toBe(1);
    });

    it('types a merge as the target with the sources added', () => {
      const merged = extend({ a: 1 }, { b: 'two' }, { c: true });
      const sum: number = merged.a;
      const text: string = merged.b;
      const flag: boolean = merged.c;

      expect([sum, text, flag]).toEqual([1, 'two', true]);
    });
  });
});
