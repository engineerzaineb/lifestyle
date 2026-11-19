import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Adresses publiques autorisées (tunnel ngrok…), séparées par des virgules dans frontend/.env
  const hotes = (env.VITE_ALLOWED_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean)
  return {
    plugins: [react()],
    server: hotes.length ? { allowedHosts: hotes } : {},
  }
})
