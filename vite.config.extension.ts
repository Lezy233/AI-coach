import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist-extension',
    rollupOptions: {
      input: resolve(import.meta.dirname, 'src/extension/content.ts'),
      output: {
        entryFileNames: 'assets/[name].js',
      },
    },
  },
})
