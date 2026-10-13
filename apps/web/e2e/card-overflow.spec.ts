import { test, expect, type Page } from '@playwright/test';
import { PORTS } from '../scripts/ports';
import { setAppearance } from './support/seed';

/**
 * Hostile unbroken text stays inside its box (O5, review R1). A tool call, a thought, a long
 * action name and a comment carry ~120 characters with no spaces (regex punctuation included), a
 * 100-character path and a long URL. Every vibe, drawer and card page, at ~680px and ~1100px wide,
 * with every attempt, tool call, Details and section open: no element may run past its nearest
 * boxed ancestor (one with a background, a border, a shadow or clipping).
 */
const API = PORTS.apiUrl;
const TENANT = { 'X-Tenant-Id': 'tnt_dev', 'Content-Type': 'application/json' };
const AGENT = { ...TENANT, 'X-Agent-Id': 'agt_r' };
const PATTERN = 'search_files:gates/.*/delivery|/delivery|updateApprovalDelivery\\('.repeat(3);
const PATH = 'apps/hub/src/services/matrix-as/inbound/control-pair/acp-transport/matrix-outbound/delivery-gates.ts';
const URL_ = 'https://github.com/SuperJackfruitLabs/agentpod/blob/3f625b618d443aa8ef1dad7c04d3ddd14dcf6708/apps/hub/src/services/matrix-as/inbound.ts#L379-L786';
const COMMENT = `The reminder is implemented only below the product boundary: ${PATTERN} ${PATH} ${URL_}`;

async function seed(request: import('@playwright/test').APIRequestContext, vibe: string): Promise<{ boardId: string; cardId: string }> {
  const stages = [{ key: 'research', name: 'Research', order: 0, ownerKind: 'capability', owner: 'research' }, { key: 'done', name: 'Done', order: 1, ownerKind: 'human' }];
  const board = await (await request.post(`${API}/v1/boards`, { headers: TENANT, data: { name: `Overflow ${vibe}`, stages } })).json();
  const card = await (await request.post(`${API}/v1/boards/${board.boardId}/cards`, { headers: TENANT, data: { title: 'A card to open', ownerUserId: 'usr_a' } })).json();
  const claim = await (await request.post(`${API}/v1/boards/${board.boardId}/claims`, { headers: AGENT, data: { capabilities: ['research'] } })).json();
  const post = (data: object) => request.post(`${API}/v1/boards/${board.boardId}/runs/${claim.runId}/activities`, { headers: AGENT, data: { leaseEpoch: claim.leaseEpoch, ...data } });
  await post({ type: 'thought', body: `Looking for ${PATTERN} in ${PATH}` });
  await post({ type: 'action', action: 'search_files', body: PATTERN, parameter: { pattern: PATTERN, path: PATH }, result: { matches: [URL_] } });
  await post({ type: 'action', action: `read_file:${PATH}`, body: URL_, parameter: { path: PATH }, result: null });
  await request.post(`${API}/v1/boards/${board.boardId}/cards/${card.card.id}/comments`, { headers: TENANT, data: { body: COMMENT } });
  return { boardId: board.boardId, cardId: card.card.id };
}

/** Open everything: every section, every attempt, its tool calls, every Details. */
async function openAll(page: Page, root: string): Promise<void> {
  for (let round = 0; round < 3; round++) {
    await page.evaluate((sel) => {
      const r = document.querySelector(sel)!;
      r.querySelectorAll('details').forEach((d) => ((d as HTMLDetailsElement).open = true));
      r.querySelectorAll<HTMLButtonElement>('button[data-attempt-head][aria-expanded="false"]').forEach((b) => b.click());
      r.querySelectorAll<HTMLButtonElement>('button[data-attempt-tools][aria-pressed="false"]').forEach((b) => b.click());
    }, root);
    await page.waitForTimeout(150);
  }
}

async function overflows(page: Page, root: string): Promise<string[]> {
  return page.evaluate((sel) => {
    const r = document.querySelector(sel)!;
    const boxed = (e: Element) => {
      const cs = getComputedStyle(e);
      const bg = cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);
      const border = ['Left', 'Right'].some((s) => parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)) > 0);
      return bg || border || cs.boxShadow !== 'none' || cs.overflowX !== 'visible' || e.tagName === 'DETAILS' || e.tagName === 'SECTION';
    };
    const out: string[] = [];
    for (const e of r.querySelectorAll('*')) {
      const rect = e.getBoundingClientRect();
      if (rect.width <= 2 || rect.height <= 2 || e.closest('.vk-visually-hidden, .sr, [hidden]')) continue;
      // A control that widens its own hit area with a negative margin is drawn inside; its text is what must fit.
      const ecs = getComputedStyle(e);
      if (parseFloat(ecs.marginLeft) < 0 || parseFloat(ecs.marginRight) < 0) continue;
      if (getComputedStyle(e).position === 'fixed') continue;
      let a = e.parentElement;
      while (a && a !== r && (!boxed(a) || a.getBoundingClientRect().width <= 2)) a = a.parentElement;
      if (!a) continue;
      const ar = a.getBoundingClientRect();
      const cs = getComputedStyle(a);
      const right = ar.right - parseFloat(cs.borderRightWidth);
      const left = ar.left + parseFloat(cs.borderLeftWidth);
      if (rect.right > right + 0.5 || rect.left < left - 0.5) {
        const name = (x: Element) => `${x.tagName.toLowerCase()}${x.className && typeof x.className === 'string' ? '.' + x.className.trim().split(/\s+/).join('.') : ''}`;
        out.push(`${name(e)} "${(e.textContent ?? '').trim().slice(0, 30)}" [${Math.round(rect.left)}–${Math.round(rect.right)}] past ${name(a)} [${Math.round(left)}–${Math.round(right)}]`);
      }
      if (e.scrollWidth > e.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowX)) out.push(`${(e as HTMLElement).tagName} scrolls sideways`);
    }
    return [...new Set(out)].slice(0, 8);
  }, root);
}

for (const vibe of ['daylight', 'paper', 'studio', 'quiet'] as const) {
  for (const width of [680, 1100]) {
    for (const surface of ['drawer', 'page'] as const) {
      test(`${vibe} ${surface} at ${width}px: hostile unbroken text stays inside its box`, async ({ page, request }) => {
        await page.setViewportSize({ width, height: 900 });
        await setAppearance(page, `${vibe}.dark.strong.0`);
        const { boardId, cardId } = await seed(request, vibe);
        if (surface === 'page') await page.goto(`/b/${boardId}/c/${cardId}/page`);
        else {
          await page.goto(`/b/${boardId}`);
          await page.getByRole('button', { name: /^A card to open, in/ }).or(page.getByRole('link', { name: /^A card to open, in/ })).first().click();
        }
        const root = surface === 'page' ? 'body' : '[role="dialog"]';
        await expect(page.locator(root).first()).toBeVisible();
        await expect(page.locator(root).first()).toContainText('A card to open');
        const tabs = page.locator(`${root} [role="tab"]`);
        const n = await tabs.count();
        const bad: string[] = [];
        let seen = false;
        for (let t = 0; t < Math.max(n, 1); t++) {
          if (n) await tabs.nth(t).click();
          await openAll(page, root);
          bad.push(...(await overflows(page, root)));
          seen ||= ((await page.locator(root).first().textContent()) ?? '').includes('updateApprovalDelivery');
        }
        expect(seen, 'the hostile text was drawn').toBe(true);
        expect([...new Set(bad)], 'nothing runs past its box').toEqual([]);
      });
    }
  }
}
