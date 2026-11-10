import type { JsonValue, Outcome } from './types';

/**
 * Canonical renderings of whatever an engine hands back or passes to a
 * callback. Both engines go through the same code, so two values render the
 * same exactly when the harness considers them equal.
 */

const MAX_DEPTH = 6;
const MAX_ITEMS = 40;

type UnknownRecord = Record<string, unknown>;

export interface InspectOptions {
  /**
   * Renders Control and Meta alike. The browser driver sets it while it
   * presses the platform's own paste and cut shortcut.
   */
  neutralModifiers?: boolean;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function isElement(value: unknown): value is Element {
  return typeof Element !== 'undefined' && value instanceof Element;
}

function isEvent(value: unknown): value is Event {
  return typeof Event !== 'undefined' && value instanceof Event;
}

function isEngineInstance(value: unknown): boolean {
  return isRecord(value)
    && typeof value.unmaskedvalue === 'function'
    && typeof value.getemptymask === 'function';
}

function isResolvedOptions(value: unknown): boolean {
  return isRecord(value) && '_maxTestPos' in value;
}

function isMaskset(value: unknown): boolean {
  return isRecord(value) && 'validPositions' in value && 'maskToken' in value;
}

function describeNumber(value: number): string {
  if (Number.isNaN(value)) return 'NaN';
  if (value === Infinity) return 'Infinity';
  if (value === -Infinity) return '-Infinity';
  return Object.is(value, -0) ? '-0' : String(value);
}

function describeElement(element: Element): string {
  return `<${element.tagName.toLowerCase()}>`;
}

function describeDate(date: Date): string {
  return Number.isNaN(date.getTime()) ? 'Date(invalid)' : `Date(${date.toISOString()})`;
}

type EventReader = (property: string) => unknown;

function modifiersOf(read: EventReader, options: InspectOptions): string[] {
  const names: string[] = [];
  const primary = read('ctrlKey') === true || read('metaKey') === true;
  if (options.neutralModifiers) {
    if (primary) names.push('mod');
  } else {
    if (read('ctrlKey') === true) names.push('ctrl');
    if (read('metaKey') === true) names.push('meta');
  }
  if (read('altKey') === true) names.push('alt');
  if (read('shiftKey') === true) names.push('shift');
  return names;
}

function describeEvent(event: Event, options: InspectOptions): string {
  // Read by name: a keyboard event has these, and so does the plain event
  // upstream decorates with a `key` while it validates a value.
  const read: EventReader = (property) => Reflect.get(event, property);
  const key = read('key');
  const inputType = read('inputType');
  const parts = [event.type];
  if (typeof key === 'string') {
    const neutral = options.neutralModifiers && (key === 'Meta' || key === 'Control');
    parts.push(`key=${JSON.stringify(neutral ? 'Mod' : key)}`);
  }
  if (typeof inputType === 'string' && inputType !== '') parts.push(`inputType=${inputType}`);
  parts.push(...modifiersOf(read, options));
  return `Event(${parts.join(' ')})`;
}

/** Arrays of single characters are buffers; they read better as one quoted run. */
function isCharacterArray(items: unknown[]): boolean {
  const hasHoles = Object.keys(items).length !== items.length;
  if (items.length === 0 || hasHoles) return false;
  return items.every((item) => typeof item === 'string' && item.length === 1);
}

interface Walk {
  options: InspectOptions;
  ancestors: unknown[];
}

function inspectValue(value: unknown, walk: Walk): string {
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') return describeNumber(value);
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'function') return 'fn';
  // What is left that is not an object: null, booleans and symbols.
  if (!isRecord(value)) return String(value);
  if (isElement(value)) return describeElement(value);
  if (isEvent(value)) return describeEvent(value, walk.options);
  if (value instanceof Date) return describeDate(value);
  if (value instanceof RegExp) return String(value);
  if (isEngineInstance(value)) return 'Inputmask';
  if (isResolvedOptions(value)) return 'opts';
  if (isMaskset(value)) return 'maskset';
  if (walk.ancestors.includes(value)) return '(circular)';

  const deeper: Walk = { options: walk.options, ancestors: [...walk.ancestors, value] };
  const tooDeep = deeper.ancestors.length > MAX_DEPTH;

