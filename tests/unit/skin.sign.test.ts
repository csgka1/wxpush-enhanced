import { describe, expect, it, vi } from 'vitest';

import { signSkinParam } from '../../src/pages/skin';

// sanitize-html 依赖的 CommonJS 链在 workerd 中无法解析，签名测试不涉及渲染，直接替换。
vi.mock('sanitize-html', () => ({ default: (html: string) => html }));

const SIGN_SECRET = 'testsignsecret1234';

const param = {
    title: '服务通知',
    message: '服务已于 22:00 重启',
    timestamp: 1700000000000,
    nonce: 'ab12',
    truncatedCount: 0,
};

describe('signSkinParam', () => {
    it('对固定输入输出固定的摘要', () => {
        expect(
            signSkinParam(
                {
                    title: 't',
                    message: 'hello',
                    timestamp: 1700000000000,
                    nonce: 'ab12',
                    truncatedCount: 0,
                },
                SIGN_SECRET,
            ),
        ).toBe('2RiGV9E8pAk1CDBxDeedgLi3lWUs7KrsZ0AznhXImkY');
    });

    it('任一被保护的字段变化都会改变摘要', () => {
        const base = signSkinParam(param, SIGN_SECRET);

        expect(
            signSkinParam({ ...param, title: '服务通知2' }, SIGN_SECRET),
        ).not.toBe(base);
        expect(
            signSkinParam(
                { ...param, message: '服务已于 23:00 重启' },
                SIGN_SECRET,
            ),
        ).not.toBe(base);
        expect(
            signSkinParam({ ...param, timestamp: 1700000000001 }, SIGN_SECRET),
        ).not.toBe(base);
        expect(
            signSkinParam({ ...param, nonce: 'ab13' }, SIGN_SECRET),
        ).not.toBe(base);
    });

    it('密钥变化会改变摘要', () => {
        expect(signSkinParam(param, SIGN_SECRET)).not.toBe(
            signSkinParam(param, 'othersignsecret1234'),
        );
    });

    it('truncatedCount 不参与摘要计算', () => {
        expect(
            signSkinParam({ ...param, truncatedCount: 128 }, SIGN_SECRET),
        ).toBe(signSkinParam(param, SIGN_SECRET));
    });
});
