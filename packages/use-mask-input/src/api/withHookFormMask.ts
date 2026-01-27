/* eslint-disable no-nested-ternary */
import { applyMaskToElement } from '../core';
import { flow } from '../utils';

import type { RefCallback } from 'react';
import type { FieldValues } from 'react-hook-form';

import type {
  Mask, Options, UseFormRegisterReturn, UseHookFormMaskReturn,
} from '../types';

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
): UseHookFormMaskReturn<FieldValues> {
  const { ref } = register as UseHookFormMaskReturn<FieldValues>;

  const applyMaskToRef = (_ref: HTMLElement | null) => {
    if (_ref) applyMaskToElement(_ref, mask, options);
    return _ref;
  };

  const refWithMask = ref === null
    ? null
    : ref
      ? flow(applyMaskToRef, ref)
      : null;

  const result = {
    ...register,
    ref: refWithMask as RefCallback<HTMLElement | null>,
  } as UseHookFormMaskReturn<FieldValues>;

  // change prevRef to non-enumerable
  Object.defineProperty(result, 'prevRef', {
    value: ref,
    enumerable: false,
    writable: true,
    configurable: true,
  });

  return result;
}
