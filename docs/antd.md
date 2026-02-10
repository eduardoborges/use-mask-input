---
sidebar_position: 2
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

### useMaskInputAntd

```tsx
function useMaskInputAntd(props: {
  mask: Mask;
  register?: (element: HTMLElement) => void;
  options?: Options;
}): (input: InputRef | null) => void
```

**Parameters:**

- `mask` - The mask pattern to apply (string, array, or alias)
- `register` - Optional callback that receives the resolved HTML element
- `options` - Optional mask configuration options

**Returns:**

A ref callback function that accepts Ant Design's `InputRef` and applies the mask to the underlying input element.

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

**Parameters:**

- `registerFn` - The register function from React Hook Form's `useForm` hook

**Returns:**

A function that registers a field with mask support, compatible with Ant Design's `Input` component.

## Differences from Standard Hooks

The Ant Design hooks differ from the standard hooks in the following ways:

1. **InputRef Handling**: Automatically handles Ant Design's `InputRef` structure, which wraps the actual input element
2. **Type Safety**: Provides TypeScript types specifically for Ant Design components
3. **Seamless Integration**: Works directly with Ant Design's `Input` component without additional configuration

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
