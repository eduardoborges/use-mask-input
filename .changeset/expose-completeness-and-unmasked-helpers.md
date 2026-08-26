---
"use-mask-input": minor
---

Add `isComplete()` next to `unmaskedValue()` on every hook and `with*` return (React and Vue), plus three standalone helpers: `isValidWithMask(value, mask)` for schema validators, `getUnmaskedValue(element)` for reading the raw value from `event.target`, and `isMaskComplete(element)`.

`useHookFormMaskAntd` now actually carries `unmaskedValue()` and `isComplete()`; its return type always promised them.
