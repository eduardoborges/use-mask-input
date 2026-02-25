import {
  useCallback, useEffect, useRef,
} from 'react';

import { resolveInputRef } from '../core';
import withMask from './withMask';
import isServer from '../utils/isServer';

import type { Input, Mask, Options } from '../types';

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
export default function useMaskInput(props: UseMaskInputOptions): ((input: Input | null) => void) {
  const { mask, register, options } = props;
  const ref = useRef<HTMLInputElement | null>(null);
  const maskRef = useRef(mask);
  const optionsRef = useRef(options);

  const refCallback = useCallback((input: Input | null): void => {
    if (!input) {
      ref.current = null;
      return;
    }

    ref.current = resolveInputRef(input);
    withMask(maskRef.current, optionsRef.current)(ref.current);
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
