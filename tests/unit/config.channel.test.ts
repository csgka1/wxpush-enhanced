import { describe, expect, it } from 'vitest';

import { resolveConfig, tryResolveConfig } from '../../src/config';
import { makeEnv } from '../support/env';
import { zodIssues } from '../support/zod';

describe('resolveConfig', () => {
    it('只为已启用的推送渠道生成配置', () => {
        const { channels } = resolveConfig(
            makeEnv({ ENABLED_CHANNELS: 'wecom,smtp' }),
        );

        expect(Object.keys(channels).sort()).toEqual(['smtp', 'wecom']);
    });

    it('未启用推送渠道的变量缺失不影响解析', () => {
        expect(() =>
            resolveConfig(
                makeEnv({ ENABLED_CHANNELS: 'wecom', WX_APPID: undefined }),
            ),
        ).not.toThrow();
    });

    it('已启用推送渠道的变量缺失时失败', () => {
        const issues = zodIssues(() =>
            resolveConfig(
                makeEnv({
                    ENABLED_CHANNELS: 'wechat',
                    DEFAULT_CHANNEL: 'wechat',
                    WX_APPID: undefined,
                }),
            ),
        );

        expect(issues.some((issue) => issue.path.includes('WX_APPID'))).toBe(
            true,
        );
    });

    it('把微信收件人解析为数组', () => {
        const { channels } = resolveConfig(makeEnv());

        expect(channels.wechat?.config.WX_USERID).toEqual(['userA', 'userB']);
    });

    it('解析收件人时去掉空白并过滤空项', () => {
        const { channels } = resolveConfig(
            makeEnv({ WX_USERID: ' a , b || c ,' }),
        );

        expect(channels.wechat?.config.WX_USERID).toEqual(['a', 'b', 'c']);
    });

    it('把 SMTPS 地址解析为连接参数', () => {
        const { channels } = resolveConfig(makeEnv());

        expect(channels.smtp?.config.SMTP_URL).toEqual({
            hostname: 'smtp.example.com',
            port: 465,
            username: 'notify@example.com',
            password: 'p@ssw0rd',
        });
    });

    it('SMTP 收件人上限为 50 个', () => {
        const recipients = Array.from(
            { length: 50 },
            (_, index) => `user${index}@example.com`,
        ).join('|');

        expect(
            resolveConfig(makeEnv({ SMTP_TO: recipients })).channels.smtp
                ?.config.SMTP_TO,
        ).toHaveLength(50);

        expect(() =>
            resolveConfig(
                makeEnv({ SMTP_TO: `${recipients}|extra@example.com` }),
            ),
        ).toThrow();
    });

    it('拒绝不合法的发件人地址', () => {
        expect(() =>
            resolveConfig(makeEnv({ SMTP_FROM: 'not-an-email' })),
        ).toThrow();
    });
});

describe('tryResolveConfig', () => {
    it('配置合法时返回配置', () => {
        expect(tryResolveConfig(makeEnv())?.global.ENABLED_CHANNELS).toEqual([
            'wechat',
            'wecom',
            'smtp',
        ]);
    });

    it('配置非法时返回 undefined 而不抛出', () => {
        expect(
            tryResolveConfig(makeEnv({ SIGN_SECRET: 'short' })),
        ).toBeUndefined();
    });
});
