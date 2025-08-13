<div align="center">
  <h1>🥸 use-mask-input</h1>
  <h4>A React Hook for building elegant and simple input masks.</h4>

  ![npm](https://img.shields.io/npm/v/use-mask-input) ![npm package minimized gzipped size (select exports)](https://img.shields.io/bundlejs/size/use-mask-input?color=green-light) ![npm](https://img.shields.io/npm/dw/use-mask-input)

</div>

## Features

- 🚀 **Lightweight** - Minimal bundle size with zero dependencies
- 🎯 **Flexible** - Support for custom patterns and predefined masks
- ⚡ **Fast** - Optimized performance with efficient masking algorithms
- 🔧 **Framework Agnostic** - Works with React, Vue, and vanilla JavaScript
- 🎨 **Customizable** - Easy to create custom mask patterns
- 🛡️ **TypeScript** - Full TypeScript support with type safety

## Installation

```bash
npm install use-mask-input
```

## Quick Start

### Vanilla JavaScript

```javascript
import { mask } from 'use-mask-input';

const input = document.querySelector('#my-input');
mask('999.999.999-99').bind(input);
```

### React

```jsx
import { mask } from 'use-mask-input/react';
import { useEffect, useRef } from 'react';

function MyComponent() {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      mask('999.999.999-99').bind(inputRef.current);
    }
  }, []);

  return <input ref={inputRef} />;
}
```

## Usage

### Basic Masking

```javascript
import { mask } from 'use-mask-input';

// Simple pattern
const cpfMask = mask('999.999.999-99');
cpfMask.bind(inputElement);

// Format a value
const formatted = cpfMask.format('12345678900');
console.log(formatted); // "123.456.789-00"
```

### Multiple Patterns

```javascript
// Support multiple patterns (e.g., CPF or CNPJ)
const cpfCnpjMask = mask(['999.999.999-99', '99.999.999/9999-99']);
cpfCnpjMask.bind(inputElement);
```

### Decimal Numbers

```javascript
// Decimal formatting with custom separators
const decimalMask = mask('[DECIMAL]', {
  decimal: {
    decimalSeparator: ',',
    thousandSeparator: '.',
  }
});
decimalMask.bind(inputElement);
```

### Predefined Masks

```javascript
import { presets } from 'use-mask-input';

// Brazilian CPF
mask(presets.CPF).bind(inputElement);

// Brazilian CNPJ
mask(presets.CNPJ).bind(inputElement);

// CPF or CNPJ (auto-detection)
mask(presets.CPF_CNPJ).bind(inputElement);

// Brazilian phone numbers (supports both formats)
mask(presets.PHONE).bind(inputElement);

// Currency formatting
mask(presets.CURRENCY, {
  decimal: {
    symbol: 'R$ ',
    decimalSeparator: ',',
    thousandSeparator: '.',
  }
}).bind(inputElement);

// Date format
mask(presets.DATE).bind(inputElement);

// Credit card
mask(presets.CREDIT_CARD).bind(inputElement);
```

### Individual Preset Imports

```javascript
import { CPF, CNPJ, PHONE, CURRENCY, DATE } from 'use-mask-input';

mask(CPF).bind(inputElement);
mask(CNPJ).bind(inputElement);
mask(PHONE).bind(inputElement);
mask(CURRENCY).bind(inputElement);
mask(DATE).bind(inputElement);
```

### React Integration

```jsx
import { withMask } from 'use-mask-input/react';

function MyForm() {
  return (
    <form>
      <input
        ref={withMask('999.999.999-99')}
        placeholder="Enter CPF"
      />
      <input
        ref={withMask('(99) 99999-9999')}
        placeholder="Enter phone"
      />
    </form>
  );
}
```

### React Hook Form Integration

```jsx
import { useForm } from 'react-hook-form';
import { mask } from 'use-mask-input/react';
import { useEffect, useRef } from 'react';

function MyForm() {
  const { register } = useForm();
  const cpfRef = useRef(null);

  useEffect(() => {
    if (cpfRef.current) {
      mask('999.999.999-99').bind(cpfRef.current);
    }
  }, []);

  return (
    <form>
      <input
        {...register('cpf')}
        ref={cpfRef}
        placeholder="Enter CPF"
      />
    </form>
  );
}
```

## API Reference

### `mask(pattern, options?)`

Creates a mask instance with the specified pattern.

**Parameters:**
- `pattern` (string | string[]): The mask pattern(s) to apply
- `options` (PatternOptions, optional): Configuration options

**Returns:**
- `format(value: string)`: Function to format a value according to the mask
- `bind(input: Input)`: Function to bind the mask to an input element

### Pattern Syntax

- `9`: Numeric digit (0-9)
- `A`: Alphabetic character (A-Z, a-z)
- `*`: Any character
- `[DECIMAL]`: Special pattern for decimal numbers

### Pattern Options

```typescript
type PatternOptions = {
  decimal: {
    symbol?: string;           // Currency symbol
    thousandSeparator?: string; // Thousand separator (default: ',')
    decimalSeparator?: string;  // Decimal separator (default: '.')
  }
}
```

## Available Presets

### Brazilian Documents
- `presets.CPF`: Brazilian CPF format (`999.999.999-99`)
- `presets.CNPJ`: Brazilian CNPJ format (`99.999.999/9999-99`)
- `presets.CPF_CNPJ`: Auto-detection between CPF and CNPJ

### Phone Numbers
- `presets.PHONE` / `presets.BR_PHONE`: Brazilian phone numbers (`(99) 9999-9999` or `(99) 99999-9999`)

### Numbers & Currency
- `presets.DECIMAL`: Decimal number formatting (`[DECIMAL]`)
- `presets.CURRENCY`: Currency formatting (`[DECIMAL]`)

### Common Formats
- `presets.DATE`: Date format (`99/99/9999`)
- `presets.TIME`: Time format (`99:99`)
- `presets.ZIP_CODE`: ZIP code format (`99999-999`)
- `presets.LICENSE_PLATE`: License plate format (`AAA-9999`)
- `presets.EMAIL`: Email format (`*******************`)

### Credit Card
- `presets.CREDIT_CARD`: Credit card number (`9999 9999 9999 9999`)
- `presets.CVV`: CVV code (`999`)
- `presets.EXPIRY`: Expiry date (`99/99`)

## Examples

### Phone Number Masking

```javascript
import { presets } from 'use-mask-input';

// Supports both 8-digit and 9-digit phone numbers
mask(presets.PHONE).bind(inputElement);
// Input: 11987654321 → Output: (11) 98765-4321
// Input: 1187654321 → Output: (11) 8765-4321
```

### Currency Masking

```javascript
import { presets } from 'use-mask-input';

// Brazilian currency format
mask(presets.CURRENCY, {
  decimal: {
    decimalSeparator: ',',
    thousandSeparator: '.',
  }
}).bind(inputElement);
// Input: 1234567.89 → Output: 1.234.567,89
```

### Using Presets vs Custom Patterns

```javascript
import { presets } from 'use-mask-input';

// Using presets
mask(presets.DATE).bind(inputElement);
// Input: 12345678 → Output: 12/34/5678

mask(presets.LICENSE_PLATE).bind(inputElement);
// Input: ABC1234 → Output: ABC-1234

// Custom patterns (still supported)
mask('99/99/9999').bind(inputElement);
mask('AAA-9999').bind(inputElement);
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [Eduardo Borges](https://github.com/eduardoborges)
