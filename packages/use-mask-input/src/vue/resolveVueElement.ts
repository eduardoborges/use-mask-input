import { findInputElement, isHTMLElement } from '../core/elementResolver';

import type { MaskRefTarget } from './types';

/**
 * Resolves whatever Vue hands us into the element that should carry the mask.
 *
 * A directive always receives a DOM element. A `:ref` on a component receives
 * the component's public instance instead, so the element has to be dug out of
 * `$el` first. Either way the existing `findInputElement` does the final
 * wrapper search, which is the same code path that makes Ant Design work on the
 * React side.
 *
 * Fragment-root components resolve to `null` on purpose: their `$el` is a text
 * anchor node, and Vue itself refuses this case for directives
 * ("Runtime directive used on component with non-element root node"). Walking
 * up to `parentElement` could just as easily find a sibling input as the
 * intended one.
 *
 * @param target - Element, component public instance, or null
 * @returns The element to mask, or null if there isn't one
 */
export default function resolveVueElement(target: MaskRefTarget): HTMLElement | null {
  if (!target) return null;

  if (isHTMLElement(target)) {
    return findInputElement(target);
  }

  const { $el } = target as { $el?: unknown };
  if (!isHTMLElement($el)) return null;

  return findInputElement($el);
}
