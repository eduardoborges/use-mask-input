---
"use-mask-input": patch
---

fix: stop `maxLength` from blocking input on masked fields

A masked input holds the full mask placeholder as its value, so the browser
counted literals the user never typed against `maxlength` and refused
keystrokes. inputmask also copied the attribute into its own validator, which
rejected any buffer longer than it — and the buffer is always the whole mask.
Together they made any `maxLength` at or below the masked length reject every
keystroke, and larger values silently truncate.

The attribute is now removed before the mask is applied, so a `maxLength` left
on a masked field no longer breaks it.

Closes #191
