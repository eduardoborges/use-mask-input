---
"use-mask-input": patch
---

Improve TypeScript types around TanStack Form and the masked element.

- `TanStackFormInputProps` now declares `value`, `onChange`, and `onBlur`
  explicitly, so the inline `onChange: (event) => field.handleChange(event.target.value)`
  handler infers `event` as a `ChangeEvent<HTMLInputElement>` instead of an
  implicit `any` under `noImplicitAny` (fixes #183).
- Declare the `inputmask` instance property on `HTMLInputElement` and
  `HTMLTextAreaElement` so `unmaskedValue()` reads are fully typed.
