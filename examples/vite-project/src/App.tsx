import React from 'react';
import { useForm } from 'react-hook-form';
import { Form, Field } from 'react-final-form';
import { useHookFormMask, withMask } from 'use-mask-input';
import "./App.css";

function App() {
  const [lib, setLib] = React.useState<'hook-form' | 'final-form'>('hook-form');
  const { register, handleSubmit } = useForm({
    defaultValues: {
      cardNumber: '',
      cardHolder: '',
      cardExpiration: '',
      cardCvv: '',
      cpf: '',
    }
  });

  const onSubmit = (data: any) => {
    console.log(data);
  };

  const registerWithMask = useHookFormMask(register);

  return (
    <>
      <h3>Using simple ref</h3>
      <input type="text" ref={withMask(["AAA"], {
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
              placeholder='Card Number'
              type="text"
              {...registerWithMask("cardNumber", ["9999 9999 9999 9999","99999 9999 9999 9999"], {
                required: true,
              })}
            />
            <br/>
            <input
              placeholder='Card Holder'
              type="text"
              {...registerWithMask("cardHolder", "[A| ]{1,20}[ ]", {
                required: true,
              })}
            />
            <br/>
            <input
              placeholder='Card Expiration'
              type="text"
              {...registerWithMask("cardExpiration", "99/99", {
                required: true,
              })}
            />
            <br/>
            <input
              placeholder='Card CVV'
              type="text"
              {...registerWithMask("cardCvv", "(999)|(9999)", {
                required: true,
              })}
            />
            <br/>
            <input
              placeholder='CPF'
              type="text"
              {...registerWithMask("cpf", "cpf", {
                required: true,
              })}
            />
            <br />
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
