import { useMemo } from 'react';

import withTanStackFormMask from './withTanStackFormMask';

import type { Mask, Options, TanStackFormInputProps, UseTanStackFormMaskReturn } from '../types';

/**
 * Creates a helper to mask TanStack Form-compatible input props.
 * Designed for objects returned by field.getInputProps().
 */
export default function useTanStackFormMask(): <T extends TanStackFormInputProps>(
  mask: Mask,
  inputProps: T,
  options?: Options,
) => UseTanStackFormMaskReturn<T> {
  return useMemo(
    () => <T extends TanStackFormInputProps>(
      mask: Mask,
      inputProps: T,
      options?: Options,
    ): UseTanStackFormMaskReturn<T> => withTanStackFormMask(inputProps, mask, options),
    [],
  );
}
