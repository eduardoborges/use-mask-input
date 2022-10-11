/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { useForm } from 'react-hook-form';
import { Form, Field } from 'react-final-form';
import { withHookFormMask, withMask } from '../index';

function App() {
  const { register, handleSubmit } = useForm();

  const onSubmit = (data: any) => {
    console.log(data);
  };

  return (
    <>
      <h3>Using simple ref</h3>
      <input type="text" ref={withMask(['(99) 9999 9999', '(99) 9 9999 9999'])} />
      <hr />
      <h3>Using react-hook-form</h3>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input
          type="text"
          {...withHookFormMask(register('phone'), ['(99) 9999 9999', '(99) 9 9999 9999'])}
        />
        <button type="submit">Submit</button>
      </form>
      <hr />

      <Form
        onSubmit={onSubmit}
        render={({ handleSubmit: _handleSubmit }) => (
          <form onSubmit={_handleSubmit}>
            <h3>working with example react-final-form </h3>
            <Field
              name="phone"
              render={({ input, meta }) => (
                <label htmlFor="phone">
                  Phone
                  <input ref={withMask('9999-9999')} {...input} placeholder="Phone" />
                  {meta.touched && meta.error && <span>{meta.error}</span>}
                </label>
              )}
            />
            <button type="submit">Submit</button>
          </form>
        )}
      />
    </>
  );
}

export default App;
