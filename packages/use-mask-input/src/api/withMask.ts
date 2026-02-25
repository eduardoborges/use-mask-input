/* eslint-disable import-x/no-extraneous-dependencies */
import inputmask from 'inputmask';

import { getMaskOptions } from '../core/maskConfig';
import { makeMaskCacheKey } from '../utils';
import isServer from '../utils/isServer';
import interopDefaultSync from '../utils/moduleInterop';

import type { Input, Mask, Options } from '../types';

const callbackCache = new Map<string, (input: Input | null) => void>();

/**
 * Higher-order function that creates a ref callback for applying input masks.
 * Simple function to apply mask via ref. No hooks, no drama.
 *
 * @param mask - The mask pattern to apply
 * @param options - Optional mask configuration options
 * @returns A ref callback function that applies the mask
 */
export default function withMask(mask: Mask, options?: Options): ((input: Input | null) => void) {
  // without options, we cant cache, so we always return a fresh callback. :P
  if (!options) {
    const cacheKey = makeMaskCacheKey('', mask);
    if (callbackCache.has(cacheKey)) {
      return callbackCache.get(cacheKey) as (input: Input | null) => void;
    }
  }

  const callback = (input: Input | null): void => {
    if (isServer || mask === null || !input) return;

    const maskInput = interopDefaultSync(inputmask)(getMaskOptions(mask, options));
    maskInput.mask(input as HTMLElement);
  };

  if (!options) {
    const cacheKey = makeMaskCacheKey('', mask);
    callbackCache.set(cacheKey, callback);
  }

  return callback;
}
