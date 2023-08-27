import inputmask from 'inputmask';
import { RefCallback } from 'react';
import {
  FieldValues, Path, UseFormRegister, RegisterOptions,
} from 'react-hook-form';
import { flow, getMaskOptions } from './utils';
import { Mask, Options } from './types';

export function useHookFormMask<T extends FieldValues>(registerFn: UseFormRegister<T>) {
  return (fieldName: Path<T>, mask: Mask, options?: Options, registerOptions?: RegisterOptions) => {
    if (!registerFn) throw new Error('registerFn is required');

    const { ref, ...restRegister } = registerFn(fieldName, registerOptions);

    const maskInput = inputmask(getMaskOptions(mask, options));

    const newRef = flow((_ref: HTMLElement) => {
      if (_ref) maskInput.mask(_ref);
      return _ref;
    }, ref) as RefCallback<HTMLElement>;

    return {
      ...restRegister,
      ref: newRef as RefCallback<HTMLElement>,
    };
  };
}
