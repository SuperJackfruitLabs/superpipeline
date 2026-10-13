// apps/web/src/lib/components/dialogs/dialog-copy.test.ts
import { describe, expect, it } from 'vitest';
import { MOD_KEY, NC_LEAD, PRIORITY_OPTIONS } from './dialog-copy';

describe('new card copy', () => {
  it('has each vibe’s lead verbatim', () => {
    expect(NC_LEAD).toEqual({
      daylight: 'Tell me in a sentence. An agent drafts the brief, and you can change any of it before it goes.',
      paper: 'Describe it in a sentence. An agent drafts the brief, and you may change any of it before it goes.',
      studio: 'One sentence in, a drafted brief out. Edit anything before dispatch.',
      quiet: 'Describe the work in one sentence. An agent writes a draft brief. You can change all of it before you dispatch.',
    });
  });
  it('offers None and P1–P4, and prints the command key as the shell does', () => {
    expect(PRIORITY_OPTIONS.map((o) => o.label)).toEqual(['None', 'P1', 'P2', 'P3', 'P4']);
    expect(PRIORITY_OPTIONS.map((o) => o.value)).toEqual(['0', '1', '2', '3', '4']);
    expect(MOD_KEY).toBe('⌘');
  });
});
