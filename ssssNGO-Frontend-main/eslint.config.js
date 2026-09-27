import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^(?:[A-Z_]|motion$)',
        argsIgnorePattern: '^(?:[A-Z_]|_)',
        caughtErrorsIgnorePattern: '^(?:err|error|_)',
      }],
      // Existing pages intentionally start async data loading from mount effects.
      'react-hooks/set-state-in-effect': 'off',
      // The existing navbar uses a closure component so it can close the mobile menu.
      'react-hooks/static-components': 'off',
      // AuthContext exports both the provider and its consumer hook by design.
      'react-refresh/only-export-components': 'off',
    },
  },
])
