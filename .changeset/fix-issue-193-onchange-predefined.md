---
"use-mask-input": patch
---

fix(react-hook-form): fire `onChange` on the first select-all + delete for predefined values

When a React Hook Form field had a predefined value, the mask was applied before RHF wrote that value onto the element, leaving Inputmask's internal buffer out of sync with the DOM. The first `Ctrl+A` + `Delete` was swallowed and did not trigger `onChange`. The RHF ref now runs before the mask is applied, so Inputmask is seeded with the current value and stays in sync from the start.
