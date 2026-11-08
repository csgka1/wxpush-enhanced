import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { validateGlobalEnv } from "../config";
import { CHANNEL, type Env } from "../types";
import { handleSmtpSend } from "./smtp";
import { handleWecomSend } from "./wecom";
import { handleWxSend } from "./wxsend";

type SendHandler = typeof handleWxSend;

const sendHandlers: Record<CHANNEL, SendHandler> = {
    [CHANNEL.wechat]: handleWxSend,
    [CHANNEL.wecom]: handleWecomSend,
    [CHANNEL.smtp]: handleSmtpSend
};

const sendSchema = z
    .object({
        title: z.string().min(1),
        content: z.string().min(1),
        channel: z.enum(CHANNEL).optional(),
        acceptDefaultChannel: z.boolean().default(false),
    })
    .strict();

export const send = new Hono<Env>().post(
    "/",
    zValidator("json", sendSchema),
    async (c) => {
        const { title, content, channel: requestedChannel } = c.req.valid("json");
        let globalConfig: ReturnType<typeof validateGlobalEnv>;

        try {
            globalConfig = validateGlobalEnv(c);
        } catch (error) {
            console.error("[send] Invalid global environment configuration:", error);
            return c.json(
                { msg: "Invalid global environment configuration." },
                500
            );
        }

        const channel = requestedChannel ?? globalConfig.DEFAULT_CHANNEL;
        if (!channel || !globalConfig.ENABLED_CHANNELS.includes(channel)) {
            return c.json(
                { msg: "No available channel." },
                400
            );
        }

        return sendHandlers[channel](c, title, content);
    }
);
