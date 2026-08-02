import applyMask, { sameBinding } from './applyMask';
import resolveVueElement from './resolveVueElement';

import type { ObjectDirective } from 'vue';

import type { VueMaskBinding } from './types';

type MaskedElement = HTMLElement & {
  inputmask?: { remove?: () => void };
};

/**
 * `v-mask-input` — the only thing in the Vue entry that applies a mask.
 *
 * Getting real lifecycle hooks is why this, and not the composable, is the
 * primitive. The React surface has no `unmounted`, so it tears Inputmask down
 * from the detach branch of its ref callbacks instead (see `utils/removeMask`).
 *
 * Note there is no `v-model` handling here, and none is needed. Inputmask
 * replaces the element's `value` property with its own accessor, so `v-model`
 * reads and writes through the engine rather than around it — including
 * returning the unmasked value under `autoUnmask`.
 *
 * @example
 * ```vue
 * <script setup>
 * import { vMaskInput } from 'use-mask-input/vue'
 * </script>
 *
 * <template>
 *   <input v-mask-input="'cpf'" />
 *   <input v-mask-input="{ mask: 'currency', options: { prefix: 'R$ ' } }" />
 * </template>
 * ```
 */
const vMaskInput: ObjectDirective<HTMLElement, VueMaskBinding> = {
  mounted(el, binding) {
    applyMask(resolveVueElement(el), binding.value);
  },

  updated(el, binding) {
    // Every parent re-render lands here. Re-masking an unchanged binding would
    // rebuild the buffer and send the caret to the end while the user types.
    if (sameBinding(binding.value, binding.oldValue as VueMaskBinding)) return;

    applyMask(resolveVueElement(el), binding.value);
  },

  unmounted(el) {
    const target = resolveVueElement(el) as MaskedElement | null;
    target?.inputmask?.remove?.();
  },

  // Without this, @vue/server-renderer warns about an unhandled custom
  // directive. There is nothing to render server-side.
  getSSRProps: () => ({}),
};

export default vMaskInput;
