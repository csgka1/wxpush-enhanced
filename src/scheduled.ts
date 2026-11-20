import type { Hono } from 'hono';
import * as Config from './config';
import { CHANNEL, type Env } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const ALIVE_TITLE = '保活测试';

export const ALIVE_CONTENT =
    '这是一条由定时任务自动发送的保活消息，无需处理。\n收到它说明微信公众号测试号仍在正常接收消息。';

/**
 * 判断本次触发是否到达保活间隔
 *
 */
export function isAliveDay(scheduledTime: number, days: number): boolean {
    const anchor = Date.UTC(2026, 0, 1);
    const daysSince = Math.floor((scheduledTime - anchor) / MS_PER_DAY);
    return daysSince % days === 0;
}

/**
 * 生成 Cron Trigger 的处理函数
 
 */
export function createScheduledHandler(app: Hono<Env>) {
    return async (
        controller: ScheduledController,
        env: Env['Bindings'],
        ctx: ExecutionContext,
    ): Promise<void> => {
        const config = Config.tryResolveAppConfig(env);
        if (!config) {
            return;
        }

        const days = config.global.ALIVE_DAYS;
        if (days === undefined || !isAliveDay(controller.scheduledTime, days)) {
            return;
        }

        const response = await app.request(
            '/api/send',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${env.API_TOKEN}`,
                },
                body: JSON.stringify({
                    title: ALIVE_TITLE,
                    content: ALIVE_CONTENT,
                    channel: CHANNEL.wechat,
                    acceptChannelFallback: false,
                }),
            },
            env,
            ctx,
        );

        const detail = await response.text();

        if (!response.ok) {
            console.error({
                event: 'alive_send_failed',
                cron: controller.cron,
                scheduledTime: new Date(controller.scheduledTime).toISOString(),
                intervalDays: days,
                status: response.status,
                response: detail,
            });
            return;
        }

        console.log({
            event: 'alive_sent',
            cron: controller.cron,
            scheduledTime: new Date(controller.scheduledTime).toISOString(),
            intervalDays: days,
            response: detail,
        });
    };
}
