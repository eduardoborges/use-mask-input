/* eslint-disable import-x/no-extraneous-dependencies */
import inputmask from 'inputmask';

import { getMaskOptions } from './maskConfig';
import { moduleInterop } from '../utils';

import type { Mask, Options } from '../types';

/**
 * Creates a mask instance with the given mask and options.
 * Like a factory, but simpler.
 *
 * @param mask - The mask pattern
 * @param options - Optional configuration options
 * @returns A mask instance
 */
export function createMaskInstance(mask: Mask, options?: Options): Inputmask.Instance {
  const maskfn = moduleInterop(inputmask);
  return maskfn(getMaskOptions(mask, options));
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
  element: HTMLElement,
  mask: Mask,
  options?: Options,
): void {
  if (!element) return;

  const maskInstance = createMaskInstance(mask, options);
  const inputElement = element.nodeName === 'INPUT'
    ? element
    : (element.querySelector('input') as HTMLElement);

  if (inputElement) {
    maskInstance.mask(inputElement);
  } else {
    maskInstance.mask(element);
  }
}
