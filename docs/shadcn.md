---
sidebar_position: 5
---

# shadcn/ui Integration

**use-mask-input** works out of the box with [shadcn/ui](https://ui.shadcn.com/). No dedicated integration is needed.

shadcn/ui's `Input` component is a thin `React.forwardRef` wrapper around a native `<input>` element, so it exposes an `HTMLInputElement` ref directly — the same type the base hooks already handle.

## Installation

```bash
npm install use-mask-input
```

## useMaskInput

Use `useMaskInput` when you don't need React Hook Form, or when you need to control the ref directly (e.g. inside a `FormField` with `useController`).

```tsx
import { useMaskInput } from 'use-mask-input';
import { Input } from '@/components/ui/input';

function CepField() {
  const ref = useMaskInput({ mask: '99999-999' });

  return <Input ref={ref} placeholder="00000-000" />;
}
```

### With `useController` (shadcn/ui FormField pattern)

```tsx
import { useController } from 'react-hook-form';
import { useMaskInput } from 'use-mask-input';
import { Input } from '@/components/ui/input';
import { FormItem, FormLabel, FormControl } from '@/components/ui/form';

function PhoneField({ control }: { control: Control<FormValues> }) {
  const { field } = useController({ control, name: 'phone' });
  const ref = useMaskInput({ mask: '(99) 99999-9999' });

  return (
    <FormItem>
      <FormLabel>Telefone</FormLabel>
      <FormControl>
        <Input {...field} ref={ref} placeholder="(00) 00000-0000" />
      </FormControl>
    </FormItem>
  );
}
```

> **Note:** When you spread `{...field}` and also pass `ref={ref}`, React will use the last ref. Use this pattern only when you don't need React Hook Form to track focus via ref — for full RHF integration, prefer `useHookFormMask` with `register` instead.

## useHookFormMask

`useHookFormMask` wraps React Hook Form's `register` function and returns a full registration object — including a merged ref that applies the mask and registers the field at the same time.

```tsx
import { useForm } from 'react-hook-form';
import { useHookFormMask } from 'use-mask-input';
import { Input } from '@/components/ui/input';

interface FormValues {
  cpf: string;
  phone: string;
  cep: string;
}

function MyForm() {
  const { register, handleSubmit } = useForm<FormValues>();
  const registerWithMask = useHookFormMask(register);

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <Input
        {...registerWithMask('cpf', 'cpf')}
        placeholder="000.000.000-00"
      />

      <Input
        {...registerWithMask('phone', '(99) 99999-9999')}
        placeholder="(00) 00000-0000"
      />

      <Input
        {...registerWithMask('cep', '99999-999')}
        placeholder="00000-000"
      />

      <button type="submit">Enviar</button>
    </form>
  );
}
```

### With validation (Zod + react-hook-form)

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useHookFormMask } from 'use-mask-input';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';

const schema = z.object({
  cpf: z.string().min(14, 'CPF inválido'),
  phone: z.string().min(15, 'Telefone inválido'),
});

type FormValues = z.infer<typeof schema>;

function ContactForm() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const registerWithMask = useHookFormMask(form.register);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(console.log)} className="space-y-4">
        <FormField
          control={form.control}
          name="cpf"
          render={() => (
            <FormItem>
              <FormLabel>CPF</FormLabel>
              <FormControl>
                <Input
                  {...registerWithMask('cpf', 'cpf')}
                  placeholder="000.000.000-00"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={() => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input
                  {...registerWithMask('phone', '(99) 99999-9999')}
                  placeholder="(00) 00000-0000"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <button type="submit">Enviar</button>
      </form>
    </Form>
  );
}
```

## Unmasked value

Both hooks expose `unmaskedValue()` on the ref to read the raw digits without formatting characters:

```tsx
const ref = useMaskInput({ mask: 'cpf' });

// after the user types 123.456.789-09
ref.unmaskedValue(); // "12345678909"
```

## Why no dedicated integration?

Unlike Ant Design — which wraps the native input inside a custom `InputRef` object that needs special resolution — shadcn/ui's `Input` passes refs directly to the underlying `<input>` element. The base hooks already accept `HTMLInputElement`, so everything works without any adapter layer.

| Library    | Ref type          | Needs dedicated hook? |
|------------|-------------------|-----------------------|
| shadcn/ui  | `HTMLInputElement` | No                   |
| Ant Design | `InputRef`         | Yes (`use-mask-input/antd`) |
