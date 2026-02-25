<div align="center">
  <h1>🥸 use-mask-input</h1>
  <h4>A React Hook for building elegant and simple input masks.</h4>

  ![npm](https://img.shields.io/npm/v/use-mask-input) ![npm package minimized gzipped size (select exports)](https://img.shields.io/bundlejs/size/use-mask-input?color=green-light) ![npm](https://img.shields.io/npm/dw/use-mask-input) [![codecov](https://codecov.io/gh/eduardoborges/use-mask-input/branch/main/graph/badge.svg?token=8ORAOAUZTP)](https://codecov.io/gh/eduardoborges/use-mask-input)
</div>

## [Full Documentation](http://use-mask-input.eduardoborges.dev) | [Sponsor this project](https://github.com/eduardoborges?tab=sponsors)

## Features
- 🎯  Simple API
- 💎  Works like a charm with *Next.js*
- ✨  Compatible with [React Hook Form](https://github.com/react-hook-form/react-hook-form)
- 🏁  Compatible with [React Final Form](https://github.com/final-form/react-final-form)
## Install

```sh
npm i use-mask-input
```

## Quickstart

```jsx
import React from 'react'
import { useMaskInput } from 'use-mask-input';

const App = () => {
  return (
    <input type="text" ref={withMask('9999-9999')} />
  )
}
```

### Usage with React Hook Forms

```jsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { useHookFormMask } from 'use-mask-input';

function App() {
  const { register, handleSubmit } = useForm();
  const registerWithMask = useHookFormMask(register);

  ...

  return (
    <form onSubmit={onSubmit}>
      <input
        {...registerWithMask("phone", ['99 9999-9999', '99999-9999'], {
          required: true
        })}
        type="text"
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Usage with `withHookFormMask`

If you have already registered your field, you can use `withHookFormMask` to add the mask.
Wrap the call in `useMemo` to avoid reapplying the mask on every render:

```jsx
import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { withHookFormMask } from 'use-mask-input';

function App() {
  const { register, handleSubmit } = useForm();

  const maskedProps = useMemo(
    () => withHookFormMask(register("amount"), 'brl-currency', {
      unmaskAsNumber: true,
    }),
    [register]
  );

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input {...maskedProps} type="text" />
      <button type="submit">Submit</button>
    </form>
  );
}
```
