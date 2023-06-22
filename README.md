# 🥸 use-mask-input

[![NPM](https://img.shields.io/npm/v/use-mask-input.svg)](https://www.npmjs.com/package/use-mask-input) [![Bundle Size](https://badgen.net/bundlephobia/minzip/use-mask-input)](https://bundlephobia.com/result?p=use-mask-input)

A React Hook for build elegant and simple input masks.

---

## Map o contents

## Table of Contents

- [Installation](#install)
- [Usage](#quickstart)
- [Masking Types](#masking-types)
  - [Static Masks](#static-types)

## Features
- 🎯  Simple API
- 💎  Works with Next.js
- ✨  Compatible with [React Hook Form](https://github.com/react-hook-form/react-hook-form)
- 🏁  Compatible with [React Final Form](https://github.com/final-form/react-final-form)
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

### Usage with React Hook Forms

```jsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { withHookFormMask } from 'use-mask-input';

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

### Usage with React Final Form

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

## Masking types

The `mask` params cabe be

### Static Types

These are the very basics of masking. The mask is defined and will not change during the input.

```tsx
<input
  {...registerWithMask("phone", '99 9999-9999')}
  type="text"
/>
```

### Optional Types

It is possible to define some parts in the mask as optional. This is done by using `[ ]`. By example:

```tsx
<input
  {...registerWithMask("phone", '99 [9]9999-9999')}
  type="text"
/>
```
This mask will allow input like (99) 99999-9999 or (99) 9999-9999.

### Dynamic Types
Dynamic masks can change during input. To define a dynamic part use { }.

{n} => n repeats {n|j} => n repeats, with j jitmasking {n,m} => from n to m repeats {n,m|j} => from n to m repeats, with j jitmasking

Also {+} and {} is allowed. + start from 1 and start from 0.

By example:

```tsx
//static mask with dynamic syntax
<input
  {...registerWithMask("phone", "aa-9{4}")}
  type="text"
/>

// dynamic mask ~ the 9 def can be occur 1 to 4 times
<input
  {...registerWithMask("phone", "aa-9{4}")}
  type="text"
/>

// dynamic mask ~ email
<input
  {...registerWithMask("phone", "*{1,20}[.*{1,20}][.*{1,20}][.*{1,20}]@*{1,20}[.*{2,6}][.*{1,2}]")}
  type="text"
/>

```
### Alias Types

### Alternator masks

The alternator syntax is like an OR statement. The mask can be one of the 3 choices specified in the alternator.

To define an alternator use the |. ex: "a|9" => a or 9 "(aaa)|(999)" => aaa or 999 "(aaa|999|9AA)" => aaa or 999 or 9AA
"aaaa|9999" => aaa a or 9 999

Also make sure to read about the keepStatic option.

### Preprocessing masks
