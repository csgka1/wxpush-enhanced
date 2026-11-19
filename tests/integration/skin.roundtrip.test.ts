import { afterEach, describe, expect, it, vi } from 'vitest';

import { b64Encode } from '../../src/util';
import { app, sendRequest } from '../support/app';
import { makeEnv } from '../support/env';
import { stubUpstream } from '../support/upstream';

const env = makeEnv({ ENABLED_CHANNELS: 'wechat', DEFAULT_CHANNEL: 'wechat' });

const title = '服务通知';
const content = '服务已于 22:00 重启';

/**
 * 完成一次微信推送，返回上游消息里携带的展示页链接。
 */
async function sendAndGetSkinUrl() {
    const upstream = stubUpstream([
        {
            match: 'stable_token',
            replies: [{ json: { access_token: 'token-1' } }],
        },
        {
            match: 'message/template/send',
            replies: [{ json: { errcode: 0, errmsg: 'ok' } }],
        },
    ]);

    const response = await sendRequest({ title, content }, env);
    expect(response.status).toBe(200);

    const { url } = upstream.jsonBody(1);
    upstream.restore();

    return new URL(url);
}

function visitSkin(url: URL) {
    return app.request(`${url.pathname}${url.search}`, {}, env);
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('推送链接与展示页往返', () => {
    it('推送产生的链接可直接打开并渲染正文', async () => {
        const skinUrl = await sendAndGetSkinUrl();

        const response = await visitSkin(skinUrl);

        expect(response.status).toBe(200);
        const html = await response.text();
        expect(html).toContain(title);
        expect(html).toContain(content);
    });

    it('篡改链接中的正文后返回 403', async () => {
        const skinUrl = await sendAndGetSkinUrl();
        skinUrl.searchParams.set('message', b64Encode('伪造内容', 'base64url'));

        const response = await visitSkin(skinUrl);

        expect(response.status).toBe(403);
    });

    it('缺少签名参数时返回 400', async () => {
        const skinUrl = await sendAndGetSkinUrl();
        skinUrl.searchParams.delete('sign');

        const response = await visitSkin(skinUrl);

        expect(response.status).toBe(400);
    });
});
