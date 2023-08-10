import inputmask from 'inputmask';
import { RefCallback } from 'react';
import { flow, getMaskOptions } from './utils';
import { Mask, Options, UseFormRegisterReturn } from './types';

export const withHookFormMask = (
  register: UseFormRegisterReturn,
  mask: Mask,
  options?: Options,
): UseFormRegisterReturn => {
  //
  let newRef;

  if (register) {
    const { ref } = register;

    const maskInput = inputmask(getMaskOptions(mask, options));

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
