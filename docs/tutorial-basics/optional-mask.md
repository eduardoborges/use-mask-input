---
sidebar_position: 2
---

# Optional Mask

Optional masks allow certain parts of the mask to be optional. This is useful when you want to accept inputs with or without specific parts, like area codes in phone numbers.

## Basic Syntax

Use square brackets `[ ]` to define optional parts of the mask:

```tsx
import { useMaskInput } from 'use-mask-input';

function PhoneInput() {
  const phoneMask = useMaskInput({
    mask: '99 [9]9999-9999',
  });

  return (
    <input
      type="tel"
      ref={phoneMask}
      placeholder="(00) 99999-9999"
    />
  );
}
```

This mask will accept both:
- `(99) 99999-9999` (with area code)
- `(99) 9999-9999` (without area code)

## Common Examples

### Phone Number with Optional Area Code

```tsx
function PhoneInput() {
  const phoneMask = useMaskInput({
    mask: '[99] 9999-9999',
  });

  return (
    <input
      type="tel"
      ref={phoneMask}
      placeholder="00 0000-0000"
    />
  );
}
```

Users can type:
- `11 98765-4321` (with area code)
- `98765-4321` (without area code)

### Email with Optional Domain

```tsx
function EmailInput() {
  const emailMask = useMaskInput({
    mask: '*{1,20}[.*{1,20}][.*{1,20}][.*{1,20}]@*{1,20}[.*{2,6}][.*{1,2}]',
  });

  return (
    <input
      type="email"
      ref={emailMask}
      placeholder="user@example.com"
    />
  );
}
```

### Credit Card with Optional Spaces

```tsx
function CreditCardInput() {
  const cardMask = useMaskInput({
    mask: '9999[ 9999][ 9999][ 9999]',
  });

  return (
    <input
      type="text"
      ref={cardMask}
      placeholder="0000 0000 0000 0000"
    />
  );
}
```

### International Phone Number

```tsx
function InternationalPhoneInput() {
  const phoneMask = useMaskInput({
    mask: '[+99] [9]9999-9999',
  });

  return (
    <input
      type="tel"
      ref={phoneMask}
      placeholder="+00 00000-0000"
    />
  );
}
```

This accepts:
- `+55 1198765-4321` (with country code and area code)
- `55 1198765-4321` (without +)
- `1198765-4321` (without country code)

## Multiple Optional Sections

You can have multiple optional sections in a single mask:

```tsx
function FlexibleInput() {
  const flexibleMask = useMaskInput({
    mask: '[Prefix-]999[-Suffix]',
  });

  return (
    <input
      type="text"
      ref={flexibleMask}
      placeholder="Prefix-000-Suffix"
    />
  );
}
```

## Tips

- Optional sections are skipped when the user doesn't type the required characters
- Use optional masks when you want to support multiple input formats
- Combine optional sections with dynamic masks for maximum flexibility
- The optional marker characters `[` and `]` can be customized via options
