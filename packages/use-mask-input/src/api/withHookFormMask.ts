import { applyMaskToElement } from '../core';
import {
  getUnmaskedValue, makeMaskCacheKey, setPrevRef, setUnmaskedValue,
} from '../utils';

import type { RefCallback } from 'react';
import type { FieldValues } from 'react-hook-form';

import type {
  Mask, Options, UseFormRegisterReturn, UseHookFormMaskReturn,
} from '../types';

type MaskedRefCallback = RefCallback<HTMLElement | null> & {
  currentElement?: HTMLElement | null;
};

const refCache = new WeakMap<
  RefCallback<HTMLElement | null>,
  Map<string, RefCallback<HTMLElement | null>>
>();

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

  // null ref — nothing to cache, return as-is.
  if (!ref) {
    const result = {
      ...register,
      ref: null as unknown as RefCallback<HTMLElement | null>,
    } as UseHookFormMaskReturn<FieldValues>;
    setUnmaskedValue(result, () => '');
    setPrevRef(result, ref);
    return result;
  }

  if (!refCache.has(ref)) {
    refCache.set(ref, new Map());
  }
  const maskCache = refCache.get(ref);
  const cacheKey = makeMaskCacheKey(register.name, mask);

  if (!maskCache?.has(cacheKey)) {
    const maskedRef = ((input: HTMLElement | null) => {
      maskedRef.currentElement = input;
      if (input) applyMaskToElement(input, mask, options);
      return ref(input);
    }) as MaskedRefCallback;

    maskCache?.set(cacheKey, maskedRef);
  }

  const maskedRef = maskCache?.get(cacheKey) as MaskedRefCallback | undefined;
  const result = {
    ...register,
    ref: maskedRef,
  } as UseHookFormMaskReturn<FieldValues>;
  setUnmaskedValue(result, () => getUnmaskedValue(maskedRef?.currentElement ?? null));

  setPrevRef(result, ref);

  return result;
}