  if (Array.isArray(value)) {
    if (isCharacterArray(value)) return `'${value.join('')}'`;
    if (tooDeep) return '[…]';
    const shown = Array.from(value.slice(0, MAX_ITEMS), (item: unknown, index) => (
      index in value ? inspectValue(item, deeper) : 'empty'
    ));
    if (value.length > MAX_ITEMS) shown.push(`…+${value.length - MAX_ITEMS}`);
    return `[${shown.join(',')}]`;
  }

  if (tooDeep) return '{…}';
  const entries = Object.keys(value)
    .toSorted()
    .map((key) => `${key}:${inspectValue(value[key], deeper)}`);
  return `{${entries.join(',')}}`;
}

/** One line for a callback log. Keys are sorted and cycles are cut, so equal values render alike. */
export function inspect(value: unknown, options: InspectOptions = {}): string {
  return inspectValue(value, { options, ancestors: [] });
}

function tagged(text: string): string {
  return `«${text}»`;
}

function toJsonValue(value: unknown, ancestors: unknown[]): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (value === undefined) return tagged('undefined');
  if (typeof value === 'number') {
    return Number.isFinite(value) && !Object.is(value, -0) ? value : tagged(describeNumber(value));
  }
  if (typeof value === 'bigint') return tagged(`${value}n`);
  if (typeof value === 'function') return tagged('function');
  // What is left that is not an object: symbols.
  if (!isRecord(value)) return tagged(String(value));
  if (isElement(value)) return tagged(describeElement(value));
  if (isEvent(value)) return tagged(describeEvent(value, {}));
  if (value instanceof Date) return tagged(describeDate(value));
  if (value instanceof RegExp) return tagged(String(value));
  if (isEngineInstance(value)) return tagged('Inputmask');
  if (ancestors.includes(value)) return tagged('circular');
  if (ancestors.length >= MAX_DEPTH) return tagged('…');

  const deeper = [...ancestors, value];
  if (Array.isArray(value)) {
    return Array.from(value, (item: unknown, index) => (
      index in value ? toJsonValue(item, deeper) : tagged('empty')
    ));
  }

  const result: Record<string, JsonValue> = {};
  Object.keys(value).toSorted().forEach((key) => {
    result[key] = toJsonValue(value[key], deeper);
  });
  return result;
}

/** What a fixture stores for a value. Anything JSON cannot hold becomes a `«tag»`. */
export function toJson(value: unknown): JsonValue {
  return toJsonValue(value, []);
}

export function errorMessage(error: unknown): string {
  // Checked by shape, because jsdom's DOMException is not an Error.
  if (isRecord(error) && typeof error.name === 'string' && typeof error.message === 'string') {
    return `${error.name}: ${error.message}`;
  }
  return `thrown: ${inspect(error)}`;
}

/** Runs a read against the engine and keeps what it throws as the outcome. */
export function outcomeOf(read: () => unknown): Outcome {
  try {
    return toJson(read());
  } catch (error) {
    return { throws: errorMessage(error) };
  }
}

export function jsonEqual(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
  if (left === right) return true;
  if (left === undefined || right === undefined || left === null || right === null) return false;
  if (typeof left !== 'object' || typeof right !== 'object') return false;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((item, index) => jsonEqual(item, right[index]));
  }

  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) return false;
  return leftKeys.every((key) => key in right && jsonEqual(left[key], right[key]));
}

function isIdentifier(key: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(key);
}

function literalOf(value: unknown, ancestors: unknown[], showSource: boolean): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return describeNumber(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'function') {
    return showSource ? String(value) : `[Function${value.name ? ` ${value.name}` : ''}]`;
  }
  if (value instanceof RegExp) return String(value);
  if (value instanceof Date) return `new Date(${JSON.stringify(value.toISOString())})`;
  if (typeof value !== 'object') return String(value);
  if (ancestors.includes(value)) return '[Circular]';

  const deeper = [...ancestors, value];
  if (Array.isArray(value)) {
    return `[${value.map((item) => literalOf(item, deeper, showSource)).join(', ')}]`;
  }

  const record = value as UnknownRecord;
  const entries = Object.keys(record).map((key) => {
    const name = isIdentifier(key) ? key : JSON.stringify(key);
    return `${name}: ${literalOf(record[key], deeper, showSource)}`;
  });
  return entries.length === 0 ? '{}' : `{ ${entries.join(', ')} }`;
}

/**
 * A value as JavaScript source, for failure messages and fuzzer
 * reproductions. Functions print their source when `showSource` is set.
 */
export function toLiteral(value: unknown, showSource = false): string {
  return literalOf(value, [], showSource);
}
