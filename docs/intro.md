---
sidebar_position: 1
---

# Quick Start

<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  marginBottom: '2rem'
}}>
  <img
    src="https://img.shields.io/npm/v/use-mask-input"
    alt="npm version"
  />
  <img
    src="https://img.shields.io/bundlejs/size/use-mask-input?color=green-light"
    alt="bundle size"
  />
  <img
    src="https://img.shields.io/npm/dw/use-mask-input"
    alt="npm downloads"
  />
</div>

**use-mask-input** is a powerful and elegant React Hook for building input masks with a simple and intuitive API. Whether you need to format phone numbers, credit cards, dates, or any custom pattern, this library makes it effortless.

## Why use-mask-input?

### ✨ Simple & Intuitive API

Get started in seconds with a clean, straightforward API that feels natural to use.

```tsx
import { useMaskInput } from 'use-mask-input';

function App() {
  const phoneMask = useMaskInput({
    mask: '9999-9999',
  });

  return (
    <input
      type="text"
      ref={phoneMask}
      placeholder="0000-0000"
    />
  );
}
```

### 🎯 Framework Compatible

Works seamlessly with your favorite React form libraries:

- ✅ **React Hook Form** - Full compatibility with validation and error handling
- ✅ **React Final Form** - Perfect integration for complex forms
- ✅ **Next.js** - Server-side rendering support
- ✅ **Vanilla React** - Works great on its own too!

### 🚀 Powerful Features

- **Multiple Mask Types**: Static, optional, dynamic, alias, alternator, and preprocessing
- **TypeScript Support**: Full type definitions included
- **Lightweight**: Minimal bundle size impact
- **Flexible**: Works with refs, hooks, or HOCs
- **Well Tested**: Comprehensive test coverage

### 💎 Production Ready

Trusted by developers worldwide, with regular updates and active maintenance.

## Quick Start

Install the package:

```bash
npm install use-mask-input
```

Use it in your component:

```tsx
import { useMaskInput } from 'use-mask-input';

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

That's it! Your input now has a phone number mask applied automatically.

## What's Next?

- **[Static Mask](./tutorial-basics/static-mask)** - Learn about fixed pattern masks
- **[Optional Mask](./tutorial-basics/optional-mask)** - Discover masks with optional parts
- **[Dynamic Mask](./tutorial-basics/dynamic-mask)** - Explore variable-length masks
- **[Alias Mask](./tutorial-basics/alias-mask)** - Use pre-configured masks for common formats
- **[Alternator Mask](./tutorial-basics/alternator-mask)** - Learn about multiple mask patterns
- **[Preprocessing Mask](./tutorial-basics/preprocessing-mask)** - Create dynamic masks with functions

Ready to build beautiful, masked inputs? Let's get started! 🚀
