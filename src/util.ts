import { createHmac } from 'crypto';
import { Buffer } from 'buffer';

/**
 * Retrun encoded Base64 format string.
 *
 */
export function b64Encode(
    value: string | Buffer,
    alphabet: 'base64' | 'base64url' = 'base64',
): string {
    return Buffer.from(value).toBase64({
        alphabet,
        omitPadding: alphabet === 'base64url',
    });
}

/**
 * Decode Base64 string into raw string or buffer.
 */
export function b64Decode<T extends 'string' | 'buffer' = 'string'>(
    value: string,
    targetType: T = 'string' as T,
    alphabet: 'base64' | 'base64url' = 'base64',
): T extends 'buffer' ? Buffer : string {
    const raw = Buffer.from(value, alphabet);
    return (
        targetType === 'buffer' ? raw : raw.toString('utf-8')
    ) as T extends 'buffer' ? Buffer : string;
}

/**
 * Truncate string to given bytes size.
 *
 */
export function truncateUtf8(s: string, maxBytes: number): string {
    let bytes = 0;
    let end = 0;

    let arr = Array.from(s); // 某些 emoji 会使用两个 utf-8 char，使用 array 可以避免它们被拆分
    for (const char of arr) {
        const charBytes = Buffer.byteLength(char, 'utf8');
        if (bytes + charBytes > maxBytes) {
            break;
        }
        bytes += charBytes;
        end += char.length;
    }

    return s.slice(0, end);
}

export function getBeijingTime(date?: Date): string {
    return new Date((date ?? new Date()).getTime() + 8 * 60 * 60 * 1000)
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
    return hmac.digest().toBase64({ alphabet: 'base64url', omitPadding: true });
}

/**
 * 返回截短后的文本，以适应文字长度限制
 */

export function truncate_and_replace(
    text: string,
    limit: number,
    replacer: string = '...',
) {
    if (limit < 0) {
        limit = 0;
    }
    limit = Math.floor(limit);

    if (replacer.length > limit) {
        replacer = '';
    }

    if (text.length <= limit) {
        return text;
    }

    const truncatedText = text.substring(0, limit);

    return (
        truncatedText.substring(0, truncatedText.length - replacer.length) +
        replacer
    );
}
