import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  define: {
    __BUILD_SHA__: JSON.stringify('test-sha'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Process only the stylesheets the CSS contract tests read via `?raw`
    // (salary-attendance, trip-list, DispatchPage, OcrRequestsPage, the global
    // styles/tokens+responsive, and the contrast-pinned DashboardPage/
    // FinancePage/sidebar). Every other .css id stays stubbed to an empty
    // string (Vitest default) — cheaper and side-effect free.
    css: {
      include: [/((salary-attendance|trip-list)\/[^?]+|pages\/(DispatchPage|OcrRequestsPage|DashboardPage|FinancePage)|styles\/(tokens|responsive)|layout\/sidebar)\.css(\?.*)?$/],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@tingting/shared': resolve(__dirname, '../shared/src'),
    },
  },
});
