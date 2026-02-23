
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import './App.css'
import { useHookFormMask, useMaskInput } from 'use-mask-input'
import { useHookFormMaskAntd, useMaskInputAntd } from 'use-mask-input/antd'
import { Input } from 'antd'

function App() {

  const { register, handleSubmit } = useForm({
    resolver: zodResolver(z.object({
      phone: z.string().min(1),
      amount: z.number().min(1),
    })),
  });

  const phoneMask = useMaskInput({
    mask: 'brl-currency',
  })

  const registerWithMask = useHookFormMask(register);
  const onSubmit = handleSubmit(data => {
    console.log(data);
  })

  const phoneMaskAntd = useMaskInputAntd({
    mask: '9999-9999',
  })

  const registerWithMaskAntd = useHookFormMaskAntd(register);

  return (
    <>
      <h1>Vite + React</h1>
      <div className="card">
        <input type="text" ref={phoneMask} />
        <Input type="text" ref={phoneMaskAntd} />
      </div>

      <hr />

      <div className="card">
        <h3>React Hook Form</h3>
        <form onSubmit={onSubmit}>

          <input {...registerWithMask('phone', 'brl-currency')} />
          <Input {...registerWithMaskAntd('amount', 'brl-currency')} />
          <button type="submit">Submit</button>
        </form>
      </div>
    </>
  )
}

export default App
