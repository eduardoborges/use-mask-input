/* eslint-disable import-x/no-extraneous-dependencies */
import inputmask from 'inputmask';

import { flow, getMaskOptions } from './utils';
import interopDefaultSync from './utils/moduleInterop';

import type { RefCallback } from 'react';

import type { Mask, Options, UseFormRegisterReturn } from './types';

export default function withHookFormMask(
  register: UseFormRegisterReturn,
  mask: Mask,
  options?: Options,
): UseFormRegisterReturn {
  //
  let newRef;

  if (register) {
    const { ref } = register;

    const maskInput = interopDefaultSync(inputmask)(getMaskOptions(mask, options));

    newRef = flow((_ref: HTMLElement) => {
      if (_ref) maskInput.mask(_ref);
      return _ref;
    }, ref) as RefCallback<HTMLElement>;
  }

  return {
    ...register,
    ref: newRef as RefCallback<HTMLElement>,
  };
}
