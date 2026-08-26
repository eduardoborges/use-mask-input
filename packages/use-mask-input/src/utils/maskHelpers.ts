import { findInputElement, resolveInputRef } from '../core/elementResolver';

import type {
  Input, Mask, Options, UnmaskedValueApi,
} from '../types';

// Kept self-contained (not relying on the ambient src/@types augmentation) so
// this module type-checks when consumers compile the package source directly,
// e.g. the example apps that alias `use-mask-input` to `src` and build with `tsc`.
type MaskedElement = (HTMLInputElement | HTMLTextAreaElement) & {
  inputmask?: {
    unmaskedvalue?: () => string;
    isComplete?: () => boolean | undefined;
    remove?: () => void;
  };
};

/**
 * Builds a stable string key from a field name and mask, used to cache ref
 * callbacks so their identity stays stable across renders.
 */
export function makeMaskCacheKey(fieldName: string, mask: Mask): string {
  return `${fieldName}:${Array.isArray(mask) ? mask.join(',') : String(mask)}`;
}

/**
 * Shallow equality over mask options. Shared by both binding layers so their
 * "did this actually change?" guards cannot drift apart.
 *
 * Compares structurally, not by identity: callers pass inline object literals
 * (`options={{ prefix: 'R$ ' }}`, `v-mask-input="{ mask: 'cpf' }"`) that
 * allocate a fresh object every render and would otherwise never look equal.
 *
 * ponytail: shallow on purpose. An options object mutated in place, or one
 * holding functions, won't compare equal-then-changed correctly — but deep
 * comparison on every re-render is exactly the cost this guard exists to
 * avoid. Documented as "replace options, don't mutate them".
 */
export function sameOptions(a?: Options, b?: Options): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  const keysA = Object.keys(a) as (keyof Options)[];
  const keysB = Object.keys(b) as (keyof Options)[];
  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => Object.is(a[key], b[key]));
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
 * Whether every required position of the mask on `input` is filled.
 *
 * No element yet (unmounted, SSR) reads as incomplete. An element with no mask
 * attached, or a mask Inputmask cannot judge (`repeat: '*'` yields `undefined`),
 * reads as complete: there is no pattern left to finish.
 */
export function isMaskComplete(input: Input | null): boolean {
  const element = resolveUnmaskedInput(input);
  if (!element) return false;

  const { inputmask } = element as MaskedElement;
  if (inputmask && typeof inputmask.isComplete === 'function') {
    return inputmask.isComplete() !== false;
  }

  return true;
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

/**
 * Hangs `unmaskedValue()` and `isComplete()` on a hook result as non-enumerable
 * properties, so spreading the result into JSX props does not leak them.
 *
 * @param result - The ref callback or props object being returned to the caller
 * @param getElement - Resolves the currently masked element, or null
 */
export function setValueApi<T extends object>(
  result: T,
  getElement: () => Input | null,
): T & UnmaskedValueApi {
  const define = (key: keyof UnmaskedValueApi, value: () => unknown) => {
    Object.defineProperty(result, key, {
      value,
      enumerable: false,
      writable: true,
      configurable: true,
    });
  };

  define('unmaskedValue', () => getUnmaskedValue(getElement()));
  define('isComplete', () => isMaskComplete(getElement()));

  return result as T & UnmaskedValueApi;
}
