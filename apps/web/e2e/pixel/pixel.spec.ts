import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { SCREENS, SHELL_CHECKS, screenKey, type Screen, type Theme } from './screens';
import { MANIFEST, renderReference, resolveReference } from './reference';
import { renderApp } from './app';
import { compare, type Result } from './compare';
import { record, renderFailure, writeReport } from './report';
import { seedWorld } from './fixture/seed';
import { PLATFORM_OVERRIDES, currentPlatform, isEither, isExpectedFailure } from './expected-failures';
import { allowListVerdict } from './deploy-bar';

const THEMES: Theme[] = ['light', 'dark'];
let dirty = false;
test.afterAll(() => writeReport());

for (const screen of [...SCREENS, ...SHELL_CHECKS] as Screen[]) {
  if (!MANIFEST[screen.artboard]) throw new Error(`not in manifest: ${screen.artboard}`);
  for (const theme of THEMES) {
    const key = screenKey(screen, theme);
    test(key, async ({ page, request, browser }) => {
      await seedWorld(request, { force: dirty });
      dirty = !!screen.writes;
      const src = resolveReference(screen.artboard, theme);
      if (!src) throw new Error(`no reference for ${screen.artboard}`);
      const ref = await renderReference(page, src, screen.artboard, { parts: screen.parts, masks: screen.masks, refPatch: screen.refPatch });
      const allowed = isExpectedFailure(key);
      const overridden = PLATFORM_OVERRIDES[currentPlatform()]?.[key] !== undefined ? currentPlatform() : undefined;
      const row = { artboard: screen.artboard + (SHELL_CHECKS.includes(screen) ? '#shell' : ''), vibe: screen.vibe, theme, masks: (screen.masks ?? []).map((m) => m.id) };
      // The reference must always render (renderReference throws above). The app may not draw this
      // screen yet: a render error (no data-ready, a part that does not exist) always fails with its
      // cause, even for an allow-listed key; the allow-list excuses pixel differences only.
      let app: Awaited<ReturnType<typeof renderApp>>;
      try {
        app = await renderApp(browser, screen, theme, { refBoxes: ref.boxes });
      } catch (e) {
        const msg = (e as Error).message;
        if (/pixel origin:|fonts not loaded:/.test(msg)) throw e;
        const f = renderFailure(row, key, msg);
        record(f.row);
        throw new Error(f.message);
      }
      const results: Result[] = ref.shots.map((r, i) => compare(r, app.shots[i]!, screen.parts?.length ? [...(ref.partMasks[i] ?? []), ...(app.partMasks[i] ?? [])] : [...ref.masks, ...app.masks]));
      // Per-part ratios, for the shell reports (the row records only the worst part).
      if (screen.parts?.length && process.env.PIXEL_PARTS) for (const [i, r] of results.entries()) console.log(`[part] ${key} ${screen.parts[i]!.name} ${r.status} ${(r.ratio * 100).toFixed(3)}%${r.sizeMismatch ? ` size ${r.sizeMismatch.ref.join('×')} vs ${r.sizeMismatch.app.join('×')}` : ''}`);
      // Every part's images, for a shell report (the report keeps only the worst part's).
      if (screen.parts?.length && process.env.PIXEL_PARTS_DIR) for (const [i, r] of results.entries()) {
        const b = join(process.env.PIXEL_PARTS_DIR, `${key.replace(/[^\w-]+/g, '_')}-${screen.parts[i]!.name}`);
        writeFileSync(`${b}.ref.png`, r.ref); writeFileSync(`${b}.app.png`, r.app); writeFileSync(`${b}.diff.png`, r.diff);
      }
      const worst = results.find((r) => r.status === 'fail') ?? results.find((r) => r.status === 'warn') ?? results[0]!;
      record({ ...row, status: worst.status === 'fail' && allowed ? 'expected-fail' : worst.status, ratio: worst.ratio, brokenBlocks: worst.brokenBlocks,
        sizeMismatch: worst.sizeMismatch }, worst);
      const failed = results.some((r) => r.status === 'fail');
      // An allow-listed key must still fail the compare, and stay within the 1% deploy bar.
      if (allowed) {
        const verdict = allowListVerdict(key, { ratio: Math.max(...results.map((r) => r.ratio)), failed }, overridden, isEither(key));
        expect(verdict, verdict ?? '').toBeNull();
      }
      else expect(failed, `${key}: ratio ${(worst.ratio * 100).toFixed(3)}%, ${worst.brokenBlocks} broken blocks${worst.sizeMismatch ? `, size ${worst.sizeMismatch.ref.join('×')} vs ${worst.sizeMismatch.app.join('×')}` : ''} (report: test-results/pixel/index.html)`).toBe(false);
    });
  }
}
