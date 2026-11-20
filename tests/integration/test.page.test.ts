import { describe, expect, it } from 'vitest';

import { app } from '../support/app';
import { makeEnv } from '../support/env';

const env = makeEnv();

function getTestPage() {
    return app.request('/test', {}, env);
}

describe('GET /test', () => {
    it('无需鉴权即可访问', async () => {
        const response = await getTestPage();

        expect(response.status).toBe(200);
    });

    it('渲染测试表单容器', async () => {
        const html = await (await getTestPage()).text();

        expect(html).toContain('WXPush 测试页面');
        expect(html).toContain('id="testFormRoot"');
    });

    it('不在页面中暴露 API_TOKEN', async () => {
        const html = await (await getTestPage()).text();

        expect(html).not.toContain(env.API_TOKEN);
        expect(html).not.toContain('data-token');
    });
});
