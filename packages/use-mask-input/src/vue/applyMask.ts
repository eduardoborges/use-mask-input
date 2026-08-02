import { applyMaskToElement } from '../core';
import { makeMaskCacheKey, sameOptions } from '../utils';
import isServer from '../utils/isServer';

import type { Mask, Options, VueMaskBinding, VueMaskConfig } from './types';

type MaskedElement = HTMLElement & {
  inputmask?: { remove?: () => void };
};

/**
 * Single implementation both Vue surfaces route through, so the directive and
 * the composable cannot drift apart on what a given mask means.
 */

function isConfig(binding: VueMaskBinding): binding is VueMaskConfig {
  return (
    typeof binding === 'object'
    && binding !== null
    && !Array.isArray(binding)
    && 'mask' in binding
  );
}

/** Unpacks the two accepted binding shapes into a mask and its options. */
export function normalizeBinding(binding: VueMaskBinding): {
  mask: Mask;
  options?: Options;
} {
  if (isConfig(binding)) {
    return { mask: binding.mask, options: binding.options };
  }

  return { mask: binding as Mask };
}

/**
 * True when two bindings mean the same mask, so an unrelated re-render doesn't
 * rebuild Inputmask's buffer and drop the caret to the end mid-typing.
 *
 * Compares structurally, not by identity: an inline `v-mask-input="{ mask: 'cpf' }"`
 * allocates a fresh object every render and would otherwise never look equal.
 */
export function sameBinding(a: VueMaskBinding, b: VueMaskBinding): boolean {
  const left = normalizeBinding(a);
  const right = normalizeBinding(b);

  if (makeMaskCacheKey('', left.mask) !== makeMaskCacheKey('', right.mask)) {
    return false;
  }

  return sameOptions(left.options, right.options);
}

/**
 * Applies a binding's mask to an already-resolved element.
 *
 * A null mask is not merely "do nothing": it has to tear down whatever mask is
 * already on the element. A binding is reactive, so `v-mask-input="on ? 'cpf' : null"`
 * turns the mask off, and simply returning early would leave the element still
 * formatting as a CPF.
 *
 * @param element - The element to mask
 * @param binding - Mask, or `{ mask, options }`
 */
export default function applyMask(
  element: HTMLElement | null,
  binding: VueMaskBinding,
): void {
  if (isServer || !element) return;

  const { mask, options } = normalizeBinding(binding);

  if (mask === null || mask === undefined) {
    (element as MaskedElement).inputmask?.remove?.();
    return;
  }

  applyMaskToElement(element, mask, options);
}
