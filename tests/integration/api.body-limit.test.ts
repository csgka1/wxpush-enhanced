import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    SEND_CONTENT_MAX_LENGTH,
    SEND_TITLE_MAX_LENGTH,
} from '../../src/const';
import { sendRequest } from '../support/app';
import { makeEnv } from '../support/env';
import { stubUpstream } from '../support/upstream';

const env = makeEnv({ ENABLED_CHANNELS: 'wecom', DEFAULT_CHANNEL: 'wecom' });

afterEach(() => {
    vi.restoreAllMocks();
});

describe('请求体上限', () => {
    it('请求体超过 16 KiB 时返回 413', async () => {
        const response = await sendRequest(
            {
                title: '标题',
                content: '😀'.repeat(SEND_CONTENT_MAX_LENGTH),
            },
            env,
        );

        expect(response.status).toBe(413);
    });

    it('上限内的中文正文可以提交到上游', async () => {
        const upstream = stubUpstream([
            {
                match: 'qyapi.weixin.qq.com',
                replies: [{ json: { errcode: 0 } }],
            },
        ]);
        const title = '标'.repeat(SEND_TITLE_MAX_LENGTH);
        const content = '中'.repeat(SEND_CONTENT_MAX_LENGTH);

        const response = await sendRequest({ title, content }, env);

        expect(response.status).toBe(200);
        expect(upstream.calls).toHaveLength(1);
    });

    it('超过字符上限的中文由字段校验拒绝', async () => {
        const response = await sendRequest(
            {
                title: '标题',
                content: '中'.repeat(SEND_CONTENT_MAX_LENGTH + 1),
            },
            env,
        );

        expect(response.status).toBe(400);
    });
});
