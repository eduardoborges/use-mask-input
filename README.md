<div align="center">
  <h1>🥸 use-mask-input</h1>
  <h4>A React Hook for build elegant and simple input masks.</h4>

  ![npm](https://img.shields.io/npm/v/use-mask-input) ![npm package minimized gzipped size (select exports)](https://img.shields.io/bundlejs/size/use-mask-input?color=green-light) ![npm](https://img.shields.io/npm/dw/use-mask-input)

</div>


## Table of Contents

- [Installation](#install)
- [Usage](#quickstart)
- [Masking Types](#masking-types)
  - [Static Masking Type](#static-masking-type)
  - [Optional Masking Type](#optional-masking-type)
  - [Dynamic Masking Type](#dynamic-masking-type)
  - [Alias Masking Type](#alias-masking-type)
  - [Alternator Masking Type](#alias-masking-type)
  - [Preprocessing Masking Type](#preprocessing-masking-type)


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

### Static Masking Type

These are the very basics of masking. The mask is defined and will not change during the input.

```tsx
<input
  {...registerWithMask("phone", '99 9999-9999')}
  type="text"
/>
```

### Optional Masking Type

It is possible to define some parts in the mask as optional. This is done by using `[ ]`. By example:

```tsx
<input
  {...registerWithMask("phone", '99 [9]9999-9999')}
  type="text"
/>
```
This mask will allow input like (99) 99999-9999 or (99) 9999-9999.

### Dynamic Masking Type

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
### Alias Masking Type

A Lot of common default "alises" presets, you can use like that:
```tsx
<input                         // the alias
  {...registerWithMask("date", "datetime", {
    inputFormat: "yyyy-mm-dd",
  })}
  type="text"
/>
```

You can use together with options like  `inputFormat`, `prefix`, `sufix`, etc. Checkout [API docs](#api)

The avaliable ones is:

 - `datetime`
 - `email`
 - `ip`
 - `datetime`
 - `cpf`
 - `email`
 - `numeric`
 - `currency`
 - `decimal`
 - `integer`
 - `percentage`
 - `url`
 - `ip`
 - `mac`
 - `ssn`

### Alternator Masking Type

The alternator syntax is like an OR statement. The mask can be one of the 3 choices specified in the alternator.

To define an alternator use the |. ex: "a|9" => a or 9 "(aaa)|(999)" => aaa or 999 "(aaa|999|9AA)" => aaa or 999 or 9AA
"aaaa|9999" => aaa a or 9 999

```tsx
<input
  {...registerWithMask("phone", "9999-9999|99999-9999")}
  type="text"
/>

// or just passing an array
<input
  {...registerWithMask("phone", ["9999-9999", "99999-9999"])}
  type="text"
/>

```


### Preprocessing Masking Type

You can define the mask as a function that can allow you to preprocess the resulting mask. Example sorting for multiple masks or retrieving mask definitions dynamically through ajax. The preprocessing fn should return a valid mask definition.

```tsx
<input
  {...registerWithMask("phone", function () {
    /* do stuff */ return ["[1-]AAA-999", "[1-]999-AAA"];
  })}
  type="text"
/>

```


## API

(TODO)
