import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development, /api calls go to the local Express backend (yarn --cwd backend dev).
    proxy: {
      '/api': process.env.VITE_DEV_API_TARGET || 'http://localhost:3001',
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react';
          }
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase';
          }
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'pdf';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          return undefined;
        },
      },
    },
  }
})
