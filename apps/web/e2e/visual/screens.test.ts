// apps/web/e2e/visual/screens.test.ts — the visual job's screen list: every kind in every vibe, once.
import { defaultTimeStrength } from '@superjackfruitlabs/vibekit-ui/appearance';
import { describe, expect, it } from 'vitest';
import { KINDS, VIBES, VISUAL_ARTBOARDS, VISUAL_SCREENS } from './screens';

describe('visual screens', () => {
  it('captures thirteen kinds in four vibes, each once (52)', () => {
    expect(VISUAL_SCREENS).toHaveLength(KINDS.length * VIBES.length);
    expect(VISUAL_SCREENS).toHaveLength(52);
    expect(VISUAL_SCREENS.map((s) => s.artboard)).toEqual(VISUAL_ARTBOARDS);
    expect(new Set(VISUAL_ARTBOARDS).size).toBe(VISUAL_ARTBOARDS.length);
  });
  it('keeps every dialog under base versus head now that their frozen references are gone', () => {
    for (const d of ['NewCard', 'Move', 'Palette', 'BoardSwitcher', 'Appearance', 'Reconnect'])
      for (const V of VIBES) expect(VISUAL_ARTBOARDS, d).toContain(`SP-Dlg-${d}-${V}`);
  });
  it('each screen’s vibe matches its name', () => {
    for (const s of VISUAL_SCREENS) expect(s.artboard.toLowerCase().endsWith(`-${s.vibe}`), s.artboard).toBe(true);
  });
  it('phone screens are 390 wide, everything else 1440', () => {
    for (const s of VISUAL_SCREENS) expect(s.size.w, s.artboard).toBe(s.artboard.startsWith('SP-Phone-') ? 390 : 1440);
  });
  it('a plain vibe renders with strength off, the other vibes at the default', () => {
    for (const s of VISUAL_SCREENS) expect(s.strength, s.artboard).toBe(defaultTimeStrength(s.vibe) === 'off' ? 'off' : undefined);
  });
  it('no screen freezes a second clock', () => {
    for (const s of VISUAL_SCREENS) expect(s.clock, s.artboard).toBeUndefined();
  });
});
