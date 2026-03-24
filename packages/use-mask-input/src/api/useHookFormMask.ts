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

interface CacheEntry {
  stableRef: RefCallback<HTMLElement | null>;
  element: HTMLElement | null;
  latestRHFRef?: RefCallback<HTMLElement | null>;
  syncedRHFRef?: RefCallback<HTMLElement | null>;
}

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
  const entryCacheRef = useRef(new Map<string, CacheEntry>());

  useLayoutEffect(() => {
    entryCacheRef.current.forEach((entry) => {
      const currentEntry = entry;
      if (!currentEntry.element || !currentEntry.latestRHFRef) return;

      // After reset(), RHF gives us a new ref callback. React won't call it
      // because our outward ref identity stays stable, so we replay it here.
      if (currentEntry.latestRHFRef !== currentEntry.syncedRHFRef) {
        currentEntry.latestRHFRef(currentEntry.element);
        currentEntry.syncedRHFRef = currentEntry.latestRHFRef;
      }
    });
  });

  return useMemo(() => {
    // registerFn identity changed, so drop cached refs bound to the previous
    // register lifecycle.
    entryCacheRef.current = new Map<string, CacheEntry>();

    return (fieldName: Path<T>, mask: Mask, options?: (
      D & Options) | Options | D): UseHookFormMaskReturn<T> => {
      if (!registerFn) throw new Error('registerFn is required');

      const registerReturn = registerFn(fieldName, options as Options);
      const { ref } = registerReturn as UseHookFormMaskReturn<T>;

      const cacheKey = makeMaskCacheKey(fieldName, mask);

      let entry = entryCacheRef.current.get(cacheKey);
      if (!entry) {
        const nextEntry: CacheEntry = {
          element: null,
          latestRHFRef: ref,
          syncedRHFRef: undefined,
          stableRef: null as unknown as RefCallback<HTMLElement | null>,
        };

        const applyMaskToRef = (_ref: HTMLElement | null) => {
          nextEntry.element = _ref;
          if (_ref) applyMaskToElement(_ref, mask, options as Options);
          return _ref;
        };

        nextEntry.stableRef = (
          nextEntry.latestRHFRef
            ? flow(applyMaskToRef, (_ref: HTMLElement | null) => nextEntry.latestRHFRef?.(_ref))
            : applyMaskToRef
        ) as RefCallback<HTMLElement | null>;

        entry = nextEntry;
        entryCacheRef.current.set(cacheKey, nextEntry);
      } else {
        entry.latestRHFRef = ref;
      }

      const result = {
        ...registerReturn,
        ref: entry.stableRef,
      } as UseHookFormMaskReturn<T>;

      setPrevRef(result, ref);

      return result;
    };
  }, [registerFn]);
}
