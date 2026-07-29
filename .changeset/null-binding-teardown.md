---
"use-mask-input": patch
---

Vue: binding `null` to `v-mask-input` now removes a mask that is already on the element.

The binding is reactive, so `v-mask-input="enabled ? 'cpf' : null"` reads as a toggle. Previously switching it off left the previous Inputmask instance attached and the field kept formatting.
