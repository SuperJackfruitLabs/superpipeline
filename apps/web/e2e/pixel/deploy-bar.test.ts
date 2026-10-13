// apps/web/e2e/pixel/deploy-bar.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEPLOY_BAR, allowListVerdict } from './deploy-bar';
import { EXPECTED_FAILURES, PLATFORM_OVERRIDES, currentPlatform, isExpectedFailure } from './expected-failures';

describe('the deploy bar for allow-listed keys', () => {
  it('is 1%', () => expect(DEPLOY_BAR).toBe(0.01));
  it('fails a listed key over 1%, even though it is listed', () => {
    expect(allowListVerdict('SP-X·light', { ratio: 0.0144, failed: true })).toBe('SP-X·light: ratio 1.440% is over the 1% deploy bar; allow-listed keys must be within it');
  });
  it('keeps a listed key that fails the compare at or under 1%', () => {
    expect(allowListVerdict('SP-X·light', { ratio: 0.0099, failed: true })).toBeNull();
    expect(allowListVerdict('SP-X·light', { ratio: 0.01, failed: true })).toBeNull();
  });
  it('still fails a listed key that passes now', () => {
    expect(allowListVerdict('SP-X·dark', { ratio: 0.0001, failed: false })).toMatch(/passes now/);
  });
});

describe('the documented allow-list', () => {
  const src = readFileSync(new URL('./expected-failures.ts', import.meta.url), 'utf8');
  const lines = src.split('\n').filter((l) => /^ {2}'[^']+',/.test(l));
  const residuals = readFileSync(new URL('./RESIDUALS.md', import.meta.url), 'utf8');
  it('names a ratio and a cause on every key', () => {
    for (const l of lines) expect(l, l).toMatch(/^ {2}'[^']+', \/\/ \d+\.\d+% \([^)]*\): \S.{10,}/);
  });
  it('lists every key with its ratio in RESIDUALS.md', () => {
    for (const l of lines) {
      const key = /'([^']+)'/.exec(l)![1]!;
      const ratio = Number(/\/\/ (\d+\.\d+)%/.exec(l)![1]);
      expect(residuals, key).toContain(`| ${key} | ${ratio.toFixed(3)}% |`);
    }
  });
  it('has no row in RESIDUALS.md for a key the allow-list does not hold', () => {
    const keys = new Set(lines.map((l) => /'([^']+)'/.exec(l)![1]!));
    const rows = [...residuals.matchAll(/^\| (SP-[^ |]+) \| \d+\.\d+% \|/gm)].map((m) => m[1]!);
    expect(rows.length).toBe(keys.size);
    for (const r of rows) expect(keys.has(r), r).toBe(true);
  });
});

describe('per-platform verdicts', () => {
  it('keys the platform as platform-arch', () => {
    expect(currentPlatform()).toBe(`${process.platform}-${process.arch}`);
  });
  it('falls back to the darwin list when a platform has no override', () => {
    const listed = [...EXPECTED_FAILURES][0]!;
    expect(isExpectedFailure(listed, 'darwin-arm64')).toBe(true);
    expect(isExpectedFailure('SP-Nowhere·light', 'linux-x64')).toBe(false);
  });
  it('a linux-x64 override flips the verdict there only (and not on linux-arm64)', () => {
    const o = PLATFORM_OVERRIDES['linux-x64']!;
    const passes = Object.keys(o).find((k) => o[k] === 'passes')!;
    const fails = Object.keys(o).find((k) => o[k] === 'fails')!;
    expect(EXPECTED_FAILURES.has(passes)).toBe(true);
    expect(isExpectedFailure(passes, 'linux-x64')).toBe(false);
    expect(isExpectedFailure(passes, 'linux-arm64')).toBe(true);
    expect(isExpectedFailure(fails, 'linux-x64')).toBe(true);
    expect(isExpectedFailure(fails, 'darwin-arm64')).toBe(EXPECTED_FAILURES.has(fails));
  });
  it('an override only says something the darwin list does not', () => {
    for (const o of Object.values(PLATFORM_OVERRIDES)) for (const [k, v] of Object.entries(o)) expect(EXPECTED_FAILURES.has(k), k).toBe(v === 'passes');
  });
  it('names the platform list in the ratchet message for an override', () => {
    expect(allowListVerdict('SP-X·dark', { ratio: 0, failed: false }, 'linux-x64')).toMatch(/passes now on linux-x64: remove its PLATFORM_OVERRIDES\['linux-x64'\] line/);
    expect(allowListVerdict('SP-X·dark', { ratio: 0.02, failed: true }, 'linux-x64')).toMatch(/over the 1% deploy bar/);
  });
});

describe('the documented per-platform overrides', () => {
  const src = readFileSync(new URL('./expected-failures.ts', import.meta.url), 'utf8');
  const lines = src.split('\n').filter((l) => /^ {4}'[^']+': '(fails|passes)',/.test(l));
  const residuals = readFileSync(new URL('./RESIDUALS.md', import.meta.url), 'utf8');
  const count = Object.values(PLATFORM_OVERRIDES).reduce((n, o) => n + Object.keys(o).length, 0);
  it('has one documented line per override', () => expect(lines.length).toBe(count));
  it('names a ratio, the platform and a cause on every override', () => {
    for (const l of lines) expect(l, l).toMatch(/^ {4}'[^']+': '(fails|passes)', \/\/ \d+\.\d+% \(CI [a-z0-9]+-[a-z0-9]+\): \S.{10,}/);
  });
  it('a fails override is within the 1% bar', () => {
    for (const l of lines) if (l.includes("'fails'")) expect(Number(/\/\/ (\d+\.\d+)%/.exec(l)![1]) / 100, l).toBeLessThanOrEqual(DEPLOY_BAR);
  });
  it('syncs both ways with RESIDUALS.md', () => {
    const rows = [...residuals.matchAll(/^\| ([a-z0-9]+-[a-z0-9]+) \| (SP-[^ |]+) \| (fails|passes) \| (\d+\.\d+)% \|/gm)];
    expect(rows.length).toBe(count);
    for (const l of lines) {
      const [, key, v] = /'([^']+)': '(\w+)'/.exec(l)!;
      const platform = /\(CI ([^)]+)\)/.exec(l)![1]!;
      const ratio = Number(/\/\/ (\d+\.\d+)%/.exec(l)![1]);
      expect(PLATFORM_OVERRIDES[platform]?.[key!], l).toBe(v);
      expect(residuals, key).toContain(`| ${platform} | ${key} | ${v} | ${ratio.toFixed(3)}% |`);
    }
    for (const r of rows) expect(PLATFORM_OVERRIDES[r[1]!]?.[r[2]!], r[0]).toBe(r[3]);
  });
});
