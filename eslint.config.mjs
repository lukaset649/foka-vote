import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const TS_FILES = ['**/*.{ts,tsx}'];

const sharedConfigs = [
  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended-type-checked'],
  react.configs.flat.recommended,
  reactHooks.configs.flat.recommended,
  importPlugin.flatConfigs.errors,
  importPlugin.flatConfigs.warnings,
  importPlugin.flatConfigs.typescript,
  prettierConfig,
].map((config) => ({ ...config, files: TS_FILES }));

export default [
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/.cache',
      '**/.turbo',
      '**/coverage',
      'apps/api/src/generated',
    ],
  },
  ...sharedConfigs,
  {
    files: TS_FILES,
    plugins: {
      prettier: prettierPlugin,
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        project: ['./apps/*/tsconfig.json', './packages/*/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: { version: 'detect' },
      'import/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] },
      'import/resolver': { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      'prettier/prettier': 'error',
      'react/react-in-jsx-scope': 'off',
      'import/no-unresolved': ['error', { ignore: ['^virtual:'] }],
    },
  },
  {
    files: TS_FILES,
    ignores: ['apps/api/**'],
    languageOptions: {
      globals: globals.browser,
    },
  },
];
