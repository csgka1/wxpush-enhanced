import { zValidator, type Hook } from '@hono/zod-validator';
import {
    type Context,
    type MiddlewareHandler,
    type ValidationTargets,
} from 'hono';

import { timingSafeEqual } from 'hono/utils/buffer';

import type { Env } from './types';
import { HTTPException } from 'hono/http-exception';
import { bearerAuth } from 'hono/bearer-auth';
import * as Config from './config';
import { z, ZodError, type ZodType } from 'zod';

export const auth_token: MiddlewareHandler<Env> = async (c, next) => {
    const authQuery = c.req.query('token');
    // Validate query if query is sent, otherwise validate Header instead
    if (!authQuery) {
        return bearerAuth<Env>({
            verifyToken: async (token, c) =>
                timingSafeEqual(token, c.env.API_TOKEN),
        })(c, next);
    } else {
        if (!(await timingSafeEqual(authQuery, c.env.API_TOKEN))) {
            throw new HTTPException(403);
        }
    }
    await next();
};

export const installGlobalConfig: MiddlewareHandler<Env> = async (c, next) => {
    try {
        const config = Config.validateGlobalEnv(c.env);
        c.set('globalConfig', config);
    } catch (err) {
        if (err instanceof ZodError) {
            console.log(`[ERROR] [Global Config] ${err.message}`);
        } else {
            console.log(err);
        }
        throw new HTTPException(500, {
            message: 'Internal Server Error',
        });
    }
    await next();
};

export function validate<
    Target extends keyof ValidationTargets,
    Schema extends ZodType,
>(target: Target, schema: Schema) {
    const hook: Hook<z.output<Schema>, Env, string, Target, object, Schema> = (
        result,
        c,
    ) => {
        if (result.success) {
            return;
        }

        console.error({
            event: 'zod_validation_error',
            requestId: c.var.requestId,
            cfRay: c.req.header('Cf-Ray'), // 关联 Cloudflare 请求。对于非 Cloudflare Workers 环境，此项不存在。
            method: c.req.method,
            path: c.req.path,
            target: result.target,
            issues: result.error.issues.map(({ code, path, message }) => ({
                code,
                path,
                message,
            })),
        });

        return c.json(
            {
                success: false,
                message: 'Invalid request',
                requestId: c.var.requestId,
            },
            400,
        );
    };

    return zValidator<Schema, Target, Env, string, typeof hook>(
        target,
        schema,
        hook,
    );
}

export const checkSign = <Query>(
    getClientSign: (
        c: Context<Env, string, { out: { query: Query } }>,
    ) => string,
    getServerSign: (
        c: Context<Env, string, { out: { query: Query } }>,
    ) => string,
): MiddlewareHandler<Env, string, { out: { query: Query } }> => {
    return async (c, next) => {
        const clientSign = getClientSign(c);
        const serverSign = getServerSign(c);
        if (!(await timingSafeEqual(clientSign, serverSign))) {
            throw new HTTPException(403, {
                message: 'Invalid Sign',
            });
        }

        await next();
    };
};
