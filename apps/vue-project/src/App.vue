<script setup lang="ts">
import { ref } from 'vue'
import { useField, useForm } from 'vee-validate'
import { vMaskInput, useMaskInput } from 'use-mask-input/vue'

import WrappedInput from './WrappedInput.vue'

// (c) v-model + autoUnmask: the input displays masked, the model holds raw.
const rawCpf = ref('')

// (d) composable: unmaskedValue() is a function and is NOT reactive, so it is
// only ever read from an event handler.
const { maskRef, unmaskedValue } = useMaskInput('cnpj')

function showUnmasked() {
  // eslint-disable-next-line no-alert
  alert(`unmaskedValue(): ${unmaskedValue()}`)
  console.log('unmaskedValue()', unmaskedValue())
}

// (f) vee-validate: the field is bound with v-model, so autoUnmask means the
// submitted value is already unmasked.
const { handleSubmit } = useForm()
const { value: phone, errorMessage } = useField<string>('phone', (v: string) =>
  (v && v.length === 11 ? true : 'Enter a full phone number'),
)

const onSubmit = handleSubmit((values) => {
  console.log('submitted values', values)
  // eslint-disable-next-line no-alert
  alert(`submitted: ${JSON.stringify(values)}`)
})
</script>

<template>
  <h1>use-mask-input + Vue 3</h1>

  <section>
    <h2>a. Directive, plain input (<code>cpf</code> alias)</h2>
    <input v-mask-input="'cpf'" placeholder="000.000.000-00" />
  </section>

  <section>
    <h2>b. Directive with options (<code>currency</code> + prefix override)</h2>
    <input
      v-mask-input="{ mask: 'currency', options: { prefix: 'R$ ' } }"
      placeholder="R$ 0,00"
    />
  </section>

  <section>
    <h2>c. Directive + <code>v-model</code> with <code>autoUnmask</code></h2>
    <input
      v-model="rawCpf"
      v-mask-input="{ mask: 'cpf', options: { autoUnmask: true } }"
      placeholder="000.000.000-00"
    />
    <p>bound raw value: <code>{{ rawCpf || '(empty)' }}</code></p>
  </section>

  <section>
    <h2>d. <code>useMaskInput</code> composable (<code>cnpj</code>)</h2>
    <input :ref="maskRef" placeholder="00.000.000/0000-00" />
    <button type="button" @click="showUnmasked">Log unmaskedValue()</button>
  </section>

  <section>
    <h2>e. Directive on a wrapper component</h2>
    <WrappedInput v-mask-input="'brl-currency'" />
  </section>

  <section>
    <h2>f. vee-validate <code>useField</code> + <code>v-model</code></h2>
    <form @submit="onSubmit">
      <input
        v-model="phone"
        v-mask-input="{ mask: '(99) 99999-9999', options: { autoUnmask: true } }"
        placeholder="(00) 00000-0000"
      />
      <button type="submit">Submit</button>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p>field value: <code>{{ phone || '(empty)' }}</code></p>
    </form>
  </section>
</template>
