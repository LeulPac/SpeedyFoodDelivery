import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const googleClientId = (env.VITE_GOOGLE_CLIENT_ID || '').trim()

  return {
    plugins: [react()],
    envDir: '.',
    define: {
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(googleClientId),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:5000',
        '/uploads': 'http://localhost:5000',
        '/socket.io': {
          target: 'http://localhost:5000',
          ws: true,
        },
      },
    },
  }
})
