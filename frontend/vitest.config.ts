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
    // Process only the salary-attendance stylesheets so the CSS contract
    // tests can read them via `?raw`. Every other .css id stays stubbed to
    // an empty string (Vitest default) — cheaper and side-effect free.
    css: {
      include: [/salary-attendance\/[^?]+\.css(\?.*)?$/],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@tingting/shared': resolve(__dirname, '../shared/src'),
    },
  },
});
