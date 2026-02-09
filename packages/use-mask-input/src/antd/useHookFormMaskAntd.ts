import { applyMaskToElement, resolveInputRef } from '../core';

import type { InputRef } from 'antd';
import type { RefCallback } from 'react';
import type {
  FieldValues, Path,
  RegisterOptions,
  UseFormRegister,
} from 'react-hook-form';

import type { Mask, Options, UseHookFormMaskReturn } from '../types';

export type UseHookFormMaskAntdReturn<T extends FieldValues> = Omit<
  UseHookFormMaskReturn<T>,
  'ref'
> & { ref: RefCallback<InputRef | null> };

/**
 * Ant Design version of useHookFormMask.
 * Creates a masked register that works with Ant Design Input (ref receives InputRef).
 *
 * @template T - The form data type
 * @template D - The register options type
 * @param registerFn - The register function from useForm hook
 * @returns A function that registers a field with mask support for Ant Design Input
 */
export default function useHookFormMaskAntd<
  T extends FieldValues, D extends RegisterOptions,
>(registerFn: UseFormRegister<T>) {
  return (fieldName: Path<T>, mask: Mask, options?: (
    D & Options) | Options | D): UseHookFormMaskAntdReturn<T> => {
    if (!registerFn) throw new Error('registerFn is required');

    const registerReturn = registerFn(fieldName, options as Options);
    const { ref } = registerReturn as UseHookFormMaskReturn<T>;

    const refWithMask: RefCallback<InputRef | null> = (inputRef) => {
      const element = inputRef ? resolveInputRef(inputRef.input) : null;
      if (element) applyMaskToElement(element, mask, options as Options);
      if (ref) ref(element);
    };

    const result = {
      ...registerReturn,
      ref: refWithMask,
    } as UseHookFormMaskAntdReturn<T>;

    Object.defineProperty(result, 'prevRef', {
      value: ref,
      enumerable: false,
      writable: true,
      configurable: true,
    });

    return result;
  };
}
