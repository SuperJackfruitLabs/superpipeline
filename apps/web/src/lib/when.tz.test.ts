// apps/web/src/lib/when.tz.test.ts
import { describe, expect, it } from 'vitest';
import { whenLabel } from './when';

describe('times read in the viewer’s own zone', () => {
  it('Los Angeles sees its own day and clock', () => {
    process.env.TZ = 'America/Los_Angeles';
    const now = new Date('2026-10-11T08:21:00Z'); // 01:21 Sunday in LA
    expect(whenLabel('2026-10-11T07:18:00Z', now)).toBe('Today, 00:18');
    expect(whenLabel('2026-10-11T02:10:00Z', now)).toBe('Sat 10 Oct, 19:10');
  });
  it('UTC sees UTC', () => {
    process.env.TZ = 'UTC';
    expect(whenLabel('2026-10-08T14:11:45Z', new Date('2026-10-11T08:21:00Z'))).toBe('Thu 8 Oct, 14:11');
  });
});
