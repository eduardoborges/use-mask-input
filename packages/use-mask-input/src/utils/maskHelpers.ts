import type { Mask } from '../types';

/**
 * Builds a stable string key from a field name and mask, used to cache ref
 * callbacks so their identity stays stable across renders.
 */
export function makeMaskCacheKey(fieldName: string, mask: Mask): string {
  return `${fieldName}:${Array.isArray(mask) ? mask.join(',') : String(mask)}`;
}

/**
 * Attaches the original ref as a non-enumerable `prevRef` property so it is
 * accessible internally without polluting the spread result.
 */
export function setPrevRef(result: object, ref: unknown): void {
  Object.defineProperty(result, 'prevRef', {
    value: ref,
    enumerable: false,
    writable: true,
    configurable: true,
  });
}
