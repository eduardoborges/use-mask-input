/* eslint-disable import-x/no-extraneous-dependencies */
import inputmask from './inputmask';

import { getMaskOptions } from './maskConfig';
import { isHTMLElement } from './elementResolver';
import { moduleInterop } from '../utils';

import type { Mask, Options } from '../types';

/**
 * Drops the native `maxlength` when the mask renders characters the user never types.
 *
 * A mask like `999.999.999-99` keeps its literals and placeholder in the value, so
 * `maxlength` counts characters nobody typed: the browser stops accepting keystrokes,
 * and inputmask copies the attribute into a validator that rejects any buffer longer
 * than it. Either way the field takes no input at all.
 *
 * Open-ended masks (`numeric`, `integer`, `decimal`) render nothing while empty, so
 * their value only ever holds what was typed and `maxlength` still caps what it says
 * it caps. Those keep the attribute. Rendering the empty value is what tells the two
 * apart, since aliases hide their real pattern.
 *
 * ponytail: the empty render is a proxy, not a proof. A mask that starts empty but
 * grows a literal later (`br-bank-agency` gains a `-` at the 6th digit) still loses
 * that many characters off the cap. Sharpen this only if someone hits it.
 *
 * @see https://github.com/eduardoborges/use-mask-input/issues/191
 * @param element - The element about to be masked
 * @param mask - The mask pattern about to be applied
 * @param options - Optional configuration options
 */
export function stripMaxLength(element: unknown, mask: Mask, options?: Options): void {
  if (!isHTMLElement(element) || !element.hasAttribute('maxlength')) return;
  if (formatWithMask('', mask, options).length === 0) return;

  element.removeAttribute('maxlength');
}

/**
 * Creates a mask instance with the given mask and options.
 * Like a factory, but simpler.
 *
 * @param mask - The mask pattern
 * @param options - Optional configuration options
 * @returns A mask instance
 */
export function createMaskInstance(mask: Mask, options?: Options): ReturnType<typeof inputmask> {
  const inputmaskInstance = moduleInterop(inputmask);
  return inputmaskInstance(getMaskOptions(mask, options));
}

/**
 * Applies a mask to an input element.
 * If it's not a direct input, searches inside.
 *
 * @param element - The element to apply mask to
 * @param mask - The mask pattern
 * @param options - Optional configuration options
 */
export function applyMaskToElement(
  element: HTMLElement | null,
  mask: Mask,
  options?: Options,
): void {
  if (!element) return;

  const maskInstance = createMaskInstance(mask, options);
  const inputElement = element.nodeName === 'INPUT'
    ? element
    : (element.querySelector('input') as HTMLElement);

  const target = inputElement ?? element;

  stripMaxLength(target, mask, options);
  maskInstance.mask(target);
}

/**
 * Formats a raw value using the given mask, without needing a mounted element.
 * Useful for displaying already-persisted (unmasked) values in the UI.
 *
 * @param value - The raw value to format
 * @param mask - The mask pattern
 * @param options - Optional configuration options
 * @returns The masked value
 */
export function formatWithMask(value: string, mask: Mask, options?: Options): string {
  const inputmaskInstance = moduleInterop(inputmask);
  return inputmaskInstance.format(value, getMaskOptions(mask, options));
}

/**
 * Removes the mask from a formatted value, without needing a mounted element.
 * Useful for sanitizing input before sending it to the backend.
 *
 * @param value - The masked value to unformat
 * @param mask - The mask pattern
 * @param options - Optional configuration options
 * @returns The raw, unmasked value
 */
export function unformatWithMask(value: string, mask: Mask, options?: Options): string {
  const inputmaskInstance = moduleInterop(inputmask);
  return inputmaskInstance.unmask(value, getMaskOptions(mask, options));
}
