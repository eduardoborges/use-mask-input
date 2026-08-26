import { useMemo } from 'react';

import { applyMaskToElement, resolveInputRef } from '../core';
import {
  makeMaskCacheKey, removeMask, setPrevRef, setValueApi,
} from '../utils';

import type { InputRef } from 'antd';
import type { RefCallback } from 'react';
import type {
  FieldValues, Path,
  RegisterOptions,
  UseFormRegister,
} from 'react-hook-form';

import type { Mask, Options, UseHookFormMaskReturn } from '../types';

type MaskedRefCallback = RefCallback<InputRef | null> & {
  currentElement?: HTMLElement | null;
};

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
>(registerFn: UseFormRegister<T>): ((fieldName: Path<T>, mask: Mask, options?: (
  D & Options) | Options | D) => UseHookFormMaskAntdReturn<T>) {
  //
  return useMemo(() => {
    const refCache = new Map<string, MaskedRefCallback>();

    return (fieldName: Path<T>, mask: Mask, options?: (
      D & Options) | Options | D): UseHookFormMaskAntdReturn<T> => {
      if (!registerFn) throw new Error('registerFn is required');

      const registerReturn = registerFn(fieldName, options as Options);
      const { ref } = registerReturn as UseHookFormMaskReturn<T>;

      const cacheKey = makeMaskCacheKey(fieldName, mask);

      if (!refCache.has(cacheKey)) {
        // antd hands back an InputRef, so the detach call carries no element to
        // unmask. Remember the one we masked.
        let maskedElement: HTMLElement | null = null;

        const refWithMask: MaskedRefCallback = (inputRef) => {
          const element = inputRef ? resolveInputRef(inputRef.input) : null;
          if (!element) removeMask(maskedElement);
          maskedElement = element;
          refWithMask.currentElement = element;
          if (element) applyMaskToElement(element, mask, options as Options);
          if (ref) ref(element);
        };
        refCache.set(cacheKey, refWithMask);
      }

      const maskedRef = refCache.get(cacheKey);
      const result = {
        ...registerReturn,
        ref: maskedRef,
      } as UseHookFormMaskAntdReturn<T>;
      setValueApi(result, () => maskedRef?.currentElement ?? null);

      setPrevRef(result, ref);

      return result;
    };
  }, [registerFn]);
}
