---
sidebar_position: 3
---

# Dynamic Mask

Dynamic masks allow the mask pattern to change or repeat during input. This is useful for inputs where the length or pattern can vary, like email addresses or variable-length numbers.

## Basic Syntax

Use curly braces `{ }` to define dynamic parts:

- `{n}` - Exactly n repetitions
- `{n|j}` - n repetitions with jit masking
- `{n,m}` - From n to m repetitions
- `{n,m|j}` - From n to m repetitions with jit masking
- `{+}` - One or more repetitions (starts from 1)
- `{}` - Zero or more repetitions (starts from 0)

## Common Examples

### Fixed Repetition

```tsx
import { useMaskInput } from 'use-mask-input';

function FixedLengthInput() {
  const mask = useMaskInput({
    mask: 'aa-9{4}',
  });

  return (
    <input 
      type="text"
      ref={mask}
      placeholder="AA-0000"
    />
  );
}
```

This mask requires exactly 4 digits after the letters.

### Variable Length

```tsx
function VariableLengthInput() {
  const mask = useMaskInput({
    mask: '9{1,10}',
  });

  return (
    <input 
      type="text"
      ref={mask}
      placeholder="0"
    />
  );
}
```

Accepts 1 to 10 digits.

### Email Address

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

This creates a flexible email mask that accepts:
- Local part: 1-20 alphanumeric characters
- Optional subdomains: up to 3 levels
- Domain: 1-20 alphanumeric characters
- TLD: 2-6 characters with optional country code

### One or More Characters

```tsx
function OneOrMoreInput() {
  const mask = useMaskInput({
    mask: 'A{+}',
  });

  return (
    <input 
      type="text"
      ref={mask}
      placeholder="ABC"
    />
  );
}
```

Accepts one or more uppercase letters.

### Zero or More Characters

```tsx
function ZeroOrMoreInput() {
  const mask = useMaskInput({
    mask: '9{}',
  });

  return (
    <input 
      type="text"
      ref={mask}
      placeholder="123"
    />
  );
}
```

Accepts zero or more digits.

### Product Code

```tsx
function ProductCodeInput() {
  const mask = useMaskInput({
    mask: 'A{2}-9{4,8}',
  });

  return (
    <input 
      type="text"
      ref={mask}
      placeholder="AB-0000"
    />
  );
}
```

Requires 2 letters followed by 4 to 8 digits.

### Flexible ID

```tsx
function FlexibleIdInput() {
  const mask = useMaskInput({
    mask: 'ID-9{3,6}-A{1,3}',
  });

  return (
    <input 
      type="text"
      ref={mask}
      placeholder="ID-000-ABC"
    />
  );
}
```

Accepts:
- `ID-123-A`
- `ID-12345-ABC`
- `ID-123456-AB`

## JIT Masking

JIT (Just-In-Time) masking shows the mask only as the user types:

```tsx
function JitMaskInput() {
  const mask = useMaskInput({
    mask: '9{4|1}',
    options: {
      jitMasking: true,
    },
  });

  return (
    <input 
      type="text"
      ref={mask}
      placeholder="0"
    />
  );
}
```

## Tips

- Use dynamic masks for inputs with variable lengths
- Combine with optional sections for maximum flexibility
- JIT masking provides a better user experience for long inputs
- Dynamic masks are perfect for email, URLs, and flexible ID formats
