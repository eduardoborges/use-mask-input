import { useEffect, useRef } from 'react';
import Inputmask from 'inputmask';

interface UseInputMaskOptions {
  mask: Inputmask.Options['mask']
  register?(element: HTMLElement): void
  options?: Inputmask.Options
}

const useInputMask = (props: UseInputMaskOptions) => {
  const { mask, register, options } = props;

  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const maskInput = Inputmask({
      mask,
      ...options,
    });

    maskInput.mask(ref.current);

    if (register && ref.current) {
      register(ref.current);
    }
  }, [mask, register, options]);

  return ref;
};

export default useInputMask;
