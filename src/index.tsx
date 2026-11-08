import { Env } from './types';

import { Hono } from 'hono';
import { validateGlobalConfig } from './middlewares';
import { RegisterApi } from './api';
import { bodyLimit } from 'hono/body-limit';
import RegisterSkinPage from './pages/skin';
import RegisterTestPage from './pages/test';

const app = new Hono<Env>();

app.use('/*', bodyLimit({ maxSize: 8 * 1024 }));
app.use('/*', validateGlobalConfig);

RegisterApi(app);

RegisterSkinPage(app);
RegisterTestPage(app);

export default app;
