import { applyMaskToElement } from '../core';
import { flow, makeMaskCacheKey, setPrevRef } from '../utils';

import type { RefCallback } from 'react';
import type { FieldValues } from 'react-hook-form';

import type {
  Mask, Options, UseFormRegisterReturn, UseHookFormMaskReturn,
} from '../types';

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
    setPrevRef(result, ref);
    return result;
  }

  if (!refCache.has(ref)) {
    refCache.set(ref, new Map());
  }
  const maskCache = refCache.get(ref);
  const cacheKey = makeMaskCacheKey(register.name, mask);

  if (!maskCache?.has(cacheKey)) {
    const applyMaskToRef = (_ref: HTMLElement | null) => {
      if (_ref) applyMaskToElement(_ref, mask, options);
      return _ref;
    };
    maskCache?.set(
      cacheKey,
      flow(applyMaskToRef, ref) as RefCallback<HTMLElement | null>,
    );
  }

  const result = {
    ...register,
    ref: maskCache?.get(cacheKey),
  } as UseHookFormMaskReturn<FieldValues>;

  setPrevRef(result, ref);

  return result;
}
