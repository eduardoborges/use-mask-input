---
sidebar_position: 2
---

# API Reference

**use-mask-input** has two entry points. `use-mask-input` holds the React API: six main exports plus two Ant Design hooks. `use-mask-input/vue` holds the Vue 3 API: a directive and a composable. Both share the same mask engine, the same aliases, and the two standalone formatting utilities.

### React, from `use-mask-input`


| API | Type | React Hook Form | Ant Design | Needs `memo`? |
|-----|------|:---------------:|:----------:|:-------------:|
| [`useMaskInput`](#usemaskinput) | Hook | - | - | No |
| [`useHookFormMask`](#usehookformmask) | Hook | Yes | - | No |
| [`useTanStackFormMask`](#usetanstackformmask) | Hook | - | - | No |
| [`withMask`](#withmask) | Function | - | - | **Yes** |
| [`withHookFormMask`](#withhookformmask) | Function | Yes | - | **Yes** |
| [`withTanStackFormMask`](#withtanstackformmask) | Function | - | - | **Yes** |
| [`useMaskInputAntd`](#usemaskinputantd) | Hook | - | Yes | No |
| [`useHookFormMaskAntd`](#usehookformmaskantd) | Hook | Yes | Yes | No |

### Vue 3, from `use-mask-input/vue`

| API | Type | vee-validate | Wrapper components |
|-----|------|:------------:|:------------------:|
| [`vMaskInput`](#vmaskinput) | Directive | Yes, no adapter | Yes |
| [`useMaskInput` (Vue)](#usemaskinput-vue) | Composable | Yes, no adapter | Yes |

### Shared

| API | Type | Entry point |
|-----|------|-------------|
| [`formatWithMask`](#formatwithmask) | Function | Both |
| [`unformatWithMask`](#unformatwithmask) | Function | Both |

---

## Hooks

Hooks manage ref stability internally (`useCallback` / `useMemo`), so they are safe to use in components that re-render frequently without any extra precautions.

### useMaskInput

React hook that returns a ref callback for applying an input mask.

```ts
function useMaskInput(props: {
  mask: Mask;
  register?: (element: HTMLElement) => void;
  options?: Options;
}): (input: HTMLElement | null) => void
```

**Parameters**

| Name | Type | Required | Description |
|------|------|:--------:|-------------|
| `mask` | `Mask` | Yes | The mask pattern, alias, or array of patterns. |
| `register` | `(element: HTMLElement) => void` | No | Callback that receives the resolved DOM element (useful for third-party form libraries). |
| `options` | `Options` | No | Inputmask configuration options (placeholder, autoUnmask, etc.). |

**Returns**

A stable ref callback. Attach it to any `<input>` (or compatible element) via the `ref` prop.
The returned callback also exposes `unmaskedValue()` so you can read the current unmasked value directly from the hook result.

**Example**

```tsx
import { useMaskInput } from 'use-mask-input';

function PhoneInput() {
  const maskRef = useMaskInput({
    mask: '(99) 99999-9999',
  });

  return <input ref={maskRef} placeholder="(00) 00000-0000" />;
}
```

---

### useHookFormMask

React hook that wraps React Hook Form's `register` and adds automatic masking.

```ts
function useHookFormMask<T extends FieldValues>(
  registerFn: UseFormRegister<T>
): (
  fieldName: Path<T>,
  mask: Mask,
  options?: RegisterOptions & Options
) => UseHookFormMaskReturn<T>
```

**Parameters**

| Name | Type | Required | Description |
|------|------|:--------:|-------------|
| `registerFn` | `UseFormRegister<T>` | Yes | The `register` function returned by `useForm()`. |

**Returns**

A function with the signature `(fieldName, mask, options?) => { ref, name, onChange, onBlur, ... }`. Use it by spreading the result onto your input.
The returned object also exposes `unmaskedValue()` for the resolved field.

**Example**

```tsx
import { useForm } from 'react-hook-form';
import { useHookFormMask } from 'use-mask-input';

function MyForm() {
  const { register, handleSubmit } = useForm();
  const registerWithMask = useHookFormMask(register);

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input
        {...registerWithMask('phone', '(99) 99999-9999')}
        placeholder="(00) 00000-0000"
      />

      {/* Fields without masks still use the regular register */}
      <input {...register('email')} placeholder="email@example.com" />

      <button type="submit">Submit</button>
    </form>
  );
}
```

---

### useTanStackFormMask

React hook that wraps TanStack Form-compatible input props and adds automatic masking.

```ts
function useTanStackFormMask(): <T extends TanStackFormInputProps>(
  mask: Mask,
  inputProps: T,
  options?: Options
) => UseTanStackFormMaskReturn<T>
```

**Parameters**

The returned function accepts:

| Name | Type | Required | Description |
|------|------|:--------:|-------------|
| `mask` | `Mask` | Yes | The mask pattern, alias, or array of patterns. |
| `inputProps` | `TanStackFormInputProps` | Yes | Input props generated from TanStack `field` state and handlers. |
| `options` | `Options` | No | Inputmask configuration options. |

**Returns**

A new props object with a masked `ref` callback while preserving all original handlers and values.

**Example**

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
  );
}
```

---

## Higher-Order Functions

`withMask` and `withHookFormMask` are **not** hooks. They are plain functions that create new ref callbacks on every call. Because React treats a new ref callback as a different ref, calling these directly inside a component body causes the mask to be re-applied on every render.

:::warning Wrap the component with `React.memo`
Since `withMask` and `withHookFormMask` are not hooks, they don't have internal memoization via React's lifecycle. You **must** wrap the component that uses them with `React.memo` to ensure the ref callback identity stays stable across parent re-renders.

Without `memo`, every parent re-render creates a new ref callback, which detaches and re-attaches the mask. This causes flickering, cursor position loss, and degraded performance.
:::

### withMask

Creates a ref callback that applies an input mask. This is the simplest API when you just need a masked ref and don't use React Hook Form.

```ts
function withMask(
  mask: Mask,
  options?: Options
): (input: HTMLElement | null) => void
```

**Parameters**

| Name | Type | Required | Description |
|------|------|:--------:|-------------|
| `mask` | `Mask` | Yes | The mask pattern, alias, or array of patterns. |
| `options` | `Options` | No | Inputmask configuration options. |

**Returns**

A ref callback function to pass to an element's `ref` prop.
The returned callback also exposes `unmaskedValue()`.

**Caching behavior**: when called without `options`, the callback is cached by mask key so the same function identity is returned for the same mask. When `options` is provided, a new callback is created each call, so `memo` is needed.

**Example**

```tsx
import { memo } from 'react';
import { withMask } from 'use-mask-input';

const PhoneInput = memo(() => {
  return (
    <input
      ref={withMask('(99) 99999-9999')}
      placeholder="(00) 00000-0000"
    />
  );
});
```

**With options**

```tsx
import { memo } from 'react';
import { withMask } from 'use-mask-input';

const CurrencyInput = memo(() => {
  return (
    <input
      ref={withMask('currency', {
        prefix: 'R$ ',
        radixPoint: ',',
        groupSeparator: '.',
        digits: 2,
        rightAlign: false,
      })}
    />
  );
});
```

:::tip Prefer `useMaskInput` if you don't need the function-based API
If you're already inside a component and don't need to pass the mask as a prop, `useMaskInput` is the safer choice. It handles memoization internally and doesn't require `memo`.
:::

---

### withHookFormMask

Takes an already-registered React Hook Form field and adds mask support to it.

```ts
function withHookFormMask(
  register: UseFormRegisterReturn,
  mask: Mask,
  options?: Options
): UseHookFormMaskReturn<FieldValues>
```

**Parameters**

| Name | Type | Required | Description |
|------|------|:--------:|-------------|
| `register` | `UseFormRegisterReturn` | Yes | The object returned by calling `register('fieldName')`. |
| `mask` | `Mask` | Yes | The mask pattern, alias, or array of patterns. |
| `options` | `Options` | No | Inputmask and/or React Hook Form register options. |

**Returns**

A new register return object with the `ref` replaced by a mask-applying ref callback. Spread it onto your input.
The returned object also exposes `unmaskedValue()`.

**Example**

```tsx
import { memo } from 'react';
import { useForm } from 'react-hook-form';
import { withHookFormMask } from 'use-mask-input';

const MyForm = memo(() => {
  const { register, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input
        {...withHookFormMask(register('phone'), '(99) 99999-9999')}
        placeholder="(00) 00000-0000"
      />
      <button type="submit">Submit</button>
    </form>
  );
});
```

:::tip Prefer `useHookFormMask` for most cases
`useHookFormMask` is a hook that wraps `register` with built-in memoization. Use `withHookFormMask` only when you need to apply the mask to an already-registered field (e.g., the `register` call happens elsewhere and you receive the return object as a prop).
:::

---

### withTanStackFormMask

Takes TanStack Form-compatible input props and adds mask support to them.

```ts
function withTanStackFormMask<T extends TanStackFormInputProps>(
  inputProps: T,
  mask: Mask,
  options?: Options
): UseTanStackFormMaskReturn<T>
```

**Parameters**

| Name | Type | Required | Description |
|------|------|:--------:|-------------|
| `inputProps` | `TanStackFormInputProps` | Yes | Input props object from TanStack field state and handlers. |
| `mask` | `Mask` | Yes | The mask pattern, alias, or array of patterns. |
| `options` | `Options` | No | Inputmask configuration options. |

**Returns**

A new input props object with `ref` replaced by a mask-applying callback.

**Example**

```tsx
import { memo } from 'react';
import { withTanStackFormMask } from 'use-mask-input';

const InputField = memo(function InputField({
  inputProps,
}: {
  inputProps: {
    name: string;
    value: string;
    onBlur: () => void;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  };
}) {
  const maskedProps = withTanStackFormMask(inputProps, '(99) 99999-9999');
  return <input {...maskedProps} />;
});
```

---

## Ant Design Hooks

These hooks handle Ant Design's `InputRef` structure automatically. Import them from `use-mask-input/antd`.

### useMaskInputAntd

React hook for applying masks to Ant Design `Input` components.

```ts
import { useMaskInputAntd } from 'use-mask-input/antd';

function useMaskInputAntd(props: {
  mask: Mask;
  register?: (element: HTMLElement) => void;
  options?: Options;
}): (input: InputRef | null) => void
```

**Parameters**

| Name | Type | Required | Description |
|------|------|:--------:|-------------|
| `mask` | `Mask` | Yes | The mask pattern, alias, or array of patterns. |
| `register` | `(element: HTMLElement) => void` | No | Callback that receives the resolved DOM element. |
| `options` | `Options` | No | Inputmask configuration options. |

**Returns**

A stable ref callback that accepts Ant Design's `InputRef` and applies the mask to the underlying input element.
The returned callback also exposes `unmaskedValue()`.

**Example**

```tsx
import { Input } from 'antd';
import { useMaskInputAntd } from 'use-mask-input/antd';

function PhoneInput() {
  const maskRef = useMaskInputAntd({ mask: '(99) 99999-9999' });
  return <Input ref={maskRef} placeholder="(00) 00000-0000" />;
}
```

See the full [Ant Design Integration](./antd) guide for Form.Item, useWatch, and validation examples.

---

### useHookFormMaskAntd

Combines React Hook Form with Ant Design. A masked `register` that works with `InputRef`.

```ts
import { useHookFormMaskAntd } from 'use-mask-input/antd';

function useHookFormMaskAntd<T extends FieldValues>(
  registerFn: UseFormRegister<T>
): (
  fieldName: Path<T>,
  mask: Mask,
  options?: RegisterOptions & Options
) => UseHookFormMaskAntdReturn<T>
```

**Parameters**

| Name | Type | Required | Description |
|------|------|:--------:|-------------|
| `registerFn` | `UseFormRegister<T>` | Yes | The `register` function returned by `useForm()`. |

**Returns**

A function with the signature `(fieldName, mask, options?)` that returns an object you spread onto Ant Design's `Input`.

**Example**

```tsx
import { Input } from 'antd';
import { useForm } from 'react-hook-form';
import { useHookFormMaskAntd } from 'use-mask-input/antd';

function MyForm() {
  const { register, handleSubmit } = useForm();
  const registerWithMask = useHookFormMaskAntd(register);

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <Input
        {...registerWithMask('phone', '(99) 99999-9999')}
        placeholder="(00) 00000-0000"
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## Vue 3

Exported from the `use-mask-input/vue` subpath. `vue` is an optional peer dependency, and the Vue entry never imports React.

Both surfaces route mask application through one internal implementation, so a given mask and options produce identical engine configuration either way.

### vMaskInput

A Vue directive that applies a mask to the bound element.

```ts
const vMaskInput: ObjectDirective<HTMLElement, VueMaskBinding>
```

In `<script setup>`, importing a binding named `vMaskInput` is enough. Vue resolves any `vFoo` variable to the `v-foo` directive, so there is no registration step and no plugin.

```vue
<script setup>
import { vMaskInput } from 'use-mask-input/vue';
</script>

<template>
  <input v-mask-input="'cpf'" />
</template>
```

For the Options API or global registration:

```ts
import { createApp } from 'vue';
import { vMaskInput } from 'use-mask-input/vue';

createApp(App).directive('mask-input', vMaskInput);
```

**Binding value**

| Form | Example | Meaning |
|------|---------|---------|
| `string` | `v-mask-input="'cpf'"` | An alias or a raw pattern. |
| `string[]` | `v-mask-input="['999-999', '999-999-999']"` | Several patterns; the engine picks the one that fits. |
| `object` | `v-mask-input="{ mask: 'currency', options: { prefix: 'R$ ' } }"` | A mask plus options. |
| `null` | `v-mask-input="null"` | No mask is applied. |

User options always take precedence over an alias's defaults, and the rest of the alias survives the merge.

**Lifecycle**

| Hook | Behaviour |
|------|-----------|
| `mounted` | Resolves the target element and applies the mask. |
| `updated` | Re-applies only when the mask or options actually changed, compared structurally. An unrelated re-render leaves the value and caret alone. |
| `unmounted` | Calls `el.inputmask.remove()`, so no listeners outlive the element. |
| `getSSRProps` | Returns `{}`, so server rendering emits no unhandled-directive warning. |

**Works with `v-model`**

Inputmask replaces the element's `value` property with its own accessor, so `v-model` reads and writes through the engine rather than around it. No adapter is needed, and directive order does not matter.

```vue
<input v-model="cpf" v-mask-input="{ mask: 'cpf', options: { autoUnmask: true } }" />
```

With `autoUnmask: true` the bound value is `12345678901` while the input displays `123.456.789-01`. Without it, the bound value is the masked string.

### useMaskInput (Vue)

Composable form, for imperative reads and for a ref you can hold.

```ts
function useMaskInput(mask: Mask, options?: Options): {
  maskRef: (target: MaskRefTarget) => void;
  unmaskedValue: () => string;
}
```

**Parameters**

| Name | Type | Required | Description |
|------|------|:--------:|-------------|
| `mask` | `Mask` | Yes | The mask pattern or alias. |
| `options` | `Options` | No | Inputmask configuration options. |

**Returns**

| Name | Type | Description |
|------|------|-------------|
| `maskRef` | `(target) => void` | Ref callback. Bind with `:ref="maskRef"`. |
| `unmaskedValue` | `() => string` | The current raw value, or `''` before mount. |

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

`unmaskedValue()` is **not reactive**. Calling it in a template renders once and never updates, because reading the DOM registers no reactive dependency. Use it from event handlers; for a value the template tracks, use `v-model` with `autoUnmask`.

The directive already covers wrapper components, so reach for the composable when you specifically need `unmaskedValue()` or an imperative handle.

### Vue element resolution

Both surfaces resolve the element the mask should land on:

| Target | Resolution |
|--------|-----------|
| A native `<input>` or `<textarea>` | Used directly. |
| A wrapper element | Searched with `querySelector('input, textarea')`. |
| A component instance (from `:ref`) | Unwrapped via `$el`, then searched. |
| A fragment-root component | Not supported; resolves to `null`. Vue warns about this case for directives too. |

This is what makes PrimeVue, Element Plus and Ant Design Vue work without a dedicated adapter.

### Vue caveats

| Caveat | Detail |
|--------|--------|
| `unmaskedValue()` is not reactive | Use it in handlers, not in templates. |
| `noValuePatching: true` is unsupported | It disables the `value` accessor the `v-model` integration depends on. |
| Options are compared shallowly | Replace the options object rather than mutating it in place. |

---

## Utilities

`formatWithMask` and `unformatWithMask` work directly on plain values, with no DOM element required. Use them to format data for display (e.g. rendering a persisted value) or to sanitize data before sending it to the backend.

### formatWithMask

Formats a raw value using the given mask.

```ts
function formatWithMask(
  value: string,
  mask: Mask,
  options?: Options
): string
```

**Parameters**

| Name | Type | Required | Description |
|------|------|:--------:|-------------|
| `value` | `string` | Yes | The raw value to format. |
| `mask` | `Mask` | Yes | The mask pattern or alias. |
| `options` | `Options` | No | Inputmask configuration options. |

**Returns**

The formatted (masked) value.

**Example**

```ts
import { formatWithMask } from 'use-mask-input';

formatWithMask('12345678900', 'cpf'); // '123.456.789-00'
formatWithMask('999999', '999-999'); // '999-999'
```

---

### unformatWithMask

Removes the mask from a formatted value, returning the raw underlying value.

```ts
function unformatWithMask(
  value: string,
  mask: Mask,
  options?: Options
): string
```

**Parameters**

| Name | Type | Required | Description |
|------|------|:--------:|-------------|
| `value` | `string` | Yes | The masked value to unformat. |
| `mask` | `Mask` | Yes | The mask pattern or alias. |
| `options` | `Options` | No | Inputmask configuration options. |

**Returns**

The raw, unmasked value.

**Example**

```ts
import { unformatWithMask } from 'use-mask-input';

unformatWithMask('123.456.789-00', 'cpf'); // '12345678900'
```

---

## Types

### Mask

```ts
type Mask =
  | 'datetime' | 'email' | 'numeric' | 'currency'
  | 'decimal' | 'integer' | 'percentage' | 'url'
  | 'ip' | 'mac' | 'ssn' | 'brl-currency'
  | 'cpf' | 'cnpj' | 'br-bank-account' | 'br-bank-agency'
  | (string & {})       // custom pattern like '999-999'
  | (string[] & {})     // dynamic mask array
  | null;               // no mask
```

### VueMaskBinding

Everything the `v-mask-input` directive accepts.

```ts
type VueMaskBinding = Mask | { mask: Mask; options?: Options };
```

### MaskRefTarget

What Vue hands a `:ref` callback: a DOM element for a native tag, or the component's public instance for a component.

```ts
type MaskRefTarget = Element | { $el?: unknown } | null;
```

### Options

Inputmask configuration options. Commonly used:

| Option | Type | Description |
|--------|------|-------------|
| `placeholder` | `string` | Placeholder character for unfilled positions (default `_`). |
| `autoUnmask` | `boolean` | If `true`, `value` returns unmasked data. |
| `prefix` | `string` | Text prepended to the input. |
| `suffix` | `string` | Text appended to the input. |
| `radixPoint` | `string` | Decimal separator character. |
| `groupSeparator` | `string` | Thousands separator character. |
| `digits` | `number` | Number of decimal digits. |
| `rightAlign` | `boolean` | Align input text to the right. |
| `inputFormat` | `string` | Date input format (for `datetime` alias). |
| `outputFormat` | `string` | Date output format (for `datetime` alias). |
| `min` | `number` | Minimum allowed value (numeric aliases). |
| `max` | `number` | Maximum allowed value (numeric aliases). |

For the complete list, see the [Inputmask documentation](https://robinherbots.github.io/Inputmask/).

### Input

```ts
type Input = HTMLInputElement | HTMLTextAreaElement | HTMLElement;
```

### TanStackFormInputProps

```ts
interface TanStackFormInputProps {
  name?: string;
  ref?: RefCallback<HTMLElement | null>;
  [key: string]: unknown;
}
```

### UseTanStackFormMaskReturn

```ts
type UseTanStackFormMaskReturn<T extends TanStackFormInputProps> =
  Omit<T, 'ref'> & {
    ref: RefCallback<HTMLElement | null>;
    prevRef: RefCallback<HTMLElement | null> | undefined;
  };
```
