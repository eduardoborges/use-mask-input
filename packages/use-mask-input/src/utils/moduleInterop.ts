/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Synchronously resolve the default value of a module.
 */
export default function interopDefaultSync<T = any>(module: T): T {
  if (typeof module === 'object' && module !== null) {
    if ('default' in module) {
      return module.default as T;
    }
    return module;
  }
  return module;
}
