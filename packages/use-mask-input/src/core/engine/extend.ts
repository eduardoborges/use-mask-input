type Properties = Record<string, unknown>;

function isPlainObject(value: unknown): value is Properties {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function merge(deep: boolean, target: object, source: object): object {
  const into = target as Properties;
  const from = source as Properties;

  // There is no own-property check on purpose: inherited enumerable
  // properties are copied too.
  for (const name in from) {
    // Skipping a value that is the target itself keeps a deep merge from recursing forever.
    if (from[name] !== target) {
      const existing = into[name];
      const copy = from[name];

      if (deep && Array.isArray(copy)) {
        into[name] = merge(true, Array.isArray(existing) ? existing : [], copy);
      } else if (deep && copy && isPlainObject(copy)) {
        into[name] = merge(true, existing && isPlainObject(existing) ? existing : {}, copy);
      } else if (copy !== undefined) {
        into[name] = copy;
      }
    }
  }

  return target;
}

/**
 * Merges the sources into `target` and returns it, like `jQuery.extend`.
 *
 * - `undefined` values are skipped; `null` overwrites.
 * - With a leading `true`, arrays and plain objects are merged recursively
 *   into the matching value of the target, or into a fresh one when the target
 *   holds something else. Other values (dates, regexes, functions) are copied
 *   by reference.
 * - Anything whose tag is `[object Object]` counts as a plain object, class
 *   instances included, so a deep merge turns them into plain copies.
 * - Only a literal `true` asks for a deep merge. A leading `false` counts as a
 *   missing target, so everything after it is merged, shallowly, into a new
 *   object.
 *
 * `extend(true, [], list)` and `extend(true, {}, object)` are the deep-clone
 * idioms used throughout the engine.
 */
export function extend<Item>(deep: true, target: never[], source: readonly Item[]): Item[];
export function extend<Target extends object>(deep: true, target: Target): Target;
export function extend<Target extends object, Source>(
  deep: true,
  target: Target,
  source: Source | null | undefined,
): Target & Source;
export function extend<Target extends object, First, Second>(
  deep: true,
  target: Target,
  first: First | null | undefined,
  second: Second | null | undefined,
): Target & First & Second;
export function extend<Target extends object, Source>(
  target: Target,
  source: Source | null | undefined,
): Target & Source;
export function extend<Target extends object, First, Second>(
  target: Target,
  first: First | null | undefined,
  second: Second | null | undefined,
): Target & First & Second;
export function extend(...args: unknown[]): unknown {
  const deep = args[0] === true;
  const targetIndex = deep ? 1 : 0;

  // A missing or primitive target is replaced by a new object.
  const given = args[targetIndex] || {};
  const target: object = typeof given === 'object' || typeof given === 'function' ? given : {};

  args.slice(targetIndex + 1).forEach((source) => {
    if (source != null) merge(deep, target, Object(source));
  });

  return target;
}
