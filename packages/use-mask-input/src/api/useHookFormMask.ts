import { applyMaskToElement } from '../core';
import { flow } from '../utils';

import type { RefCallback } from 'react';
import type {
  FieldValues, Path,
  RegisterOptions,
  UseFormRegister,
} from 'react-hook-form';

import type { Mask, Options, UseHookFormMaskReturn } from '../types';

/**
 * Creates a masked version of React Hook Form's register function.
 * Takes react-hook-form's register and adds automatic masking. Like an upgrade.
 *
 * @template T - The form data type
 * @template D - The register options type
 * @param registerFn - The register function from useForm hook
 * @returns A function that registers a field with mask support
 */
export default function useHookFormMask<
  T extends FieldValues, D extends RegisterOptions,
>(registerFn: UseFormRegister<T>) {
  return (fieldName: Path<T>, mask: Mask, options?: (
    D & Options) | Options | D): UseHookFormMaskReturn<T> => {
    if (!registerFn) throw new Error('registerFn is required');

    const registerReturn = registerFn(fieldName, options as Options);
    const { ref } = registerReturn as UseHookFormMaskReturn<T>;

    const applyMaskToRef = (_ref: HTMLElement | null) => {
      if (_ref) applyMaskToElement(_ref, mask, options as Options);
      return _ref;
    };

    const refWithMask = ref
      ? flow(applyMaskToRef, ref)
      : applyMaskToRef;

    return {
      ...registerReturn,
      ref: refWithMask as RefCallback<HTMLElement | null>,
    };
  };
}
