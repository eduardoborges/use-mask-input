<div align="center">
  <h1>🥸 use-mask-input</h1>
  <p>Input masks for <strong>React</strong> and <strong>Vue 3</strong>. Works with React Hook Form, TanStack Form, vee-validate, Ant Design, and plain inputs.</p>

  [![npm](https://img.shields.io/npm/v/use-mask-input)](https://www.npmjs.com/package/use-mask-input)
  [![npm downloads](https://img.shields.io/npm/dw/use-mask-input)](https://www.npmjs.com/package/use-mask-input)
  [![bundle size](https://img.shields.io/bundlejs/size/use-mask-input?color=green-light)](https://bundlejs.com/?q=use-mask-input)
  [![codecov](https://codecov.io/gh/eduardoborges/use-mask-input/branch/main/graph/badge.svg?token=8ORAOAUZTP)](https://codecov.io/gh/eduardoborges/use-mask-input)

  [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E71VQENQ)
</div>

---

**[Documentation](http://use-mask-input.eduardoborges.dev)** · **[API Reference](http://use-mask-input.eduardoborges.dev/api-reference)** · **[TanStack Form](http://use-mask-input.eduardoborges.dev/tanstack-form)** · **[Sponsor](https://ko-fi.com/E1E71VQENQ)**

## Install

```sh
npm install use-mask-input
```

## Usage

```tsx
import { useMaskInput } from 'use-mask-input';

function PhoneInput() {
  const ref = useMaskInput({ mask: '(99) 99999-9999' });
  return <input ref={ref} />;
}
```

### With React Hook Form

```tsx
import { useForm } from 'react-hook-form';
import { useHookFormMask } from 'use-mask-input';

function MyForm() {
  const { register, handleSubmit } = useForm();
  const registerWithMask = useHookFormMask(register);

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input {...registerWithMask('phone', '(99) 99999-9999')} />
      <input {...registerWithMask('email', 'email')} />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### With TanStack Form

```tsx
import { useForm } from '@tanstack/react-form';
import { useTanStackFormMask } from 'use-mask-input';

function MyForm() {
  const maskField = useTanStackFormMask();
  const form = useForm({
    defaultValues: {
      phone: '',
    },
    onSubmit: async ({ value }) => {
      console.log(value);
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="phone">
        {(field) => {
          const inputProps = maskField(
            '(99) 99999-9999',
            {
              name: field.name,
              value: field.state.value,
              onBlur: field.handleBlur,
              onChange: (event) => field.handleChange(event.target.value),
            },
          );

          return <input {...inputProps} placeholder="(00) 00000-0000" />;
        }}
      </form.Field>
    </form>
  );
}
```

### With Ant Design

```tsx
import { Input } from 'antd';
import { useMaskInputAntd } from 'use-mask-input/antd';

function EmailInput() {
  const ref = useMaskInputAntd({ mask: 'email' });
  return <Input ref={ref} />;
}
```

## Vue 3

Everything above is React. Vue 3 has its own entry point:

```ts
import { vMaskInput, useMaskInput } from 'use-mask-input/vue';
```

### The directive

In `<script setup>`, importing `vMaskInput` is enough. Vue resolves a `vFoo` binding to `v-foo`, so there is no registration step and no plugin.

```vue
<script setup>
import { vMaskInput } from 'use-mask-input/vue';
</script>

<template>
  <input v-mask-input="'cpf'" />
  <input v-mask-input="'(99) 99999-9999'" />
  <input v-mask-input="['999-999', '999-999-999']" />
  <input v-mask-input="{ mask: 'currency', options: { prefix: 'R$ ' } }" />
</template>
```

Outside `<script setup>`, register it yourself: `app.directive('mask-input', vMaskInput)`.

### With `v-model`

`v-model` works with no extra code. Add `autoUnmask` and the bound value is the raw one, while the input keeps showing the mask:

```vue
<input v-model="cpf" v-mask-input="{ mask: 'cpf', options: { autoUnmask: true } }" />
<!-- displays 123.456.789-01, and cpf === '12345678901' -->
```

Without `autoUnmask`, `v-model` receives the masked string. Directive order does not matter: `v-model` before or after `v-mask-input` behaves identically.

Binding `null` turns masking off and removes any mask already applied, so `v-mask-input="enabled ? 'cpf' : null"` works as a toggle.

### With vee-validate

No helper, no wrapper. `useField` plus `v-model` plus the directive is the whole integration, and `handleSubmit` receives the unmasked value:

```vue
<script setup>
import { useField, useForm } from 'vee-validate';
import { vMaskInput } from 'use-mask-input/vue';

const { handleSubmit } = useForm();
const { value, errorMessage } = useField('cpf', (v) => v?.length === 11 || 'Invalid CPF');

const onSubmit = handleSubmit((values) => console.log(values)); // { cpf: '12345678901' }
</script>

<template>
  <form @submit="onSubmit">
    <input v-model="value" v-mask-input="{ mask: 'cpf', options: { autoUnmask: true } }" />
    <span>{{ errorMessage }}</span>
  </form>
</template>
```

### With component libraries

Put the directive on the component. Vue applies it to the root element and the mask finds the inner input, so PrimeVue, Element Plus and Ant Design Vue work as-is:

```vue
<InputText v-mask-input="'cpf'" />
```

### The composable

For imperative reads, or when you want the raw value without `autoUnmask`:

```vue
<script setup>
import { useMaskInput } from 'use-mask-input/vue';

const { maskRef, unmaskedValue } = useMaskInput('cpf');
const submit = () => console.log(unmaskedValue());
</script>

<template>
  <input :ref="maskRef" />
</template>
```

### Vue caveats

- **`unmaskedValue()` is not reactive.** `{{ unmaskedValue() }}` renders once and never updates, because reading the DOM registers no reactive dependency. Use it in event handlers and imperative code. For a value the template tracks, use `v-model` with `autoUnmask: true`.
- **`noValuePatching: true` is unsupported.** It disables the property accessor that the whole `v-model` integration relies on.
- **Replace the options object, don't mutate it.** Options are compared shallowly, so an in-place mutation may not re-apply the mask.

There is deliberately no `<MaskInput>` component and no vee-validate helper, because `v-model` plus the directive already covers both.

## APIs

| API | Description |
|-----|-------------|
| `useMaskInput` | Hook. Returns a ref callback. Default choice. |
| `useHookFormMask` | Hook. Wraps React Hook Form's `register`. |
| `useTanStackFormMask` | Hook. Adds mask to TanStack Form field input props. |
| `withMask` | Function. Ref callback. Requires `React.memo`. |
| `withHookFormMask` | Function. Mask for registered fields. Requires `React.memo`. |
| `withTanStackFormMask` | Function. Mask for TanStack input props. Requires `React.memo`. |
| `useMaskInputAntd` | Hook. `useMaskInput` for Ant Design. |
| `useHookFormMaskAntd` | Hook. `useHookFormMask` for Ant Design. |
| `formatWithMask` | Function. Formats a raw value using a mask, without a mounted element. |
| `unformatWithMask` | Function. Removes the mask from a formatted value, without a mounted element. |
| `isValidWithMask` | Function. Whether a value is a complete, valid entry for a mask. For schema validators. |
| `getUnmaskedValue` | Function. Reads the unmasked value off an element, e.g. `event.target` in `onChange`. |
| `isMaskComplete` | Function. Whether the mask on an element is fully filled. |
| `vMaskInput` | Vue directive. `use-mask-input/vue`. The Vue default choice. |
| `useMaskInput` (Vue) | Composable. `use-mask-input/vue`. Returns `{ maskRef, unmaskedValue, isComplete }`. |

Every hook and `with*` helper also carries `unmaskedValue()` and `isComplete()` on what it returns:

```tsx
const cpf = useMaskInput({ mask: 'cpf' });
<input ref={cpf} onChange={(e) => console.log(getUnmaskedValue(e.target), cpf.isComplete())} />
```

## Built-in Aliases

`cpf` · `cnpj` · `cep` · `phone-br` · `date-br` · `plate-br` · `br-bank-account` · `br-bank-agency` · `currency` · `brl-currency` · `credit-card` · `time` · `datetime` · `email` · `numeric` · `decimal` · `integer` · `percentage` · `url` · `ip` · `mac` · `ssn`

## Works With

- **TanStack Form** (`useTanStackFormMask`, `withTanStackFormMask`). See the [TanStack Form guide](http://use-mask-input.eduardoborges.dev/tanstack-form).
- React Hook Form
- Ant Design (`use-mask-input/antd`)
- React Final Form
- Next.js / SSR
- **Vue 3** (`use-mask-input/vue`)
- **vee-validate** (no adapter needed)
- Vue component libraries: PrimeVue, Element Plus, Ant Design Vue

## License

MIT
