import type { Hono, Env as LibEnv } from 'hono';

import { auth_token } from '../middlewares';
import { send } from './send';

export const RegisterApi = <Env extends LibEnv>(app: Hono<Env>) => {
    app.use('/api/*', auth_token);
    app.route('/api/send', send);
};
