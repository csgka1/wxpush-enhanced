import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendRequest } from '../support/app';
import { makeEnv } from '../support/env';
import { stubUpstream, type UpstreamReply } from '../support/upstream';

const env = makeEnv({ ENABLED_CHANNELS: 'wechat', DEFAULT_CHANNEL: 'wechat' });

const tokenRoute = {
    match: 'stable_token',
    replies: [{ json: { access_token: 'token-1' } }],
};

function sendRoute(replies: UpstreamReply[]) {
    return { match: 'message/template/send', replies };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('微信模板消息推送', () => {
    it('模板字段超过 20 字符时截断并追加省略号', async () => {
        const upstream = stubUpstream([
            tokenRoute,
            sendRoute([{ json: { errcode: 0, errmsg: 'ok' } }]),
        ]);

        const response = await sendRequest(
            { title: 'T'.repeat(25), content: 'C'.repeat(30) },
            env,
        );

        expect(response.status).toBe(200);
        const body = upstream.jsonBody(1);
        expect(body.data.thing01.value).toBe(`${'T'.repeat(17)}...`);
        expect(body.data.thing02.value).toBe(`${'C'.repeat(17)}...`);
    });

    it('为每个收件人各发送一条消息', async () => {
        const upstream = stubUpstream([
            tokenRoute,
            sendRoute([{ json: { errcode: 0, errmsg: 'ok' } }]),
        ]);

        const response = await sendRequest(
            { title: '标题', content: '内容' },
            env,
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            msg: 'Successfully sent messages to 2 user(s).',
        });
        expect(upstream.calls).toHaveLength(3);
        expect(upstream.jsonBody(1).touser).toBe('userA');
        expect(upstream.jsonBody(2).touser).toBe('userB');
        expect(upstream.calls[1].url).toContain('access_token=token-1');
    });

    it('部分收件人失败时按成功数返回', async () => {
        const upstream = stubUpstream([
            tokenRoute,
            sendRoute([
                { json: { errcode: 0, errmsg: 'ok' } },
                { json: { errcode: 40003, errmsg: 'invalid openid' } },
            ]),
        ]);

        const response = await sendRequest(
            { title: '标题', content: '内容' },
            env,
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            msg: 'Successfully sent messages to 1 user(s).',
        });
        expect(upstream.calls).toHaveLength(3);
    });

    it('上游 errcode 非 0 时返回 502 并带上首个错误', async () => {
        stubUpstream([
            tokenRoute,
            sendRoute([
                { json: { errcode: 40001, errmsg: 'invalid credential' } },
            ]),
        ]);

        const response = await sendRequest(
            { title: '标题', content: '内容' },
            env,
        );

        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
            msg: 'Failed to send messages. First error: invalid credential, errcode=40001',
        });
    });

    it('获取 access_token 失败时返回 502', async () => {
        stubUpstream([
            {
                match: 'stable_token',
                replies: [
                    { json: { errcode: 40013, errmsg: 'invalid appid' } },
                ],
            },
        ]);

        const response = await sendRequest(
            { title: '标题', content: '内容' },
            env,
        );

        expect(response.status).toBe(502);
        const body = (await response.json()) as { msg: string };
        expect(body.msg).toBe(
            'Failed to send WeChat message: Failed to get WeChat access token: invalid appid',
        );
    });

    it('消息中的跳转链接指向 /skin 且带签名', async () => {
        const upstream = stubUpstream([
            tokenRoute,
            sendRoute([{ json: { errcode: 0, errmsg: 'ok' } }]),
        ]);

        await sendRequest({ title: '标题', content: '内容' }, env);

        const url = new URL(upstream.jsonBody(1).url);
        expect(url.origin).toBe('https://push.example.com');
        expect(url.pathname).toBe('/skin');
        expect(url.searchParams.get('sign')).not.toBeNull();
    });
});
