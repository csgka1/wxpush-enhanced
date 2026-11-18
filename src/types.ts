import type { Env as LibEnv } from 'hono';
import type { AppConfig } from './config';

export type EnvVar = {
    API_TOKEN: string;
    WX_APPID?: string;
    WX_SECRET?: string;
    WX_USERID?: string;
    WX_TEMPLATE_ID?: string;
    WX_BASE_URL?: string;
    SIGN_SECRET?: string;
    WECOM_WEBHOOK_URL?: string;
    SMTP_URL?: string;
    SMTP_FROM?: string;
    SMTP_TO?: string;
    DEFAULT_CHANNEL?: string;
    ENABLED_CHANNELS?: string;
    ALIVE_DAYS?: string;
    DEBUG?: string;
};

export type MetaData = {
    pageTitle?: string;
    config: AppConfig;
    requestId: string;
};

export interface Env extends LibEnv {
    Bindings: EnvVar;
    Variables: MetaData;
}

export enum CHANNEL {
    wechat = 'wechat',
    wecom = 'wecom',
    smtp = 'smtp',
}
