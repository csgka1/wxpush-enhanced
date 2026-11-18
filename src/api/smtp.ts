import { WorkerMailer } from '@workermailer/smtp';
import type { Context } from 'hono';

import { getChannelConfig } from '../config';
import { CHANNEL, type Env } from '../types';

export async function handleSmtpSend(
    c: Context<Env>,
    title: string,
    content: string,
) {
    const {
        SMTP_URL: smtp,
        SMTP_FROM: from,
        SMTP_TO: to,
    } = getChannelConfig(c, CHANNEL.smtp);

    let mailer: WorkerMailer | undefined;
    try {
        mailer = await WorkerMailer.connect({
            host: smtp.hostname,
            port: smtp.port,
            secure: true,
            startTls: false,
            authType: ['plain', 'login'],
            credentials: {
                username: smtp.username,
                password: smtp.password,
            },
        });

        await mailer.send({
            from,
            to,
            subject: title.replace(/[\r\n]+/g, ' '),
            text: content,
        });

        return c.json({
            msg: `Successfully sent email to ${to.length} recipient(s).`,
        });
    } catch (error) {
        console.error('[smtp] Failed to send email:', error);
        const message =
            error instanceof Error ? error.message : 'Unknown error';
        return c.json({ msg: `Failed to send email: ${message}` }, 502);
    } finally {
        if (mailer) {
            try {
                await mailer.close();
            } catch (error) {
                console.error('[smtp] Failed to close SMTP connection:', error);
            }
        }
    }
}
