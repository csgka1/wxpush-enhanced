import { Script } from 'vite-ssr-components/hono';
import { Env } from '../types';
import { Hono } from 'hono';
import { renderer } from './renderer';

export default function RegisterTestPage(app: Hono<Env>) {
    app.get('/test', renderer, async (c) => {
        c.set('pageTitle', 'WXPush 测试页面');
        return c.render(<TestPage />);
    });
}

function TestPage() {
    return (
        <main class="test-page">
            <h1>WXPush 测试页面</h1>
            <div id="testFormRoot"></div>
            <noscript>请启用 JavaScript 以使用测试表单。</noscript>
            <Script src="/src/client/test-form.client.tsx" />
        </main>
    );
}
