import { VIBES } from '@superjackfruitlabs/vibekit-ui';
import { describe, expect, it } from 'vitest';
import { BLEED_VIBES, FADE_VIBES, FIGURE_HEADLINE_VIBES, GREETING_VIBES, WORDS_ONLY_BOOT_VIBES } from './vibe-sets';

describe('vibe sets', () => {
  it('Console is plain: bleeds, fades, boots with words alone', () => {
    expect([...BLEED_VIBES].toSorted()).toEqual(['console', 'quiet']);
    expect([...FADE_VIBES].toSorted()).toEqual(['console', 'quiet']);
    expect([...WORDS_ONLY_BOOT_VIBES].toSorted()).toEqual(['console', 'quiet']);
  });
  it('Console sets the Inbox count as a figure, as Studio does, and does not greet', () => {
    expect([...FIGURE_HEADLINE_VIBES].toSorted()).toEqual(['console', 'studio']);
    expect([...GREETING_VIBES]).toEqual(['daylight']);
  });
  it('holds only vibes vibekit knows', () => {
    for (const set of [BLEED_VIBES, FADE_VIBES, WORDS_ONLY_BOOT_VIBES, FIGURE_HEADLINE_VIBES, GREETING_VIBES]) for (const v of set) expect(VIBES).toContain(v);
  });
});
