import { z } from 'zod';

import { CHANNEL, Env } from './types';
import { Context } from 'hono';

/**
 * 汇总 ZodError 中的 issues，避免日志里输出整段 schema 信息。
 */
export function summarizeZodIssues(error: z.ZodError) {
    return error.issues.map(({ code, path, message }) => ({
        code,
        path,
        message,
    }));
}

/**
 * 把 `|` 或 `,` 分隔的环境变量解析为去掉空项后的数组。
 *
 * # Example
 * - `"a, b, c"` => `['a', 'b', 'c']`
 *
 * - `"a | b | c"` => `['a', 'b', 'c']`
 */
const splitEnvArray = (s: string) =>
    s
        .replaceAll(',', '|')
        .split('|')
        .map(String.prototype.trim)
        .filter(Boolean);

type SmtpsConnection = {
    hostname: string;
    port: 465;
    username: string;
    password: string;
};

/**
 * 解析 SMTPS URL
 */
export function parseSmtpsUrl(value: string): SmtpsConnection {
    const url = new URL(value);
    if (
        url.protocol !== 'smtps:' ||
        !url.hostname ||
        (url.port && url.port !== '465') ||
        !url.username ||
        !url.password ||
        (url.pathname !== '' && url.pathname !== '/') ||
        url.search ||
        url.hash
    ) {
        throw new Error(
            'SMTP_URL must be an SMTPS URL with credentials and valid port.',
        );
    }

    let username: string;
    let password: string;
    try {
        username = decodeURIComponent(url.username);
        password = decodeURIComponent(url.password);
    } catch {
        throw new Error('SMTP_URL contains invalid encoded credentials.');
    }

    if (!username || !password) {
        throw new Error('SMTP_URL must include a username and password.');
    }

    return {
        hostname: url.hostname,
        port: 465,
        username,
        password,
    };
}

const channelSchemas = {
    [CHANNEL.wechat]: z.object({
        WX_APPID: z.string().min(1),
        WX_SECRET: z.string().min(1),
        WX_USERID: z
            .string()
            .transform(splitEnvArray)
            .pipe(z.array(z.string()).min(1)),
        WX_TEMPLATE_ID: z.string().min(1),
        WX_BASE_URL: z.url(),
    }),
    [CHANNEL.wecom]: z.object({
        WECOM_WEBHOOK_URL: z.url(),
    }),
    [CHANNEL.smtp]: z.object({
        SMTP_URL: z.string().transform((value, ctx) => {
            try {
                return parseSmtpsUrl(value);
            } catch (error) {
                ctx.issues.push({
                    code: 'custom',
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Invalid SMTP_URL configuration.',
                    input: value,
                });
                return z.NEVER;
            }
        }),
        SMTP_FROM: z.email(),
        SMTP_TO: z
            .string()
            .transform(splitEnvArray)
            .pipe(z.array(z.string()).min(1).max(50)),
    }),
} satisfies Record<CHANNEL, z.ZodType>;

type ChannelConfigMap = {
    [C in CHANNEL]: z.output<(typeof channelSchemas)[C]>;
};

export type ValidatedChannelEnv<C extends CHANNEL = CHANNEL> = {
    [K in C]: {
        channel: K;
        config: ChannelConfigMap[K];
    };
}[C];

/**
 * 验证指定推送渠道的环境变量配置，并返回经过类型转换后的配置
 * @throws { z.ZodError }
 */
export function validateChannelEnv<C extends CHANNEL>(
    channel: C,
    c: Context<Env>,
): ValidatedChannelEnv<C> {
    return {
        channel,
        config: channelSchemas[channel].parse(c.env),
    } as ValidatedChannelEnv<C>;
}

const globalEnvScheme = z
    .object({
        API_TOKEN: z.string().regex(/^[a-zA-Z0-9_\-=]+$/),
        SIGN_SECRET: z.string().regex(/^[a-zA-Z0-9]{10,32}$/),
        DEFAULT_CHANNEL: z.enum(CHANNEL).optional(),
        ENABLED_CHANNELS: z
            .string()
            .trim()
            .min(1)
            .transform(splitEnvArray)
            .pipe(z.array(z.enum(CHANNEL)).min(1))
            .refine(
                (channels) => new Set(channels).size === channels.length,
                'ENABLED_CHANNELS must not contain duplicates.',
            ),
        DEBUG: z.string().transform(Number).transform(Boolean).default(false),
        ALIVE_DAYS: z
            .string()
            .transform(Number)
            .optional()
            .pipe(z.number().positive().min(1).max(3650).int()),
    })
    .superRefine(({ DEFAULT_CHANNEL, ENABLED_CHANNELS }, ctx) => {
        if (DEFAULT_CHANNEL && !ENABLED_CHANNELS.includes(DEFAULT_CHANNEL)) {
            ctx.addIssue({
                code: 'custom',
                path: ['DEFAULT_CHANNEL'],
                message:
                    'DEFAULT_CHANNEL must be included in ENABLED_CHANNELS.',
            });
        }
    });

/**
 * 验证全局环境变量配置，并返回经过类型转换后的配置
 *
 * @throws { z.ZodError }
 *
 */
export function validateGlobalEnv(env: Env['Bindings']) {
    return globalEnvScheme.parse(env);
}

export type GlobalEnv = z.infer<typeof globalEnvScheme>;
