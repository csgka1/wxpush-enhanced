import { Env } from './types';

import { Hono } from 'hono';
import { installGlobalConfig } from './middlewares';
import { RegisterApi } from './api';
import { bodyLimit } from 'hono/body-limit';
import RegisterSkinPage from './pages/skin';
import RegisterTestPage from './pages/test';

const app = new Hono<Env>();

app.use('/*', async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set('requestId', requestId);
    await next();
})
app.use('/*', bodyLimit({ maxSize: 8 * 1024 }));
app.use('/*', installGlobalConfig);

RegisterApi(app);

RegisterSkinPage(app);
RegisterTestPage(app);

export default app;
