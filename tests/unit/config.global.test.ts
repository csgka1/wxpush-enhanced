import { describe, expect, it } from 'vitest';

import { validateGlobalEnv } from '../../src/config';
import { makeEnv } from '../support/env';
import { zodIssues } from '../support/zod';

describe('validateGlobalEnv', () => {
    it('解析出结构化配置', () => {
        const config = validateGlobalEnv(makeEnv());

        expect(config.ENABLED_CHANNELS).toEqual(['wechat', 'wecom', 'smtp']);
        expect(config.DEFAULT_CHANNEL).toBe('wecom');
        expect(config.DEBUG).toBe(false);
        expect(config.ALIVE_DAYS).toBe(7);
    });

    it('未设置 ALIVE_DAYS 时解析为 undefined', () => {
        expect(
            validateGlobalEnv(makeEnv({ ALIVE_DAYS: undefined })).ALIVE_DAYS,
        ).toBeUndefined();
    });

    it('把用逗号与竖线分隔的渠道列表统一解析为数组', () => {
        expect(
            validateGlobalEnv(makeEnv({ ENABLED_CHANNELS: ' wecom , smtp ' }))
                .ENABLED_CHANNELS,
        ).toEqual(['wecom', 'smtp']);
    });

    it('把 ALIVE_DAYS 转为整数', () => {
        expect(validateGlobalEnv(makeEnv({ ALIVE_DAYS: '7' })).ALIVE_DAYS).toBe(
            7,
        );
    });

    it.each(['0', '3651', '1.5', 'abc'])(
        '拒绝非法的 ALIVE_DAYS: %s',
        (value) => {
            expect(() =>
                validateGlobalEnv(makeEnv({ ALIVE_DAYS: value })),
            ).toThrow();
        },
    );

    it.each([
        ['1', true],
        ['0', false],
        ['', false],
        ['abc', false],
        [undefined, false],
    ])('DEBUG=%j 解析为 %s', (raw, expected) => {
        expect(validateGlobalEnv(makeEnv({ DEBUG: raw })).DEBUG).toBe(expected);
    });

    it('拒绝空的渠道列表', () => {
        expect(() =>
            validateGlobalEnv(makeEnv({ ENABLED_CHANNELS: ' , ' })),
        ).toThrow();
    });

    it('拒绝重复的渠道', () => {
        const issues = zodIssues(() =>
            validateGlobalEnv(makeEnv({ ENABLED_CHANNELS: 'wecom,wecom' })),
        );

        expect(issues[0].message).toMatch(/must not contain duplicates/);
    });

    it('拒绝未知渠道', () => {
        expect(() =>
            validateGlobalEnv(makeEnv({ ENABLED_CHANNELS: 'telegram' })),
        ).toThrow();
    });

    it('拒绝不在渠道列表中的默认渠道', () => {
        const issues = zodIssues(() =>
            validateGlobalEnv(
                makeEnv({
                    ENABLED_CHANNELS: 'wecom',
                    DEFAULT_CHANNEL: 'wechat',
                }),
            ),
        );

        expect(issues).toHaveLength(1);
        expect(issues[0].path).toEqual(['DEFAULT_CHANNEL']);
        expect(issues[0].message).toMatch(/must be included in/);
    });

    it('拒绝缺少全局凭据的配置', () => {
        expect(() =>
            validateGlobalEnv(makeEnv({ API_TOKEN: undefined })),
        ).toThrow();
        expect(() =>
            validateGlobalEnv(makeEnv({ SIGN_SECRET: undefined })),
        ).toThrow();
    });

    it('接受长度为 16 到 64 的全局凭据', () => {
        for (const length of [16, 64]) {
            const value = 'a'.repeat(length);
            const config = validateGlobalEnv(
                makeEnv({ API_TOKEN: value, SIGN_SECRET: value }),
            );

            expect(config.API_TOKEN).toBe(value);
            expect(config.SIGN_SECRET).toBe(value);
        }
    });

    it('拒绝长度不在 16 到 64 之间的 API_TOKEN', () => {
        for (const token of ['a'.repeat(15), 'a'.repeat(65)]) {
            expect(() =>
                validateGlobalEnv(makeEnv({ API_TOKEN: token })),
            ).toThrow();
        }
    });

    it('拒绝长度不在 16 到 64 之间的 SIGN_SECRET', () => {
        for (const secret of ['a'.repeat(15), 'a'.repeat(65)]) {
            expect(() =>
                validateGlobalEnv(makeEnv({ SIGN_SECRET: secret })),
            ).toThrow();
        }
    });

    it('拒绝不符合 base64url 字符集的 API_TOKEN', () => {
        for (const token of [
            'bad token 1234567890',
            `${'a'.repeat(15)}+`,
            `${'a'.repeat(15)}/`,
        ]) {
            expect(() =>
                validateGlobalEnv(makeEnv({ API_TOKEN: token })),
            ).toThrow();
        }
    });

    it('允许 API_TOKEN 使用 -、_ 与 = 填充', () => {
        const token = `ab-_${'a'.repeat(12)}=`;

        expect(validateGlobalEnv(makeEnv({ API_TOKEN: token })).API_TOKEN).toBe(
            token,
        );
    });

    it('拒绝不符合字符集的 SIGN_SECRET', () => {
        expect(() =>
            validateGlobalEnv(makeEnv({ SIGN_SECRET: 'has-dash-1234567890' })),
        ).toThrow();
    });
});
