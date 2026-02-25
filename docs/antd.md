---
sidebar_position: 3
---

# Ant Design Integration

**use-mask-input** provides dedicated hooks for seamless integration with Ant Design components. These hooks handle Ant Design's `InputRef` structure automatically, making it easy to add masks to your Ant Design forms.

## Installation

Make sure you have both `use-mask-input` and `antd` installed:

```bash
npm install use-mask-input antd
```

## useMaskInputAntd

The `useMaskInputAntd` hook is specifically designed for Ant Design's `Input` component. It handles the `InputRef` structure automatically.

### Basic Usage

```tsx
import { Input } from 'antd';
import { useMaskInputAntd } from 'use-mask-input/antd';

function PhoneInput() {
  const maskRef = useMaskInputAntd({
    mask: 'phone',
  });

  return (
    <Input
      ref={maskRef}
      placeholder="(555) 123-4567"
    />
  );
}
```

### With Options

```tsx
import { Input } from 'antd';
import { useMaskInputAntd } from 'use-mask-input/antd';

function CPFInput() {
  const maskRef = useMaskInputAntd({
    mask: 'cpf',
    options: {
      placeholder: '___.___.___-__',
    },
  });

  return (
    <Input
      ref={maskRef}
      placeholder="000.000.000-00"
    />
  );
}
```

### With Register Callback

You can also use a register callback to integrate with form libraries:

```tsx
import { Input } from 'antd';
import { useMaskInputAntd } from 'use-mask-input/antd';

function FormInput() {
  const maskRef = useMaskInputAntd({
    mask: '9999-9999',
    register: (element) => {
      // Do something with the element
      console.log('Input element:', element);
    },
  });

  return (
    <Input
      ref={maskRef}
      placeholder="0000-0000"
    />
  );
}
```

### With Ant Design Form (Form.Item + name)

`useMaskInputAntd` works with Ant Design's native `Form` component. Use `Form.Item` with `name` to let the form manage value and validation automatically:

```tsx
import { Button, Form, Input } from 'antd';
import { useMaskInputAntd } from 'use-mask-input/antd';

function AntdFormExample() {
  const [form] = Form.useForm();

  const phoneMaskRef = useMaskInputAntd({
    mask: '(999) 999-9999',
  });

  const cpfMaskRef = useMaskInputAntd({
    mask: 'cpf',
  });

  const currencyMaskRef = useMaskInputAntd({
    mask: 'currency',
    options: {
      prefix: '$ ',
      radixPoint: '.',
      digits: 2,
      groupSeparator: ',',
      rightAlign: false,
    },
  });

  const onFinish = (values: Record<string, string>) => {
    console.log('Form values:', values);
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item
        name="phone"
        label="Phone"
        rules={[{ required: true, message: 'Phone is required' }]}
      >
        <Input ref={phoneMaskRef} placeholder="(555) 123-4567" />
      </Form.Item>

      <Form.Item
        name="cpf"
        label="CPF"
        rules={[{ required: true, message: 'CPF is required' }]}
      >
        <Input ref={cpfMaskRef} placeholder="000.000.000-00" />
      </Form.Item>

      <Form.Item name="amount" label="Amount">
        <Input ref={currencyMaskRef} placeholder="$ 0.00" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
}
```

#### Watching form values

Use `Form.useWatch` to observe masked values in real time:

```tsx
import { Form, Input, Typography } from 'antd';
import { useMaskInputAntd } from 'use-mask-input/antd';

function WatchExample() {
  const [form] = Form.useForm();
  const values = Form.useWatch([], form);

  const maskRef = useMaskInputAntd({ mask: 'cpf' });

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="cpf" label="CPF">
        <Input ref={maskRef} />
      </Form.Item>
      <Typography.Text code>
        Current value: {values?.cpf}
      </Typography.Text>
    </Form>
  );
}
```

#### Submitting and accessing values

Call `form.getFieldsValue()` or use the `onFinish` callback to get the form values. The values reflect what Inputmask writes to the DOM (masked by default, or unmasked if `autoUnmask: true` is set in options).

## useHookFormMaskAntd

The `useHookFormMaskAntd` hook combines React Hook Form with Ant Design, providing a seamless way to register masked inputs.

### Basic Usage with React Hook Form

```tsx
import { Input } from 'antd';
import { useForm } from 'react-hook-form';
import { useHookFormMaskAntd } from 'use-mask-input/antd';

interface FormData {
  phone: string;
  email: string;
}

function MyForm() {
  const { register, handleSubmit } = useForm<FormData>();
  const registerWithMask = useHookFormMaskAntd(register);

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...registerWithMask('phone', 'phone')}
        placeholder="(555) 123-4567"
      />
      <Input
        {...register('email')}
        placeholder="email@example.com"
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### With Validation

You can combine masks with React Hook Form validation:

```tsx
import { Input } from 'antd';
import { useForm } from 'react-hook-form';
import { useHookFormMaskAntd } from 'use-mask-input/antd';

