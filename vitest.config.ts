import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

import { validAppConfig } from './tests/support/env';

export default defineConfig({
    plugins: [
        cloudflareTest({
            wrangler: { configPath: './wrangler.toml' },
            miniflare: { bindings: validAppConfig },
        }),
    ],
    test: {
        include: ['tests/**/*.test.ts'],
        setupFiles: ['./tests/support/setup.ts'],
        coverage: {
            provider: 'istanbul',
            include: ['src/**'],
            exclude: ['src/client/**', 'src/components/**'],
        },
    },
});
