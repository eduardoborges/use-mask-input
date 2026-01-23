import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'use-mask-input': path.resolve(__dirname, '../../packages/use-mask-input/src/index.tsx'),
    },
  },
  server: {
    watch: {
      ignored: ['!**/node_modules/use-mask-input/**'],
    },
  },
  optimizeDeps: {
    include: ['use-mask-input > inputmask'],
  },
})
