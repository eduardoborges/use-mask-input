import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { withMask } from '../../../src/react'
import './App.css'

function App() {

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <input type="text" id="input" ref={withMask('AAA-AA')} />
        <input type="text" id="input" ref={withMask('[DECIMAL]', {
          decimal: {
            decimalSeparator: ',',
            thousandSeparator: '.',
            symbol: 'R$ '
          }
        })} />
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
