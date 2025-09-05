/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import-x/no-extraneous-dependencies */
import inputmask from 'inputmask';

import { flow, getMaskOptions } from './utils';
import interopDefaultSync from './utils/moduleInterop';

import type { RefCallback } from 'react';
import type {
  FieldValues, Path,
  RegisterOptions,
  UseFormRegister,
  UseFormRegisterReturn,
} from 'react-hook-form';

import type { Mask, Options } from './types';

export default function useHookFormMask<
  T extends FieldValues, D extends RegisterOptions,
>(registerFn: UseFormRegister<T>) {
  return (fieldName: Path<T>, mask: Mask, options?: (
    D & Options) | Options | D): UseFormRegisterReturn<Path<T>> => {
    if (!registerFn) throw new Error('registerFn is required');

    const { ref, ...restRegister } = registerFn(fieldName, options as any);

    const maskInput = interopDefaultSync(inputmask)(getMaskOptions(mask, options as any));

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
      ref: newRef,
    };
  };
}
