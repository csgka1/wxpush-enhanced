import { Hono } from 'hono';
import { z } from 'zod';

import { validate } from '../middlewares';
import { CHANNEL, type Env } from '../types';
import { handleSmtpSend } from './smtp';
import { handleWecomSend } from './wecom';
import { handleWxSend } from './wxsend';
import { SEND_CONTENT_MAX_LENGTH, SEND_TITLE_MAX_LENGTH } from '../const';

type SendHandler = typeof handleWxSend;

const sendHandlers: Record<CHANNEL, SendHandler> = {
    [CHANNEL.wechat]: handleWxSend,
    [CHANNEL.wecom]: handleWecomSend,
    [CHANNEL.smtp]: handleSmtpSend,
};

const sendSchema = z
    .object({
        title: z.string().max(SEND_TITLE_MAX_LENGTH),
        content: z.string().max(SEND_CONTENT_MAX_LENGTH),
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
        const { global, channels } = c.var.config;

        const fallback = acceptChannelFallback
            ? global.DEFAULT_CHANNEL
            : undefined;
        const channel =
            requestedChannel && channels[requestedChannel]
                ? requestedChannel
                : fallback;

        if (!channel) {
            return c.json({ msg: 'No available channel.' }, 400);
        }

        return sendHandlers[channel](c, title, content);
    },
);
