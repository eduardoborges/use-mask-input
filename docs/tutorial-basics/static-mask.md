---
sidebar_position: 1
---

# Static Mask

Static masks are the foundation of input masking. They have a fixed pattern that doesn't change during user input. This is the simplest and most commonly used type of mask.

## Basic Usage

A static mask is defined as a string where each character represents a specific input pattern:

```tsx
import { useMaskInput } from 'use-mask-input';

function PhoneInput() {
  const phoneMask = useMaskInput({
    mask: '9999-9999',
  });

  return (
    <input 
      type="tel"
      ref={phoneMask}
      placeholder="0000-0000"
    />
  );
}
```

## Mask Definitions

The library uses special characters to define input patterns:

- `9` - Numeric digit (0-9)
- `a` - Alphabetic character (a-z, A-Z)
- `*` - Alphanumeric character (a-z, A-Z, 0-9)
- `A` - Uppercase alphabetic character
- `#` - Hexadecimal character (0-9, a-f, A-F)

## Common Examples

### Phone Number

```tsx
function PhoneInput() {
  const phoneMask = useMaskInput({
    mask: '(99) 99999-9999',
  });

  return (
    <input 
      type="tel"
      ref={phoneMask}
      placeholder="(00) 00000-0000"
    />
  );
}
```

### Date

```tsx
function DateInput() {
  const dateMask = useMaskInput({
    mask: '99/99/9999',
  });

  return (
    <input 
      type="text"
      ref={dateMask}
      placeholder="DD/MM/YYYY"
    />
  );
}
```

### Credit Card

```tsx
function CreditCardInput() {
  const cardMask = useMaskInput({
    mask: '9999 9999 9999 9999',
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

### License Plate (Brazil)

```tsx
function LicensePlateInput() {
  const plateMask = useMaskInput({
    mask: 'AAA-9999',
  });

  return (
    <input 
      type="text"
      ref={plateMask}
      placeholder="ABC-1234"
    />
  );
}
```

### ZIP Code

```tsx
function ZipCodeInput() {
  const zipMask = useMaskInput({
    mask: '99999-999',
  });

  return (
    <input 
      type="text"
      ref={zipMask}
      placeholder="00000-000"
    />
  );
}
```

## Custom Characters

You can also use literal characters in your mask. Any character that isn't a mask definition will be treated as a literal and displayed as-is:

```tsx
function CustomInput() {
  const customMask = useMaskInput({
    mask: 'ID: 999-AAA',
  });

  return (
    <input 
      type="text"
      ref={customMask}
      placeholder="ID: 000-ABC"
    />
  );
}
```

## Tips

- Static masks are perfect for fixed-format inputs like phone numbers, dates, and IDs
- Literal characters (like `-`, `(`, `)`, `/`) are automatically included in the mask
- The mask pattern is case-sensitive for alphabetic characters
- Use `A` for uppercase-only and `a` for case-insensitive alphabetic input
