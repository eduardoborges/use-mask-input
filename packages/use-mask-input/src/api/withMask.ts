/* eslint-disable import-x/no-extraneous-dependencies */
import inputmask from 'inputmask';

import { getMaskOptions } from '../core/maskConfig';
import isServer from '../utils/isServer';
import interopDefaultSync from '../utils/moduleInterop';

import type { Input, Mask, Options } from '../types';

/**
 * Higher-order function that creates a ref callback for applying input masks.
 * Simple function to apply mask via ref. No hooks, no drama.
 *
 * @param mask - The mask pattern to apply
 * @param options - Optional mask configuration options
 * @returns A ref callback function that applies the mask
 */
export default function withMask(mask: Mask, options?: Options) {
  return (input: Input | null): void => {
    if (isServer || mask === null || !input) return;

    const maskInput = interopDefaultSync(inputmask)(getMaskOptions(mask, options));
    maskInput.mask(input as HTMLElement);
  };
}
