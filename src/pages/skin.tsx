import { marked } from 'marked';
import { Script } from 'vite-ssr-components/hono';
import { getBeijingTime } from '../util';
import { z } from 'zod';
import { type Hono } from 'hono';
import { renderer } from './renderer';
import { zValidator } from '@hono/zod-validator';
import { Env } from '../types';

type SkinProps = {
    title: string;
    message: string;
    date?: Date;
};

const SkinSchema = z.object({
    title: z.string().default('消息推送'),
    message: z.string().default('无告警信息'),
    date: z.number().nonnegative(),
});

export type SkinPageParam = z.infer<typeof SkinSchema>;

export default function RegisterSkinPage(app: Hono<Env>) {
    /**
     * 消息展示页
     *
     * params:
     *  - title: string
     *  - message: string
     *  - date: string
     */
    app.get('/skin', renderer, zValidator('query', SkinSchema), async (c) => {
        c.set('pageTitle', '消息推送');
        const params = c.req.valid('query');

        return c.render(
            <Skin
                title={params.title || '消息推送'}
                message={params.message || '无信息'}
                date={params.date ? new Date(params.date) : undefined}
            />,
        );
    });
}

function Skin({ title, message, date }: SkinProps) {
    const parsedMarkdown = marked.parse(message, { async: false });
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
