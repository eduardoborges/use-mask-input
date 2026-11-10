/**
 * `a == b`. Positions and locators mix numbers with numeric strings, and the
 * engine compares them with `==`. Every other comparison in the engine is
 * strict.
 */
export function looseEquals(a: unknown, b: unknown): boolean {
  // oxlint-disable-next-line eqeqeq -- the one place that needs the coercion
  return a == b;
}
