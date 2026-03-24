import { useForm } from '@tanstack/react-form'
import type { ChangeEvent } from 'react'
import { useTanStackFormMask, withTanStackFormMask } from 'use-mask-input'
import './App.css'

type FormValues = {
  phone: string
  email: string
  postalCode: string
}

function App() {
  const maskField = useTanStackFormMask()

  const form = useForm({
    defaultValues: {
      phone: '',
      email: '',
      postalCode: '',
    } as FormValues,
    onSubmit: async ({ value }) => {
      // eslint-disable-next-line no-console
      console.log('submit', value)
    },
  })

  return (
    <main className="container">
      <h2>TanStack Form + use-mask-input</h2>
      <p>Smoke test for TanStack Form integration.</p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <div className="row">
          <form.Field name="phone">
            {(field) => {
              const inputProps = maskField('(99) 99999-9999', {
                name: field.name,
                value: field.state.value,
                onBlur: field.handleBlur,
                onChange: (event: ChangeEvent<HTMLInputElement>) => {
                  field.handleChange(event.target.value)
                },
              })

              return (
                <label className="field">
                  Phone
                  <input {...inputProps} placeholder="(00) 00000-0000" />
                </label>
              )
            }}
          </form.Field>

          <form.Field name="email">
            {(field) => {
              const inputProps = withTanStackFormMask(
                {
                  name: field.name,
                  value: field.state.value,
                  onBlur: field.handleBlur,
                  onChange: (event: ChangeEvent<HTMLInputElement>) => {
                    field.handleChange(event.target.value)
                  },
                },
                'email',
              )

              return (
                <label className="field">
                  Email
                  <input {...inputProps} placeholder="name@example.com" />
                </label>
              )
            }}
          </form.Field>
        </div>

        <form.Field name="postalCode">
          {(field) => {
            const inputProps = maskField('99999-9999', {
              name: field.name,
              value: field.state.value,
              onBlur: field.handleBlur,
              onChange: (event: ChangeEvent<HTMLInputElement>) => {
                field.handleChange(event.target.value)
              },
            })

            return (
              <label className="field">
                Postal code (ZIP+4 style)
                <input {...inputProps} placeholder="00000-0000" />
              </label>
            )
          }}
        </form.Field>

        <div className="actions">
          <button type="submit">Submit</button>
          <button type="button" onClick={() => form.reset()}>
            Reset
          </button>
        </div>
      </form>

      <form.Subscribe selector={(state) => state.values}>
        {(values) => <pre>{JSON.stringify(values, null, 2)}</pre>}
      </form.Subscribe>
    </main>
  )
}

export default App
