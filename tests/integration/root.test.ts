import { describe, expect, it } from 'vitest';

import { app } from '../support/app';
import { makeEnv } from '../support/env';

describe('GET /', () => {
    it('配置合法时返回 200', async () => {
        const response = await app.request('/', {}, makeEnv());

        expect(response.status).toBe(200);
        expect(await response.text()).toBe('WxPush-Enhanced Service');
    });

    // ========== 期待该接口对配置进行验证 ===============

    it('全局配置非法时返回 500', async () => {
        const response = await app.request(
            '/',
            {},
            makeEnv({ SIGN_SECRET: 'short' }),
        );

        expect(response.status).toBe(500);
    });

    it('已启用渠道缺少配置时返回 500', async () => {
        const response = await app.request(
            '/',
            {},
            makeEnv({ WX_APPID: undefined }),
        );

        expect(response.status).toBe(500);
    });
});
