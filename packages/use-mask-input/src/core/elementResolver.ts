import type { Input } from '../types';

/**
 * Checks if an element is a valid DOM element (or at least looks like one).
 *
 * @param element - The element to check
 * @returns True if it's a valid HTMLElement
 */
export function isHTMLElement(element: unknown): element is HTMLElement {
  return (
    element !== null
    && typeof element === 'object'
    && 'nodeType' in element
    && 'querySelector' in element
    && typeof (element as HTMLElement).querySelector === 'function'
  );
}

/**
 * Finds the actual input element from various component structures.
 * Finds the actual input inside wrappers (ant design, etc). Like a detective.
 *
 * @param element - The element to search in
 * @returns The found input element or null
 */
export function findInputElement(element: unknown): HTMLElement | null {
  if (!element) return null;

  if (!isHTMLElement(element)) {
    return null;
  }

  // if it's already an input or textarea, return it directly
  if (element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA') {
    return element;
  }

  // tries to find input inside the wrapper
  if (!('querySelector' in element) || typeof element.querySelector !== 'function') {
    return null;
  }

  try {
    const inputElement = element.querySelector('input, textarea');

    if (inputElement && isHTMLElement(inputElement)) {
      return inputElement;
    }
  } catch {
    // if it errors, return null and move on
    return null;
  }

  return null;
}

/**
 * Resolves React refs to a valid HTMLInputElement.
 * Handles ref objects and direct DOM elements.
 *
 * @param input - The input reference to resolve
 * @returns A valid HTMLInputElement or null
 */
export function resolveInputRef(input: Input | null): HTMLInputElement | null {
  if (!input) {
    return null;
  }

  // react ref objects
  if (typeof input === 'object' && 'current' in input) {
    const refValue = (input as { current: HTMLElement | null }).current;
    if (isHTMLElement(refValue)) {
      return refValue as HTMLInputElement;
    }
    return null;
  }

  // direct dom elements
  if (isHTMLElement(input)) {
    return input as HTMLInputElement;
  }

  return null;
}
