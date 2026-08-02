import {
  useCallback, useEffect, useRef,
} from 'react';

import { applyMaskToElement, resolveInputRef } from '../core';
import withMask from './withMask';
import isServer from '../utils/isServer';
import {
  getUnmaskedValue, makeMaskCacheKey, removeMask, sameOptions, setUnmaskedValue,
} from '../utils';

import type {
  Input, Mask, Options, UseMaskInputReturn,
} from '../types';

interface UseMaskInputOptions {
  mask: Mask;
  register?: (element: HTMLElement) => void;
  options?: Options;
}

/**
 * React hook for applying input masks to form elements.
 * Works with Ant Design and other wrapped components too.
 *
 * @param props - Configuration object
 * @param props.mask - The mask pattern to apply
 * @param props.register - Optional callback that receives the element
 * @param props.options - Optional mask configuration options
 * @returns A ref callback function to attach to the input element
 */
export default function useMaskInput(props: UseMaskInputOptions): UseMaskInputReturn {
  const { mask, register, options } = props;
  const ref = useRef<HTMLInputElement | null>(null);
  const maskRef = useRef(mask);
  const optionsRef = useRef(options);
  const unmaskedValue = useCallback(() => getUnmaskedValue(ref.current), []);

  const refCallback = useCallback((input: Input | null): void => {
    if (!input) {
      // React hands us `null` when the ref comes off the element, which is not
      // always an unmount: the element can outlive the detach, or be handed to
      // a different ref. Leaving Inputmask attached leaves its listeners and its
      // `value` accessor on it. See `removeMask` for why the teardown lives here
      // and not in a React 19 cleanup return.
      removeMask(ref.current);
      ref.current = null;
      return;
    }

    ref.current = resolveInputRef(input);
    withMask(maskRef.current, optionsRef.current)(ref.current);
  }, []);

  /**
   * `refCallback` masks the element once, on attach, and its identity is stable
   * on purpose — so React never re-invokes it and a later `mask` or `options`
   * would otherwise be ignored for the life of the component. This is the Vue
   * directive's `updated` hook, minus the lifecycle React doesn't give us.
   *
   * The guard is the point: re-masking rebuilds Inputmask's buffer and sends the
   * caret to the end, so an unrelated re-render must not reach the apply. Both
   * comparisons are structural because callers pass inline literals.
   */
  useEffect(() => {
    if (isServer) return;

    const unchanged = makeMaskCacheKey('', maskRef.current) === makeMaskCacheKey('', mask)
      && sameOptions(optionsRef.current, options);

    // Keep the refs current either way: if the element re-attaches later,
    // `refCallback` must mask it with the mask we have now, not the mount-time one.
    maskRef.current = mask;
    optionsRef.current = options;

    if (unchanged || !ref.current) return;

    // A null mask is not "do nothing" — it has to tear the old mask off, or the
    // field keeps formatting after the caller switched masking off.
    if (mask === null || mask === undefined) {
      removeMask(ref.current);
      return;
    }

    applyMaskToElement(ref.current, mask, options);
  }, [mask, options]);

  useEffect(() => {
    if (isServer || !ref.current || !register) return;
    register(ref.current);
  }, [register]);

  if (isServer) {
    const noop = (() => {
      // server doesn't have dom, so just do nothing
    }) as unknown as UseMaskInputReturn;

    return setUnmaskedValue(noop, () => '');
  }

  return setUnmaskedValue(refCallback, unmaskedValue);
}
