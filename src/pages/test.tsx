import { Script } from 'vite-ssr-components/hono';
import { Env } from '../types';
import { Hono } from 'hono';
import { auth_token } from '../middlewares';
import { renderer } from './renderer';

type TestPageProps = {
    token: string;
};

export default function RegisterTestPage(app: Hono<Env>) {
    app.get('/test', auth_token, renderer, async (c) => {
        c.set('pageTitle', 'WXPush 测试页面');
        return c.render(<TestPage token={c.env.API_TOKEN} />);
    });
}

function TestPage({ token }: TestPageProps) {
    return (
        <main class="test-page">
            <h1>WXPush 测试页面</h1>
            <p class="test-page__hint">
                当前 token：<strong>{token}</strong>
            </p>

            <div id="testFormRoot" data-token={token}></div>
            <noscript>请启用 JavaScript 以使用测试表单。</noscript>
            <Script src="/src/client/test-form.client.tsx" />
        </main>
    );
}
