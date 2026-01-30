import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import {
  createMaskInstance, findInputElement, isHTMLElement, resolveInputRef,
} from '../core';
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
  const maskInput = useMemo(
    () => (isServer ? null : createMaskInstance(mask, options)),
    [mask, options],
  );

  const refCallback = useCallback((input: Input | null): void => {
    if (!input) {
      ref.current = null;
      return;
    }

    ref.current = resolveInputRef(input);
  }, []);

  useEffect(() => {
    if (isServer || !ref.current) return;

    if (!isHTMLElement(ref.current)) {
      return;
    }

    const inputElement = findInputElement(ref.current);

    if (maskInput && inputElement && isHTMLElement(inputElement)) {
      maskInput.mask(inputElement);
    }

    if (register && isHTMLElement(ref.current)) {
      register(ref.current);
    }
  }, [mask, register, options, maskInput]);

  if (isServer) {
    return (): void => {
      // server doesn't have dom, so just do nothing
    };
  }

  return refCallback;
}
