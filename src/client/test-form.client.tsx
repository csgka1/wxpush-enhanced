/** @jsxImportSource hono/jsx/dom */
import { render, useRef, useState } from 'hono/jsx/dom';
import { SEND_CONTENT_MAX_LENGTH, SEND_TITLE_MAX_LENGTH } from '../const';

type EditableValue = {
    value: string;
    length: number;
    bytes: number;
};

type Channel = 'wechat' | 'wecom' | 'smtp';

type TestFormProps = {
    token: string;
};

function createEditableValue(value: string): EditableValue {
    return {
        value,
        length: value.length,
        bytes: new TextEncoder().encode(value).length,
    };
}

function TestForm({ token }: TestFormProps) {
    const [title, setTitle] = useState(() => createEditableValue('测试标题'));
    const [content, setContent] = useState(() =>
        createEditableValue('这是测试内容'),
    );
    const [channel, setChannel] = useState<Channel>('wechat');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [responseText, setResponseText] = useState<string | null>(null);
    const submissionLock = useRef(false);

    const updateEditableField =
        (setValue: (value: EditableValue) => void) => (event: Event) => {
            const field = event.currentTarget;
            if (
                field instanceof HTMLInputElement ||
                field instanceof HTMLTextAreaElement
            ) {
                setValue(createEditableValue(field.value));
            }
        };

    const updateChannel = (event: Event) => {
        const field = event.currentTarget;
        if (
            field instanceof HTMLSelectElement &&
            (field.value === 'wechat' ||
                field.value === 'wecom' ||
                field.value === 'smtp')
        ) {
            setChannel(field.value);
        }
    };

    const clearForm = () => {
        setTitle(createEditableValue(''));
        setContent(createEditableValue(''));
        setChannel('wechat');
        setResponseText(null);
    };

    const handleSubmit = async (event: Event) => {
        event.preventDefault();
        if (submissionLock.current) return;

        submissionLock.current = true;
        setIsSubmitting(true);
        setResponseText(null);

        const payload = Object.fromEntries(
            Object.entries({
                title: title.value,
                content: content.value,
                channel,
            }).filter(([, value]) => value.length > 0),
        );
        const headers = new Headers({
            'Content-Type': 'application/json',
        });
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        try {
            const response = await fetch('/api/send', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            const body = await response.text();
            setResponseText(`Status: ${response.status}\n\n${body}`);
        } catch (error) {
            setResponseText(
                `Fetch error: ${error instanceof Error ? error.message : String(error)}`,
            );
        } finally {
            submissionLock.current = false;
            setIsSubmitting(false);
        }
    };


    return (
        <>
            <form
                id="testForm"
                method="post"
                style: 
                action="/api/send"
                onSubmit={handleSubmit}
            >
                <label for="channel">发送渠道 (channel)</label>
                <select
                    id="channel"
                    name="channel"
                    value={channel}
                    onChange={updateChannel}
                >
                    <option value="wechat">微信公众号 (wechat)</option>
                    <option value="wecom">企业微信群机器人 (wecom)</option>
                    <option value="smtp">Email</option>
                </select>

                <label for="title">标题 (title)</label>
                <input
                    id="title"
                    name="title"
                    type="text"
                    value={title.value}
                    onChange={updateEditableField(setTitle)}
                />
                <div><small style = {{ 
                    "padding-left": '5px',
                    "color": content.length > SEND_CONTENT_MAX_LENGTH ? 'red' : ''
                    }}>
                    {title.length} / { SEND_TITLE_MAX_LENGTH } 字符
                </small></div>

                <label for="content">Markdown 内容 (content)</label>
                <textarea
                    id="content"
                    name="content"
                    rows={10}
                    value={content.value}
                    onChange={updateEditableField(setContent)}
                />
                <div><small style={{ 
                    "padding-left": '5px',
                    "color": content.length > SEND_CONTENT_MAX_LENGTH ? 'red' : ''
                    }}
                >
                    {content.length} / { SEND_CONTENT_MAX_LENGTH } 字符
                </small></div>
                <div style = { { "margin-top": '0.2em', "padding-left": '5px', }}>
                    <small>
                        { content.bytes } 字节 （某些渠道可能会对超过 {SEND_CONTENT_MAX_LENGTH * 1} 个字节的部分进行截断处理）
                    </small>
                </div>

                <div class="test-page__actions">
                    <button id="sendBtn" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? '发送中...' : '发送测试请求'}
                    </button>
                    <button id="clearBtn" type="button" onClick={clearForm}>
                        清空
                    </button>
                </div>
            </form>

            {responseText !== null && (
                <section class="test-page__response">
                    <label for="responseArea">响应</label>
                    <pre id="responseArea">{responseText}</pre>
                </section>
            )}
        </>
    );
}

const root = document.getElementById('testFormRoot');
if (!(root instanceof HTMLElement)) {
    throw new Error('Test form root element was not found');
}

render(<TestForm token={root.dataset.token ?? ''} />, root);
