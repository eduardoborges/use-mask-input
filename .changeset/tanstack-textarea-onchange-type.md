---
"use-mask-input": patch
---

Widen `TanStackFormInputProps.onChange`/`onBlur` to accept `HTMLTextAreaElement` in addition to `HTMLInputElement`.

`use-mask-input` supports masking `<textarea>` elements, but #184 pinned the TanStack Form `onChange`/`onBlur` event types to `ChangeEvent<HTMLInputElement>`/`FocusEvent<HTMLInputElement>` only. That broke consumers masking a `<textarea>` field who explicitly annotate their handler as `ChangeEvent<HTMLTextAreaElement>`, and mistyped the event for anyone relying on inline (unannotated) handlers rendering a `<textarea>`. The event types are now `ChangeEvent<HTMLInputElement | HTMLTextAreaElement>` / `FocusEvent<HTMLInputElement | HTMLTextAreaElement>`.
