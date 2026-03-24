---
sidebar_position: 4
---

# TanStack Form Integration

`use-mask-input` supports TanStack Form through two APIs:

- `useTanStackFormMask` (hook, recommended)
- `withTanStackFormMask` (function, requires `React.memo`)

## Installation

```bash
npm install use-mask-input @tanstack/react-form
```

## useTanStackFormMask

`useTanStackFormMask` returns a helper that receives your TanStack input props and returns masked input props with a stable ref callback.

### Basic usage

```tsx
import { useForm } from '@tanstack/react-form';
import { useTanStackFormMask } from 'use-mask-input';

type FormValues = {
  phone: string;
};

function MyForm() {
  const maskField = useTanStackFormMask();
  const form = useForm({
    defaultValues: { phone: '' } as FormValues,
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

### With custom options

```tsx
const inputProps = maskField(
  'currency',
  {
    name: field.name,
    value: field.state.value,
    onBlur: field.handleBlur,
    onChange: (event) => field.handleChange(event.target.value),
  },
  {
    prefix: '$ ',
    groupSeparator: ',',
    digits: 2,
    rightAlign: false,
  },
);
```

## withTanStackFormMask

`withTanStackFormMask` is the function version. Use it when the input props object is already available and you want to apply the mask at that point.

Because this is not a hook, make sure the component is memoized when needed.

```tsx
import { memo } from 'react';
import { withTanStackFormMask } from 'use-mask-input';

const MaskedField = memo(function MaskedField({
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

## API signatures

```ts
function useTanStackFormMask(): <T extends TanStackFormInputProps>(
  mask: Mask,
  inputProps: T,
  options?: Options
) => UseTanStackFormMaskReturn<T>
```

```ts
function withTanStackFormMask<T extends TanStackFormInputProps>(
  inputProps: T,
  mask: Mask,
  options?: Options
): UseTanStackFormMaskReturn<T>
```

## Tips

- Prefer `useTanStackFormMask` for regular component usage.
- Keep passing `name`, `value`, `onBlur`, and `onChange` from `field`.
- Use alias masks like `email`, `currency`, `datetime`, and custom patterns like `(99) 99999-9999`.
