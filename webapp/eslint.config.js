// eslint.config.js
import globals from "globals";
import js from "@eslint/js";

// React specific plugins/configs
import pluginReactRecommended from 'eslint-plugin-react/configs/recommended.js';
import pluginReactJsxRuntime from 'eslint-plugin-react/configs/jsx-runtime.js'; // Handles new JSX transform
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReactRefresh from "eslint-plugin-react-refresh";

export default [
  // Global ESLint recommended rules
  js.configs.recommended,

  // React recommended configurations
  pluginReactRecommended,
  pluginReactJsxRuntime, // This will turn off react/react-in-jsx-scope and react/jsx-uses-react

  // General language options and settings for React
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect", // Autodetect React version
      },
    },
  },

  // React Hooks specific configuration
  {
    plugins: {
      'react-hooks': pluginReactHooks,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules, // Spread recommended rules
    },
  },

  // React Refresh specific configuration (for Vite)
  {
    plugins: {
      'react-refresh': pluginReactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': 'warn',
    },
  },

  // Your custom rules or overrides
  {
    rules: {
      "react/prop-types": "off", // Disable prop-types as per original config
      // Example: "no-unused-vars": "warn", // To make unused vars a warning
    },
  },

  // Configuration for .config.js files (like postcss.config.js, tailwind.config.js)
  {
    files: ["postcss.config.cjs", "tailwind.config.cjs"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly",
        process: "readonly",
        __dirname: "readonly",
      },
      sourceType: "commonjs" // Explicitly treat these as CommonJS
    },
  },

  // Files to ignore
  {
    ignores: [
      "node_modules/",
      "dist/", 
      ".vite/", 
      "coverage/", // Common coverage directory
      "eslint.config.js"
    ],
  },
];
