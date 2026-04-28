import { applyMaskToElement } from '../core';
import {
  getUnmaskedValue, makeMaskCacheKey, setPrevRef, setUnmaskedValue,
} from '../utils';

import type { RefCallback } from 'react';

import type {
  Mask, Options, TanStackFormInputProps, UseTanStackFormMaskReturn,
} from '../types';

type MaskedRefCallback = RefCallback<HTMLElement | null> & {
  currentElement?: HTMLElement | null;
};

const refCache = new WeakMap<
  RefCallback<HTMLElement | null>,
  Map<string, RefCallback<HTMLElement | null>>
>();

/**
 * Enhances TanStack Form-compatible input props with mask support.
 * Works with objects returned by field.getInputProps().
 */
export default function withTanStackFormMask<T extends TanStackFormInputProps>(
  inputProps: T,
  mask: Mask,
  options?: Options,
): UseTanStackFormMaskReturn<T> {
  const { ref } = inputProps;

  if (!ref) {
    let currentElement: HTMLElement | null = null;
    const result = {
      ...inputProps,
      ref: ((input: HTMLElement | null) => {
        currentElement = input;
        if (input) applyMaskToElement(input, mask, options);
      }) as RefCallback<HTMLElement | null>,
    } as unknown as UseTanStackFormMaskReturn<T>;
    setUnmaskedValue(result, () => getUnmaskedValue(currentElement));

    setPrevRef(result, ref);
    return result;
  }

  if (!refCache.has(ref)) {
    refCache.set(ref, new Map());
  }

  const maskCache = refCache.get(ref);
  const cacheKey = makeMaskCacheKey(inputProps.name ?? '', mask);

  if (!maskCache?.has(cacheKey)) {
    const maskedRef = ((input: HTMLElement | null) => {
      maskedRef.currentElement = input;
      if (input) applyMaskToElement(input, mask, options);
      ref(input);
    }) as MaskedRefCallback;

    maskCache?.set(cacheKey, maskedRef);
  }

  const maskedRef = maskCache?.get(cacheKey) as MaskedRefCallback | undefined;
  const result = {
    ...inputProps,
    ref: maskedRef,
  } as unknown as UseTanStackFormMaskReturn<T>;
  setUnmaskedValue(result, () => getUnmaskedValue(maskedRef?.currentElement ?? null));

  setPrevRef(result, ref);
  return result;
}
