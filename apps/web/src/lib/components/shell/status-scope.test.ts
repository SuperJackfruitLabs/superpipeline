import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// A board page's status line says how many cards need you on THIS board, the same count as its rail badge.
const read = (p: string) => readFileSync(new URL(`../../../routes/${p}`, import.meta.url), 'utf8');

describe('status line scope', () => {
  it.each(['b/[boardId]/operate/log/+page.svelte', 'b/[boardId]/operate/telemetry/+page.svelte'])('%s counts this board', (p) => {
    const src = read(p);
    expect(src).toContain('needsPart(shellModel.needsCount)');
    expect(src).not.toContain('attentionCount');
  });
  it('the Crew pages keep the all-boards count', () => {
    expect(read('crew/+layout.svelte')).toContain('needsPart(shellModel.attentionCount)');
  });
});
