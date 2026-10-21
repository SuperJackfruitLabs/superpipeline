// apps/web/e2e/long-text.spec.ts
/**
 * User text never spills (operator, Paper: a 120-character unbroken word and a literal "{{y}}" ran past
 * the Needs-you column and across the page). Every vibe, three widths, every surface that draws a
 * card, board, project or agent title. A text's extent must sit inside each ancestor up to the first
 * one that clips it (an ellipsis or a scroller), and the page never scrolls sideways.
 */
import { expect, test, type Page } from '@playwright/test';
import { API, TENANT, REVIEW_PIPELINE, openBoard, seedBoard, seedGatedCard, seedQuestionCard, setAppearance } from './support/seed';

import { waitForAppReady, waitForLayout } from './support/readiness';

const LONG = 'Supercalifragilistic' + 'x'.repeat(100); // 120 characters, no break opportunity
const MARKERS = [LONG.slice(0, 24), '{{y}}', '<script>'];

async function spills(page: Page): Promise<string[]> {
  return page.evaluate((markers) => {
    const out: string[] = [];
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrolls sideways: ${document.documentElement.scrollWidth} > ${vw}`);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent ?? '';
      if (!markers.some((m) => text.includes(m))) continue;
      const el = n.parentElement;
      if (!el || el.closest('[aria-hidden="true"], .sr-only, .sr, script, style, title')) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      const rect = r.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      let right = rect.right;
      let clipped = false;
      for (let p: HTMLElement | null = el; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.display === 'contents') continue;
        const pr = p.getBoundingClientRect();
        if (right > pr.right + 1 && cs.overflowX === 'visible') {
          out.push(`${text.slice(0, 30)}… spills ${Math.round(right - pr.right)}px past <${p.tagName.toLowerCase()} class="${p.className}">`);
          break;
        }
        if (cs.overflowX !== 'visible') { clipped = true; break; }
        right = Math.max(right, pr.right);
      }
      if (!clipped && rect.right > vw + 1 && !out.length) out.push(`${text.slice(0, 30)}… ends past the viewport`);
    }
    return out;
  }, MARKERS);
}

let boardId = '';
let cardId = '';
test.beforeAll(async ({ request }) => {
  boardId = await seedBoard(request, `Long ${LONG}`, REVIEW_PIPELINE);
  await seedGatedCard(request, boardId, `Long title: ${LONG} and then a normal sentence that keeps going`);
  await seedQuestionCard(request, boardId, '{{y}}');
  await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title: `<script>alert(1)</script> ${'plain words that run on for a long while '.repeat(4)}` } });
  const snap = (await (await request.get(`${API}/v1/boards/${boardId}`, { headers: TENANT })).json()) as { cards: Array<{ id: string; title: string }> };
  cardId = snap.cards.find((c) => c.title.startsWith('Long title'))!.id;
  await request.post(`${API}/v1/projects`, { headers: TENANT, data: { name: `Project ${LONG}` } });
  await request.post(`${API}/v1/agents`, { headers: { ...TENANT, 'X-User-Id': 'usr_dev' }, data: { name: `Agent ${LONG}`, capabilities: ['research'] } });
});

const SIZES = [{ w: 1440, h: 900 }, { w: 1100, h: 800 }, { w: 390, h: 844 }];
for (const vibe of ['daylight', 'paper', 'studio', 'quiet']) {
  for (const { w, h } of SIZES) {
    test(`${vibe} ${w}: long titles wrap inside their containers everywhere`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await setAppearance(page, `${vibe}.light.strong.0`);
      await openBoard(page, boardId);
      const where = [`/inbox`, `/b/${boardId}`, `/b/${boardId}?view=list`, `/b/${boardId}/c/${cardId}`, `/b/${boardId}/c/${cardId}/page`, `/plan/projects`, `/b/${boardId}/operate`, `/crew/agents`];
      const problems: string[] = [];
      for (const path of where) {
        await page.goto(path);
        if (path.endsWith('/operate')) await page.waitForURL('**/inbox');
        await waitForAppReady(page);
        // Each surface must contain its seeded title: missing content is a failure,
        // not a swallowed ten-second wait followed by a vacuous geometry check.
        const title = path === '/plan/projects' ? `Project ${LONG}`
          : path === '/crew/agents' ? `Agent ${LONG}` : `Long title: ${LONG}`;
        await expect(page.getByText(title, { exact: false }).filter({ visible: true }).first()).toBeVisible();
        await waitForLayout(page);
        for (const p of await spills(page)) problems.push(`${path}: ${p}`);
      }
      // The command palette lists the long card title.
      await page.goto(`/b/${boardId}`);
      await waitForAppReady(page);
      await page.keyboard.press('ControlOrMeta+k');
      await page.keyboard.type('Supercali');
      // Phone search is a full-screen surface; both forms expose the same result option.
      await expect(page.getByRole('option', { name: `Long title: ${LONG}`, exact: false }).filter({ visible: true }).first()).toBeVisible();
      await waitForLayout(page);
      for (const p of await spills(page)) problems.push(`palette: ${p}`);
      await page.keyboard.press('Escape');
      // The literal text is drawn as text: never templated away, never run as markup.
      await page.goto(`/b/${boardId}?view=list`);
      await expect(page.getByText('{{y}}', { exact: true }).filter({ visible: true }).first()).toBeVisible();
      await expect(page.getByText(/<script>alert\(1\)<\/script>/).filter({ visible: true }).first()).toBeVisible();
      expect(problems).toEqual([]);
    });
  }
}
