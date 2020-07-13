# use-mask-input

[![NPM](https://img.shields.io/npm/v/use-mask-input.svg)](https://www.npmjs.com/package/use-mask-input) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![Bundle Size](https://badgen.net/bundlephobia/minzip/use-mask-input)](https://bundlephobia.com/result?p=use-mask-input)

A React Hook for build elegant input masks.

## Todo

- [ ] Enhance bundle sizes
- [ ] Make tests :P
- [ ] Better example page with GH pages


## Features

- ✨  Compatible with [React Hook Form](https://github.com/react-hook-form/react-hook-form)
- 🎯  No complex API

## Install

```bash
npm install --save use-mask-input
## or
yarn add use-mask-input
```

## Quickstart

```tsx
import React from 'react'
import useMaskInput from 'use-mask-input';

const App = () => {
  const ref = useMaskInput({
    mask: ['999-999', '999-9999']
  })

  return (
    <input type="text" ref={ref} />
  )
}
```

## Usage with React Hook Forms

```tsx
import React from 'react'
import useMaskInput from 'use-mask-input';
import { useForm } from 'react-hook-form';

const App = () => {
  const { register, handleSubmit, errors } = useForm();

  const onSubmit = (data) => {
    console.log(data);
  };

  const maskedPhoneRef = useMaskInput({
    mask: ['(99) 9999 9999', '(99) 9 9999 9999'],
    register: register,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input name="phone" ref={maskedPhoneRef} /> {/* register an input */}
      <input type="submit" />
    </form>
  )
}
```

## License

MIT © [eduardoborges](https://github.com/eduardoborges)
