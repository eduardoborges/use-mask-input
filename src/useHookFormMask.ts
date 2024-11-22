import inputmask from 'inputmask';
import { RefCallback } from 'react';
import {
  FieldValues, Path,
  RegisterOptions,
  UseFormRegister,
} from 'react-hook-form';
import { Mask, Options } from './types';
import { flow, getMaskOptions } from './utils';

export function useHookFormMask<
  T extends FieldValues, D extends RegisterOptions,
>(registerFn: UseFormRegister<T>) {
  return (fieldName: Path<T>, mask: Mask, options?: (D & Options) | Options | D) => {
    if (!registerFn) throw new Error('registerFn is required');

    const { ref, ...restRegister } = registerFn(fieldName, options as any);

    const maskInput = inputmask(getMaskOptions(mask, options as any));

    const newRef = flow((_ref: HTMLElement) => {
      if (_ref) {
        const { nodeName } = _ref;

        if (nodeName !== 'INPUT') {
          maskInput.mask(_ref.querySelector('input') as HTMLElement);
        } else {
          maskInput.mask(_ref);
        }
      }
      return _ref;
    }, ref) as RefCallback<HTMLElement>;

    return {
      ...restRegister,
      ref: newRef as RefCallback<HTMLElement>,
    };
  };
}
