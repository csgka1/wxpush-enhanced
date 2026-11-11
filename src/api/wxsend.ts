import type { Context } from 'hono';

import type { Env } from '../types';
import { signSkinParam, SkinPageParam } from '../pages/skin';

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

/**
 * 返回截短后的预览文本，以适应文字长度限制
 */
function trim_text(text: string, limit: number) {
    if (limit < 0) {
        limit = 0;
    }
    limit = Math.floor(limit);
    if (text.length <= limit) {
        return text;
    } else {
        if (limit <= 1) {
            return '';
        } else if (limit == 2) {
            return '..';
        } else if (limit === 3) {
            return '...';
        } else {
            return text.substring(0, limit - 3) + '...';
        }
    }
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
    const signKey = 'presharedSign' satisfies keyof SkinPageParam;
    const params = {
        message: content,
        timestamp: Date.now(),
        title: title,
        nonce: Math.floor(Math.random() * 0x7fffffff).toString(16),
    } satisfies Omit<SkinPageParam, typeof signKey>;

    const sign = signSkinParam(params, c);

    for (const [key, value] of Object.entries(params)) {
        messageUrl.searchParams.set(key, value.toString());
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
                    thing01: { value: trim_text(title, WX_TEMPLATE_THING_LENGTH_LIMIT) },
                    thing02: { value: trim_text(content, WX_TEMPLATE_THING_LENGTH_LIMIT) },
                },
            }),
        },
    );

    // TODO: 日后若有多处 DEBUG 需求，应将方法封装到 c.var.logger 中
    if (c.var.globalConfig.DEBUG) {
        console.log(`href = ${messageUrl.href}, hrefLength=${messageUrl.href.length}`);
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
    const appid = c.env.WX_APPID;
    const secret = c.env.WX_SECRET;
    const userIds =
        c.env.WX_USERID?.split('|')
            .map((userid) => userid.trim())
            .filter(Boolean) ?? [];
    const templateId = c.env.WX_TEMPLATE_ID;
    const baseUrl = c.env.WX_BASE_URL;

    if (!appid || !secret || !userIds.length || !templateId || !baseUrl) {
        return c.json(
            {
                msg: 'Missing required configuration: WX_APPID, WX_SECRET, WX_USERID, WX_TEMPLATE_ID, WX_BASE_URL',
            },
            500,
        );
    }

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
            { msg: `Failed to send messages. First error: ${firstError.errmsg ?? 'Unknown Error'}, errcode=${firstError.errcode ?? '[unknown]'}` },
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
