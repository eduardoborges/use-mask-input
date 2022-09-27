import React from 'react';

import useMaskInput from '../useMaskInput';

function App() {
  const phone = useMaskInput({
    mask: ['(99) 9999 9999', '(99) 9 9999 9999'],
  });

  return (
    <>
      <h3>Telefone que suporta 8 ou 9 digitos</h3>
      <input type="text" ref={phone} />
      <hr />
    </>
  );
}

export default App;
