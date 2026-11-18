import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendRequest } from '../support/app';
import { makeEnv } from '../support/env';
import { stubUpstream, type UpstreamReply } from '../support/upstream';

const env = makeEnv({ ENABLED_CHANNELS: 'wecom', DEFAULT_CHANNEL: 'wecom' });

function stubWecom(replies: UpstreamReply[]) {
    return stubUpstream([{ match: 'qyapi.weixin.qq.com', replies }]);
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('企业微信群机器人推送', () => {
    it('把标题与正文拼装为 Markdown', async () => {
        const upstream = stubWecom([{ json: { errcode: 0 } }]);

        const response = await sendRequest(
            { title: '服务通知', content: '服务已重启' },
            env,
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            msg: 'Successfully sent message to WeCom group.',
        });
        expect(upstream.jsonBody(0)).toEqual({
            msgtype: 'markdown_v2',
            markdown_v2: { content: '# 服务通知\n\n服务已重启' },
        });
    });

    it('正文超过 4096 字节时截断并追加标记', async () => {
        const upstream = stubWecom([{ json: { errcode: 0 } }]);

        const response = await sendRequest(
            { title: '标题', content: '中'.repeat(2000) },
            env,
        );

        expect(response.status).toBe(200);
        const content: string = upstream.jsonBody(0).markdown_v2.content;
        expect(content.startsWith('# 标题\n\n中')).toBe(true);
        expect(new TextEncoder().encode(content).length).toBeLessThanOrEqual(
            4096,
        );
        expect(content.endsWith(' ...[消息过长被截断]')).toBe(true);
    });

    it('上游 errcode 非 0 时返回 502', async () => {
        stubWecom([
            { json: { errcode: 93000, errmsg: 'invalid webhook url' } },
        ]);

        const response = await sendRequest(
            { title: '标题', content: '内容' },
            env,
        );

        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
            msg: 'Failed to send WeCom message: invalid webhook url',
        });
    });

    it('上游返回非 2xx 时返回 502', async () => {
        stubWecom([{ status: 500, json: {} }]);

        const response = await sendRequest(
            { title: '标题', content: '内容' },
            env,
        );

        expect(response.status).toBe(502);
    });
});
