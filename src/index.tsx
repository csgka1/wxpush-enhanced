import { Env } from './types';

import { Hono } from 'hono';
import { installGlobalConfig } from './middlewares';
import { RegisterApi } from './api';
import { bodyLimit } from 'hono/body-limit';
import RegisterSkinPage from './pages/skin';
import RegisterTestPage from './pages/test';

const app = new Hono<Env>();

// todo: 在生产环境隐藏日志详细信息，但在控制台照常输出
app.use('/*', bodyLimit({ maxSize: 8 * 1024 }));
app.use('/*', installGlobalConfig);

RegisterApi(app);

RegisterSkinPage(app);
RegisterTestPage(app);

export default app;
