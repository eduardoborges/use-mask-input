import React from 'react'

import useMaskInput from 'use-mask-input';

const App = () => {

  const ref = useMaskInput({
    mask: '999-999'
  })

  return (
    <input type="text" ref={ref} />
  )
}

export default App
