import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

import { validEnv } from './tests/support/env';

export default defineConfig({
    plugins: [
        cloudflareTest({
            wrangler: { configPath: './wrangler.toml' },
            miniflare: { bindings: { ...validEnv } },
        }),
    ],
    test: {
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'istanbul',
            include: ['src/**'],
            exclude: ['src/client/**', 'src/components/**'],
        },
    },
});
