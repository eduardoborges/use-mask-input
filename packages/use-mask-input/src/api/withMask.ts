/* eslint-disable import-x/no-extraneous-dependencies */
import inputmask from '../core/inputmask';

import { getMaskOptions } from '../core/maskConfig';
import { getUnmaskedValue, makeMaskCacheKey, setUnmaskedValue } from '../utils';
import isServer from '../utils/isServer';
import interopDefaultSync from '../utils/moduleInterop';

import type { Input, Mask, Options, UseMaskInputReturn } from '../types';

const callbackCache = new Map<string, UseMaskInputReturn>();

/**
 * Higher-order function that creates a ref callback for applying input masks.
 * Simple function to apply mask via ref. No hooks, no drama.
 *
 * @param mask - The mask pattern to apply
 * @param options - Optional mask configuration options
 * @returns A ref callback function that applies the mask
 */
export default function withMask(mask: Mask, options?: Options): UseMaskInputReturn {
  // without options, we cant cache, so we always return a fresh callback. :P
  if (!options) {
    const cacheKey = makeMaskCacheKey('', mask);
    if (callbackCache.has(cacheKey)) {
      return callbackCache.get(cacheKey) as UseMaskInputReturn;
    }
  }

  let currentInput: Input | null = null;

  const callback = ((input: Input | null): void => {
    if (isServer || mask === null || !input) return;

    currentInput = input;
    const maskInput = interopDefaultSync(inputmask)(getMaskOptions(mask, options));
    maskInput.mask(input as HTMLElement);
  }) as UseMaskInputReturn;

  if (!options) {
    const cacheKey = makeMaskCacheKey('', mask);
    callbackCache.set(cacheKey, callback);
  }

  return setUnmaskedValue(callback, () => getUnmaskedValue(currentInput));
}
