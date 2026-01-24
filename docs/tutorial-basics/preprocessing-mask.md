---
sidebar_position: 6
---

# Preprocessing Mask

Preprocessing masks allow you to define the mask as a function that can dynamically determine the mask pattern. This is useful when you need to sort multiple masks, retrieve mask definitions dynamically, or apply conditional logic based on the input.

## Basic Syntax

Pass a function that returns a valid mask definition:

```tsx
import { useMaskInput } from 'use-mask-input';

function DynamicInput() {
  const mask = useMaskInput({
    mask: function() {
      // Your logic here
      return ['[1-]AAA-999', '[1-]999-AAA'];
    },
  });

  return (
    <input
      type="text"
      ref={mask}
      placeholder="AAA-000"
    />
  );
}
```

## Common Examples

### Conditional Mask Based on Input Length

```tsx
function ConditionalInput() {
  const mask = useMaskInput({
    mask: function() {
      // Return different masks based on some condition
      const isLongFormat = true; // Your condition logic

      if (isLongFormat) {
        return '9999-9999-9999-9999';
      }
      return '9999-9999';
    },
  });

  return (
    <input
      type="text"
      ref={mask}
      placeholder="0000-0000"
    />
  );
}
```

### Sorted Multiple Masks

```tsx
function SortedMasksInput() {
  const mask = useMaskInput({
    mask: function() {
      // Sort masks by priority or complexity
      return [
        '9999-9999',      // Simple format first
        '99999-9999',     // Medium format
        '(99) 99999-9999', // Complex format last
      ];
    },
  });

  return (
    <input
      type="text"
      ref={mask}
      placeholder="0000-0000"
    />
  );
}
```

### Dynamic Mask from API

```tsx
function ApiBasedInput() {
  const [maskPattern, setMaskPattern] = useState('9999-9999');

  useEffect(() => {
    // Fetch mask pattern from API
    fetch('/api/mask-pattern')
      .then(res => res.json())
      .then(data => setMaskPattern(data.pattern));
  }, []);

  const mask = useMaskInput({
    mask: function() {
      return maskPattern;
    },
  });

  return (
    <input
      type="text"
      ref={mask}
      placeholder="0000-0000"
    />
  );
}
```

### Country-Based Phone Mask

```tsx
function CountryPhoneInput({ country }: { country: string }) {
  const mask = useMaskInput({
    mask: function() {
      const countryMasks: Record<string, string> = {
        'US': '(999) 999-9999',
        'BR': '(99) 99999-9999',
        'UK': '9999 999 999',
        'DE': '9999 9999999',
      };

      return countryMasks[country] || '9999-9999';
    },
  });

  return (
    <input
      type="tel"
      ref={mask}
      placeholder="0000-0000"
    />
  );
}
```

### User Preference Based Mask

```tsx
function UserPreferenceInput() {
  const userPreference = 'dashes'; // 'dashes' | 'spaces' | 'dots'

  const mask = useMaskInput({
    mask: function() {
      switch (userPreference) {
        case 'dashes':
          return '9999-9999-9999-9999';
        case 'spaces':
          return '9999 9999 9999 9999';
        case 'dots':
          return '9999.9999.9999.9999';
        default:
          return '9999999999999999';
      }
    },
  });

  return (
    <input
      type="text"
      ref={mask}
      placeholder="0000-0000-0000-0000"
    />
  );
}
```

### Complex Conditional Logic

```tsx
function ComplexConditionalInput() {
  const inputType = 'phone'; // 'phone' | 'email' | 'cpf'

  const mask = useMaskInput({
    mask: function() {
      if (inputType === 'phone') {
        return ['(99) 9999-9999', '(99) 99999-9999'];
      }
      if (inputType === 'email') {
        return '*{1,20}[.*{1,20}][.*{1,20}][.*{1,20}]@*{1,20}[.*{2,6}][.*{1,2}]';
      }
      if (inputType === 'cpf') {
        return '999.999.999-99';
      }
      return '9999-9999';
    },
  });

  return (
    <input
      type="text"
      ref={mask}
      placeholder="Enter value"
    />
  );
}
```

## Tips

- Use preprocessing masks when you need dynamic mask selection
- Perfect for country-specific formats or user preferences
- Can be combined with state management for reactive mask changes
- Useful when mask patterns need to be fetched from an API
- The function is called when the mask needs to be evaluated
