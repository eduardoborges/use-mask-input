import { useLayoutEffect, useMemo, useRef } from 'react';

import { applyMaskToElement } from '../core';
import { flow, makeMaskCacheKey, setPrevRef } from '../utils';

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
>(registerFn: UseFormRegister<T>): ((fieldName: Path<T>, mask: Mask, options?: (
  D & Options) | Options | D) => UseHookFormMaskReturn<T>) {
  // Queue of pending RHF ref calls to run after each render.
  // react-hook-form's reset() clears its internal _fields registry. On the
  // subsequent render, register() returns a brand-new ref callback that, when
  // invoked, re-registers the element and syncs the DOM to the reset value via
  // RHF's internal setValue logic. Because our ref is stable (cached), React
  // never calls that new callback automatically, so we do it here.
  // RHF's own guard (if el === field._f.ref → return) makes this a no-op on
  // normal re-renders where the field is already registered.
  const rhfRefQueue = useRef<(() => void)[]>([]);

  useLayoutEffect(() => {
    const queue = rhfRefQueue.current.splice(0);
    for (const fn of queue) fn();
  });

  return useMemo(() => {
    const refCache = new Map<string, RefCallback<HTMLElement | null>>();
    const elementCache = new Map<string, HTMLElement | null>();

    return (fieldName: Path<T>, mask: Mask, options?: (
      D & Options) | Options | D): UseHookFormMaskReturn<T> => {
      if (!registerFn) throw new Error('registerFn is required');

      const registerReturn = registerFn(fieldName, options as Options);
      const { ref } = registerReturn as UseHookFormMaskReturn<T>;

      const cacheKey = makeMaskCacheKey(fieldName, mask);

      if (!refCache.has(cacheKey)) {
        const applyMaskToRef = (_ref: HTMLElement | null) => {
          elementCache.set(cacheKey, _ref);
          if (_ref) applyMaskToElement(_ref, mask, options as Options);
          return _ref;
        };
        refCache.set(
          cacheKey,
          (ref ? flow(applyMaskToRef, ref) : applyMaskToRef) as RefCallback<HTMLElement | null>,
        );
      } else if (ref) {
        // On re-renders (e.g. after reset()), schedule the latest RHF ref to be
        // called with the stored element. RHF's guard short-circuits when the
        // element is already registered; it only does real work after a reset.
        const el = elementCache.get(cacheKey);
        if (el) rhfRefQueue.current.push(() => ref(el));
      }

      const result = {
        ...registerReturn,
        ref: refCache.get(cacheKey),
      } as UseHookFormMaskReturn<T>;

      setPrevRef(result, ref);

      return result;
    };
  }, [registerFn]);
}
