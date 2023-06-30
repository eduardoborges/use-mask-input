import Inputmask from 'inputmask';
import { getMaskOptions, isServer } from './utils';
import { Input, Mask, Options } from './types';

export const withMask = (mask: Mask, options?: Options) => (input: Input) => {
  //
  if (isServer) return input;
  if (mask === null) return input;

  const maskInput = Inputmask(getMaskOptions(mask, options));

  if (input) {
    maskInput.mask(input);
  }

  return input;
};
