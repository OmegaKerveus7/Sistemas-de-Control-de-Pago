import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Sistemas-de-Control-de-Pago/',
  server: {
    allowedHosts: ['parqueobelen.site'],
  },
})