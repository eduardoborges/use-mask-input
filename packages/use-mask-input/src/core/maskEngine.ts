/* eslint-disable import-x/no-extraneous-dependencies */
import inputmask from './inputmask';

import { getMaskOptions } from './maskConfig';
import { isHTMLElement } from './elementResolver';
import { moduleInterop } from '../utils';

import type { Mask, Options } from '../types';

/**
 * Drops the native `maxlength` before inputmask touches the element.
 *
 * A masked input holds the full mask placeholder as its value, so `maxlength`
 * counts the literals the user never typed and the browser blocks keystrokes
 * long before the mask is filled. inputmask also copies the attribute into its
 * own validator, which rejects any buffer longer than it — and the buffer is
 * always the whole mask. Either way the field ends up unusable, so the
 * attribute has to go before `mask()` reads it.
 *
 * @see https://github.com/eduardoborges/use-mask-input/issues/191
 * @param element - The element about to be masked
 */
export function stripMaxLength(element: unknown): void {
  if (isHTMLElement(element)) {
    element.removeAttribute('maxlength');
  }
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

  stripMaxLength(target);
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
