import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendRequest } from '../support/app';
import { makeEnv } from '../support/env';
import { stubUpstream } from '../support/upstream';

const env = makeEnv({
    ENABLED_CHANNELS: 'wechat,wecom',
    DEFAULT_CHANNEL: 'wecom',
});

function stubBothChannels() {
    return stubUpstream([
        {
            match: 'stable_token',
            replies: [{ json: { access_token: 'token-1' } }],
        },
        {
            match: 'message/template/send',
            replies: [{ json: { errcode: 0, errmsg: 'ok' } }],
        },
        {
            match: 'qyapi.weixin.qq.com',
            replies: [{ json: { errcode: 0 } }],
        },
    ]);
}

function hostsOf(upstream: ReturnType<typeof stubUpstream>) {
    return upstream.calls.map(({ url }) => new URL(url).host);
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('渠道选择', () => {
    it('省略渠道时使用默认渠道', async () => {
        const upstream = stubBothChannels();

        const response = await sendRequest(
            { title: '标题', content: '内容' },
            env,
        );

        expect(response.status).toBe(200);
        expect(hostsOf(upstream)).toEqual(['qyapi.weixin.qq.com']);
    });

    it('指定已启用渠道时使用该渠道', async () => {
        const upstream = stubBothChannels();

        const response = await sendRequest(
            { title: '标题', content: '内容', channel: 'wechat' },
            env,
        );

        expect(response.status).toBe(200);
        expect(hostsOf(upstream)).toEqual([
            'api.weixin.qq.com',
            'api.weixin.qq.com',
            'api.weixin.qq.com',
        ]);
    });

    it('指定未启用渠道时回退到默认渠道', async () => {
        const upstream = stubBothChannels();

        const response = await sendRequest(
            { title: '标题', content: '内容', channel: 'smtp' },
            env,
        );

        expect(response.status).toBe(200);
        expect(hostsOf(upstream)).toEqual(['qyapi.weixin.qq.com']);
    });

    it('指定未启用渠道且拒绝回退时返回 400', async () => {
        const upstream = stubBothChannels();

        const response = await sendRequest(
            {
                title: '标题',
                content: '内容',
                channel: 'smtp',
                acceptChannelFallback: false,
            },
            env,
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            msg: 'No available channel.',
        });
        expect(upstream.calls).toHaveLength(0);
    });

    it('未配置默认渠道且省略渠道时返回 400', async () => {
        const upstream = stubBothChannels();

        const response = await sendRequest(
            { title: '标题', content: '内容' },
            makeEnv({ ENABLED_CHANNELS: 'wecom', DEFAULT_CHANNEL: undefined }),
        );

        expect(response.status).toBe(400);
        expect(upstream.calls).toHaveLength(0);
    });

    it('未配置默认渠道且请求未启用渠道时返回 400', async () => {
        const upstream = stubBothChannels();

        const response = await sendRequest(
            { title: '标题', content: '内容', channel: 'smtp' },
            makeEnv({ ENABLED_CHANNELS: 'wecom', DEFAULT_CHANNEL: undefined }),
        );

        expect(response.status).toBe(400);
        expect(upstream.calls).toHaveLength(0);
    });
});
