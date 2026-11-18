import { describe, expect, it } from 'vitest';

import { parseSmtpsUrl } from '../../src/config';

describe('parseSmtpsUrl', () => {
    it('解析主机、端口与凭据', () => {
        expect(parseSmtpsUrl('smtps://user:pass@smtp.example.com:465')).toEqual(
            {
                hostname: 'smtp.example.com',
                port: 465,
                username: 'user',
                password: 'pass',
            },
        );
    });

    it('对用户名与密码做 URL decode', () => {
        expect(
            parseSmtpsUrl(
                'smtps://notify%40example.com:p%40ss%3Aword@smtp.example.com:465',
            ),
        ).toEqual({
            hostname: 'smtp.example.com',
            port: 465,
            username: 'notify@example.com',
            password: 'p@ss:word',
        });
    });

    it('测试默认端口 465', () => {
        expect(parseSmtpsUrl('smtps://user:pass@smtp.example.com').port).toBe(
            465,
        );
    });

    it('拒绝非 SMTPS 协议', () => {
        expect(() =>
            parseSmtpsUrl('smtp://user:pass@smtp.example.com:25'),
        ).toThrow(/SMTPS URL/);
    });

    it('拒绝 465 以外的端口', () => {
        expect(() =>
            parseSmtpsUrl('smtps://user:pass@smtp.example.com:587'),
        ).toThrow(/valid port/);
    });

    it('拒绝缺少用户名或密码的地址', () => {
        expect(() => parseSmtpsUrl('smtps://smtp.example.com:465')).toThrow(
            /SMTPS URL/,
        );
        expect(() =>
            parseSmtpsUrl('smtps://user@smtp.example.com:465'),
        ).toThrow(/SMTPS URL/);
        expect(() =>
            parseSmtpsUrl('smtps://:pass@smtp.example.com:465'),
        ).toThrow(/SMTPS URL/);
    });

    it('拒绝带路径、查询或片段的地址', () => {
        expect(() =>
            parseSmtpsUrl('smtps://user:pass@smtp.example.com:465/send'),
        ).toThrow(/SMTPS URL/);
        expect(() =>
            parseSmtpsUrl('smtps://user:pass@smtp.example.com:465?x=1'),
        ).toThrow(/SMTPS URL/);
        expect(() =>
            parseSmtpsUrl('smtps://user:pass@smtp.example.com:465#frag'),
        ).toThrow(/SMTPS URL/);
    });

    it('拒绝非法 URL encoded 字符串', () => {
        expect(() =>
            parseSmtpsUrl('smtps://us%ZZer:pass@smtp.example.com:465'),
        ).toThrow(/invalid encoded credentials/);
    });
});
