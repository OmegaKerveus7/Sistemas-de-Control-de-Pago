import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Sistemas-de-Control-de-Pago/',
  server: {
    host: '0.0.0.0',
    port: 5147,
    allowedHosts: [
      'parqueobelen.site',
      'www.parqueobelen.site',
      'localhost',
      '127.0.0.1',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5299',
        changeOrigin: true,
      },
    },
  },
})
