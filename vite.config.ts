import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: resolve(import.meta.dirname, 'src/extension/content.ts'),
      output: {
        entryFileNames: 'assets/[name].js',
      },
    },
  },
})
