/* eslint-disable import-x/no-extraneous-dependencies */
import inputmask from 'inputmask';

import { getMaskOptions } from './utils';
import isServer from './utils/isServer';
import interopDefaultSync from './utils/moduleInterop';

import type { Input, Mask, Options } from './types';

export default function withMask(mask: Mask, options?: Options) {
  return (input: Input | null): void => {
    if (isServer || mask === null || !input) return;

    const maskInput = interopDefaultSync(inputmask)(getMaskOptions(mask, options));

    maskInput.mask(input);
  };
}
