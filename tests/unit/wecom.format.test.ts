import { describe, expect, it } from 'vitest';

import { formatWecomMarkdown } from '../../src/api/wecom';

describe('formatWecomMarkdown', () => {
    it('把标题转成一级标题后与正文拼接', () => {
        expect(formatWecomMarkdown('服务器通知', '自动化任务已完成。')).toBe(
            '# 服务器通知\n\n自动化任务已完成。',
        );
    });

    it('标题为空时保留标题行的结构', () => {
        expect(formatWecomMarkdown('', '正文')).toBe('# \n\n正文');
    });

    it('正文中的 Markdown 语法原样保留', () => {
        expect(
            formatWecomMarkdown(
                '标题',
                '**加粗** 与 [链接](https://example.com)',
            ),
        ).toBe('# 标题\n\n**加粗** 与 [链接](https://example.com)');
    });
});
