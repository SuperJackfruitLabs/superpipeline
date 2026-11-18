// apps/web/src/lib/live/diff.test.ts
import { describe, expect, it } from 'vitest';
import { applyDiff, diffKeyed } from './diff';

type Row = { key: string; v: number };
const same = (a: Row, b: Row) => a.v === b.v;

describe('diffKeyed', () => {
  it('reports enter, leave, change and order', () => {
    const prev: Row[] = [{ key: 'a', v: 1 }, { key: 'b', v: 2 }, { key: 'c', v: 3 }];
    const next: Row[] = [{ key: 'c', v: 3 }, { key: 'a', v: 9 }, { key: 'd', v: 4 }];
    const d = diffKeyed(prev, next, same);
    expect(d.enter).toEqual([{ key: 'd', v: 4 }]);
    expect(d.leave).toEqual(['b']);
    expect(d.change).toEqual([{ key: 'a', from: { key: 'a', v: 1 }, to: { key: 'a', v: 9 } }]);
    expect(d.order).toEqual(['c', 'a', 'd']);
    // Unchanged rows keep their identity when the diff is applied: the DOM row for `c` stays put.
    const out = applyDiff(prev, d);
    expect(out).toEqual(next);
    expect(out[0]).toBe(prev[2]);
    // Nothing changed: nothing to report, and the order stands.
    expect(diffKeyed(prev, prev, same)).toEqual({ enter: [], leave: [], change: [], order: ['a', 'b', 'c'] });
  });
});
