// apps/web/e2e/pixel/references-lock.test.ts
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BLOCK, BLOCK_BREAK, MAX_RATIO, PIXEL_THRESHOLD, WARN_RATIO } from './compare';
import { MASK_IDS } from './masks';
import { REF_DIR } from './reference';

const lock = JSON.parse(readFileSync(join(__dirname, 'references.lock'), 'utf8')) as {
  files: Record<string, string>; thresholds: Record<string, number>; maskIds: string[]; allowList: string[];
};
const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');

describe('references.lock — references, thresholds and masks change only on purpose', () => {
  it('every reference file, the manifest and CORRECTIONS.md hash as locked', () => {
    const vk = readdirSync(REF_DIR).filter((d) => /^_vibekit-/.test(d)).flatMap((d) => readdirSync(join(REF_DIR, d)).map((f) => `${d}/${f}`));
    const now = Object.fromEntries([...readdirSync(REF_DIR).filter((f) => /\.(html|json|md)$/.test(f)), ...vk].sort().map((f) => [f, sha(join(REF_DIR, f))]));
    expect(now, 'a reference changed: fix the app instead, or (only in a task whose purpose is a reference change) run scripts/pixel/lock-references.mjs').toEqual(lock.files);
  });
  it('the comparison thresholds are the locked ones', () => {
    expect({ PIXEL_THRESHOLD, MAX_RATIO, WARN_RATIO, BLOCK, BLOCK_BREAK }).toEqual(lock.thresholds);
  });
  it('the mask ids are the locked ones', () => {
    expect(Object.keys(MASK_IDS).sort()).toEqual(lock.maskIds);
  });
  it('the allow-list only shrinks', async () => {
    const mod = await import('./expected-failures').catch(() => null);
    const keys = mod ? [...mod.EXPECTED_FAILURES] : [];
    for (const k of keys) expect(lock.allowList, `${k} was added to the allow-list`).toContain(k);
  });
});
