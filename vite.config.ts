import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
// Production builds are served from https://zyttal.github.io/Photobooth/,
// so assets need the /Photobooth/ prefix. Dev keeps the root '/' so
// `npm run dev` still works at http://localhost:5173/.
export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  base: command === 'build' || isPreview ? '/Photobooth/' : '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
}))
