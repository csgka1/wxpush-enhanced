import { describe, expect, it } from 'vitest';

import { isAliveDay } from '../../src/scheduled';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ANCHOR = Date.UTC(2026, 0, 1);
const day = (offset: number) => ANCHOR + offset * MS_PER_DAY;

describe('isAliveDay', () => {
    it('间隔为一天时每次触发都命中', () => {
        expect(isAliveDay(day(0), 1)).toBe(true);
        expect(isAliveDay(day(3), 1)).toBe(true);
    });

    it('锚点当天视为命中', () => {
        expect(isAliveDay(day(0), 7)).toBe(true);
        expect(isAliveDay(day(0), 30)).toBe(true);
    });

    it('按整日计数取模', () => {
        expect(isAliveDay(day(7), 7)).toBe(true);
        expect(isAliveDay(day(14), 7)).toBe(true);
        expect(isAliveDay(day(3), 7)).toBe(false);
        expect(isAliveDay(day(6), 7)).toBe(false);
    });

    it('同一日内不同触发时刻归入同一天', () => {
        expect(isAliveDay(day(7) + 3600_000, 7)).toBe(true);
        expect(isAliveDay(day(7) - 1, 7)).toBe(false);
    });

    it('锚点之前的时刻按负数取模', () => {
        expect(isAliveDay(day(-7), 7)).toBe(true);
        expect(isAliveDay(day(-3), 7)).toBe(false);
    });
});
