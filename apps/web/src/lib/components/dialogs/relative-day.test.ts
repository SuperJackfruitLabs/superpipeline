// apps/web/src/lib/components/dialogs/relative-day.test.ts
import { describe, expect, it } from 'vitest';
import { relativeDay } from './relative-day';

const NOW = new Date('2026-10-11T08:21:00Z');
const day = (iso: string | null) => relativeDay(iso, NOW, 'Asia/Kolkata');

describe('relativeDay', () => {
  it('counts calendar days in the viewer’s time zone', () => {
    expect(day('2026-10-11T07:18:00Z')).toBe('Today');
    expect(day('2026-10-11T01:00:00Z')).toBe('Today');
    expect(day('2026-10-10T06:00:00Z')).toBe('Yesterday');
    expect(day('2026-10-08T06:00:00Z')).toBe('3 days ago');
    expect(day('2026-10-07T06:00:00Z')).toBe('4 days ago');
    expect(day('2026-10-03T06:00:00Z')).toBe('Last week');
    expect(day('2026-10-02T06:00:00Z')).toBe('Last week');
    expect(day('2026-09-26T06:00:00Z')).toBe('2 weeks ago');
    expect(day('2026-09-19T06:00:00Z')).toBe('3 weeks ago');
    expect(day('2026-09-01T06:00:00Z')).toBe('Last month');
    expect(day('2026-07-01T06:00:00Z')).toBe('3 months ago');
    expect(day(null)).toBe('');
  });
  it('a time late on the previous UTC day can still be today in Kolkata', () => {
    expect(relativeDay('2026-10-10T19:00:00Z', NOW, 'Asia/Kolkata')).toBe('Today'); // 00:30 IST on the 11th
    expect(relativeDay('2026-10-10T19:00:00Z', NOW, 'UTC')).toBe('Yesterday');
  });
});
