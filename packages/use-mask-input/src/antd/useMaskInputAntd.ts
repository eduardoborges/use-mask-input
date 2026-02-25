import { useCallback, useEffect, useRef } from 'react';

import withMask from '../api/withMask';
import { resolveInputRef } from '../core';
import isServer from '../utils/isServer';

import type { InputRef } from 'antd';

import type { Mask, Options } from '../types';

interface UseMaskInputOptions {
  mask: Mask;
  register?: (element: HTMLElement) => void;
  options?: Options;
}

/**
 * React hook for applying input masks to Ant Design form elements.
 *
 * @param props - Configuration object
 * @param props.mask - The mask pattern to apply
 * @param props.register - Optional callback that receives the element
 * @param props.options - Optional mask configuration options
 * @returns A ref callback function to attach to the Ant Design Input element
 */
export default function useMaskInputAntd(props: UseMaskInputOptions): (
  input: InputRef | null
) => void {
  const { mask, register, options } = props;
  const ref = useRef<HTMLInputElement | null>(null);
  const maskRef = useRef(mask);
  const optionsRef = useRef(options);
  const maskedElementRef = useRef<HTMLInputElement | null>(null);

  maskRef.current = mask;
  optionsRef.current = options;

  const refCallback = useCallback((input: InputRef | null): void => {
    if (!input) {
      ref.current = null;
      return;
    }

    ref.current = resolveInputRef(input.input);

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
    return (): void => {
      // server doesn't have dom, so just do nothing
    };
  }

  return refCallback;
}
