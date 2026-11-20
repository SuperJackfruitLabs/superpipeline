// apps/web/scripts/e2e-shard.test.ts
import { describe, expect, it } from 'vitest';
import { fileFilter, planShards, testsPerFile } from './e2e-shard.mjs';

/** The extended project's files and test counts at the composition contract (2026-11-20): 337 tests. */
const spec = (file: string, tests: number) => ({ file, tests });
const EXTENDED = [
  spec('card-overflow.spec.ts', 16), spec('desktop-fit.spec.ts', 24), spec('dialogs-fit.spec.ts', 72), spec('headings.spec.ts', 17),
  spec('long-names.spec.ts', 4), spec('long-text.spec.ts', 12), spec('mobile-overflow.spec.ts', 3), spec('motion.spec.ts', 8),
  spec('pages-polish.spec.ts', 97), spec('phone-clearance.spec.ts', 4), spec('phone-fit.spec.ts', 16), spec('rail-height.spec.ts', 12),
  spec('readable-handoff.spec.ts', 2), spec('responsive.spec.ts', 12), spec('vibes.spec.ts', 28), spec('viewport.spec.ts', 10),
];
const byName = (a: string, b: string) => a.localeCompare(b);

/** A small seeded generator: the same "random" suites on every run. */
function lcg(seed: number): () => number {
  let x = seed;
  return () => (x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
}
const sizes = (bins: Array<Array<{ tests: number }>>) => bins.map((b) => b.reduce((n, f) => n + f.tests, 0));

describe('browser shards', () => {
  it('the extended suite that left shard 3 of 4 empty under --shard fills every shard, each near a quarter', () => {
    const bins = planShards(EXTENDED, 4);
    expect(bins.every((b) => b.length > 0)).toBe(true);
    const s = sizes(bins);
    expect(s.reduce((a, b) => a + b, 0)).toBe(337);
    // The largest file (97) sets the floor of the largest shard; the rest balance within one file of each other.
    expect(Math.max(...s)).toBe(97);
    expect(Math.min(...s)).toBeGreaterThanOrEqual(75);
  });
  it('every file runs in exactly one shard, in the listed order within it', () => {
    for (const total of [1, 2, 3, 4, 6]) {
      const bins = planShards(EXTENDED, total);
      expect(bins.flat().map((x) => x.file).toSorted(byName)).toEqual(EXTENDED.map((x) => x.file).toSorted(byName));
      for (const b of bins) expect(b.map((x) => x.file)).toEqual(EXTENDED.map((x) => x.file).filter((name) => b.some((x) => x.file === name)));
    }
  });
  it('no shard is empty for any plausible count: whatever the sizes, while there are at least as many files as shards', () => {
    const rnd = lcg(7);
    for (let round = 0; round < 200; round++) {
      const total = 1 + Math.floor(rnd() * 6);
      const files = Array.from({ length: total + Math.floor(rnd() * 20) }, (_, i) => ({ file: `f${i}.spec.ts`, tests: 1 + Math.floor(rnd() * (rnd() < 0.2 ? 200 : 20)) }));
      const bins = planShards(files, total);
      expect(bins).toHaveLength(total);
      expect(bins.every((b) => b.length > 0), `total ${total}: ${JSON.stringify(files)}`).toBe(true);
    }
  });
  it('is the same plan on every machine (shard n of every job agrees with the others)', () => {
    expect(planShards(EXTENDED, 4)).toEqual(planShards([...EXTENDED], 4));
    expect(planShards([{ file: 'a', tests: 5 }, { file: 'b', tests: 5 }], 2)).toEqual([[{ file: 'a', tests: 5 }], [{ file: 'b', tests: 5 }]]);
  });
  it('reads the counts from Playwright’s JSON list, nested describes included', () => {
    const report = { suites: [
      { file: 'a.spec.ts', specs: [{ tests: [{}] }], suites: [{ specs: [{ tests: [{}, {}] }] }] },
      { file: 'empty.spec.ts', specs: [] },
    ] };
    expect(testsPerFile(report)).toEqual([{ file: 'a.spec.ts', tests: 3 }]);
  });
  it('a file filter matches that file and no other whose name ends the same', () => {
    const re = new RegExp(fileFilter('fit.spec.ts'));
    expect(re.test('/w/e2e/fit.spec.ts')).toBe(true);
    expect(re.test('/w/e2e/phone-fit.spec.ts')).toBe(false);
    expect(new RegExp(fileFilter('a.spec.ts')).test('/w/e2e/aXspec.ts')).toBe(false);
  });
});
