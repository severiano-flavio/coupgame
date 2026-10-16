// Flat config (ESLint 9). Shared base for the monorepo.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// Globals por ambiente (sem dependência externa de pacote de globals).
const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
  URL: 'readonly',
};

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  HTMLElement: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
};

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/build/**', '**/node_modules/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Servidor e scripts Node.
  {
    files: ['apps/server/**/*.ts', '**/*.mjs', '*.js'],
    languageOptions: { globals: nodeGlobals },
  },
  // Cliente web (browser).
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: browserGlobals },
  },
  prettier,
);
