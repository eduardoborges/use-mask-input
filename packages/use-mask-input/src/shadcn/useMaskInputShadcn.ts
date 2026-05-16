import { useCallback, useEffect, useRef } from 'react';

import withMask from '../api/withMask';
import isServer from '../utils/isServer';
import { getUnmaskedValue, setUnmaskedValue } from '../utils';

import type { Mask, Options, UseMaskInputReturn } from '../types';

interface UseMaskInputShadcnOptions {
  mask: Mask;
  register?: (element: HTMLElement) => void;
  options?: Options;
}

/**
 * React hook for applying input masks to shadcn/ui Input components.
 *
 * @param props - Configuration object
 * @param props.mask - The mask pattern to apply
 * @param props.register - Optional callback that receives the element
 * @param props.options - Optional mask configuration options
 * @returns A ref callback to attach to the shadcn/ui Input element
 */
export default function useMaskInputShadcn(props: UseMaskInputShadcnOptions): UseMaskInputReturn {
  const { mask, register, options } = props;
  const ref = useRef<HTMLInputElement | null>(null);
  const maskRef = useRef(mask);
  const optionsRef = useRef(options);
  const maskedElementRef = useRef<HTMLInputElement | null>(null);
  const unmaskedValue = useCallback(() => getUnmaskedValue(ref.current), []);

  maskRef.current = mask;
  optionsRef.current = options;

  const refCallback = useCallback((input: HTMLInputElement | null): void => {
    if (!input) {
      ref.current = null;
      return;
    }

    ref.current = input;

    if (ref.current && ref.current !== maskedElementRef.current) {
      withMask(maskRef.current, optionsRef.current)(ref.current);
      maskedElementRef.current = ref.current;
    }
  }, []);

  useEffect(() => {
    if (isServer || !ref.current || !register) return;
    register(ref.current);
  }, [register]);

  if (isServer) {
    const noop = (() => {}) as unknown as UseMaskInputReturn;
    return setUnmaskedValue(noop, () => '');
  }

  return setUnmaskedValue(refCallback as UseMaskInputReturn, unmaskedValue);
}
