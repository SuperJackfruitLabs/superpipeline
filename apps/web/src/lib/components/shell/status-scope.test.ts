import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The status line is page data, a footer each page draws (composition contract §11.6), not the shell's:
// no page hands the shell one. When the pages draw their footers (the Board and Inbox tasks), a board
// page counts the cards that need you on THIS board (shellModel.needsCount) and Crew keeps the
// all-boards count (shellModel.attentionCount), as the old status lines did.
const read = (p: string) => readFileSync(new URL(`../../../routes/${p}`, import.meta.url), 'utf8');

describe('status line', () => {
  it.each(['b/[boardId]/operate/log/+page.svelte', 'b/[boardId]/operate/telemetry/+page.svelte', 'b/[boardId]/settings/+page.svelte', 'crew/+layout.svelte'])(
    '%s hands the shell no status line',
    (p) => {
      const src = read(p);
      expect(src).not.toMatch(/pageStatus\(|boardStatus|showStatus|\bstatus=|\{status\}/);
    },
  );
});
