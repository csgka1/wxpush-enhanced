import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendRequest } from '../support/app';
import { makeEnv } from '../support/env';

const mailer = vi.hoisted(() => ({
    connect: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
}));

vi.mock('@workermailer/smtp', () => ({
    WorkerMailer: { connect: mailer.connect },
}));

const env = makeEnv({ ENABLED_CHANNELS: 'smtp', DEFAULT_CHANNEL: 'smtp' });

beforeEach(() => {
    mailer.connect.mockReset();
    mailer.send.mockReset();
    mailer.close.mockReset();

    mailer.connect.mockResolvedValue({
        send: mailer.send,
        close: mailer.close,
    });
    mailer.send.mockResolvedValue(undefined);
    mailer.close.mockResolvedValue(undefined);
});

describe('SMTP 邮件推送', () => {
    it('使用渠道配置建立 SMTPS 连接', async () => {
        await sendRequest({ title: '标题', content: '内容' }, env);

        expect(mailer.connect).toHaveBeenCalledWith({
            host: 'smtp.example.com',
            port: 465,
            secure: true,
            startTls: false,
            authType: ['plain', 'login'],
            credentials: {
                username: 'notify@example.com',
                password: 'p@ssw0rd',
            },
        });
    });

    it('发送后关闭连接并报告收件人数量', async () => {
        const response = await sendRequest(
            { title: '标题', content: '内容' },
            env,
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            msg: 'Successfully sent email to 2 recipient(s).',
        });
        expect(mailer.send).toHaveBeenCalledWith({
            from: 'notify@example.com',
            to: ['destA@example.com', 'destB@example.com'],
            subject: '标题',
            text: '内容',
        });
        expect(mailer.close).toHaveBeenCalledTimes(1);
    });

    it('主题中的换行被替换为空格', async () => {
        await sendRequest(
            { title: '第一行\n第二行\r\n第三行', content: '内容' },
            env,
        );

        expect(mailer.send.mock.calls[0][0].subject).toBe(
            '第一行 第二行 第三行',
        );
    });

    it('发信失败时返回 502 且仍然关闭连接', async () => {
        mailer.send.mockRejectedValue(new Error('mailbox unavailable'));

        const response = await sendRequest(
            { title: '标题', content: '内容' },
            env,
        );

        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
            msg: 'Failed to send email: mailbox unavailable',
        });
        expect(mailer.close).toHaveBeenCalledTimes(1);
    });
});
