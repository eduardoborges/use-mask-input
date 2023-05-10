import Inputmask from 'inputmask';
import { isServer } from './utils';
import { Input, Mask, Options } from './types';

export const withMask = (mask?: Mask, options?: Options) => (input: Input) => {
  //
  if (isServer) return input;

  const maskInput = Inputmask({
    mask: mask || undefined,
    ...options,
  });

  if (input) {
    maskInput.mask(input);
  }

  return input;
};
