---
"use-mask-input": patch
---

Fix the `currency` alias dropping the integer part, so `1234.56` formatted as `$ .56`. The alias no longer sets an empty placeholder, which inputmask cannot handle when the number of decimals is fixed.
