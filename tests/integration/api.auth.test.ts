import { describe, expect, it } from 'vitest';

import { app } from '../support/app';
import { makeEnv } from '../support/env';

const env = makeEnv();

function postSend(init: RequestInit = {}) {
    return app.request('/api/send', { method: 'POST', ...init }, env);
}

describe('接口鉴权', () => {
    it('缺少 token 时返回 401', async () => {
        const response = await postSend();

        expect(response.status).toBe(401);
    });

    it('Header 中的 token 错误时返回 401', async () => {
        const response = await postSend({
            headers: { Authorization: 'Bearer wrong_token' },
        });

        expect(response.status).toBe(401);
    });

    it('Header 中的 token 正确时通过鉴权', async () => {
        const response = await postSend({
            headers: {
                Authorization: `Bearer ${env.API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title: '标题' }),
        });

        expect(response.status).toBe(400);
    });

    it('query 中的 token 正确时通过鉴权', async () => {
        const response = await app.request(
            `/api/send?token=${env.API_TOKEN}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: '标题' }),
            },
            env,
        );

        expect(response.status).toBe(400);
    });

    it('query 中的 token 错误时返回 403', async () => {
        const response = await app.request(
            '/api/send?token=wrong_token',
            { method: 'POST' },
            env,
        );

        expect(response.status).toBe(403);
    });

    it('query 优先于 Header，即使 Header 正确', async () => {
        const response = await app.request(
            '/api/send?token=wrong_token',
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${env.API_TOKEN}` },
            },
            env,
        );

        expect(response.status).toBe(403);
    });
});
