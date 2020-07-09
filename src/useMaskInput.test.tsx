import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import useMaskedInput from './useMaskInput'

test('shuld format input properly', () => {
  const ref = useMaskedInput({
    mask: '999-999'
  })

  const { container } = render(<input type='text' ref={ref} />)

  fireEvent.change(container, 'teste')
})
