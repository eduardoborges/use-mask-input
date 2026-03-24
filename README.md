<div align="center">
  <h1>use-mask-input</h1>
  <p>Input masks for React. Simple, lightweight, and framework-friendly.</p>

  [![npm](https://img.shields.io/npm/v/use-mask-input)](https://www.npmjs.com/package/use-mask-input)
  [![npm downloads](https://img.shields.io/npm/dw/use-mask-input)](https://www.npmjs.com/package/use-mask-input)
  [![bundle size](https://img.shields.io/bundlejs/size/use-mask-input?color=green-light)](https://bundlejs.com/?q=use-mask-input)
  [![codecov](https://codecov.io/gh/eduardoborges/use-mask-input/branch/main/graph/badge.svg?token=8ORAOAUZTP)](https://codecov.io/gh/eduardoborges/use-mask-input)

  [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E71VQENQ)
</div>

---

**[Documentation](http://use-mask-input.eduardoborges.dev)** · **[API Reference](http://use-mask-input.eduardoborges.dev/api-reference)** · **[Sponsor](https://ko-fi.com/E1E71VQENQ)**

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

## Built-in Aliases

`cpf` · `cnpj` · `br-bank-account` · `br-bank-agency` · `currency` · `brl-currency` · `datetime` · `email` · `numeric` · `decimal` · `integer` · `percentage` · `url` · `ip` · `mac` · `ssn`

## Works With

- React Hook Form
- TanStack Form
- Ant Design
- React Final Form
- Next.js / SSR

## License

MIT
