import type { AppConfigEnvVar } from '../../src/types';

/**
 * 虚拟的 app config
 */
export const validAppConfig: Required<AppConfigEnvVar> = {
    API_TOKEN: 'test_token',
    SIGN_SECRET: 'testsignsecret1234',
    ENABLED_CHANNELS: 'wechat,wecom,smtp',
    DEFAULT_CHANNEL: 'wecom',
    DEBUG: '0',
    ALIVE_DAYS: '7',
    WX_APPID: 'wxtestappid',
    WX_SECRET: 'wxtestsecret',
    WX_USERID: 'userA|userB',
    WX_TEMPLATE_ID: 'tpltest',
    WX_BASE_URL: 'https://push.example.com',
    WECOM_WEBHOOK_URL:
        'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test',
    SMTP_URL: 'smtps://notify%40example.com:p%40ssw0rd@smtp.example.com:465',
    SMTP_FROM: 'notify@example.com',
    SMTP_TO: 'destA@example.com|destB@example.com',
};

/**
 * 在完整配置的基础上覆盖指定字段。
 */
export function makeEnv(
    overrides: Partial<AppConfigEnvVar> = {},
): AppConfigEnvVar {
    return {
        ...validAppConfig,
        ...overrides,
    };
}
