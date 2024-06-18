import Inputmask from 'inputmask';
import { getMaskOptions, isServer } from './utils';
import { Input, Mask, Options } from './types';

export const withMask = (mask: Mask, options?: Options) => (input: Input) => {
  //
  if (isServer) return;
  if (mask === null) return;

  const maskInput = Inputmask(getMaskOptions(mask, options));

  if (input) {
    maskInput.mask(input);
  }
};
