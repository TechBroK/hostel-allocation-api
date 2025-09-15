// @ts-check
import js from '@eslint/js';
import eslintPluginImport from 'eslint-plugin-import';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'uploads/**'
    ]
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
  ...globals.node,
  ...globals.es2021,
  ...globals.jest
      }
    },
    plugins: {
      import: eslintPluginImport
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'import/order': ['warn', { groups: [['builtin', 'external'], ['internal'], ['parent', 'sibling', 'index']], 'newlines-between': 'always' }],
      'import/no-unresolved': 'error',
      'import/newline-after-import': ['warn', { count: 1 }],
      'prefer-const': 'error',
      'object-shorthand': ['warn', 'always'],
      'arrow-body-style': ['warn', 'as-needed'],
      'no-var': 'error'
    }
  }
];
