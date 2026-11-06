import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // If 5173 is busy, fail with a clear error instead of silently moving to
    // 5174: the backend's CORS_ALLOWED_ORIGINS only lists port 5173, so a
    // different port would make every API call fail with a CORS error.
    strictPort: true,
  },
})
