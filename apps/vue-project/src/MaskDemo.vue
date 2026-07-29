<script setup lang="ts">
import { ref } from 'vue'
import { vMaskInput } from 'use-mask-input/vue'

import type { VueMaskBinding } from 'use-mask-input/vue'

/**
 * One labelled row: the binding as written, the live input, and the raw value
 * behind it. Showing both at once is the point — most of this library's
 * behaviour is only interesting as the difference between the two.
 */
const props = defineProps<{
  label: string
  source: string
  binding: VueMaskBinding
  placeholder?: string
  note?: string
}>()

const model = ref('')
</script>

<template>
  <div class="row">
    <div class="meta">
      <strong>{{ props.label }}</strong>
      <code>{{ props.source }}</code>
      <em v-if="props.note">{{ props.note }}</em>
    </div>
    <input v-model="model" v-mask-input="props.binding" :placeholder="props.placeholder" />
    <span class="raw">{{ model || '—' }}</span>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 19rem 14rem 1fr;
  gap: 0.75rem;
  align-items: center;
  padding: 0.4rem 0;
  border-bottom: 1px solid #f0f0f0;
}
.meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.meta code {
  font-size: 0.75rem;
  color: #555;
  background: #f6f6f6;
}
.meta em {
  font-size: 0.72rem;
  color: #b06000;
  font-style: normal;
}
.raw {
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
  color: #666;
  overflow-wrap: anywhere;
}
</style>
