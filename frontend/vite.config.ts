import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

/**
 * The bundle reports which build it is. The image build passes BUILD_SHA (the same
 * short sha the image is tagged with), local dev falls back to the checkout's HEAD,
 * and a build with no git metadata reports 'dev'. Surfaced in the user menu so a
 * stale bundle is obvious at a glance (kanban 20260923_18).
 */
function resolveBuildSha(): string {
  const fromEnv = process.env.BUILD_SHA?.trim();
  if (fromEnv) return fromEnv;
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  define: {
    __BUILD_SHA__: JSON.stringify(resolveBuildSha()),
  },
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
