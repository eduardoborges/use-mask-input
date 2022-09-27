/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { useForm } from 'react-hook-form';
import useMaskInput, { maskRegister } from '..';

function App() {
  const phone = useMaskInput({
    mask: ['(99) 9999 9999', '(99) 9 9999 9999'],
  });

  const { register, handleSubmit } = useForm();

  const onSubmit = handleSubmit((data) => {
    console.log(data);
  });

  return (
    <>
      <h3>Using simple ref</h3>
      <input type="text" ref={phone} />
      <hr />
      <h3>Using react-hook-form</h3>
      <form onSubmit={onSubmit}>
        <input
          type="text"
          {...maskRegister(register('phone'), ['(99) 9999 9999', '(99) 9 9999 9999'])}
        />
        <button type="submit">Submit</button>
      </form>
    </>
  );
}

export default App;
