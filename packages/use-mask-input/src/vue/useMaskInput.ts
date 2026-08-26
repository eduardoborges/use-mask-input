import applyMask from './applyMask';
import resolveVueElement from './resolveVueElement';
import { getUnmaskedValue, isMaskComplete } from '../utils';
import isServer from '../utils/isServer';

import type {
  MaskRefTarget, Mask, Options, UseMaskInputReturn,
} from './types';

/**
 * Composable form, for imperative use and for reading the raw value when
 * `autoUnmask` is off.
 *
 * Narrower than the directive on purpose: wrapper components (PrimeVue,
 * Element Plus, Ant Design Vue) are already covered by `v-mask-input`, because
 * Vue applies directives to a component's root element and the mask engine
 * searches inside it. Reach for this when you need `unmaskedValue()` or a ref
 * you can hold.
 *
 * @param mask - The mask pattern or alias
 * @param options - Optional mask configuration options
 * @returns A ref callback to bind, and an unmasked-value accessor
 *
 * @example
 * ```vue
 * <script setup>
 * import { useMaskInput } from 'use-mask-input/vue'
 * const { maskRef, unmaskedValue } = useMaskInput('cpf')
 * function submit() { console.log(unmaskedValue()) }
 * </script>
 *
 * <template><input :ref="maskRef" /></template>
 * ```
 */
export default function useMaskInput(mask: Mask, options?: Options): UseMaskInputReturn {
  if (isServer) {
    return {
      maskRef: () => {
        // server doesn't have dom, so just do nothing
      },
      unmaskedValue: () => '',
      isComplete: () => false,
    };
  }

  let element: HTMLElement | null = null;

  const maskRef = (target: MaskRefTarget): void => {
    element = resolveVueElement(target);
    applyMask(element, { mask, options });
  };

  return {
    maskRef,
    unmaskedValue: () => getUnmaskedValue(element),
    isComplete: () => isMaskComplete(element),
  };
}
