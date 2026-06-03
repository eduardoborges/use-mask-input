# use-mask-input

Apply input masks in React with hooks compatible with React Hook Form, TanStack Form, and Ant Design.

## When to use

- Mask phone, CPF, currency, or custom patterns on `<input>` elements
- Integrate with `register()` from React Hook Form via `useHookFormMask`
- Use Ant Design `Input` via `use-mask-input/antd`

## Install

```bash
npm install use-mask-input
```

## Basic hook

```tsx
import { useMaskInput } from 'use-mask-input';

function PhoneInput() {
  const ref = useMaskInput({ mask: '(99) 99999-9999' });
  return <input ref={ref} />;
}
```

## Built-in aliases

Use string aliases instead of raw patterns: `cpf`, `cnpj`, `currency`, `datetime`, `email`, `numeric`, and others documented at https://use-mask-input.eduardoborges.dev/api-reference

## Machine-readable reference

- Summary: https://use-mask-input.eduardoborges.dev/llm.txt
- Full API: https://use-mask-input.eduardoborges.dev/llm-full.txt
