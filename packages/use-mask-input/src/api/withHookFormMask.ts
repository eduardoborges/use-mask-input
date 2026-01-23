import { applyMaskToElement } from '../core';
import { flow } from '../utils';

import type { RefCallback } from 'react';

import type { Mask, Options, UseFormRegisterReturn } from '../types';

/**
 * Enhances a React Hook Form register return object with mask support.
 * Takes an already registered field and adds mask to it.
 * Useful when you registered the field before.
 *
 * @param register - The register return object from React Hook Form
 * @param mask - The mask pattern to apply
 * @param options - Optional mask configuration options
 * @returns A new register return object with mask applied
 */
export default function withHookFormMask(
  register: UseFormRegisterReturn,
  mask: Mask,
  options?: Options,
): UseFormRegisterReturn {
  let newRef;

  if (register) {
    const { ref } = register;

    newRef = flow((_ref: HTMLElement) => {
      if (_ref) {
        applyMaskToElement(_ref, mask, options);
      }
      return _ref;
    }, ref) as RefCallback<HTMLElement>;
  }

  return {
    ...register,
    ref: newRef as RefCallback<HTMLElement>,
  };
}
