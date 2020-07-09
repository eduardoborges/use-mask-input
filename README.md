# use-mask-input

✏️ A react Hook for build elegant input masks.

Compatible with React Hook Form

[![NPM](https://img.shields.io/npm/v/use-mask-input.svg)](https://www.npmjs.com/package/use-mask-input) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save use-mask-input
## or
yarn add use-mask-input
```

## Usage

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
