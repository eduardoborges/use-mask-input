/* eslint-disable import-x/no-extraneous-dependencies */
import { useEffect, useRef } from 'react';

import inputmask from 'inputmask';

import { getMaskOptions } from './utils';
import isServer from './utils/isServer';
import interopDefaultSync from './utils/moduleInterop';

import type { RefObject } from 'react';

import type { Mask, Options } from './types';

interface UseInputMaskOptions {
  mask: Mask;
  register?: (element: HTMLElement) => void;
  options?: Options;
}

export default function useInputMask(props: UseInputMaskOptions): RefObject<HTMLInputElement> {
  const { mask, register, options } = props;
  const ref = useRef<HTMLInputElement>(null);
  if (isServer) return ref;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isServer && ref.current) {
      if (!ref.current) return;

      const maskInput = interopDefaultSync(inputmask)(getMaskOptions(mask, options));

      maskInput.mask(ref.current);

      if (register && ref.current) {
        register(ref.current);
      }
    }
  }, [mask, register, options]);

  return ref;
}
