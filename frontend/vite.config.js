import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target:       'http://localhost:3001',
        changeOrigin: true,
        proxyTimeout: 120_000,   // must exceed Claude's 90s + backend processing
        timeout:      120_000,
      },
    },
  },
})
