import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  // Handle SPA routing - redirect all paths to index.html
  appType: 'spa',
});
