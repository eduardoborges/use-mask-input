---
sidebar_position: 5
---

# Alternator Mask

Alternator masks allow you to define multiple mask patterns, where the input can match any one of them. This is like an OR condition - the mask can be one of several choices.

## Basic Syntax

Use the pipe character `|` to separate alternator options:

```tsx
import { useMaskInput } from 'use-mask-input';

function PhoneInput() {
  const phoneMask = useMaskInput({
    mask: '9999-9999|99999-9999',
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

This mask accepts both:
- `1234-5678` (8 digits)
- `12345-6789` (9 digits)

## Using Arrays

You can also pass an array of masks instead of using the pipe syntax:

```tsx
function PhoneInput() {
  const phoneMask = useMaskInput({
    mask: ['9999-9999', '99999-9999'],
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

## Common Examples

### Phone Numbers (Landline vs Mobile)

```tsx
function PhoneInput() {
  const phoneMask = useMaskInput({
    mask: '(99) 9999-9999|(99) 99999-9999',
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

Accepts both landline (8 digits) and mobile (9 digits) formats.

### Credit Card Types

```tsx
function CreditCardInput() {
  const cardMask = useMaskInput({
    mask: [
      '9999 9999 9999 9999',  // Visa, Mastercard
      '9999 999999 99999',     // Amex
    ],
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

### Date Formats

```tsx
function DateInput() {
  const dateMask = useMaskInput({
    mask: '99/99/9999|99-99-9999|99.99.9999',
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

Accepts dates with `/`, `-`, or `.` separators.

### License Plates (Different Formats)

```tsx
function LicensePlateInput() {
  const plateMask = useMaskInput({
    mask: [
      'AAA-9999',  // Old format
      'AAA9A99',   // New format (Mercosul)
    ],
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

### Mixed Patterns

```tsx
function MixedInput() {
  const mixedMask = useMaskInput({
    mask: '(aaa)|(999)|(9AA)',
  });

  return (
    <input
      type="text"
      ref={mixedMask}
      placeholder="ABC or 123 or 1AB"
    />
  );
}
```

Accepts:
- `ABC` (three letters)
- `123` (three digits)
- `1AB` (digit + two letters)

### Complex Alternator

```tsx
function ComplexInput() {
  const complexMask = useMaskInput({
    mask: 'aaaa|9999|9AA9',
  });

  return (
    <input
      type="text"
      ref={complexMask}
      placeholder="AAAA or 0000 or 0AA0"
    />
  );
}
```

## Tips

- Use alternator masks when you need to support multiple input formats
- Arrays are cleaner for complex alternators with many options
- The mask automatically detects which pattern matches the input
- Alternator masks are perfect for phone numbers, dates, and IDs with multiple formats
