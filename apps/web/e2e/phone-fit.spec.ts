// apps/web/e2e/phone-fit.spec.ts — the nav v2 pages on a phone, with realistic data: the fixture
// world (Developer Experience's four asks: error-eric, tester-tim, coder-kai, one unclaimed) plus
// boards with long names and a decision waiting on one of them. Reported from an iPhone: the Inbox
// had no side gutter and, once data loaded, laid out wider than the screen (the tab bar off-centre).
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { FIXTURE_TENANT, FIXTURE_USER } from './pixel/fixture/seed';
import { API } from './support/seed';
import { DX, VIBES, openWorld, seed } from './support/world';

const SIZES = [{ width: 390, height: 844 }, { width: 360, height: 740 }] as const;
const GUTTER = 16;
const H = { 'X-Tenant-Id': FIXTURE_TENANT, 'X-User-Id': FIXTURE_USER, 'Content-Type': 'application/json' };
const AGENT = { ...H, 'X-Agent-Id': 'agt_fit_reviewer' };
const PIPELINE = [
  { key: 'research', name: 'Research', order: 0, ownerKind: 'capability', owner: 'research' },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
];
const LONG = ['Workspace Operations & Automation Across Every Station', 'Client Quality and Release Readiness Reviews'];

let seeded = false;
async function seedRealistic(request: APIRequestContext): Promise<void> {
  if (seeded) return;
  await seed(request);
  // A decision waiting on a board with a long name.
  {
    const { boardId } = (await (await request.post(`${API}/v1/boards`, { headers: H, data: { name: LONG[1], stages: PIPELINE } })).json()) as { boardId: string };
    await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: H, data: { title: `Publish the quarterly report for ${LONG[1]} to the client portal once it is approved`, ownerUserId: FIXTURE_USER } });
    const claim = await (await request.post(`${API}/v1/boards/${boardId}/claims`, { headers: AGENT, data: { capabilities: ['research'] } })).json();
    await request.post(`${API}/v1/boards/${boardId}/runs/${claim.runId}/complete`, { headers: H, data: { leaseEpoch: claim.leaseEpoch, handoff: { summary: 'The report is final: twelve findings, none still open as a blocker.' } } });
  }
  // An unclaimed card whose Move-to-stage select offers a LONG option label (the operator's iPhone case).
  {
    const stages = [
      { key: 'reported', name: 'Reported', order: 0 },
      { key: 'audit', name: 'Audit the accessibility and the user experience of every page, end to end', order: 1, ownerKind: 'capability', owner: 'diagnostics' },
    ];
    const { boardId } = (await (await request.post(`${API}/v1/boards`, { headers: H, data: { name: LONG[0], stages } })).json()) as { boardId: string };
    await request.put(`${API}/v1/boards/${boardId}/stale`, { headers: H, data: { enabled: true, afterHours: 0 } });
    await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: H, data: { title: 'Fix the highest-severity blocker found in the clean-room journey on every station', ownerUserId: FIXTURE_USER } });
  }
  seeded = true;
}

/** What runs past the screen, what sits inside the 16px gutter, and where the tab bar's middle is. */
async function measure(page: Page) {
  return page.evaluate((g) => {
    const W = window.innerWidth;
    const main0 = document.querySelector('main') ?? document.body;
    /** Inside a scroller (a wide table that scrolls on its own) or a closed menu: not the page's width. */
    const contained = (el: Element) => {
      for (let p = el.parentElement; p && p !== main0; p = p.parentElement) {
        if (p.tagName === 'DETAILS' && !(p as HTMLDetailsElement).open && el.closest('summary') === null) return true;
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) return true;
      }
      return false;
    };
    const shown = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('.vk-visually-hidden, .sr, [aria-hidden="true"], .vk-phonetabbar, [role="dialog"]') && !contained(el);
    };
    const name = (el: Element) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.textContent ?? '').trim().slice(0, 30)}"`;
    const main = document.querySelector('main') ?? document.body;
    const over: string[] = [];
    for (const el of main.querySelectorAll('*')) if (shown(el) && el.getBoundingClientRect().right > W + 0.5) over.push(`${name(el)} right ${Math.round(el.getBoundingClientRect().right)}`);
    const tight: string[] = [];
    for (const el of main.querySelectorAll('h1, h2, h3, p, button, a, label, select, textarea, input')) {
      if (!shown(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.left < g - 0.5 || r.right > W - g + 0.5) tight.push(`${name(el)} ${Math.round(r.left)}–${Math.round(r.right)}`);
    }
    const bar = document.querySelector('.vk-phonetabbar')?.getBoundingClientRect();
    return { W, scroll: document.documentElement.scrollWidth, over: over.slice(0, 8), tight: tight.slice(0, 8), barMid: bar && bar.width > 0 ? bar.left + bar.width / 2 : null };
  }, GUTTER);
}

const PAGES = ['/inbox', '/crew/agents', '/crew/people', '/crew/capabilities', '/settings', '/plan/projects'];
/** The board, its List and a card carry the same move selects: they must not widen the page (their gutters are their own layouts'). */
const WIDTH_ONLY = [`${DX}`, `${DX}?view=list`, `${DX}/c/card_05823a57e8224605`];

for (const vibe of VIBES) {
  for (const dark of [false, true]) {
    for (const size of SIZES) {
      test(`${vibe} ${dark ? 'dark' : 'light'} ${size.width}: the nav v2 pages fit the phone, with 16px gutters and a centred tab bar`, async ({ page, request }) => {
        test.setTimeout(180_000);
        await seedRealistic(request);
        for (const path of [...PAGES, ...WIDTH_ONLY]) {
          const full = PAGES.includes(path);
          await openWorld(page, path, { vibe, dark, width: size.width, height: size.height });
          if (path === '/inbox') await expect(page.locator('.ib-board', { hasText: 'Workspace Operations' }).first()).toBeVisible();
          const m = await measure(page);
          expect.soft(m.scroll, `${path}: the page is ${m.scroll}px wide on a ${m.W}px screen`).toBeLessThanOrEqual(m.W);
          expect.soft(m.over, `${path}: runs past the screen`).toEqual([]);
          if (full) expect.soft(m.tight, `${path}: inside the ${GUTTER}px gutter`).toEqual([]);
          if (m.barMid !== null) expect.soft(Math.abs(m.barMid - m.W / 2), `${path}: tab bar centre`).toBeLessThanOrEqual(2);
        }
      });
    }
  }
}
