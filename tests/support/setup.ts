import { vi } from 'vitest';

// sanitize-html 依赖的 CommonJS 链在 workerd 中无法解析，测试环境用直通实现替代。
vi.mock('sanitize-html', () => ({ default: (html: string) => html }));
