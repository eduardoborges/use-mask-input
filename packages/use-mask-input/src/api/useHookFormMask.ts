/* eslint-disable @typescript-eslint/no-explicit-any */
import { flow } from '../utils';
import { applyMaskToElement } from '../core';

import type { RefCallback } from 'react';
import type {
  FieldValues, Path,
  RegisterOptions,
  UseFormRegister,
  UseFormRegisterReturn,
} from 'react-hook-form';

import type { Mask, Options } from '../types';

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
    D & Options) | Options | D): UseFormRegisterReturn<Path<T>> => {
    if (!registerFn) throw new Error('registerFn is required');

    const { ref, ...restRegister } = registerFn(fieldName, options as any);

    const newRef = flow((_ref: HTMLElement) => {
      if (_ref) {
        applyMaskToElement(_ref, mask, options as any);
      }
      return _ref;
    }, ref) as RefCallback<HTMLElement>;

    return {
      ...restRegister,
      ref: newRef,
    };
  };
}
