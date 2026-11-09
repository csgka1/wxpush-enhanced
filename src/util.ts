import { createHmac } from 'crypto';

export function getBeijingTime(date?: Date): string {
    return new Date((date ?? new Date()).getDate() + 8 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');
}

/**
 * HMAC 摘要
 * @param s raw string
 * @param key raw string
 * @return Base64
 */
export function hmac(s: string, key: string) {
    const hmac = createHmac('sha256', key);
    hmac.update(s);
    return hmac.digest().toBase64();
}
