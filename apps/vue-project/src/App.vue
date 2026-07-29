<script setup lang="ts">
import { ref } from 'vue'
import { useField, useForm } from 'vee-validate'
import { vMaskInput, useMaskInput, formatWithMask } from 'use-mask-input/vue'

import MaskDemo from './MaskDemo.vue'
import WrappedInput from './WrappedInput.vue'

// (5) v-model + autoUnmask: the input displays masked, the model holds raw.
const rawCpf = ref('')

// (6) composable. unmaskedValue() is a function and is NOT reactive, so it is
// only ever read from an event handler — never interpolated in the template.
const { maskRef, unmaskedValue } = useMaskInput('cnpj')
const lastRead = ref('(not read yet)')

function readUnmasked() {
  lastRead.value = unmaskedValue() || '(empty)'
}

// (8) vee-validate. The field is bound with v-model, so autoUnmask means the
// submitted value is already unmasked.
const { handleSubmit } = useForm()
const { value: phone, errorMessage } = useField<string>('phone', (v: string) =>
  (v && v.length === 11 ? true : 'Enter a full phone number'),
)
const submitted = ref('(not submitted)')

const onSubmit = handleSubmit((values) => {
  submitted.value = JSON.stringify(values)
})

// (9) formatting without a mounted element
const persisted = '12345678901'
</script>

