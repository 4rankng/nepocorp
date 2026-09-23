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
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@tingting/shared': resolve(__dirname, '../shared/src'),
    },
  },
});
