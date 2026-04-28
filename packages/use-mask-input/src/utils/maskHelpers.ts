import { findInputElement, resolveInputRef } from '../core/elementResolver';

import type { Input, Mask, UnmaskedValueApi } from '../types';

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

function resolveUnmaskedInput(input: Input | null): HTMLInputElement | HTMLTextAreaElement | null {
  const resolved = resolveInputRef(input);
  if (!resolved) return null;

  const inputElement = findInputElement(resolved);
  if (inputElement) {
    return inputElement as HTMLInputElement | HTMLTextAreaElement;
  }

  return resolved as HTMLInputElement | HTMLTextAreaElement;
}

export function getUnmaskedValue(input: Input | null): string {
  const element = resolveUnmaskedInput(input);
  if (!element) return '';

  const inputmask = (element as HTMLInputElement).inputmask as
    | { unmaskedvalue?: () => string }
    | undefined;

  if (inputmask && typeof inputmask.unmaskedvalue === 'function') {
    return inputmask.unmaskedvalue();
  }

  return 'value' in element ? element.value : '';
}

export function setUnmaskedValue<T extends object>(
  result: T,
  getter: () => string,
): T & UnmaskedValueApi {
  Object.defineProperty(result, 'unmaskedValue', {
    value: getter,
    enumerable: false,
    writable: true,
    configurable: true,
  });

  return result as T & UnmaskedValueApi;
}
