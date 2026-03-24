import { applyMaskToElement } from '../core';
import { flow, makeMaskCacheKey, setPrevRef } from '../utils';

import type { RefCallback } from 'react';

import type {
  Mask, Options, TanStackFormInputProps, UseTanStackFormMaskReturn,
} from '../types';

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
    const result = {
      ...inputProps,
      ref: ((input: HTMLElement | null) => {
        if (input) applyMaskToElement(input, mask, options);
      }) as RefCallback<HTMLElement | null>,
    } as unknown as UseTanStackFormMaskReturn<T>;

    setPrevRef(result, ref);
    return result;
  }

  if (!refCache.has(ref)) {
    refCache.set(ref, new Map());
  }

  const maskCache = refCache.get(ref);
  const cacheKey = makeMaskCacheKey(inputProps.name ?? '', mask);

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
    ...inputProps,
    ref: maskCache?.get(cacheKey),
  } as unknown as UseTanStackFormMaskReturn<T>;

  setPrevRef(result, ref);
  return result;
}
