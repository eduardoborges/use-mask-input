import type { ChangeEvent, FocusEvent, RefCallback } from 'react';
import type {
  FieldValues, Path,
  UseFormRegisterReturn,
} from 'react-hook-form';

import type { UnmaskedValueApi } from './mask';

export type { UseFormRegister, UseFormRegisterReturn } from 'react-hook-form';

// Framework-agnostic types live in ./mask so the Vue entry can import them
// without pulling this module's react / react-hook-form imports with them.
export type {
  Input, Mask, Options, UnmaskedValueApi,
} from './mask';

export type UseMaskInputReturn = RefCallback<HTMLElement | null> & UnmaskedValueApi;

export interface UseHookFormMaskReturn<
  T extends FieldValues,
> extends UseFormRegisterReturn<Path<T>>, UnmaskedValueApi {
  ref: RefCallback<HTMLElement | null>;
  prevRef: RefCallback<HTMLElement | null>;
}

export interface TanStackFormInputProps {
  name?: string;
  value?: string | number | readonly string[];
  ref?: RefCallback<HTMLElement | null>;
  // Method shorthand (not an arrow-typed property) so the parameter is checked
  // bivariantly: handlers explicitly typed for just HTMLInputElement (e.g. using
  // `event.target.files`) or just HTMLTextAreaElement (e.g. `event.target.cols`)
  // both remain assignable, alongside the common inline, unannotated handler.
  onChange?(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void;
  onBlur?(event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void;
  [key: string]: unknown;
}

export type UseTanStackFormMaskReturn<T extends TanStackFormInputProps = TanStackFormInputProps> =
  Omit<T, 'ref'> & {
  ref: RefCallback<HTMLElement | null>;
  prevRef: RefCallback<HTMLElement | null> | undefined;
} & UnmaskedValueApi;
