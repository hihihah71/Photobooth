import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
// Vercel serves from '/', while GitHub Pages can provide its repository
// subpath through VITE_BASE_PATH during the build.
export default defineConfig(() => ({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
}))
