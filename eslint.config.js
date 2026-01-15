// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '**/*.js', '!eslint.config.js'],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript strict rules (superset of recommended)
  ...tseslint.configs.strict,

  // TypeScript stylistic rules
  ...tseslint.configs.stylistic,

  // Project-specific configuration
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Allow unused vars that start with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Allow explicit any in specific cases (prefer unknown)
      '@typescript-eslint/no-explicit-any': 'warn',

      // Require consistent type imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],

      // Require consistent type exports
      '@typescript-eslint/consistent-type-exports': [
        'error',
        {
          fixMixedExportsWithInlineTypeSpecifier: true,
        },
      ],

      // Prefer nullish coalescing
      '@typescript-eslint/prefer-nullish-coalescing': 'off', // Requires type-checked config

      // Enforce consistent interface/type usage
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

      // Allow non-null assertions in specific cases
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // Test files configuration
  {
    files: ['tests/**/*.ts', 'src/**/*.test.ts'],
    rules: {
      // Tests can use any for mocking
      '@typescript-eslint/no-explicit-any': 'off',
      // Tests can use non-null assertions
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Prettier - must be last to disable conflicting rules
  eslintConfigPrettier
);
