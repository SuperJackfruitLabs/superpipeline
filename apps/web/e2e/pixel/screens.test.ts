// apps/web/e2e/pixel/screens.test.ts
import { describe, expect, it } from 'vitest';
import { MANIFEST } from './reference';
import { SCREENS, SHELL_CHECKS, screenKey } from './screens';
import { EXPECTED_FAILURES, PLATFORM_OVERRIDES } from './expected-failures';
import { MASK_IDS } from './masks';

describe('screen registry', () => {
  it('has exactly one entry per committed artboard', () => {
    expect(SCREENS.map((s) => s.artboard).sort()).toEqual(Object.keys(MANIFEST).sort());
  });
  it('each entry’s vibe matches its artboard’s file name', () => {
    for (const s of SCREENS) expect(s.artboard.toLowerCase().endsWith(`-${s.vibe}`), s.artboard).toBe(true);
  });
  it('phone artboards are 390 wide, everything else 1440', () => {
    for (const s of SCREENS) expect(MANIFEST[s.artboard]!.w, s.artboard).toBe(s.artboard.startsWith('SP-Phone-') ? 390 : 1440);
  });
  it('every mask cites a known id', () => {
    for (const s of [...SCREENS, ...SHELL_CHECKS]) for (const m of s.masks ?? []) expect(MASK_IDS[m.id], `${s.artboard} ${m.id}`).toBeTruthy();
  });
  it('the allow-list names only screens that exist', () => {
    const keys = new Set([...SCREENS, ...SHELL_CHECKS].flatMap((s) => (['light', 'dark'] as const).map((t) => screenKey(s, t))));
    for (const k of EXPECTED_FAILURES) expect(keys.has(k), k).toBe(true);
    for (const o of Object.values(PLATFORM_OVERRIDES)) for (const k of Object.keys(o)) expect(keys.has(k), k).toBe(true);
  });
  it('no screen asks for a per-screen fixture or a second clock except Board settings', () => {
    for (const s of SCREENS) if (s.clock) expect(s.artboard, s.artboard).toMatch(/^SP-Settings-/);
  });
});
