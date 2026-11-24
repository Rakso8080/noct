import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Static builds are served from a subpath (GitHub Pages), so the base is set at build time.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8788',
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: false,
  },
});
