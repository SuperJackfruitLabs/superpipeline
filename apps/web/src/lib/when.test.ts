// apps/web/src/lib/when.test.ts
import { describe, expect, it } from 'vitest';
import { clockHM, dayMonth, dayMonthLong, weekdayDayMonth, whenLabel, whenLabelLong } from './when';

const NOW = new Date('2026-10-11T08:21:00Z');
const TZ = 'Asia/Kolkata';

describe('when', () => {
  it('says Today for the same local day, else the weekday, day and month', () => {
    expect(whenLabel('2026-10-08T14:11:45Z', NOW, TZ)).toBe('Thu 8 Oct, 19:41');
    expect(whenLabel('2026-10-11T07:18:00Z', NOW, TZ)).toBe('Today, 12:48');
    expect(whenLabel('2026-10-11T02:10:00Z', NOW, TZ)).toBe('Today, 07:40');
    expect(whenLabel('2026-10-08T13:56:34.688Z', NOW, TZ)).toBe('Thu 8 Oct, 19:26');
  });
  it('uses the viewer’s day, not UTC’s: 20:00Z on the 10th is already the 11th in Kolkata', () => {
    expect(whenLabel('2026-10-10T20:00:00Z', NOW, TZ)).toBe('Today, 01:30');
  });
  it('has a long form for phones', () => expect(whenLabelLong('2026-10-08T14:11:45Z', TZ)).toBe('Thursday 8 October, 19:41'));
  it('has day-month forms and a 24-hour clock', () => {
    expect(dayMonth('2026-10-09T05:30:00Z', TZ)).toBe('9 Oct');
    expect(dayMonth('2026-10-08T17:55:00.000Z', TZ)).toBe('8 Oct');
    expect(dayMonthLong('2026-10-08T06:04:57.202Z', TZ)).toBe('8 October');
    expect(weekdayDayMonth('2026-10-08T14:11:43Z', TZ)).toBe('Thu 8 Oct');
    expect(clockHM('2026-10-11T07:32:00Z', TZ)).toBe('13:02');
    expect(clockHM('2026-10-08T06:41:00Z', TZ)).toBe('12:11');
  });
});
