import { app } from '../../src/index';
import type { Env } from '../../src/types';
import { makeEnv } from './env';

export { app };

/**
 * 携带正确 Bearer token 调用 /api/send。
 */
export function sendRequest(body: unknown, env: Env['Bindings'] = makeEnv()) {
    return app.request(
        '/api/send',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.API_TOKEN}`,
            },
            body: JSON.stringify(body),
        },
        env,
    );
}
