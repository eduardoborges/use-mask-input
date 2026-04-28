import type { RefCallback } from 'react';
import type {
  FieldValues, Path,
  UseFormRegisterReturn,
} from 'react-hook-form';

import type { Options as MaskOptions } from './inputmask.types';

export type { UseFormRegister, UseFormRegisterReturn } from 'react-hook-form';

export type Mask = 'datetime'
  | 'email'
  | 'numeric'
  | 'currency'
  | 'decimal'
  | 'integer'
  | 'percentage'
  | 'url'
  | 'ip'
  | 'mac'
  | 'ssn'
  | 'brl-currency'
  | 'cpf'
  | 'cnpj'
  | 'br-bank-account'
  | 'br-bank-agency'
  | (string & {})
  | (string[] & {})
  | null;
export type Options = MaskOptions;
export type Input = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

export interface UnmaskedValueApi {
  unmaskedValue: () => string;
}

export type UseMaskInputReturn = RefCallback<HTMLElement | null> & UnmaskedValueApi;

export interface UseHookFormMaskReturn<
  T extends FieldValues,
> extends UseFormRegisterReturn<Path<T>>, UnmaskedValueApi {
  ref: RefCallback<HTMLElement | null>;
  prevRef: RefCallback<HTMLElement | null>;
}

export interface TanStackFormInputProps {
  name?: string;
  ref?: RefCallback<HTMLElement | null>;
  [key: string]: unknown;
}

export type UseTanStackFormMaskReturn<T extends TanStackFormInputProps = TanStackFormInputProps> =
  Omit<T, 'ref'> & {
  ref: RefCallback<HTMLElement | null>;
  prevRef: RefCallback<HTMLElement | null> | undefined;
} & UnmaskedValueApi;
