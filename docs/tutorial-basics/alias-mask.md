---
sidebar_position: 4
---

# Alias Mask

Alias masks provide pre-configured masks for common use cases like dates, currency, email, and more. They save you from writing complex mask patterns manually.

## Available Aliases

The library includes the following built-in aliases:

- `datetime` - Date and time formatting
- `email` - Email address validation
- `ip` - IP address (IPv4)
- `cpf` - Brazilian CPF (tax ID)
- `numeric` - Numeric input
- `currency` - Currency formatting
- `decimal` - Decimal numbers
- `integer` - Integer numbers
- `percentage` - Percentage values
- `url` - URL formatting
- `mac` - MAC address
- `ssn` - Social Security Number

## Basic Usage

Simply use the alias name as the mask:

```tsx
import { useMaskInput } from 'use-mask-input';

function DateInput() {
  const dateMask = useMaskInput({
    mask: 'datetime',
    options: {
      inputFormat: 'dd/mm/yyyy',
    },
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

## Common Examples

### Date and Time

```tsx
function DateTimeInput() {
  const dateTimeMask = useMaskInput({
    mask: 'datetime',
    options: {
      inputFormat: 'dd/mm/yyyy HH:MM',
      outputFormat: 'yyyy-mm-dd HH:MM',
    },
  });

  return (
    <input 
      type="text"
      ref={dateTimeMask}
      placeholder="DD/MM/YYYY HH:MM"
    />
  );
}
```

### Email

```tsx
function EmailInput() {
  const emailMask = useMaskInput({
    mask: 'email',
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

### Currency

```tsx
function CurrencyInput() {
  const currencyMask = useMaskInput({
    mask: 'currency',
    options: {
      prefix: 'R$ ',
      groupSeparator: '.',
      radixPoint: ',',
      digits: 2,
    },
  });

  return (
    <input 
      type="text"
      ref={currencyMask}
      placeholder="R$ 0,00"
    />
  );
}
```

### IP Address

```tsx
function IpAddressInput() {
  const ipMask = useMaskInput({
    mask: 'ip',
  });

  return (
    <input 
      type="text"
      ref={ipMask}
      placeholder="192.168.0.1"
    />
  );
}
```

### Brazilian CPF

```tsx
function CpfInput() {
  const cpfMask = useMaskInput({
    mask: 'cpf',
  });

  return (
    <input 
      type="text"
      ref={cpfMask}
      placeholder="000.000.000-00"
    />
  );
}
```

### Numeric Input

```tsx
function NumericInput() {
  const numericMask = useMaskInput({
    mask: 'numeric',
    options: {
      min: 0,
      max: 1000,
    },
  });

  return (
    <input 
      type="text"
      ref={numericMask}
      placeholder="0"
    />
  );
}
```

### Decimal Numbers

```tsx
function DecimalInput() {
  const decimalMask = useMaskInput({
    mask: 'decimal',
    options: {
      digits: 2,
      radixPoint: ',',
      groupSeparator: '.',
    },
  });

  return (
    <input 
      type="text"
      ref={decimalMask}
      placeholder="0,00"
    />
  );
}
```

### Percentage

```tsx
function PercentageInput() {
  const percentageMask = useMaskInput({
    mask: 'percentage',
    options: {
      digits: 2,
      suffix: ' %',
    },
  });

  return (
    <input 
      type="text"
      ref={percentageMask}
      placeholder="0,00 %"
    />
  );
}
```

### URL

```tsx
function UrlInput() {
  const urlMask = useMaskInput({
    mask: 'url',
  });

  return (
    <input 
      type="url"
      ref={urlMask}
      placeholder="https://example.com"
    />
  );
}
```

### MAC Address

```tsx
function MacAddressInput() {
  const macMask = useMaskInput({
    mask: 'mac',
  });

  return (
    <input 
      type="text"
      ref={macMask}
      placeholder="00:00:00:00:00:00"
    />
  );
}
```

## Tips

- Aliases provide a quick way to implement common input formats
- Most aliases accept additional options for customization
- Use aliases when you need standard formatting patterns
- Combine alias options with custom configurations for specific requirements
