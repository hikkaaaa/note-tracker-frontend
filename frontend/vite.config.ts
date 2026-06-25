import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // The app ships as a single eagerly-loaded bundle (~1.1 MB) — acceptable for this SPA,
    // so lift Vite's advisory 500 kB chunk-size warning instead of emitting it every build.
    chunkSizeWarningLimit: 1500,
  },
})
