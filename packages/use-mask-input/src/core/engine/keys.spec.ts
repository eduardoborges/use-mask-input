import { describe, expect, it } from 'vitest';

import {
  keyCode, keys, toKey, toKeyCode,
} from './keys';

describe('keyCode', () => {
  it('maps every key name to its legacy code', () => {
    expect(keyCode).toEqual({
      c: 67,
      x: 88,
      z: 90,
      BACKSPACE_SAFARI: 127,
      Enter: 13,
      Meta_LEFT: 91,
      Meta_RIGHT: 92,
      Space: 32,
      Alt: 18,
      AltGraph: 18,
      ArrowDown: 40,
      ArrowLeft: 37,
      ArrowRight: 39,
      ArrowUp: 38,
      Backspace: 8,
      CapsLock: 20,
      Control: 17,
      ContextMenu: 93,
      Dead: 221,
      Delete: 46,
      End: 35,
      Escape: 27,
      F1: 112,
      F2: 113,
      F3: 114,
      F4: 115,
      F5: 116,
      F6: 117,
      F7: 118,
      F8: 119,
      F9: 120,
      F10: 121,
      F11: 122,
      F12: 123,
      Home: 36,
      Insert: 45,
      NumLock: 144,
      PageDown: 34,
      PageUp: 33,
      Pause: 19,
      PrintScreen: 44,
      Process: 229,
      Shift: 16,
      ScrollLock: 145,
      Tab: 9,
      Unidentified: 229,
    });
  });

  it('lists the character keys before the ones that produce no character', () => {
    expect(Object.keys(keyCode).slice(0, 9)).toEqual([
      'c', 'x', 'z', 'BACKSPACE_SAFARI', 'Enter', 'Meta_LEFT', 'Meta_RIGHT', 'Space', 'Alt',
    ]);
  });
});

describe('keys', () => {
  it('holds one entry per key name', () => {
    expect(Object.keys(keys)).toEqual(Object.keys(keyCode));
  });

  it('is the name itself for every key but Space', () => {
    Object.keys(keyCode)
      .filter((name) => name !== 'Space')
      .forEach((name) => {
        expect(keys[name as keyof typeof keys]).toBe(name);
      });
  });

  it('is a blank for Space, the value KeyboardEvent.key reports', () => {
    expect(keys.Space).toBe(' ');
  });

  it('matches what a browser reports in KeyboardEvent.key', () => {
    expect(new KeyboardEvent('keydown', { key: 'Backspace' }).key).toBe(keys.Backspace);
    expect(new KeyboardEvent('keydown', { key: 'Delete' }).key).toBe(keys.Delete);
    expect(new KeyboardEvent('keydown', { key: ' ' }).key).toBe(keys.Space);
    expect(new KeyboardEvent('keydown', { key: 'ArrowLeft' }).key).toBe(keys.ArrowLeft);
  });

  it('keeps the names no browser reports as they are', () => {
    // Comparing a real key against these never matches. Inputmask behaves the same.
    expect(keys.BACKSPACE_SAFARI).toBe('BACKSPACE_SAFARI');
    expect(keys.Meta_LEFT).toBe('Meta_LEFT');
    expect(keys.Meta_RIGHT).toBe('Meta_RIGHT');
  });
});

describe('toKey', () => {
  it('returns the name of a known code', () => {
    expect(toKey(8)).toBe('Backspace');
    expect(toKey(13)).toBe('Enter');
    expect(toKey(32)).toBe('Space');
    expect(toKey(46)).toBe('Delete');
    expect(toKey(127)).toBe('BACKSPACE_SAFARI');
  });

  it('returns the first name listed when two keys share a code', () => {
    expect(toKey(18)).toBe('Alt');
    expect(toKey(229)).toBe('Process');
  });

  it('returns the name of c, x and z whatever the shift state', () => {
    expect(toKey(67)).toBe('c');
    expect(toKey(88, true)).toBe('x');
    expect(toKey(90, false)).toBe('z');
  });

  it('returns the character of an unknown code, lower-cased without shift', () => {
    expect(toKey(65)).toBe('a');
    expect(toKey(65, false)).toBe('a');
    expect(toKey(65, true)).toBe('A');
    expect(toKey(49)).toBe('1');
    expect(toKey(49, true)).toBe('1');
  });
});

describe('toKeyCode', () => {
  it('returns the code of a named key', () => {
    expect(toKeyCode('Backspace')).toBe(8);
    expect(toKeyCode('Space')).toBe(32);
    expect(toKeyCode('c')).toBe(67);
    expect(toKeyCode('Unidentified')).toBe(229);
  });

  it('returns undefined for any other key', () => {
    expect(toKeyCode('a')).toBeUndefined();
    expect(toKeyCode(' ')).toBeUndefined();
    expect(toKeyCode('')).toBeUndefined();
    expect(toKeyCode('backspace')).toBeUndefined();
  });
});
