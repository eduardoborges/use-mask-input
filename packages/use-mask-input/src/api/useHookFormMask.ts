import { useLayoutEffect, useMemo, useRef } from 'react';

import { applyMaskToElement } from '../core';
import {
  flow, getUnmaskedValue, makeMaskCacheKey, setPrevRef, setUnmaskedValue,
} from '../utils';

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

        // RHF must run first: it writes the field's predefined value onto the
        // element. If we masked before that, Inputmask would initialise with an
        // empty buffer and RHF's later value assignment would leave its internal
        // state out of sync with the DOM, swallowing the first onChange after a
        // select-all + delete (#193). Masking after RHF seeds Inputmask with the
        // current value, keeping its buffer in sync from the start.
        const syncRHFRef = (_ref: HTMLElement | null) => {
          nextEntry.latestRHFRef?.(_ref);
          return _ref;
        };

        const composedRef = nextEntry.latestRHFRef
          ? flow(syncRHFRef, applyMaskToRef)
          : applyMaskToRef;

        // React 19 treats a ref callback's return value as a cleanup function,
        // so the composed callback must return void — never the resolved element.
        nextEntry.stableRef = ((_ref: HTMLElement | null): void => {
          composedRef(_ref);
        }) as RefCallback<HTMLElement | null>;

        entry = nextEntry;
        entryCacheRef.current.set(cacheKey, nextEntry);
      } else {
        entry.latestRHFRef = ref;
      }

      const result = {
        ...registerReturn,
        ref: entry.stableRef,
      } as UseHookFormMaskReturn<T>;
      setUnmaskedValue(result, () => getUnmaskedValue(entry?.element ?? null));

      setPrevRef(result, ref);

      return result;
    };
  }, [registerFn]);
}
