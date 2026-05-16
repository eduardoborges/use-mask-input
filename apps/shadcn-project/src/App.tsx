import { useForm } from 'react-hook-form';
import { useMaskInput, useHookFormMask } from 'use-mask-input';
import { Input } from '@/components/ui/input';
import './index.css';

interface FormValues {
  cpf: string;
  phone: string;
  cep: string;
  cnpj: string;
  currency: string;
  datetime: string;
}

function App() {
  const { register, handleSubmit, watch } = useForm<FormValues>();
  const registerWithMask = useHookFormMask(register);

  // standalone ref — not tied to react-hook-form
  const cepRef = useMaskInput({ mask: '99999-999' });

  const onSubmit = (data: FormValues) => {
    console.log('submitted:', data);
  };

  const watched = watch();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">use-mask-input + shadcn/ui</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Demonstração usando os hooks base diretamente com o componente Input do shadcn/ui.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* useHookFormMask com register */}
          <div className="space-y-1">
            <label className="text-sm font-medium">CPF (useHookFormMask)</label>
            <Input
              placeholder="000.000.000-00"
              {...registerWithMask('cpf', 'cpf')}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">CNPJ (useHookFormMask)</label>
            <Input
              placeholder="00.000.000/0000-00"
              {...registerWithMask('cnpj', 'cnpj')}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Telefone (useHookFormMask)</label>
            <Input
              placeholder="(00) 00000-0000"
              {...registerWithMask('phone', '(99) 99999-9999')}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Moeda BRL (useHookFormMask)</label>
            <Input
              placeholder="R$ 0,00"
              {...registerWithMask('currency', 'brl-currency')}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Data e hora (useHookFormMask)</label>
            <Input
              placeholder="dd/mm/yyyy hh:mm"
              {...registerWithMask('datetime', 'datetime')}
            />
          </div>

          {/* useMaskInput com ref standalone */}
          <div className="space-y-1">
            <label className="text-sm font-medium">CEP (useMaskInput — standalone ref)</label>
            <Input ref={cepRef} placeholder="00000-000" />
          </div>

          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Enviar
          </button>
        </form>

        <div>
          <h2 className="mb-2 text-sm font-semibold">Form state (tempo real)</h2>
          <pre className="rounded-md bg-muted p-4 text-xs">
            {JSON.stringify(watched, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default App;
