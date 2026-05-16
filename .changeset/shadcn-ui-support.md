---
"use-mask-input": minor
---

Add shadcn/ui support via `use-mask-input/shadcn` subpath export.

Introduces two dedicated hooks for shadcn/ui `Input` components, following the same pattern as the existing Ant Design integration:

- `useMaskInputShadcn` — applies masks to shadcn/ui Input (typed for `HTMLInputElement` ref)
- `useHookFormMaskShadcn` — wraps React Hook Form's `register` for use with shadcn/ui Input

**Usage:**

```tsx
import { useMaskInputShadcn, useHookFormMaskShadcn } from 'use-mask-input/shadcn';

// Standalone
const ref = useMaskInputShadcn({ mask: 'cpf' });
<Input ref={ref} />

// With React Hook Form
const registerWithMask = useHookFormMaskShadcn(register);
<Input {...registerWithMask('phone', 'phone')} />
```
