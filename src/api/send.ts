import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { CHANNEL, type Env } from "../types";
import { handleWecomSend } from "./wecom";
import { handleWxSend } from "./wxsend";

type SendHandler = typeof handleWxSend;

const sendHandlers: Record<CHANNEL, SendHandler> = {
    [CHANNEL.wechat]: handleWxSend,
    [CHANNEL.wecom]: handleWecomSend
};

const sendSchema = z
    .object({
        title: z.string().min(1),
        content: z.string().min(1),
        channel: z.enum(CHANNEL).optional()
    })
    .strict();

function isChannelEnum(value: string | undefined): value is CHANNEL {
    return Object.values(CHANNEL).includes(value as CHANNEL);
}

export const send = new Hono<Env>().post(
    "/",
    zValidator("json", sendSchema),
    async (c) => {
        const { title, content, channel: requestedChannel } = c.req.valid("json");
        const channel = requestedChannel ?? c.env.DEFAULT_CHANNEL;

        if (!isChannelEnum(channel)) {
            console.error("[send] Invalid DEFAULT_CHANNEL configuration:", channel);
            return c.json(
                { msg: "Invalid DEFAULT_CHANNEL configuration: expected 'wechat' or 'wecom'." },
                500
            );
        }

        return sendHandlers[channel](c, title, content);
    }
);
