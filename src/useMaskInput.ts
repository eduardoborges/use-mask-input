/* eslint-disable no-unused-vars */
import * as React from 'react'
import Inputmask from 'inputmask'
import type { Options } from 'inputmask'

interface UseInputMaskOptions {
  mask: string
  register?(element: HTMLElement): void
  options?: Options
}

const useInputMask = (props: UseInputMaskOptions) => {
  const { mask, register, options } = props

  const ref = React.useRef<HTMLInputElement>(null)

  React.useLayoutEffect(() => {
    if (!ref.current) return

    const maskInput = Inputmask({
      mask,
      ...options
    })

    maskInput.mask(ref.current)
  }, [mask, options, register])

  if (register && ref.current) {
    register(ref.current)
  }

  return ref
}

export default useInputMask
