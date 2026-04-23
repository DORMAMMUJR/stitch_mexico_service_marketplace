import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    host: true,              // Escucha en 0.0.0.0 (necesario en contenedores)
    allowedHosts: 'all',     // Permite cualquier host externo (Seenode, Vercel, etc.)
  },

  preview: {
    port: 4173,
    host: true,
    allowedHosts: 'all',     // También para `vite preview` (build de producción)
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  // SPA: redirige todas las rutas a index.html
  appType: 'spa',
});
