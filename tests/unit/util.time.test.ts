import { describe, expect, it } from 'vitest';

import { getBeijingTime } from '../../src/util';

describe('getBeijingTime', () => {
    it('把 UTC 时间偏移八小时', () => {
        expect(getBeijingTime(new Date('2026-11-18T04:05:06Z'))).toBe(
            '2026-11-18 12:05:06',
        );
    });

    it('CST 位于 UTC 时间的下一天时，日期发生对应变化', () => {
        expect(getBeijingTime(new Date('2026-12-31T20:30:00Z'))).toBe(
            '2027-01-01 04:30:00',
        );
    });

    it('省略参数时返回当前时间', () => {
        expect(getBeijingTime()).toMatch(
            /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
        );
    });
});
