import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import { defineConfig } from 'eslint/config';

export default defineConfig(
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            '.wrangler/**',
            'coverage/**',
            'worker-configuration.d.ts',
        ],
    },
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsParser,
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        rules: tsPlugin.configs.recommended.rules,
    },
);
