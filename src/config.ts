import { z } from 'zod';

import { CHANNEL, Env } from './types';
import { Context } from 'hono';

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
        WX_USERID: z.string().min(1),
        WX_TEMPLATE_ID: z.string().min(1),
        WX_BASE_URL: z.url(),
    }),
    [CHANNEL.wecom]: z.object({
        WECOM_WEBHOOK_URL: z.url(),
    }),
    [CHANNEL.smtp]: z.object({
        SMTP_URL: z
            .string()
            .min(1)
            .refine((value) => {
                try {
                    parseSmtpsUrl(value);
                    return true;
                } catch {
                    return false;
                }
            }, 'Expected an valid SMTPS URL.'),
        SMTP_FROM: z.email(),
        SMTP_TO: z.string().min(1),
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
            .transform((s) => s.split(',').map((value) => value.trim()))
            .pipe(z.array(z.enum(CHANNEL)).min(1))
            .refine(
                (channels) => new Set(channels).size === channels.length,
                'ENABLED_CHANNELS must not contain duplicates.',
            ),
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
export function validateGlobalEnv(c: Context<Env>) {
    return globalEnvScheme.parse(c.env);
}

export type GlobalEnv = z.infer<typeof globalEnvScheme>;
