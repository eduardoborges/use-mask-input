---
"use-mask-input": minor
---

Add Vue 3 support via a new `use-mask-input/vue` entry point.

Two exports: a `vMaskInput` directive and a `useMaskInput` composable. In `<script setup>` the directive needs no registration and no plugin — Vue resolves `vMaskInput` to `v-mask-input` on its own.

```vue
<script setup>
import { vMaskInput } from 'use-mask-input/vue';
</script>

<template>
  <input v-mask-input="'cpf'" />
  <input v-model="cpf" v-mask-input="{ mask: 'cpf', options: { autoUnmask: true } }" />
</template>
```

`v-model` works with no adapter, and vee-validate 4 needs no integration code at all: with `autoUnmask`, field state and submit values receive the raw value while the input keeps displaying the mask.

Also: `react` and `react-dom` are now optional peer dependencies, so installing the package in a Vue project no longer warns about missing React. `vue` and `vee-validate` are optional peers. The Vue entry never imports React.
