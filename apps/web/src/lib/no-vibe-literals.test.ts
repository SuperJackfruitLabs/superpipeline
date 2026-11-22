import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = new URL('../..', import.meta.url).pathname;
/** Every source file under src and e2e, tests included: a test with its own vibe list misses the next vibe just as code does. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === '__snapshots__' ? [] : files(p);
    return /\.(ts|svelte)$/.test(n) && !n.endsWith('no-vibe-literals.test.ts') ? [p] : [];
  });
}
const hits = (re: RegExp): string[] => ['src', 'e2e'].flatMap((d) => files(join(ROOT, d))).flatMap((f) =>
  readFileSync(f, 'utf8').split('\n').flatMap((line, i) => (re.test(line) ? [`${relative(ROOT, f)}:${i + 1}`] : [])));

describe('no vibe is named by a string check or a hand-written list', () => {
  it('never compares a vibe to a name: membership in a named set (vibe-sets.ts, e2e/support/world.ts) or a typed Record instead', () => {
    const NAME = `['"](?:daylight|paper|studio|quiet|console)['"]`;
    expect(hits(new RegExp(`[=!]==?\\s*${NAME}|${NAME}\\s*[=!]==?|\\.(?:includes|indexOf)\\(\\s*${NAME}`))).toEqual([]);
  });
  it('never lists the vibes by hand: VIBES from vibekit (or e2e/support/world.ts) instead', () => {
    expect(hits(/['"]daylight['"],\s*['"]paper['"],\s*['"]studio['"],\s*['"]quiet['"]/)).toEqual([]);
  });
});
