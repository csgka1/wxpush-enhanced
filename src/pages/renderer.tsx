import { jsxRenderer } from 'hono/jsx-renderer';
import { Link, ViteClient } from 'vite-ssr-components/hono';
import { Env } from '../types';
import { Context } from 'hono';

export const renderer = jsxRenderer<Env>(({ children }, c: Context<Env>) => {
    let titlePrefix = '';
    if (c.var.globalConfig?.DEBUG) {
        titlePrefix = '[DEBUG] ';
    }
    const pageTitle = c.var.pageTitle || 'Default Title';
    return (
        <html>
            <head>
                <title>{`${titlePrefix}${pageTitle}`}</title>
                <ViteClient />
                <Link href="/src/style.css" rel="stylesheet" />
            </head>
            <body>{children}</body>
        </html>
    );
});
