import type { Context } from 'hono';

import { getChannelConfig } from '../config';
import { signSkinParam, SkinPageParam } from '../pages/skin';
import { CHANNEL, type Env } from '../types';
import { b64Encode, truncate_and_replace, truncateUtf8 } from '../util';

type WeChatApiResponse = {
    errcode?: number;
    errmsg?: string;
    access_token?: string;
};

async function getStableToken(appid: string, secret: string): Promise<string> {
    const response = await fetch(
        'https://api.weixin.qq.com/cgi-bin/stable_token',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify({
                grant_type: 'client_credential',
                appid,
                secret,
                force_refresh: false,
            }),
        },
    );

    const data = (await response.json()) as WeChatApiResponse;
    if (!response.ok || !data.access_token || data.errcode) {
        throw new Error(
            `Failed to get WeChat access token: ${data.errmsg ?? response.statusText}`,
        );
    }

    return data.access_token;
}

async function sendWxMessage(
    accessToken: string,
    userid: string,
    templateId: string,
    baseUrl: string,
    title: string,
    content: string,
    c: Context<Env>,
): Promise<WeChatApiResponse> {
    let messageUrl = (() => {
        try {
            return new URL('/skin', baseUrl);
        } catch {
            return;
        }
    })();
    if (!messageUrl) {
        throw new Error('cannot assemble Url');
    }
    const signKey = 'sign' satisfies keyof SkinPageParam;

    /**
     * 微信限制 URL 长度最大为 10240，此处为其他参数留出余量
     */
    const SKIN_MESSAGE_MAX_B64_BYTES = 8192;

    const SKIN_MESSAGE_MAX_BYTES = SKIN_MESSAGE_MAX_B64_BYTES * (3 / 4);

    const truncatedContent = truncateUtf8(content, SKIN_MESSAGE_MAX_BYTES);

    const params = {
        message: truncatedContent,
        timestamp: Date.now(),
        title: title,
        nonce: Math.floor(Math.random() * 0x7fffffff).toString(16),
        truncatedCount: Math.abs(content.length - truncatedContent.length),
    } satisfies Omit<SkinPageParam, typeof signKey>;

    const sign = signSkinParam(params, c.var.config.global.SIGN_SECRET);

    for (const [key, value] of Object.entries(params)) {
        const encodedValue =
            key === 'message' || key === 'title'
                ? b64Encode(value.toString(), 'base64url')
                : value.toString();
        messageUrl.searchParams.set(key, encodedValue);
    }
    messageUrl.searchParams.set(signKey, sign);

    const WX_TEMPLATE_THING_LENGTH_LIMIT = 20;
    const response = await fetch(
        `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${encodeURIComponent(accessToken)}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify({
                touser: userid,
                template_id: templateId,
                url: messageUrl,
                data: {
                    thing01: {
                        value: truncate_and_replace(
                            title,
                            WX_TEMPLATE_THING_LENGTH_LIMIT,
                        ),
                    },
                    thing02: {
                        value: truncate_and_replace(
                            content,
                            WX_TEMPLATE_THING_LENGTH_LIMIT,
                        ),
                    },
                },
            }),
        },
    );

    if (c.var.config.global.DEBUG) {
        console.log(`${messageUrl.href}`);
    }

    if (!response.ok) {
        throw new Error(
            `WeChat message request failed: ${response.statusText}`,
        );
    }

    return (await response.json()) as WeChatApiResponse;
}

export async function handleWxSend(
    c: Context<Env>,
    title: string,
    content: string,
) {
    const {
        WX_APPID: appid,
        WX_SECRET: secret,
        WX_USERID: userIds,
        WX_TEMPLATE_ID: templateId,
        WX_BASE_URL: baseUrl,
    } = getChannelConfig(c, CHANNEL.wechat);

    try {
        const accessToken = await getStableToken(appid, secret);
        const results = await Promise.all(
            userIds.map((userid) =>
                sendWxMessage(
                    accessToken,
                    userid,
                    templateId,
                    baseUrl,
                    title,
                    content,
                    c,
                ),
            ),
        );
        const successfulCount = results.filter(
            (result) => result.errcode === 0 || result.errmsg === 'ok',
        ).length;

        if (successfulCount > 0) {
            return c.json({
                msg: `Successfully sent messages to ${successfulCount} user(s).`,
            });
        }

        const firstError = results[0];
        return c.json(
            {
                msg: `Failed to send messages. First error: ${firstError.errmsg ?? 'Unknown Error'}, errcode=${firstError.errcode ?? '[unknown]'}`,
            },
            502,
        );
    } catch (error) {
        console.error('[wxsend] Failed to send WeChat message:', error);
        const message =
            error instanceof Error ? error.message : 'Unknown error';
        return c.json(
            { msg: `Failed to send WeChat message: ${message}` },
            502,
        );
    }
}
