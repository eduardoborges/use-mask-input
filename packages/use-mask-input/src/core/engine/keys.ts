/** Keys that produce no character. */
const ignorables = {
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
} as const;

/** Legacy key codes by `KeyboardEvent.key` name. */
export const keyCode = {
  c: 67,
  x: 88,
  z: 90,
  BACKSPACE_SAFARI: 127,
  Enter: 13,
  Meta_LEFT: 91,
  Meta_RIGHT: 92,
  Space: 32,
  ...ignorables,
} as const;

export type KeyName = keyof typeof keyCode;

type KeyValues = { readonly [Name in KeyName]: Name extends 'Space' ? ' ' : Name };

const keyNames = Object.keys(keyCode);

/** Where two names share a code, the first one listed wins. */
const keyCodeRev = keyNames.reduce<Record<number, string>>((acc, name) => {
  const code = keyCode[name as KeyName];
  if (acc[code] === undefined) acc[code] = name;
  return acc;
}, {});

/**
 * `KeyboardEvent.key` value for each name: the name itself, except `Space`.
 * `BACKSPACE_SAFARI`, `Meta_LEFT` and `Meta_RIGHT` are not values a browser
 * reports, so comparing a key against them never matches.
 */
export const keys = Object.fromEntries(
  keyNames.map((name) => [name, name === 'Space' ? ' ' : name]),
) as KeyValues;

/** Name of the key with this code, or the character the code stands for. */
export function toKey(code: number, shiftKey?: boolean): string {
  return keyCodeRev[code]
    || (shiftKey ? String.fromCharCode(code) : String.fromCharCode(code).toLowerCase());
}

/** Code of a named key, or `undefined` for any other key. */
export function toKeyCode(key: string): number | undefined {
  return (keyCode as Record<string, number | undefined>)[key];
}
