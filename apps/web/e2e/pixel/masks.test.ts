// apps/web/e2e/pixel/masks.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MASK_IDS } from './masks';

describe('mask ids', () => {
  it('every mask id is documented, and every C-nn id is a conflict the spec still lists', () => {
    const spec = readFileSync(new URL('../../../../docs/superpowers/specs/vibes-sweep/screens/fixtures-and-harness.md', import.meta.url), 'utf8');
    for (const [id, why] of Object.entries(MASK_IDS)) {
      expect(why.length, id).toBeGreaterThan(10);
      if (/^C-\d\d$/.test(id)) expect(spec, id).toContain(`| ${id} |`);
    }
  });
});
