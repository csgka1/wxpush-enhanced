import { Buffer } from 'buffer';
import { describe, expect, it } from 'vitest';

import { b64Decode, b64Encode, hmac } from '../../src/util';

describe('b64Encode', () => {
    it('默认输出带填充的标准 Base64', () => {
        expect(b64Encode('a')).toBe('YQ==');
        expect(b64Encode(Buffer.from([0xfb, 0xff]))).toBe('+/8=');
    });

    it('base64url 使用 URL 安全字符并省略填充', () => {
        expect(b64Encode('a', 'base64url')).toBe('YQ');
        expect(b64Encode(Buffer.from([0xfb, 0xff]), 'base64url')).toBe('-_8');
    });

    it('按 UTF-8 编码多字节字符', () => {
        expect(b64Encode('中', 'base64url')).toBe('5Lit');
    });
});

describe('b64Decode', () => {
    it('默认解码为字符串', () => {
        expect(b64Decode('5Lit', 'string', 'base64url')).toBe('中');
    });

    it('可解码为 Buffer', () => {
        const raw = b64Decode('+/8=', 'buffer');

        expect(raw).toBeInstanceOf(Buffer);
        expect([...raw]).toEqual([0xfb, 0xff]);
    });

    it('编码后解码可还原原文', () => {
        const text = '服务已于 22:00 重启 🚀';

        expect(
            b64Decode(b64Encode(text, 'base64url'), 'string', 'base64url'),
        ).toBe(text);
    });
});

describe('hmac', () => {
    it('对固定输入输出固定的 base64url 摘要', () => {
        expect(hmac('The quick brown fox jumps over the lazy dog', 'key')).toBe(
            '97yD9DBThCSxMpjmqm-xQ-9NWaFJRhdZl0edvC0aPNg',
        );
    });

    it('密钥不同则摘要不同', () => {
        expect(hmac('payload', 'key1')).not.toBe(hmac('payload', 'key2'));
    });

    it('摘要不含填充字符', () => {
        expect(hmac('payload', 'key')).not.toContain('=');
    });
});
