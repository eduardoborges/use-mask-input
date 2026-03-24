---
"use-mask-input": minor
---

feat: add Brazilian banking masks (br-bank-account and br-bank-agency)

Added two new mask aliases for Brazilian banking information:

- `br-bank-account`: Supports multiple Brazilian bank account formats including Bradesco, Itaú, Banco do Brasil, Caixa Econômica, Nubank, and more
- `br-bank-agency`: Handles Brazilian bank agency numbers with optional check digits

These masks automatically adapt to different account number formats used by major Brazilian banks, making it easier to handle banking data in forms.

Example usage:
```tsx
const accountMask = useMaskInput({ mask: 'br-bank-account' })
const agencyMask = useMaskInput({ mask: 'br-bank-agency' })
```
