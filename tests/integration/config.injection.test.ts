import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { getChannelConfig } from '../../src/config';
import { installConfig } from '../../src/middlewares';
import { CHANNEL, type AppConfigEnvVar, type Env } from '../../src/types';
import { makeEnv } from '../support/env';

/**
 * 用探针路由把配置中间件注入的推送渠道配置暴露出来，便于在 HTTP 层观察读取行为。
 */
function probeWechatConfig(env: AppConfigEnvVar) {
    const app = new Hono<Env>();
    app.use(installConfig);
    app.get('/probe/wechat', (c) =>
        c.json(getChannelConfig(c, CHANNEL.wechat)),
    );

    return app.request('/probe/wechat', {}, env);
}

describe('推送渠道配置注入', () => {
    it('返回已启用推送渠道的配置', async () => {
        const response = await probeWechatConfig(makeEnv());

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
            WX_APPID: 'wxtestappid',
            WX_USERID: ['userA', 'userB'],
        });
    });

    it('推送渠道未启用时返回 500', async () => {
        const response = await probeWechatConfig(
            makeEnv({ ENABLED_CHANNELS: 'wecom' }),
        );

        expect(response.status).toBe(500);
    });

    it('已启用推送渠道的配置非法时整个应用返回 500', async () => {
        const response = await probeWechatConfig(
            makeEnv({ WX_APPID: undefined }),
        );

        expect(response.status).toBe(500);
    });
});
