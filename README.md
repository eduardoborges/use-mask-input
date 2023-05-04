<center>

<h1>use-mask-input</h1>

[![NPM](https://img.shields.io/npm/v/use-mask-input.svg)](https://www.npmjs.com/package/use-mask-input) [![Bundle Size](https://badgen.net/bundlephobia/minzip/use-mask-input)](https://bundlephobia.com/result?p=use-mask-input)

🥸 A React Hook for build elegant and simple input masks.
</center>

## Features
- 🎯  Simple API
- ✨  Compatible with [React Hook Form](https://github.com/react-hook-form/react-hook-form)
- 🏁  Compatible with [React Final Form](https://github.com/final-form/react-final-form)

## Know Issues

- Not compatible with Next.js, but we are working on it

## Install

```sh
npm i use-mask-input
```

## Quickstart

```jsx
import React from 'react'
import { withMask } from 'use-mask-input';

const App = () => {
  return (
    <input type="text" ref={withMask('9999-9999')} />
  )
}
```

## Usage with React Hook Forms

```jsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { withHookFormMask } from 'use-mask-input';

function App() {
  const { register, handleSubmit } = useForm();

  ...

  return (
    <form onSubmit={onSubmit}>
      <input
        type="text"
        {...withHookFormMask(register('phone'), ['(99) 9999 9999', '(99) 9 9999 9999'])}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Usage with React Final Form

Just use `withMask` normaly.

```jsx
import React from 'react';
import { Form, Field } from 'react-final-form';
import { withMask } from 'use-mask-input';

function App() {
  ...
  return (
    <Form
      onSubmit={onSubmit}
      render={({ handleSubmit }) => (
        <form onSubmit={handleSubmit}>
          <Field
            name="phone"
            render={({ input, meta }) => (
              <input ref={withMask('9999-9999')} {...input} />
            )}
          />
          <button type="submit">Submit</button>
        </form>
      )}
    />
  );
}
```