<template>
  <h1>use-mask-input + Vue 3</h1>
  <p class="lede">
    Every row below shows the binding, the live masked input, and the value
    <code>v-model</code> actually holds.
  </p>

  <section>
    <h2>1. Built-in aliases</h2>
    <MaskDemo label="cpf" source="'cpf'" binding="cpf" placeholder="000.000.000-00" />
    <MaskDemo label="cnpj" source="'cnpj'" binding="cnpj" placeholder="00.000.000/0000-00" />
    <MaskDemo label="ssn" source="'ssn'" binding="ssn" placeholder="000-00-0000" />
    <MaskDemo label="mac" source="'mac'" binding="mac" placeholder="AA:BB:CC:DD:EE:FF" />
    <MaskDemo label="ip" source="'ip'" binding="ip" placeholder="192.168.0.1" />
    <MaskDemo label="email" source="'email'" binding="email" placeholder="you@example.com" />
    <MaskDemo label="br-bank-account" source="'br-bank-account'" binding="br-bank-account" placeholder="1234567-8" />
    <MaskDemo label="br-bank-agency" source="'br-bank-agency'" binding="br-bank-agency" placeholder="1234-5" />
  </section>

  <section>
    <h2>2. Numeric and currency</h2>
    <p class="warn">
      Known issue, not Vue-specific and present on the React entry too: aliases
      with a forced decimal part accept only the decimal digits and never shift
      input into the integer part. <code>numeric</code>, <code>integer</code>,
      <code>decimal</code> and <code>percentage</code> are unaffected.
    </p>
    <MaskDemo
      label="brl-currency"
      source="'brl-currency'"
      binding="brl-currency"
      placeholder="R$ 0,00"
      note="ships autoUnmask; affected by the same decimal issue"
    />
    <MaskDemo
      label="currency"
      source="{ mask: 'currency', options: { placeholder: '0' } }"
      :binding="{ mask: 'currency', options: { placeholder: '0' } }"
      placeholder="$ 0.00"
      note="BROKEN: types as $ 0.18 — see the note above"
    />
    <MaskDemo
      label="currency, euro"
      source="{ prefix: '€ ', radixPoint: ',', groupSeparator: '.', placeholder: '0,00' }"
      :binding="{ mask: 'currency', options: { prefix: '€ ', radixPoint: ',', groupSeparator: '.', placeholder: '0,00' } }"
      placeholder="€ 0,00"
      note="BROKEN the same way; options themselves apply correctly"
    />
    <MaskDemo label="numeric" source="'numeric'" binding="numeric" placeholder="1234" />
    <MaskDemo label="integer" source="'integer'" binding="integer" placeholder="1234" />
    <MaskDemo label="decimal" source="'decimal'" binding="decimal" placeholder="12.34" />
    <MaskDemo
      label="decimal, 3 forced digits"
      source="{ mask: 'decimal', options: { digits: 3, digitsOptional: false } }"
      :binding="{ mask: 'decimal', options: { digits: 3, digitsOptional: false } }"
      placeholder="12.340"
      note="BROKEN: digitsOptional:false hits the same issue"
    />
    <MaskDemo label="percentage" source="'percentage'" binding="percentage" placeholder="45 %" />
  </section>

  <section>
    <h2>3. Dates</h2>
    <MaskDemo
      label="datetime, dd/mm/yyyy"
      source="{ mask: 'datetime', options: { inputFormat: 'dd/mm/yyyy' } }"
      :binding="{ mask: 'datetime', options: { inputFormat: 'dd/mm/yyyy' } }"
      placeholder="dd/mm/yyyy"
      note="always pass inputFormat: the bare alias defaults to a full ISO datetime"
    />
    <MaskDemo
      label="datetime, mm/dd/yyyy"
      source="{ mask: 'datetime', options: { inputFormat: 'mm/dd/yyyy' } }"
      :binding="{ mask: 'datetime', options: { inputFormat: 'mm/dd/yyyy' } }"
      placeholder="mm/dd/yyyy"
    />
    <MaskDemo
      label="datetime with time"
      source="{ mask: 'datetime', options: { inputFormat: 'dd/mm/yyyy HH:MM' } }"
      :binding="{ mask: 'datetime', options: { inputFormat: 'dd/mm/yyyy HH:MM' } }"
      placeholder="dd/mm/yyyy HH:MM"
    />
  </section>

  <section>
    <h2>4. Raw patterns</h2>
    <MaskDemo label="phone" source="'(99) 99999-9999'" binding="(99) 99999-9999" placeholder="(00) 00000-0000" />
    <MaskDemo label="licence plate" source="'AAA-9A99'" binding="AAA-9A99" placeholder="ABC-1D23" />
    <MaskDemo
      label="two patterns, whichever fits"
      source="['999-999', '999-999-999']"
      :binding="['999-999', '999-999-999']"
      placeholder="123-456 or 123-456-789"
    />
    <MaskDemo
      label="uppercased"
      source="{ mask: 'AAAA-AAAA', options: { casing: 'upper' } }"
      :binding="{ mask: 'AAAA-AAAA', options: { casing: 'upper' } }"
      placeholder="ABCD-EFGH"
    />
    <MaskDemo label="null mask (inert)" source="null" :binding="null" placeholder="no mask applied" />
  </section>

  <section>
    <h2>5. <code>v-model</code> with <code>autoUnmask</code></h2>
    <input
      v-model="rawCpf"
      v-mask-input="{ mask: 'cpf', options: { autoUnmask: true } }"
      placeholder="000.000.000-00"
    />
    <p>bound raw value: <code>{{ rawCpf || '(empty)' }}</code></p>
    <p class="hint">
      The input displays the mask; the model holds digits only. No adapter — the
      engine owns the element's <code>value</code> accessor.
    </p>
  </section>

  <section>
    <h2>6. <code>useMaskInput</code> composable</h2>
    <input :ref="maskRef" placeholder="00.000.000/0000-00" />
    <button type="button" @click="readUnmasked">Read unmaskedValue()</button>
    <p>last read: <code>{{ lastRead }}</code></p>
    <p class="hint">
      Read it from a handler, never from the template —
      <code>unmaskedValue()</code> is not reactive.
    </p>
  </section>

  <section>
    <h2>7. Directive on a wrapper component</h2>
    <WrappedInput v-mask-input="'cnpj'" />
    <p class="hint">
      The directive lands on the component's root <code>&lt;div&gt;</code> and the
      library digs out the inner input. This is how PrimeVue, Element Plus and
      Ant Design Vue work.
    </p>
  </section>

  <section>
    <h2>8. vee-validate</h2>
    <form @submit="onSubmit">
      <input
        v-model="phone"
        v-mask-input="{ mask: '(99) 99999-9999', options: { autoUnmask: true } }"
        placeholder="(00) 00000-0000"
      />
      <button type="submit">Submit</button>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p>field value: <code>{{ phone || '(empty)' }}</code></p>
      <p>submitted: <code>{{ submitted }}</code></p>
    </form>
    <p class="hint">No adapter and no helper — <code>useField</code> + <code>v-model</code> + the directive.</p>
  </section>

  <section>
    <h2>9. Formatting without an element</h2>
    <p>
      <code>formatWithMask('{{ persisted }}', 'cpf')</code> &rarr;
      <code>{{ formatWithMask(persisted, 'cpf') }}</code>
    </p>
    <p class="hint">For rendering already-persisted values outside an input.</p>
  </section>
</template>

<style scoped>
.lede {
  max-width: 40rem;
  color: #555;
}
.warn {
  font-size: 0.8rem;
  color: #8a4b00;
  background: #fff6e5;
  border: 1px solid #f0d9b0;
  border-radius: 4px;
  padding: 0.5rem 0.7rem;
  max-width: 46rem;
}
.hint {
  font-size: 0.8rem;
  color: #666;
  max-width: 38rem;
}
</style>
