import type { Context } from 'hono';

import type { Env } from '../types';

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
    const markdown = formatWecomMarkdown(title, content);
    if (new TextEncoder().encode(markdown).byteLength > 4096) {
        return c.json(
            {
                msg: 'WeCom markdown content, including the title, must not exceed 4096 UTF-8 bytes.',
            },
            400,
        );
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
                msgtype: 'markdown',
                markdown: { content: markdown },
            }),
        });
        const data = (await response.json()) as WecomApiResponse;

        if (!response.ok || data.errcode !== 0) {
            throw new Error(
                data.errmsg ?? response.statusText ?? 'Unknown error',
            );
        }

        return c.json({ msg: 'Successfully sent message to WeCom group.' });
    } catch (error) {
        console.error('[wecom] Failed to send WeCom message:', error);
        const message =
            error instanceof Error ? error.message : 'Unknown error';
        return c.json({ msg: `Failed to send WeCom message: ${message}` }, 502);
    }
}
