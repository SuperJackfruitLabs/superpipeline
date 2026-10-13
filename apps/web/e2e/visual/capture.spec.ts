// apps/web/e2e/visual/capture.spec.ts — writes each visual screen of THIS tree's app to $VISUAL_OUT/<name>.png.
// The job runs the head's copy of this folder in both trees, so base and head are captured the same way:
// frozen clock, reduced motion, no animation or transition, fonts awaited (pixel/app.ts renderApp).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';
import { renderApp } from '../pixel/app';
import { seedWorld } from '../pixel/fixture/seed';
import { assertNotBlank } from '../pixel/compare';
import { VISUAL_SCREENS } from './screens';

const OUT = process.env.VISUAL_OUT;
let dirty = false;
for (const screen of VISUAL_SCREENS) {
  test(screen.artboard, async ({ browser, request }) => {
    if (!OUT) throw new Error('set VISUAL_OUT to the folder the screenshots go to');
    mkdirSync(OUT, { recursive: true });
    await seedWorld(request, { force: dirty });
    dirty = !!screen.writes;
    const { shots } = await renderApp(browser, screen, 'light');
    assertNotBlank(shots[0]!, screen.artboard);
    writeFileSync(join(OUT, `${screen.artboard}.png`), shots[0]!);
  });
}
