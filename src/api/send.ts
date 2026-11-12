import { Hono } from 'hono';
import { z } from 'zod';

import { validate } from '../middlewares';
import { CHANNEL, type Env } from '../types';
import { handleSmtpSend } from './smtp';
import { handleWecomSend } from './wecom';
import { handleWxSend } from './wxsend';

type SendHandler = typeof handleWxSend;

const sendHandlers: Record<CHANNEL, SendHandler> = {
    [CHANNEL.wechat]: handleWxSend,
    [CHANNEL.wecom]: handleWecomSend,
    [CHANNEL.smtp]: handleSmtpSend,
};

const sendSchema = z
    .object({
        title: z.string().max(128),
        content: z.string().max(4096),
        channel: z.enum(CHANNEL).optional(),
        acceptChannelFallback: z.boolean().default(true), // fallback to default
    })
    .strict();

export const send = new Hono<Env>().post(
    '/',
    validate('json', sendSchema),
    async (c) => {
        const {
            title,
            content,
            channel: requestedChannel,
            acceptChannelFallback,
        } = c.req.valid('json');
        const globalConfig = c.var.globalConfig;

        const channel =
            requestedChannel === undefined
                ? globalConfig.DEFAULT_CHANNEL
                : globalConfig.ENABLED_CHANNELS.includes(requestedChannel)
                  ? requestedChannel
                  : acceptChannelFallback
                    ? globalConfig.DEFAULT_CHANNEL
                    : undefined;

        if (!channel || !globalConfig.ENABLED_CHANNELS.includes(channel)) {
            return c.json({ msg: 'No available channel.' }, 400);
        }

        return sendHandlers[channel](c, title, content);
    },
);
