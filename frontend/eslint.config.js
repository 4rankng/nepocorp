// @ts-check
/**
 * TingTing ESLint flat config — ESLint 9 + typescript-eslint + React plugins.
 *
 * Custom rules:
 *   @tingting/no-bare-query-key   — Ban inline `queryKey: [...]` arrays
 *   @tingting/no-any              — Warn on `as any` / `: any` annotations
 */
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

// ---------------------------------------------------------------------------
// T4.1.2 — Custom rule: ban bare queryKey: [...]
// ---------------------------------------------------------------------------
const noBareQueryKey = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require qk.* factory for TanStack Query keys instead of inline arrays',
    },
    schema: [],
    messages: {
      bareQueryKey:
        "Use qk.* factory for query keys instead of inline arrays. Import qk from '../api/keys' or './api/keys'.",
    },
  },
  create(context) {
    return {
      /** Match `queryKey: ['...', ...]` — property with array literal value */
      Property(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'queryKey' &&
          node.value.type === 'ArrayExpression'
        ) {
          context.report({
            node,
            messageId: 'bareQueryKey',
          });
        }
      },
    };
  },
};

// ---------------------------------------------------------------------------
// T4.1.3 — Custom rule: warn on `as any` and `: any`
// ---------------------------------------------------------------------------
const noAny = {
  meta: {
    type: 'suggestion',
    docs: {
      description: "Warn on 'any' type usage",
    },
    schema: [],
    messages: {
      noAny: "Avoid 'any' type — use proper types or unknown.",
    },
  },
  create(context) {
    return {
      /** `as any` type assertion */
      TSAsExpression(node) {
        if (node.typeAnnotation && node.typeAnnotation.typeName) {
          const typeName = node.typeAnnotation.typeName;
          if (typeName.type === 'Identifier' && typeName.name === 'any') {
            context.report({ node, messageId: 'noAny' });
          }
        }
      },
      /** Variable / parameter / property with `: any` annotation */
      TSTypeAnnotation(node) {
        if (node.typeAnnotation && node.typeAnnotation.typeName) {
          const typeName = node.typeAnnotation.typeName;
          if (typeName.type === 'Identifier' && typeName.name === 'any') {
            context.report({ node, messageId: 'noAny' });
          }
        }
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Local plugin container for @tingting namespace rules
// ---------------------------------------------------------------------------
const tingtingPlugin = {
  meta: { name: '@tingting/eslint-plugin', version: '0.1.0' },
  rules: {
    'no-bare-query-key': noBareQueryKey,
    'no-any': noAny,
  },
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
export default defineConfig([
  // Global ignores
  {
    ignores: ['dist/**', 'build/**', '*.config.js', '*.config.mjs'],
  },

  // Base JS recommended
  js.configs.recommended,

  // TypeScript + React files
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      '@tingting': tingtingPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    rules: {
      // ---- TypeScript rules ----
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // ---- React rules ----
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ---- General rules ----
      'no-console': ['warn', { allow: ['error', 'warn'] }],

      // ---- TingTing custom rules ----
      '@tingting/no-bare-query-key': 'error',
      '@tingting/no-any': 'warn',
    },
  },

  // Disable type-aware rules for plain JS files (config scripts etc.)
  {
    files: ['**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
]);
