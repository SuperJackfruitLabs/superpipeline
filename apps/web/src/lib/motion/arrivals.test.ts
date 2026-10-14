import { describe, expect, it } from 'vitest';
import { arrivals } from './arrivals';

describe('arrivals: which asks are new since the list was first shown', () => {
  it('the first sight of a list is not an arrival', () => {
    const seen = arrivals();
    expect([...seen(['a', 'b'])]).toEqual([]);
  });
  it('names only the ids that were never shown before, in list order', () => {
    const seen = arrivals();
    seen(['a', 'b']);
    expect([...seen(['c', 'a', 'd', 'b'])]).toEqual(['c', 'd']);
  });
  it('an ask that leaves and comes back is not new again, and a repeat read is quiet', () => {
    const seen = arrivals();
    seen(['a']);
    seen(['b']);
    expect([...seen(['a', 'b'])]).toEqual([]);
  });
});
