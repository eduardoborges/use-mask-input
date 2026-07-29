---
sidebar_position: 1
---

# use-mask-input

<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '1.5rem'
}}>
  <img src="https://img.shields.io/npm/v/use-mask-input" alt="npm version" />
  <img src="https://img.shields.io/bundlejs/size/use-mask-input?color=green-light" alt="bundle size" />
  <img src="https://img.shields.io/npm/dw/use-mask-input" alt="npm downloads" />
</div>

Input masks for React and Vue 3, built on the [Inputmask](https://robinherbots.github.io/Inputmask/) engine.

On React it works with plain inputs, React Hook Form, TanStack Form, shadcn/ui and Ant Design. On Vue it ships a directive and a composable, and needs no adapter for vee-validate.

```bash
npm install use-mask-input
```

```tsx
import { useMaskInput } from 'use-mask-input';

function PhoneInput() {
  const ref = useMaskInput({ mask: '(99) 99999-9999' });
  return <input ref={ref} />;
}
```

Or in Vue:

```vue
<script setup>
import { vMaskInput } from 'use-mask-input/vue';
</script>

<template>
  <input v-mask-input="'(99) 99999-9999'" />
</template>
```

## With React Hook Form

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

## With TanStack Form

```tsx
import { useForm } from '@tanstack/react-form';
import { useTanStackFormMask } from 'use-mask-input';

function MyForm() {
  const maskField = useTanStackFormMask();
  const form = useForm({
    defaultValues: { phone: '' },
    onSubmit: async ({ value }) => console.log(value),
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

See the full [TanStack Form Integration](./tanstack-form) guide.

## With Ant Design

```tsx
import { Input } from 'antd';
import { useMaskInputAntd } from 'use-mask-input/antd';

function EmailInput() {
  const ref = useMaskInputAntd({ mask: 'email' });
  return <Input ref={ref} />;
}
```

See the full [Ant Design Integration](./antd) guide.

## With shadcn/ui

shadcn/ui's `Input` exposes an `HTMLInputElement` ref directly, so the base hooks work without any adapter:

```tsx
import { useMaskInput } from 'use-mask-input';
import { Input } from '@/components/ui/input';

function CepField() {
  const ref = useMaskInput({ mask: '99999-999' });
  return <Input ref={ref} placeholder="00000-000" />;
}
```

See the full [shadcn/ui Integration](./shadcn) guide.

## With Vue 3

Import from the `use-mask-input/vue` subpath. In `<script setup>` the directive needs no registration, because Vue resolves a `vMaskInput` binding to `v-mask-input` on its own:

```vue
<script setup>
import { vMaskInput } from 'use-mask-input/vue';
import { ref } from 'vue';

const cpf = ref('');
</script>

<template>
  <input v-model="cpf" v-mask-input="{ mask: 'cpf', options: { autoUnmask: true } }" />
  <!-- displays 123.456.789-01, and cpf holds 12345678901 -->
</template>
```

`v-model` works without an adapter, and so does vee-validate. See the full [Vue 3](./vue) guide.

## APIs

### React

| API | When to use |
|-----|-------------|
| [`useMaskInput`](./api-reference#usemaskinput) | Default choice. Returns a ref callback. |
| [`useHookFormMask`](./api-reference#usehookformmask) | Wraps React Hook Form's `register`. |
| [`useTanStackFormMask`](./api-reference#usetanstackformmask) | Wraps TanStack Form input props with mask support. |
| [`withMask`](./api-reference#withmask) | Non-hook ref callback. **Requires `React.memo`.** |
| [`withHookFormMask`](./api-reference#withhookformmask) | Non-hook mask for registered fields. **Requires `React.memo`.** |
| [`withTanStackFormMask`](./api-reference#withtanstackformmask) | Non-hook mask for TanStack input props. **Requires `React.memo`.** |
| [`useMaskInputAntd`](./api-reference#usemaskinputantd) | `useMaskInput` for Ant Design. |
| [`useHookFormMaskAntd`](./api-reference#usehookformmaskantd) | `useHookFormMask` for Ant Design. |

### Vue

| API | When to use |
|-----|-------------|
| [`vMaskInput`](./api-reference#vmaskinput) | Default choice. A directive, usable as `v-mask-input`. |
| [`useMaskInput` (Vue)](./api-reference#usemaskinput-vue) | Composable, for imperative reads and `unmaskedValue()`. |

### Both

| API | When to use |
|-----|-------------|
| [`formatWithMask`](./api-reference#formatwithmask) | Format a stored value without a mounted element. |
| [`unformatWithMask`](./api-reference#unformatwithmask) | Strip a mask from a formatted value. |

Full signatures and parameters in the [API Reference](./api-reference).

## Mask Types

- [Static Mask](./tutorial-basics/static-mask): fixed patterns like `999-999`
- [Dynamic Mask](./tutorial-basics/dynamic-mask): variable-length patterns
- [Optional Mask](./tutorial-basics/optional-mask): masks with optional parts
- [Alias Mask](./tutorial-basics/alias-mask): built-in presets (`email`, `currency`, `datetime`, ...)
- [Alternator Mask](./tutorial-basics/alternator-mask): multiple patterns
- [Preprocessing Mask](./tutorial-basics/preprocessing-mask): dynamic masks with functions
