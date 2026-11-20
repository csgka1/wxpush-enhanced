import { Env } from './types';

import { Hono } from 'hono';
import { installAppConfig } from './middlewares';
import { RegisterApi } from './api';
import { bodyLimit } from 'hono/body-limit';
import RegisterSkinPage from './pages/skin';
import RegisterTestPage from './pages/test';
import { createScheduledHandler } from './scheduled';

const app = new Hono<Env>();
export { app }; // export for test code

app.use('/*', async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set('requestId', requestId);
    await next();
});
app.use('/*', bodyLimit({ maxSize: 16 * 1024 }));
app.use('/*', installAppConfig);

app.get('/', (c) => {
    return c.text('WxPush-Enhanced Service');
});

RegisterApi(app);

RegisterSkinPage(app);
RegisterTestPage(app);

export default {
    fetch: app.fetch,
    scheduled: createScheduledHandler(app),
} satisfies ExportedHandler<Env['Bindings']>;
