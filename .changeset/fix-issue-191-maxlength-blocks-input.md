---
"use-mask-input": patch
---

fix: stop `maxLength` from blocking input on masked fields

A mask like `999.999.999-99` keeps its literals and placeholder in the input's
value, so `maxlength` counted characters nobody typed. The browser refused
keystrokes, and inputmask copied the attribute into a validator that rejects any
buffer longer than it. Any `maxLength` at or below the masked length rejected
every keystroke, and larger values silently truncated.

The attribute is now removed before the mask is applied, but only for masks that
render characters on their own. Open-ended masks such as `numeric`, `integer`
and `decimal` render nothing while empty, so their `maxLength` still caps
exactly what it says it caps and is left untouched.

Closes #191
