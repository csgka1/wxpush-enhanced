import { afterEach, describe, expect, it, vi } from 'vitest';

import { createScheduledHandler } from '../../src/scheduled';
import type { EnvVar } from '../../src/types';
import { app } from '../support/app';
import { makeEnv } from '../support/env';
import { stubUpstream } from '../support/upstream';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ANCHOR = Date.UTC(2026, 0, 1);
const atDay = (offset: number) => ANCHOR + offset * MS_PER_DAY;

const handler = createScheduledHandler(app);

function runCron(env: EnvVar, scheduledTime: number) {
    const controller = {
        cron: '0 2 * * *',
        scheduledTime,
        noRetry: () => {},
    } as unknown as ScheduledController;
    const ctx = {
        waitUntil: () => {},
        passThroughOnException: () => {},
    } as unknown as ExecutionContext;

    return handler(controller, env, ctx);
}

const wechatRoutes = [
    {
        match: 'stable_token',
        replies: [{ json: { access_token: 'token-1' } }],
    },
    {
        match: 'message/template/send',
        replies: [{ json: { errcode: 0, errmsg: 'ok' } }],
    },
];

afterEach(() => {
    vi.restoreAllMocks();
});

describe('保活定时任务', () => {
    it('未到保活间隔时不发出请求', async () => {
        const upstream = stubUpstream([]);

        await runCron(makeEnv(), atDay(1));

        expect(upstream.calls).toHaveLength(0);
    });

    it('到达保活间隔时通过微信发送保活消息', async () => {
        const upstream = stubUpstream(wechatRoutes);
        const env = makeEnv({
            ENABLED_CHANNELS: 'wechat',
            DEFAULT_CHANNEL: 'wechat',
        });

        await runCron(env, atDay(7));

        expect(upstream.calls).toHaveLength(3);
        expect(new URL(upstream.jsonBody(1).url).pathname).toBe('/skin');
    });

    it('未配置保活间隔时不发出请求', async () => {
        const upstream = stubUpstream([]);

        await runCron(makeEnv({ ALIVE_DAYS: undefined }), atDay(7));

        expect(upstream.calls).toHaveLength(0);
    });

    it('微信渠道未启用时不发出请求', async () => {
        const upstream = stubUpstream([]);
        const env = makeEnv({
            ENABLED_CHANNELS: 'wecom',
            DEFAULT_CHANNEL: 'wecom',
        });

        await runCron(env, atDay(7));

        expect(upstream.calls).toHaveLength(0);
    });
});
