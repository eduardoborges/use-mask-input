import Inputmask from 'inputmask';
import { RefCallback } from 'react';
import { flow } from './utils';
import { Mask, Options, Register } from './types';

export const withHookFormMask = (register: Register, mask: Mask, options?: Options): Register => {
  //
  let newRef;

  if (register) {
    const { ref } = register;

    const maskInput = Inputmask({
      mask: mask || undefined,
      ...options,
    });

    newRef = flow((_ref: HTMLElement) => {
      if (_ref) maskInput.mask(_ref);
      return _ref;
    }, ref) as RefCallback<HTMLElement>;
  }

  return {
    ...register,
    ref: newRef as RefCallback<HTMLElement>,
  };
};
