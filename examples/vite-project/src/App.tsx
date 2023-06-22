import React from 'react';
import { useForm } from 'react-hook-form';
import { Form, Field } from 'react-final-form';
import { useHookFormMask, withMask } from '../../../src';
import "./App.css";

function App() {
  const [lib, setLib] = React.useState<'hook-form' | 'final-form'>('hook-form');
  const { register, handleSubmit } = useForm({
    defaultValues: {
      phone: '',
      email: '',
    }
  });

  const onSubmit = (data: any) => {
    console.log(data);
  };

  const registerWithMask = useHookFormMask(register);

  return (
    <>
      <h3>Using simple ref</h3>
      <input type="text" ref={withMask(null, {
        inputFormat: "yyyy-mm-dd",
        alias: "datetime",
      })} />

      <hr />

      <select onChange={(e) => setLib(e.target.value as any)}>
        <option value="hook-form">Hook Form</option>
        <option value="final-form">Final Form</option>
      </select>
      <hr />

      {lib === 'hook-form' && (
        <>
          <h3>Using react-hook-form</h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <input
              {...registerWithMask("phone", "*{1,20}[.*{1,20}][.*{1,20}][.*{1,20}]@*{1,20}[.*{2,6}][.*{1,2}]", {
                nullable: true,
                required: true,
              })}
              type="text"
            />
            <button type="submit">Submit</button>
          </form>
        </>
      )}

      <hr />
      {lib === 'final-form' && (
      <Form
        onSubmit={onSubmit}
        render={({ handleSubmit }) => (
          <form onSubmit={handleSubmit}>
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
      )}
    </>
  );
}

export default App;
