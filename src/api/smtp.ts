import { WorkerMailer } from '@workermailer/smtp';
import type { Context } from 'hono';

import { validateChannelEnv } from '../config';
import { CHANNEL } from '../types';
import type { Env } from '../types';
import { ZodError } from 'zod';

export async function handleSmtpSend(
    c: Context<Env>,
    title: string,
    content: string,
) {
    let config;
    try {
        config = validateChannelEnv(CHANNEL.smtp, c).config;
    } catch (error) {
        if (!(error instanceof ZodError)) {
            throw error;
        }

        console.error({
            event: 'smtp_configuration_error',
            issues: error.issues.map(({ code, path, message }) => ({
                code,
                path,
                message,
            })),
        });
        return c.json({ msg: 'Invalid SMTP configuration.' }, 500);
    }

    let mailer: WorkerMailer | undefined;
    try {
        mailer = await WorkerMailer.connect({
            host: config.SMTP_URL.hostname,
            port: config.SMTP_URL.port,
            secure: true,
            startTls: false,
            authType: ['plain', 'login'],
            credentials: {
                username: config.SMTP_URL.username,
                password: config.SMTP_URL.password,
            },
        });

        await mailer.send({
            from: config.SMTP_FROM,
            to: config.SMTP_TO,
            subject: title.replace(/[\r\n]+/g, ' '),
            text: content,
        });

        return c.json({
            msg: `Successfully sent email to ${config.SMTP_TO.length} recipient(s).`,
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
