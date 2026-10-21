import { test, expect } from '@playwright/test';
import { seedWorld, FIXTURE_TENANT, FIXTURE_USER } from './pixel/fixture/seed';
import { waitForSurfaceReady, waitForLayout } from './support/readiness';

type Shift = {
  value: number;
  time: number;
  sources: Array<{ element: string; before: DOMRectReadOnly; after: DOMRectReadOnly }>;
};
type ShiftWindow = Window & { __projectShifts: Shift[] };
type ShiftEntry = PerformanceEntry & { value: number; hadRecentInput: boolean; sources: Array<{ node?: Element; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }> };

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('slow project and board reads keep the phone layout stable', async ({ page, request }) => {
  await seedWorld(request, { force: true });
  await page.context().addCookies([{ name: 'vk_appearance', value: 'daylight.light.strong.0', url: test.info().project.use.baseURL! }]);
  await page.addInitScript(([tenant, user]) => {
    localStorage.setItem('superpipeline.devTenant', tenant);
    localStorage.setItem('superpipeline.devUser', user);
    localStorage.setItem('superpipeline.boardId', 'brd_134a0ddb6d434478');
    const w = window as ShiftWindow;
    w.__projectShifts = [];
    new PerformanceObserver(list => {
      for (const e of list.getEntries() as ShiftEntry[]) {
        if (e.hadRecentInput) continue;
        w.__projectShifts.push({ value: e.value, time: e.startTime, sources: e.sources.map(s => ({ element: `${s.node?.tagName ?? ''}.${s.node?.className ?? ''}`, before: s.previousRect, after: s.currentRect })) });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  }, [FIXTURE_TENANT, FIXTURE_USER]);
  await page.route('**/v1/**', async route => { await new Promise(resolve => setTimeout(resolve, 800)); await route.continue(); });
  await page.routeWebSocket('**/v1/**/stream', async ws => { await new Promise(resolve => setTimeout(resolve, 800)); ws.connectToServer(); });

  await page.goto('/plan/projects/prj_34b48f840daa4309');
  await expect(page.locator('.scr-project > [data-skeleton]')).toBeVisible();
  await expect(page.locator('.pjb')).toBeVisible();
  await waitForSurfaceReady(page);
  await waitForLayout(page);
  await expect(page.locator('.pjb-blocker').first()).toBeVisible();
  const shifts = await page.evaluate(() => (window as ShiftWindow).__projectShifts);
  await test.info().attach('project-layout-shifts', { body: JSON.stringify(shifts, null, 2), contentType: 'application/json' });
  expect(shifts.reduce((total, shift) => total + shift.value, 0), 'phone project CLS').toBeLessThanOrEqual(0.1);
});
