import { useMemo } from 'react';

import { applyMaskToElement } from '../core';
import { makeMaskCacheKey, setPrevRef } from '../utils';

import type { RefCallback } from 'react';
import type {
  FieldValues, Path,
  RegisterOptions,
  UseFormRegister,
} from 'react-hook-form';

import type { Mask, Options, UseHookFormMaskReturn } from '../types';

export type UseHookFormMaskShadcnReturn<T extends FieldValues> = Omit<
  UseHookFormMaskReturn<T>,
  'ref'
> & { ref: RefCallback<HTMLInputElement | null> };

/**
 * shadcn/ui version of useHookFormMask.
 * Creates a masked register that works with shadcn/ui Input (ref receives HTMLInputElement).
 *
 * @template T - The form data type
 * @template D - The register options type
 * @param registerFn - The register function from useForm hook
 * @returns A function that registers a field with mask support for shadcn/ui Input
 */
export default function useHookFormMaskShadcn<
  T extends FieldValues, D extends RegisterOptions,
>(registerFn: UseFormRegister<T>): ((fieldName: Path<T>, mask: Mask, options?: (
  D & Options) | Options | D) => UseHookFormMaskShadcnReturn<T>) {
  return useMemo(() => {
    const refCache = new Map<string, RefCallback<HTMLInputElement | null>>();

    return (fieldName: Path<T>, mask: Mask, options?: (
      D & Options) | Options | D): UseHookFormMaskShadcnReturn<T> => {
      if (!registerFn) throw new Error('registerFn is required');

      const registerReturn = registerFn(fieldName, options as Options);
      const { ref } = registerReturn as UseHookFormMaskReturn<T>;

      const cacheKey = makeMaskCacheKey(fieldName, mask);

      if (!refCache.has(cacheKey)) {
        const refWithMask: RefCallback<HTMLInputElement | null> = (input) => {
          if (input) applyMaskToElement(input, mask, options as Options);
          if (ref) ref(input);
        };
        refCache.set(cacheKey, refWithMask);
      }

      const result = {
        ...registerReturn,
        ref: refCache.get(cacheKey),
      } as UseHookFormMaskShadcnReturn<T>;

      setPrevRef(result, ref);

      return result;
    };
  }, [registerFn]);
}
