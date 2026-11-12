import type { Context } from 'hono';

import type { Env } from '../types';
import { truncateUtf8 } from '../util';

export function formatWecomMarkdown(title: string, content: string): string {
    return `# ${title}\n\n${content}`;
}

type WecomApiResponse = {
    errcode?: number;
    errmsg?: string;
};

export async function handleWecomSend(
    c: Context<Env>,
    title: string,
    content: string,
) {
    const WECOM_BYTES_LIMIT = 4096;
    const md = formatWecomMarkdown(title, content);
    let truncatedMd = md;
    if (Buffer.from(md).length >= WECOM_BYTES_LIMIT) {
        const replacer = ' ...[消息过长被截断]';
        const replacerBytes=Buffer.from(replacer);
        truncatedMd = truncateUtf8(md, WECOM_BYTES_LIMIT - replacerBytes.length) + replacer;
    }

    const url = c.env.WECOM_WEBHOOK_URL;
    if (!url) {
        return c.json(
            { msg: 'Missing required configuration: WECOM_WEBHOOK_URL' },
            500,
        );
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify({
                msgtype: 'markdown_v2',
                markdown_v2: { content: truncatedMd },
            }),
        });
        const data = (await response.json()) as WecomApiResponse;

        if (!response.ok || data.errcode !== 0) {
            throw new Error(
                data.errmsg ?? response.statusText ?? 'Unknown error',
            );
        }

        return c.json({ msg: `Successfully sent message to WeCom group.` });
    } catch (error) {
        console.error('[wecom] Failed to send WeCom message:', error);
        const message =
            error instanceof Error ? error.message : 'Unknown error';
        return c.json({ msg: `Failed to send WeCom message: ${message}` }, 502);
    }
}
