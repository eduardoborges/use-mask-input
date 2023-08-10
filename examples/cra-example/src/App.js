import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form, Field } from 'react-final-form';
import { withHookFormMask, withMask, useHookFormMask } from 'use-mask-input';
import './App.css';

function App() {
  const [lib, setLib] = useState('hook-form');
  const { register, handleSubmit } = useForm({
    defaultValues:{
      phone: ''
    }
  });

  const registerWithMask = useHookFormMask(register);

  const onSubmit = (data: any) => {
    console.log(data);
    console.log(withMask('9999-9999'));
  };

  return (
    <>
      <h3>Using simple ref</h3>
      <input ref={withMask("brl-currency")} type="text" />
      <hr />
      <select onChange={(e) => setLib(e.target.value)}>
        <option value="hook-form">Hook Form</option>
        <option value="final-form">Final Form</option>
      </select>
      <hr />

      {lib === 'hook-form' && (
        <>
          <h3>Using react-hook-form</h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <input
              {...registerWithMask("phone", ['999','(99) 9 9999 9999'])}
            />
            <button type="submit">Submit</button>
          </form>
        </>
      )}

      <hr />
      {lib === 'final-form' && (
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
      )}
    </>
  );
}

export default App;
