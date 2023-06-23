import { useEffect, useRef } from 'react';
import Inputmask from 'inputmask';
import { getMaskOptions, isServer } from './utils';
import { Mask, Options } from './types';

interface UseInputMaskOptions {
  mask: Mask,
  register?(element: HTMLElement): void
  options?: Options
}

const useInputMask = (props: UseInputMaskOptions) => {
  const { mask, register, options } = props;
  const ref = useRef<HTMLInputElement>(null);
  if (isServer) return ref;

  useEffect(() => {
    if (!isServer) {
      if (!ref.current) return;

      const maskInput = Inputmask(getMaskOptions(mask, options));

      maskInput.mask(ref.current);

      if (register && ref.current) {
        register(ref.current);
      }
    }
  }, [mask, register, options]);

  return ref;
};

export default useInputMask;
