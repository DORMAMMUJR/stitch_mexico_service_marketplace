import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    host: true,
    allowedHosts: 'all',
    // En desarrollo: redirige /api → Express en :3000
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  preview: {
    port: 4173,
    host: true,
    allowedHosts: 'all',     // También para `vite preview` (build de producción)
  },

  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },

  // SPA: redirige todas las rutas a index.html
  appType: 'spa',
});
