import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tingting/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 7173,
    // Fail fast when another dev server already holds the port: silently moving to
    // 7174 left a second Vite serving the same tree, and a tab opened against the
    // first one kept an old HMR bundle (kanban 20260923_17).
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3090',
        changeOrigin: true,
      },
      // socket.io (assistant transport). `ws: true` proxies the WebSocket
      // upgrade handshake; without it the engine.io upgrade fails in dev.
      '/socket.io': {
        target: 'http://localhost:3090',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
