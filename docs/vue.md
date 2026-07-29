---
sidebar_position: 6
---

# Vue 3

**use-mask-input** ships a Vue 3 entry point alongside the React one. It reuses the same mask engine and the same [built-in aliases](./api-reference.md), so a `cpf` mask behaves identically in both frameworks.

```ts
import { vMaskInput, useMaskInput } from 'use-mask-input/vue';
```

Two exports, and that is the whole surface:

| Export | Type | Use it for |
|--------|------|------------|
| `vMaskInput` | Directive | Everything. The default choice. |
| `useMaskInput` | Composable | Imperative reads and `unmaskedValue()`. |

## Installation

```sh
npm install use-mask-input
```

`vue` is an optional peer dependency. React is never imported by the Vue entry, so a Vue app never pulls React into its bundle or its install graph.

## The directive

In `<script setup>`, importing `vMaskInput` is all it takes. Vue resolves any `vFoo` binding to `v-foo`, so there is no registration step and no plugin to install.

```vue
<script setup>
import { vMaskInput } from 'use-mask-input/vue';
</script>

<template>
  <input v-mask-input="'cpf'" />
</template>
```

### Binding forms

```vue
<template>
  <!-- a built-in alias -->
  <input v-mask-input="'cpf'" />

  <!-- a raw pattern -->
  <input v-mask-input="'(99) 99999-9999'" />

  <!-- several patterns; the engine picks the one that fits -->
  <input v-mask-input="['999-999', '999-999-999']" />

  <!-- with options -->
  <input v-mask-input="{ mask: 'currency', options: { prefix: 'R$ ' } }" />

  <!-- null is inert: no mask is applied -->
  <input v-mask-input="null" />
</template>
```

User options always win over an alias's defaults, and the rest of the alias survives the merge. `{ mask: 'brl-currency', options: { prefix: 'US$ ' } }` keeps the alias's `,` radix point and `.` group separator.

### Outside `<script setup>`

```ts
import { createApp } from 'vue';
import { vMaskInput } from 'use-mask-input/vue';

createApp(App).directive('mask-input', vMaskInput);
```

### Lifecycle

The directive re-applies the mask when the bound mask changes and removes the Inputmask instance when the element unmounts. An unrelated re-render does **not** re-apply it, so the caret is not thrown to the end while the user is typing.

## Using `v-model`

`v-model` needs no adapter. Inputmask replaces the element's `value` property with its own accessor, so `v-model` reads and writes *through* the mask engine rather than fighting it.

```vue
<script setup>
import { ref } from 'vue';
import { vMaskInput } from 'use-mask-input/vue';

const cpf = ref('');
</script>

<template>
  <input v-model="cpf" v-mask-input="{ mask: 'cpf', options: { autoUnmask: true } }" />
  <p>Raw value: {{ cpf }}</p>
</template>
```

With `autoUnmask: true` the input displays `123.456.789-01` while `cpf` holds `12345678901`. Without it, `cpf` holds the masked string.

Directive order does not matter. `v-model v-mask-input` and `v-mask-input v-model` produce identical results, because whichever runs second still goes through the same accessor.

## vee-validate

There is no adapter and no helper, because none is needed. `useField` plus `v-model` plus the directive is the entire integration.

```vue
<script setup>
import { useField, useForm } from 'vee-validate';
import { vMaskInput } from 'use-mask-input/vue';

const { handleSubmit } = useForm();
const { value, errorMessage } = useField(
  'cpf',
  (v) => v?.length === 11 || 'CPF must have 11 digits',
);

const onSubmit = handleSubmit((values) => {
  console.log(values); // { cpf: '12345678901' }
});
</script>

<template>
  <form @submit="onSubmit">
    <input v-model="value" v-mask-input="{ mask: 'cpf', options: { autoUnmask: true } }" />
    <span v-if="errorMessage">{{ errorMessage }}</span>
    <button type="submit">Submit</button>
  </form>
</template>
```

With `autoUnmask: true`, the value that reaches your validation rules, your schema and your submit handler is the raw one — which is almost always what a backend wants — while the user keeps seeing the mask.

Everything else behaves normally: dirty tracking, validation on change and on blur, `setValue`, and `resetForm` re-rendering the masked display.

## Component libraries

Put the directive on the component. Vue applies directives to a component's root element, and the mask engine searches inside it for the real input:

```vue
<template>
  <!-- PrimeVue -->
  <InputText v-mask-input="'cpf'" />

  <!-- Element Plus -->
  <el-input v-mask-input="'cpf'" />

  <!-- Ant Design Vue -->
  <a-input v-mask-input="'cpf'" />
</template>
```

This does not work for a component with a **fragment root** (multiple root nodes). Vue itself warns about that case: *"Runtime directive used on component with non-element root node."* Give the component a single root element.

## The composable

Use it when you need the raw value imperatively, or a ref you can hold:

```vue
<script setup>
import { useMaskInput } from 'use-mask-input/vue';

const { maskRef, unmaskedValue } = useMaskInput('cpf');

function submit() {
  console.log(unmaskedValue()); // '12345678901'
}
</script>

<template>
  <input :ref="maskRef" />
  <button @click="submit">Submit</button>
</template>
```

`useMaskInput(mask, options?)` returns:

| Property | Description |
|----------|-------------|
| `maskRef` | Ref callback. Bind with `:ref="maskRef"`. |
| `unmaskedValue()` | Returns the current raw value, or `''` before mount. |

For most cases the directive is the better choice — it covers wrapper components too, and it gets proper teardown on unmount.

## Server-side rendering

The Vue entry is SSR-safe. The composable returns a no-op on the server and `unmaskedValue()` returns `''`; the directive contributes no props during server rendering and emits no unhandled-directive warning.

## Caveats

### `unmaskedValue()` is not reactive

```vue
<template>
  <!-- WRONG: renders once, never updates -->
  <p>{{ unmaskedValue() }}</p>
</template>
```

Reading the DOM registers no reactive dependency, so Vue never knows to re-render. `unmaskedValue()` is for event handlers and imperative code. When the template needs to track the value, use `v-model` with `autoUnmask: true` instead.

### `noValuePatching: true` is unsupported

That option disables the `value` property accessor that the entire `v-model` integration depends on. With it enabled, `v-model` and the mask become two independent writers and drift apart.

### Replace options, don't mutate them

Options are compared shallowly to decide whether to re-apply the mask. Mutating an options object in place may not trigger a re-apply:

```ts
// won't reliably re-apply
options.prefix = 'US$ ';

// will
options = { ...options, prefix: 'US$ ' };
```

## What is deliberately not included

There is no `<MaskInput>` component and no `useVeeValidateMask` helper. `v-model` plus the directive already covers everything they would have done, and every extra export is surface that has to be maintained and kept consistent forever.

If you hit a case where they would genuinely help, [open an issue](https://github.com/eduardoborges/use-mask-input/issues) — a concrete use case is a much better basis for that decision than a guess.
