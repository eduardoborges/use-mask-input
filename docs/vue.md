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

```html
<script setup>
import { vMaskInput } from 'use-mask-input/vue';
</script>

<template>
  <input v-mask-input="'cpf'" />
</template>
```

### Binding forms

```html
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

The directive re-applies the mask when the bound mask changes and removes the Inputmask instance when the element unmounts. An unrelated re-render does not re-apply it, so the caret is not thrown to the end while the user is typing.

## Using `v-model`

`v-model` needs no adapter. Inputmask replaces the element's `value` property with its own accessor, so `v-model` reads and writes *through* the mask engine rather than fighting it.

```html
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

```html
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

With `autoUnmask: true`, the value that reaches your validation rules, your schema and your submit handler is the raw one, which is almost always what a backend wants, while the user keeps seeing the mask.

Everything else behaves normally: dirty tracking, validation on change and on blur, `setValue`, and `resetForm` re-rendering the masked display.

## Component libraries

Put the directive on the component. Vue applies directives to a component's root element, and the mask engine searches inside it for the real input:

```html
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

## Built-in aliases

The same aliases as the React entry, since both share `core/maskConfig`:

`cpf` · `cnpj` · `br-bank-account` · `br-bank-agency` · `currency` · `brl-currency` · `datetime` · `email` · `numeric` · `decimal` · `integer` · `percentage` · `url` · `ip` · `mac` · `ssn`

```html
<input v-mask-input="'cnpj'" />
```

Aliases carry defaults that your options override individually. This keeps the alias's `,` radix point and `.` group separator while changing only the prefix:

```html
<input v-mask-input="{ mask: 'brl-currency', options: { prefix: 'US$ ' } }" />
```

Anything that is not a known alias is treated as a raw pattern, so `'(99) 99999-9999'` and `'AAA-9A99'` work directly. Full option list in the [API Reference](./api-reference#options).

## TypeScript

The entry ships its own types, none of which reference React:

```ts
import type {
  Mask,
  Options,
  VueMaskBinding,
  MaskRefTarget,
  UseMaskInputReturn,
} from 'use-mask-input/vue';
```

`VueMaskBinding` is useful when passing a mask down as a prop:

```html
<script setup lang="ts">
import { vMaskInput } from 'use-mask-input/vue';
import type { VueMaskBinding } from 'use-mask-input/vue';

defineProps<{ mask: VueMaskBinding }>();
</script>

<template>
  <input v-mask-input="mask" />
</template>
```

## The composable

Use it when you need the raw value imperatively, or a ref you can hold:

```html
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

For most cases the directive is the better choice. It covers wrapper components too, and it gets proper teardown on unmount.

## Server-side rendering

The Vue entry is SSR-safe. The composable returns a no-op on the server and `unmaskedValue()` returns `''`; the directive contributes no props during server rendering and emits no unhandled-directive warning.

## Nuxt

The entry is SSR-safe, so it works in Nuxt without a wrapper. Register the directive in a plugin:

```ts
// plugins/mask-input.ts
import { vMaskInput } from 'use-mask-input/vue';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('mask-input', vMaskInput);
});
```

The mask applies on the client after hydration. Server-rendered markup contains the input without a mask, which is the same contract the React entry has under Next.js.

## Caveats

### `unmaskedValue()` is not reactive

```html
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

If you hit a case where they would genuinely help, [open an issue](https://github.com/eduardoborges/use-mask-input/issues). A concrete use case is a much better basis for that decision than a guess.

## Migrating from another Vue mask library

Coming from [maska](https://github.com/beholdr/maska) or [v-mask](https://github.com/probil/v-mask), the directive name is `v-mask-input` rather than `v-mask`. That is deliberate: the shorter name is already taken by both, and keeping it distinct means you can migrate one field at a time instead of all at once.

| Concept | maska | use-mask-input |
|---------|-------|----------------|
| Directive | `v-maska` | `v-mask-input` |
| Pattern | `data-maska="#####-###"` | `v-mask-input="'99999-999'"` |
| Token for a digit | `#` | `9` |
| Token for a letter | `@` | `A` |
| Token for either | `*` | `*` |
| Raw value | `data-maska-unmasked` binding | `options: { autoUnmask: true }` with `v-model` |
| Named presets | none built in | 16 [aliases](#built-in-aliases) |

The pattern tokens come from Inputmask, so `9` is a digit and `A` is a letter. A CEP written `#####-###` in maska becomes `99999-999` here.

## Troubleshooting

**The mask does not appear at all.**
Check that the directive resolved. In `<script setup>` the imported binding must be named exactly `vMaskInput` for Vue to map it to `v-mask-input`. If you renamed the import, register it explicitly with `app.directive`.

**It works on a plain input but not on my component library's input.**
The component probably has a fragment root. Vue cannot attach directives to those and warns as much: *"Runtime directive used on component with non-element root node."* Give the component a single root element.

**`{{ unmaskedValue() }}` shows the initial value and never changes.**
Expected. It reads the DOM, which registers no reactive dependency. Use `v-model` with `autoUnmask: true` when the template needs to track the value.

**My validation rule receives `123.456.789-01` instead of `12345678901`.**
Add `autoUnmask: true` to the options. Without it the bound value is the masked string.

**Changing options at runtime does nothing.**
Options are compared shallowly. Replace the object rather than mutating it: `options = { ...options, prefix: 'US$ ' }`.

**The caret jumps to the end while typing.**
That usually means the mask is being re-applied on every render. The directive guards against this by comparing bindings structurally, so check whether something else in your code is re-mounting the input, for example a changing `:key`.

## Example app

`apps/vue-project` in the repository is a working Vite + Vue 3 + vee-validate app covering every alias, raw and multi-pattern masks, option overrides, `v-model` with `autoUnmask`, the composable, wrapper components and a validated form.

```sh
pnpm dev:vue
```
