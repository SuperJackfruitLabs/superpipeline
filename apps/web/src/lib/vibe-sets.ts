/**
 * The places where Superpipeline treats a group of vibes alike, each named for what it means. Test
 * membership here, never a string check on one vibe: a new vibe then joins a group by one edit in this file,
 * and `vibe-sets.test.ts` says where it stands in each. vibekit's own `PLAIN_VIBES` (no time of day,
 * no travel in motion) is a different question and lives in vibekit.
 */
import type { Vibe } from '@superjackfruitlabs/vibekit-ui';

/** Pages run to the shell's edges (vibekit AppShell `bleed`) instead of the 72ch reading column. */
export const BLEED_VIBES: ReadonlySet<Vibe> = new Set<Vibe>(['quiet', 'console']);

/** A Show-all or other expand toggle fades its block in, never moving its height (`motion/reveal.ts`). */
export const FADE_VIBES: ReadonlySet<Vibe> = new Set<Vibe>(['quiet', 'console']);

/** The boot screen draws its status words alone: no mark, no wordmark, no live dot. */
export const WORDS_ONLY_BOOT_VIBES: ReadonlySet<Vibe> = new Set<Vibe>(['quiet', 'console']);

/** The Inbox sets its count as a figure (vibekit Hero) on a desktop; the others say it in a heading. */
export const FIGURE_HEADLINE_VIBES: ReadonlySet<Vibe> = new Set<Vibe>(['studio', 'console']);

/** Daylight greets by the time of day before the Inbox count ("Working late, Asha? 18 cards want you."). */
export const GREETING_VIBES: ReadonlySet<Vibe> = new Set<Vibe>(['daylight']);
