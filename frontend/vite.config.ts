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
    // Exposing dev through a tunnel (ngrok) arrives with an external Host header,
    // which Vite's DNS-rebinding check rejects unless the domain is allowlisted.
    allowedHosts: ['.ngrok-free.dev', '.ngrok.app'],
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
  build: {
    // Vite's 500 kB default flags two known-budget chunks on every build:
    // `exceljs.min` (~940 kB) is the vendored Excel export library — its own
    // shared chunk, not part of the first load — and `index` (~790 kB) is the
    // app shell (react-dom + zod + socket.io-client + shared UI). Route pages
    // are already lazy-split via lazyPage(). The threshold documents that
    // budget; cutting below it means replacing exceljs or splitting the shell,
    // which are scoped tasks of their own.
    chunkSizeWarningLimit: 1024,
  },
});
