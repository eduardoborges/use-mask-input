
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { useMaskInput } from 'use-mask-input'

function App() {

  const phoneMask = useMaskInput({
    mask: '9999-9999',
  })

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <input type="text" ref={phoneMask} />
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
