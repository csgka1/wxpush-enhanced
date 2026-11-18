import { z, ZodError } from 'zod';

import { CHANNEL, Env } from './types';
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

/**
 * 汇总 ZodError 中的 issues，避免日志里输出整段 schema 信息。
 */
function summarizeZodIssues(error: z.ZodError) {
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
        .map((s) => s.trim())
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
 * 已注入的渠道配置，未启用的渠道不存在对应条目。
 */
export type ChannelConfigs = {
    [C in CHANNEL]?: ValidatedChannelEnv<C>;
};

function parseChannelConfig<C extends CHANNEL>(
    channel: C,
    env: Env['Bindings'],
): ValidatedChannelEnv<C> {
    return {
        channel,
        config: channelSchemas[channel].parse(env),
    } as ValidatedChannelEnv<C>;
}

/**
 * 读取已注入的渠道配置。
 *
 * @throws { HTTPException } 渠道未启用，或对应配置未注入
 */
export function getChannelConfig<C extends CHANNEL>(
    c: Context<Env>,
    channel: C,
): ChannelConfigMap[C] {
    const entry = c.var.config.channels[channel];
    if (!entry) {
        console.error({ event: 'channel_config_missing', channel });
        throw new HTTPException(500, { message: 'Internal Server Error' });
    }

    return entry.config;
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
            .pipe(z.number().positive().min(1).max(3650).int())
            .optional(),
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

export type AppConfig = {
    global: GlobalEnv;
    channels: ChannelConfigs;
};

/**
 * 解析全局配置与所有已启用渠道的配置。
 *
 * @throws { z.ZodError } 全局配置或任一已启用渠道的配置不合法
 */
export function resolveConfig(env: Env['Bindings']): AppConfig {
    const global = validateGlobalEnv(env);

    const channels = Object.fromEntries(
        global.ENABLED_CHANNELS.map(
            (channel) => [channel, parseChannelConfig(channel, env)] as const,
        ),
    ) as ChannelConfigs;

    return { global, channels };
}

/**
 * 解析配置，失败时记录日志并返回 undefined。
 */
export function tryResolveConfig(env: Env['Bindings']): AppConfig | undefined {
    try {
        return resolveConfig(env);
    } catch (error) {
        if (error instanceof ZodError) {
            console.error({
                event: 'config_validation_error',
                issues: summarizeZodIssues(error),
            });
        } else {
            console.error(error);
        }
    }
}
