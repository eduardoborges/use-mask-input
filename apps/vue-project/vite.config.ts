import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'use-mask-input': path.resolve(__dirname, '../../packages/use-mask-input/src'),
    },
  },
})