interface FormData {
  phone: string;
  cpf: string;
}

function ValidatedForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const registerWithMask = useHookFormMaskAntd(register);

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <Input
          {...registerWithMask('phone', 'phone', {
            required: 'Phone number is required',
            minLength: {
              value: 14,
              message: 'Please enter a valid phone number',
            },
          })}
          placeholder="(555) 123-4567"
        />
        {errors.phone && <span>{errors.phone.message}</span>}
      </div>

      <div>
        <Input
          {...registerWithMask('cpf', 'cpf', {
            required: 'CPF is required',
          })}
          placeholder="000.000.000-00"
        />
        {errors.cpf && <span>{errors.cpf.message}</span>}
      </div>

      <button type="submit">Submit</button>
    </form>
  );
}
```

### With Ant Design Form

You can also use it with Ant Design's Form component:

```tsx
import { Form, Input, Button } from 'antd';
import { useForm } from 'react-hook-form';
import { useHookFormMaskAntd } from 'use-mask-input/antd';

function AntdForm() {
  const { register, handleSubmit } = useForm();
  const registerWithMask = useHookFormMaskAntd(register);

  const onSubmit = (data: any) => {
    console.log(data);
  };

  return (
    <Form onFinish={handleSubmit(onSubmit)}>
      <Form.Item label="Phone">
        <Input
          {...registerWithMask('phone', 'phone')}
          placeholder="(555) 123-4567"
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
}
```

## API Reference

For full API documentation of all exports (including standard hooks, higher-order functions, and types), see the **[API Reference](./api-reference)** page.

Below is a quick reference for the Ant Design-specific hooks.

### useMaskInputAntd

```tsx
function useMaskInputAntd(props: {
  mask: Mask;
  register?: (element: HTMLElement) => void;
  options?: Options;
}): (input: InputRef | null) => void
```

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `mask` | `Mask` | Yes | The mask pattern, alias, or array of patterns. |
| `register` | `(element: HTMLElement) => void` | No | Callback that receives the resolved DOM element. |
| `options` | `Options` | No | Inputmask configuration options (placeholder, autoUnmask, etc.). |

**Returns** a stable ref callback that accepts Ant Design's `InputRef` and applies the mask to the underlying input element. Uses `useCallback` internally, so no need for `React.memo`.

### useHookFormMaskAntd

```tsx
function useHookFormMaskAntd<T extends FieldValues>(
  registerFn: UseFormRegister<T>
): (
  fieldName: Path<T>,
  mask: Mask,
  options?: RegisterOptions & Options
) => UseHookFormMaskAntdReturn<T>
```

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `registerFn` | `UseFormRegister<T>` | Yes | The `register` function returned by `useForm()`. |

**Returns** a function with the signature `(fieldName, mask, options?)` that returns an object you spread onto Ant Design's `Input`. Uses `useMemo` internally, so no need for `React.memo`.

## Differences from Standard Hooks

The Ant Design hooks differ from the standard hooks in the following ways:

1. **InputRef Handling**: Automatically unwraps Ant Design's `InputRef` structure (which wraps the actual `<input>` element) before applying the mask
2. **Type Safety**: Ref callbacks accept `InputRef | null` instead of `HTMLElement | null`, so TypeScript works out of the box with `<Input ref={...} />`
3. **Same Stability Guarantees**: Both Ant Design hooks use `useCallback` / `useMemo` internally, just like their standard counterparts. No `React.memo` needed

## Examples

### Phone Number Input

```tsx
import { Input } from 'antd';
import { useMaskInputAntd } from 'use-mask-input/antd';

function PhoneInput() {
  const maskRef = useMaskInputAntd({ mask: 'phone' });
  return <Input ref={maskRef} placeholder="(555) 123-4567" />;
}
```

### CPF Input (Brazilian ID)

```tsx
import { Input } from 'antd';
import { useMaskInputAntd } from 'use-mask-input/antd';

function CPFInput() {
  const maskRef = useMaskInputAntd({ mask: 'cpf' });
  return <Input ref={maskRef} placeholder="000.000.000-00" />;
}
```

### Credit Card Input

```tsx
import { Input } from 'antd';
import { useMaskInputAntd } from 'use-mask-input/antd';

function CreditCardInput() {
  const maskRef = useMaskInputAntd({
    mask: '9999 9999 9999 9999',
  });
  return <Input ref={maskRef} placeholder="0000 0000 0000 0000" />;
}
```

## Next Steps

- Explore [mask types](./tutorial-basics/static-mask)
- Check out [all available aliases](./tutorial-basics/alias-mask)
- Learn about [optional masks](./tutorial-basics/optional-mask)
- Discover [dynamic masks](./tutorial-basics/dynamic-mask)
