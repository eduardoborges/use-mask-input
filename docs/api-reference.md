---
sidebar_position: 2
---

# API Reference

**use-mask-input** exports four main APIs and two Ant Design-specific hooks. Choose the one that fits your use case:

| API | Type | React Hook Form | Ant Design | Needs `memo`? |
|-----|------|:---------------:|:----------:|:-------------:|
| [`useMaskInput`](#usemaskinput) | Hook | - | - | No |
| [`useHookFormMask`](#usehookformmask) | Hook | Yes | - | No |
| [`withMask`](#withmask) | Function | - | - | **Yes** |
| [`withHookFormMask`](#withhookformmask) | Function | Yes | - | **Yes** |
| [`useMaskInputAntd`](#usemaskinputantd) | Hook | - | Yes | No |
| [`useHookFormMaskAntd`](#usehookformmaskantd) | Hook | Yes | Yes | No |

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

**Example**

```tsx
import { Input } from 'antd';
import { useMaskInputAntd } from 'use-mask-input/antd';

function CPFInput() {
  const maskRef = useMaskInputAntd({ mask: 'cpf' });
  return <Input ref={maskRef} placeholder="000.000.000-00" />;
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

## Types

### Mask

```ts
type Mask =
  | 'datetime' | 'email' | 'numeric' | 'currency'
  | 'decimal' | 'integer' | 'percentage' | 'url'
  | 'ip' | 'mac' | 'ssn' | 'brl-currency'
  | 'cpf' | 'cnpj'
  | (string & {})       // custom pattern like '999-999'
  | (string[] & {})     // dynamic mask array
  | null;               // no mask
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
