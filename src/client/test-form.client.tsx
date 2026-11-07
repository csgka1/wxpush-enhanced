/** @jsxImportSource hono/jsx/dom */
import { render, useRef, useState } from 'hono/jsx/dom'

type TestFormValues = {
    title: string
    content: string
    channel: 'wechat' | 'wecom'
}

type TestFormProps = {
    token: string
}

const initialValues: TestFormValues = {
    title: '测试标题',
    content: '这是测试内容',
    channel: 'wechat'
}

const emptyValues: TestFormValues = {
    title: '',
    content: '',
    channel: 'wechat'
}

function TestForm({ token }: TestFormProps) {
    const [values, setValues] = useState(initialValues)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [responseText, setResponseText] = useState<string | null>(null)
    const submissionLock = useRef(false)

    const updateField = (name: keyof TestFormValues) => (event: Event) => {
        const field = event.currentTarget
        if (
            field instanceof HTMLInputElement ||
            field instanceof HTMLTextAreaElement ||
            field instanceof HTMLSelectElement
        ) {
            setValues((currentValues) => ({
                ...currentValues,
                [name]: field.value
            }))
        }
    }

    const clearForm = () => {
        setValues(emptyValues)
        setResponseText(null)
    }

    const handleSubmit = async (event: Event) => {
        event.preventDefault()
        if (submissionLock.current) return

        submissionLock.current = true
        setIsSubmitting(true)
        setResponseText(null)

        const payload = Object.fromEntries(
            Object.entries(values).filter(([, value]) => value.length > 0)
        )
        const headers = new Headers({
            'Content-Type': 'application/json'
        })
        if (token) {
            headers.set('Authorization', `Bearer ${token}`)
        }

        try {
            const response = await fetch('/api/send', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            })
            const body = await response.text()
            setResponseText(`Status: ${response.status}\n\n${body}`)
        } catch (error) {
            setResponseText(
                `Fetch error: ${error instanceof Error ? error.message : String(error)}`
            )
        } finally {
            submissionLock.current = false
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <form id="testForm" method="post" action="/api/send" onSubmit={handleSubmit}>
                <label for="channel">发送渠道 (channel)</label>
                <select
                    id="channel"
                    name="channel"
                    value={values.channel}
                    onInput={updateField('channel')}
                >
                    <option value="wechat">微信公众号 (wechat)</option>
                    <option value="wecom">企业微信群机器人 (wecom)</option>
                </select>

                <label for="title">标题 (title)</label>
                <input
                    id="title"
                    name="title"
                    type="text"
                    value={values.title}
                    onInput={updateField('title')}
                />

                <label for="content">Markdown 内容 (content)</label>
                <textarea
                    id="content"
                    name="content"
                    rows={4}
                    value={values.content}
                    onInput={updateField('content')}
                />

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
    )
}

const root = document.getElementById('testFormRoot')
if (!(root instanceof HTMLElement)) {
    throw new Error('Test form root element was not found')
}

render(<TestForm token={root.dataset.token ?? ''} />, root)
