// apps/web/src/lib/components/dialogs/dialog-copy.ts
import type { Vibe } from '@superjackfruit/vibekit';

/** The composer's lead, verbatim per vibe. It still says an agent drafts (D-1 ships later; the copy is the reference's). */
export const NC_LEAD: Readonly<Record<Vibe, string>> = {
  daylight: 'Tell me in a sentence. An agent drafts the brief, and you can change any of it before it goes.',
  paper: 'Describe it in a sentence. An agent drafts the brief, and you may change any of it before it goes.',
  studio: 'One sentence in, a drafted brief out. Edit anything before dispatch.',
  quiet: 'Describe the work in one sentence. An agent writes a draft brief. You can change all of it before you dispatch.',
};

/** The lead when a person works the chosen stage (#11): the same words, without an agent drafting. */
export const NC_LEAD_PERSON: Readonly<Record<Vibe, string>> = {
  daylight: 'Tell me in a sentence. You can change any of it before it goes.',
  paper: 'Describe it in a sentence. You may change any of it before it goes.',
  studio: 'One sentence in. Edit anything before dispatch.',
  quiet: 'Describe the work in one sentence. You can change all of it before you dispatch.',
};

export const PRIORITY_OPTIONS = [
  { value: '0', label: 'None' }, { value: '1', label: 'P1' }, { value: '2', label: 'P2' }, { value: '3', label: 'P3' }, { value: '4', label: 'P4' },
] as const;

/** The command key as every hint prints it (the shell prints ⌘K too); the bindings accept Ctrl as well as ⌘. */
export const MOD_KEY = '⌘';
