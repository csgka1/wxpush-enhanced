import { describe, expect, it } from 'vitest';

import { truncateUtf8, truncate_and_replace } from '../../src/util';

describe('truncateUtf8', () => {
    it('未达到上限时原样返回', () => {
        expect(truncateUtf8('abc', 3)).toBe('abc');
        expect(truncateUtf8('abc', 100)).toBe('abc');
    });

    it('按 UTF-8 字节数截断而非按字符数', () => {
        expect(truncateUtf8('中文内容', 6)).toBe('中文');
        expect(truncateUtf8('中文内容', 8)).toBe('中文');
    });

    it('不切断代理对', () => {
        expect(truncateUtf8('a🚀b', 4)).toBe('a');
        expect(truncateUtf8('a🚀b', 5)).toBe('a🚀');
    });

    it('剩余的字节不足以容纳任何完整字符时返回空串', () => {
        expect(truncateUtf8('中', 2)).toBe('');
        expect(truncateUtf8('中', 0)).toBe('');
    });
});

describe('truncate_and_replace', () => {
    it('未超限时原样返回', () => {
        expect(truncate_and_replace('abc', 3)).toBe('abc');
    });

    it('超限时以替换符收尾并保持总长度等于上限', () => {
        expect(truncate_and_replace('abcdefgh', 5)).toBe('ab...');
        expect(truncate_and_replace('abcdefgh', 5)).toHaveLength(5);
    });

    it('替换符长于上限时丢弃替换符', () => {
        expect(truncate_and_replace('abcdefgh', 2)).toBe('ab');
    });

    it('上限为负数时按 0 处理', () => {
        expect(truncate_and_replace('abc', -1)).toBe('');
    });

    // Undefined Behavior
    it.skip('按 UTF-16 码元计数，可能切断代理对', () => {
        expect(truncate_and_replace('🚀', 1)).toBe('\ud83d');
    });
});
