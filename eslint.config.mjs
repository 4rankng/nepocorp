import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Non-source / generated / tooling dirs — not linted from the root.
  // The frontend package has its own eslint.config.js + lint script with
  // React/TanStack rules; backend & shared are covered here.
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/drizzle/**',
      // Generated output & data
      'uploads/**',
      'test-results/**',
      'qa-screenshots/**',
      'graphify-out/**',
      // Docs, plans, and notes
      'docs/**',
      'plans/**',
      'memory/**',
      '.claude/**',
      // Tooling & deployment scripts
      'deploy/**',
      'e2e/**',
      'qa/**',
      'wireframe/**',
      // JS/MJS/CJS are config (vite/eslint/drizzle) or throwaway QA/puppeteer
      // scripts — out of scope for the TS source lint.
      '**/*.{js,mjs,cjs}',
    ],
  },

  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        // Monorepo with multiple tsconfig.json (frontend/backend/shared).
        // Pin the root so the parser does not error on ambiguous candidates.
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  }
);
