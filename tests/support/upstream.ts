import { vi } from 'vitest';

export type UpstreamReply =
    { status?: number; json: unknown } | { status?: number; text: string };

export type UpstreamRoute = {
    /** 用于匹配请求 URL 的片段 */
    match: string;
    /** 依次取用的响应，用尽后重复最后一个 */
    replies: UpstreamReply[];
};

export type UpstreamCall = {
    url: string;
    method: string;
    body?: string;
};

/**
 * 替换全局 fetch，按 URL 片段把出站请求路由到预置响应。
 *
 * 未匹配到路由的请求会直接抛错，便于断言某条链路没有发出请求。
 */
export function stubUpstream(routes: UpstreamRoute[]) {
    const calls: UpstreamCall[] = [];
    const cursors = new Map<string, number>();

    const spy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async (input, init) => {
            const url =
                typeof input === 'string'
                    ? input
                    : input instanceof URL
                      ? input.href
                      : input.url;

            calls.push({
                url,
                method: init?.method ?? 'GET',
                body: typeof init?.body === 'string' ? init.body : undefined,
            });

            const route = routes.find(({ match }) => url.includes(match));
            if (!route) {
                throw new Error(`Unstubbed upstream request: ${url}`);
            }

            const cursor = cursors.get(route.match) ?? 0;
            cursors.set(route.match, cursor + 1);
            const reply =
                route.replies[Math.min(cursor, route.replies.length - 1)];
            const status = reply.status ?? 200;

            if ('text' in reply) {
                return new Response(reply.text, { status });
            }

            return new Response(JSON.stringify(reply.json), {
                status,
                headers: { 'Content-Type': 'application/json' },
            });
        });

    return {
        calls,
        /** 取出指定请求的 JSON 请求体 */
        jsonBody(index: number) {
            return JSON.parse(calls[index].body ?? 'null');
        },
        restore: () => spy.mockRestore(),
    };
}
