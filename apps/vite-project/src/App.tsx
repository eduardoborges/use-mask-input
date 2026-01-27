
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import './App.css'
import { useHookFormMask, useMaskInput } from 'use-mask-input'

function App() {

  const { register, handleSubmit } = useForm({
    resolver: zodResolver(z.object({
      phone: z.string().min(1),
    })),
  });

  const phoneMask = useMaskInput({
    mask: '9999-9999',
  })

  const registerWithMask = useHookFormMask(register);

  const onSubmit = handleSubmit(data => {
    console.log(data);
  })

  return (
    <>
      <h1>Vite + React</h1>
      <div className="card">
        <input type="text" ref={phoneMask} />
      </div>

      <hr />

      <div className="card">
        <h3>React Hook Form</h3>
        <form onSubmit={onSubmit}>
          <input type="text" {...registerWithMask('phone', '9999-9999')} />

          <button type="submit">Submit</button>
        </form>
      </div>
    </>
  )
}

export default App
