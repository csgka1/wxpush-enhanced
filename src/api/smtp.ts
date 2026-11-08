import { WorkerMailer } from '@workermailer/smtp';
import type { Context } from 'hono';

import { parseSmtpsUrl } from '../config';
import type { Env } from '../types';

const MAX_RECIPIENTS = 50;

export async function handleSmtpSend(
    c: Context<Env>,
    title: string,
    content: string,
) {
    const { SMTP_URL, SMTP_FROM, SMTP_TO } = c.env;
    const recipients =
        SMTP_TO?.split('|')
            .map((address) => address.trim())
            .filter(Boolean) ?? [];

    let smtpConnection;
    try {
        if (!SMTP_URL) {
            throw new Error('SMTP_URL is required.');
        }
        smtpConnection = parseSmtpsUrl(SMTP_URL);
    } catch (error) {
        console.error('[smtp] Invalid SMTP configuration.');
        return c.json(
            {
                msg:
                    error instanceof Error
                        ? error.message
                        : 'Invalid SMTP_URL configuration.',
            },
            500,
        );
    }

    if (
        !SMTP_FROM ||
        !SMTP_TO ||
        !recipients.length ||
        recipients.length > MAX_RECIPIENTS
    ) {
        console.error('[smtp] Invalid SMTP sender or recipient configuration.');
        return c.json(
            {
                msg: 'Invalid SMTP configuration: configure SMTP_FROM and 1-50 SMTP_TO recipients.',
            },
            500,
        );
    }

    let mailer: WorkerMailer | undefined;
    try {
        mailer = await WorkerMailer.connect({
            host: smtpConnection.hostname,
            port: smtpConnection.port,
            secure: true,
            startTls: false,
            authType: ['plain', 'login'],
            credentials: {
                username: smtpConnection.username,
                password: smtpConnection.password,
            },
        });

        await mailer.send({
            from: SMTP_FROM,
            to: recipients,
            subject: title.replace(/[\r\n]+/g, ' '),
            text: content,
        });

        return c.json({
            msg: `Successfully sent email to ${recipients.length} recipient(s).`,
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
