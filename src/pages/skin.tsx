import { marked } from 'marked';
import { Script } from 'vite-ssr-components/hono';
import { getBeijingTime, hmac } from '../util';
import { z } from 'zod';
import { Context, type Hono } from 'hono';
import { renderer } from './renderer';
import { zValidator } from '@hono/zod-validator';
import { Env } from '../types';
import { checkSign } from '../middlewares';
import sanitizeHtml from 'sanitize-html';

type SkinProps = {
    title: string;
    message: string;
    date?: Date;
};

const SkinSchema = z.object({
    title: z.string().default('消息推送'),
    message: z.string().default('无告警信息'),
    timestamp: z
        .string()
        .transform(Number)
        .refine((n) => n >= 0 && Number.isInteger(n)),
    nonce: z.string().regex(/^[0-9a-fA-F]{1,64}$/),
    presharedSign: z.base64(),
});

export type SkinPageParam = z.infer<typeof SkinSchema>;
type SignKey = Extract<'presharedSign', keyof SkinPageParam>;

// 在日后对其他接口进行鉴权时，再考虑封装问题。
export function signSkinParam(
    { title, message, timestamp, nonce }: Omit<SkinPageParam, SignKey>,
    c: Context<Env>,
): string {
    const payload = [
        `message=${message}`,
        `nonce=${nonce}`,
        `timestamp=${timestamp}`,
        `title=${title}`,
    ].join('&');
    return hmac(payload, c.var.globalConfig.SIGN_SECRET);
}

export default function RegisterSkinPage(app: Hono<Env>) {
    /**
     * 消息展示页
     *
     * params:
     *  - title: string
     *  - message: string
     *  - date: string
     */
    app.get(
        '/skin',
        renderer,
        zValidator('query', SkinSchema, (result, c) => {
            if (!result.success) {
                // todo: only DEBUG
                console.log(
                    `${c.req.path} has met error during Zod Validation:`,
                );
                console.log('ERROR:\n', result.error);
                console.log('DATA:\n', result.data);
                console.log(`REQ:`, c.req);
            }
        }),
        checkSign<SkinPageParam>(
            (c) => c.req.valid('query').presharedSign,
            (c) => signSkinParam(c.req.valid('query'), c),
        ),
        async (c) => {
            c.set('pageTitle', '消息推送');
            const params = c.req.valid('query');
            return c.render(
                <Skin
                    title={params.title || '消息推送'}
                    message={params.message || '无信息'}
                    date={
                        params.timestamp
                            ? new Date(params.timestamp)
                            : undefined
                    }
                />,
            );
        },
    );
}

function Skin({ title, message, date }: SkinProps) {
    const parsedMarkdown = sanitizeHtml(
        marked.parse(message, { async: false }),
        {
            allowedTags: [
                'p',
                'br',
                'strong',
                'em',
                'del',
                'blockquote',
                'ul',
                'ol',
                'li',
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'h6',
                'pre',
                'code',
                'hr',
                'a',
                'img',
                'table',
                'thead',
                'tbody',
                'tr',
                'th',
                'td',
            ],
            allowedAttributes: {
                a: ['href', 'title'],
                img: ['src', 'alt', 'title'],
            },
            allowedSchemes: ['https', 'http', 'mailto'],
            allowedSchemesByTag: {
                img: ['https', 'http'],
            },
            allowProtocolRelative: false,
        },
    );

    return (
        <div>
            <div id="particles-root"></div>

            <div class="container pulse">
                <div class="title">{title}</div>

                <div class="info-card">
                    <div class="info-label">通知内容</div>
                    <div
                        class="info-content"
                        id="message"
                        dangerouslySetInnerHTML={{ __html: parsedMarkdown }}
                    />
                </div>

                <div class="info-card">
                    <div class="info-label">时间</div>
                    <div class="info-content">
                        {date ? getBeijingTime(date) : '无日期信息'}
                    </div>
                </div>
            </div>
            <Script src="/src/client/skin.client.tsx" />
        </div>
    );
}
