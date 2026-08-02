import { findInputElement, resolveInputRef } from '../core/elementResolver';

import type { Input, Mask, UnmaskedValueApi } from '../types';

// Kept self-contained (not relying on the ambient src/@types augmentation) so
// this module type-checks when consumers compile the package source directly,
// e.g. the example apps that alias `use-mask-input` to `src` and build with `tsc`.
type MaskedElement = (HTMLInputElement | HTMLTextAreaElement) & {
  inputmask?: { unmaskedvalue?: () => string; remove?: () => void };
};

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

  const { inputmask } = element as MaskedElement;

  if (inputmask && typeof inputmask.unmaskedvalue === 'function') {
    return inputmask.unmaskedvalue();
  }

  return 'value' in element ? element.value : '';
}

/**
 * Detaches Inputmask from an element, restoring the native `value` accessor it
 * overrode and dropping the listeners it installed.
 *
 * Every React ref callback in this package calls this from its detach branch,
 * rather than returning a cleanup function. React 19 added cleanup returns, but
 * React 17 and 18 ignore whatever a ref callback returns, so on the lower half
 * of the `react >= 17` peer range the cleanup would silently never run. The
 * detach branch is correct on all three: 17 and 18 always call `ref(null)` when
 * the ref comes off an element, and 19 still does for any callback that returns
 * no cleanup, which these do since they return void.
 *
 * @param input - The element (or ref) the mask was applied to
 */
export function removeMask(input: Input | null): void {
  const element = resolveUnmaskedInput(input) as MaskedElement | null;
  element?.inputmask?.remove?.();
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
