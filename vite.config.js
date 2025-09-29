import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: { port: 5173, headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' } },
  build: { outDir: 'dist' }
})
