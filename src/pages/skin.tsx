import { marked } from 'marked';
import { Script } from 'vite-ssr-components/hono';
import { b64Decode, b64Encode, getBeijingTime, hmac } from '../util';
import { z } from 'zod';
import { type Hono } from 'hono';
import { renderer } from './renderer';
import { Env } from '../types';
import { checkSign, validate } from '../middlewares';
import sanitizeHtml from 'sanitize-html';
import { SEND_CONTENT_MAX_LENGTH, SEND_TITLE_MAX_LENGTH } from '../const';

type SkinProps = {
    title: string;
    message: string;
    date?: Date;
    truncatedCount: number;
};

const b64UrlCodec = z.codec(z.base64url(), z.string(), {
    decode: (value, ctx) => {
        try {
            return b64Decode(value, 'string', 'base64url');
        } catch {
            ctx.issues.push({
                code: 'custom',
                message: 'Expected valid Base64URL-encoded UTF-8 text.',
                input: value,
            });
            return z.NEVER;
        }
    },
    encode: (s) => b64Encode(s, 'base64url'),
});

const SkinSchema = z.object({
    title: b64UrlCodec
        .pipe(z.string().max(SEND_TITLE_MAX_LENGTH))
        .default('消息推送'),
    message: b64UrlCodec
        .pipe(z.string().max(SEND_CONTENT_MAX_LENGTH))
        .default('无告警信息'),
    timestamp: z
        .string()
        .transform(Number)
        .refine((n) => n >= 0 && Number.isInteger(n)),
    nonce: z.string().regex(/^[0-9a-fA-F]{1,64}$/),
    truncatedCount: z
        .string()
        .max(8)
        .regex(/^[0-9]*$/)
        .transform(Number)
        .default(0),
    sign: z.base64url(),
});

export type SkinPageParam = z.infer<typeof SkinSchema>;
type SignKeyRaw = Extract<'sign', keyof SkinPageParam>;
/**
 * 若 `SignKeyRaw` 解析为 `never`，
 * 则回退为一个不属于 `keyof any` 的对象类型，
 * 使 `Omit<..., SignKey>` 等使用处直接在编译期报错。
 */
type SignKey = [SignKeyRaw] extends [never]
    ? { readonly __error: 'SignKey resolved to never: check the sign key name' }
    : SignKeyRaw;

// 在日后对其他接口进行鉴权时，再考虑封装问题。
export function signSkinParam(
    { title, message, timestamp, nonce }: Omit<SkinPageParam, SignKey>,
    secret: string,
): string {
    const payload = [
        `message=${message}`,
        `nonce=${nonce}`,
        `timestamp=${timestamp}`,
        `title=${title}`,
    ].join('&');
    return hmac(payload, secret);
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
        validate('query', SkinSchema),
        checkSign<SkinPageParam>(
            (c) => c.req.valid('query').sign,
            (c) =>
                signSkinParam(
                    c.req.valid('query'),
                    c.var.config.global.SIGN_SECRET,
                ),
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
                    truncatedCount={params.truncatedCount}
                />,
            );
        },
    );
}

function Skin({ title, message, date, truncatedCount }: SkinProps) {
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

                    <div>
                        {truncatedCount > 0 ? (
                            <div class="info-content">
                                <br />
                                <b>
                                    <i>
                                        {' '}
                                        ... 由于内容过长，消息被截断了{' '}
                                        {truncatedCount} 字符。
                                    </i>
                                </b>
                            </div>
                        ) : (
                            ''
                        )}
                    </div>
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
