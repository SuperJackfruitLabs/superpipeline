import { test, expect } from '@playwright/test';

/**
 * The card drawer as a modal dialog.
 *
 * It had no role, no `aria-modal`, nothing labelling it and no focus management: opening a card
 * left focus on `<body>`, and the first Tab landed on "superpipeline home" — the navigation
 * BEHIND the drawer. Its controls, a gate's Approve among them, were reachable only after tabbing
 * through the whole board.
 */
import { PORTS } from '../scripts/ports';
import { setAppearance } from './support/seed';
const API = PORTS.apiUrl;
const TENANT = { 'X-Tenant-Id': 'tnt_dev', 'Content-Type': 'application/json' };

/** A card's title control: a button on most boards, a link on the Paper front page. */
const cardTitle = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /^A card to open, in/ }).or(page.getByRole('link', { name: /^A card to open, in/ })).first();
const PIPELINE = [{ key: 'intake', name: 'Intake', order: 0, ownerKind: 'human' }];

async function boardWithACard(request: import('@playwright/test').APIRequestContext) {
  const board = await (
    await request.post(`${API}/v1/boards`, { headers: TENANT, data: { name: 'Drawer demo', stages: PIPELINE } })
  ).json();
  await request.post(`${API}/v1/boards/${board.boardId}/cards`, {
    headers: TENANT,
    data: { title: 'A card to open', ownerUserId: 'usr_a' },
  });
  return board.boardId as string;
}

test('opening a card announces a dialog and takes focus into it', async ({ page, request }) => {
  const boardId = await boardWithACard(request);
  await page.goto(`/b/${boardId}`);

  await cardTitle(page).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // Labelled by the card's own title, so a screen reader says which card opened rather than
  // "dialog".
  await expect(dialog).toHaveAccessibleName(/A card to open/);

  const focusInside = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return !!d && (d === document.activeElement || d.contains(document.activeElement));
  });
  expect(focusInside, 'focus must move into the dialog, not stay on <body>').toBe(true);
});

test('Tab stays inside the dialog rather than walking the board behind it', async ({ page, request }) => {
  const boardId = await boardWithACard(request);
  await page.goto(`/b/${boardId}`);
  await cardTitle(page).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Far more presses than the dialog has controls: a trap that only holds for one cycle is not
  // a trap, and the failure it hides is focus escaping after the last control.
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      return !!d && (d === document.activeElement || d.contains(document.activeElement));
    });
    expect(inside, `focus escaped the dialog on Tab ${i + 1}`).toBe(true);
  }
});

test('closing returns focus to the card that opened it', async ({ page, request }) => {
  const boardId = await boardWithACard(request);
  await page.goto(`/b/${boardId}`);

  const tile = cardTitle(page);
  await tile.click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  // Returning focus to the top of the document would lose a keyboard user their place on a board
  // that may be many columns wide.
  const backOnTile = await page.evaluate(
    () => document.activeElement?.getAttribute('aria-label')?.includes('A card to open') ?? false,
  );
  expect(backOnTile).toBe(true);
});

test('a card tile exposes one button for itself, not a button inside a button', async ({ page, request }) => {
  const boardId = await boardWithACard(request);
  await page.goto(`/b/${boardId}`);
  await expect(page.getByText('Intake', { exact: true })).toBeVisible();

  // The tile used to be `role="button"` wrapping a real button and, with a reference, an anchor.
  // An element with a button role may not contain interactive descendants.
  const nested = await page.evaluate(() =>
    [...document.querySelectorAll('[role="button"], button')].filter((el) =>
      el.querySelector('button, a[href], [role="button"]'),
    ).length,
  );
  expect(nested, 'no interactive element may contain another').toBe(0);
});

for (const vibe of ['daylight', 'paper', 'studio', 'quiet'] as const) {
  test(`${vibe}: the dialog keeps its name while editing, and a second "Edit card" keeps the draft`, async ({ page, request }) => {
    await page.context().addCookies([{ name: 'vk_appearance', value: `${vibe}.light.strong.0`, url: PORTS.webUrl }]);
    const boardId = await boardWithACard(request);
    await page.goto(`/b/${boardId}`);
    await cardTitle(page).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Edit card' }).click();
    await expect(dialog).toHaveAccessibleName(/A card to open/);
    const title = dialog.getByPlaceholder('Title', { exact: true });
    await title.fill('Typed but not saved');
    // Daylight swaps the button out while editing; the other vibes keep it on screen.
    const again = dialog.getByRole('button', { name: 'Edit card' });
    if (await again.count()) {
      await expect(again).toHaveAttribute('aria-pressed', 'true');
      await again.click();
    }
    await expect(title).toHaveValue('Typed but not saved');
  });
}

/**
 * The drawer opens at the top (audit #1/#28): the first focus used to land below the drawer's
 * head and scroll it 130–265px, hiding the title and Close. Every vibe, on a card long enough to scroll.
 */
for (const vibe of ['daylight', 'paper', 'studio', 'quiet'] as const) {
  test(`${vibe}: the drawer opens scrolled to the top, title and Close in view`, async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setAppearance(page, `${vibe}.light.strong.0`);
    const board = await (await request.post(`${API}/v1/boards`, { headers: TENANT, data: { name: `Top ${vibe}`, stages: PIPELINE } })).json();
    const long = Array.from({ length: 60 }, (_, i) => `Line ${i + 1} of a long brief, so the drawer has to scroll.`).join('\n');
    await request.post(`${API}/v1/boards/${board.boardId}/cards`, { headers: TENANT, data: { title: 'A card to open', ownerUserId: 'usr_a', spec: { description: long, acceptanceCriteria: ['One', 'Two'] } } });
    await page.goto(`/b/${board.boardId}`);
    await cardTitle(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(400);
    const tops = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]')!;
      return [d, ...d.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)).map((e) => e.scrollTop);
    });
    expect(tops.length, 'the drawer scrolls').toBeGreaterThan(0);
    expect(tops.every((t) => t === 0), `every scroller at its top, got ${tops.join(', ')}`).toBe(true);
    await expect(dialog.getByRole('button', { name: /^Close/ }).first()).toBeInViewport();
    await expect(dialog.getByRole('heading', { name: /A card to open/ }).first()).toBeInViewport();
  });
}

/**
 * Long unbroken strings in the run timeline wrap inside the card (O5): a search pattern or a path
 * with no spaces ran past the card edge. Every vibe, with the attempt open, its tool calls and a
 * tool call's details shown.
 */
const UNBROKEN = 'search_files(pattern="' + 'matrix-inbound/control-pair/ACP/matrix-outbound/'.repeat(8) + '")';
for (const vibe of ['daylight', 'paper', 'studio', 'quiet'] as const) {
  test(`${vibe}: long unbroken strings in the timeline wrap inside the drawer`, async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setAppearance(page, `${vibe}.light.strong.0`);
    const stages = [{ key: 'research', name: 'Research', order: 0, ownerKind: 'capability', owner: 'research' }, { key: 'done', name: 'Done', order: 1, ownerKind: 'human' }];
    const board = await (await request.post(`${API}/v1/boards`, { headers: TENANT, data: { name: `Wrap ${vibe}`, stages } })).json();
    await request.post(`${API}/v1/boards/${board.boardId}/cards`, { headers: TENANT, data: { title: 'A card to open', ownerUserId: 'usr_a' } });
    const AGENT = { ...TENANT, 'X-Agent-Id': 'agt_r' };
    const claim = await (await request.post(`${API}/v1/boards/${board.boardId}/claims`, { headers: AGENT, data: { capabilities: ['research'] } })).json();
    const post = (data: object) => request.post(`${API}/v1/boards/${board.boardId}/runs/${claim.runId}/activities`, { headers: AGENT, data: { leaseEpoch: claim.leaseEpoch, ...data } });
    await post({ type: 'thought', body: `Looking for ${UNBROKEN}` });
    await post({ type: 'action', action: 'search_files', body: UNBROKEN, parameter: { pattern: UNBROKEN }, result: { matches: [UNBROKEN] } });
    await page.goto(`/b/${board.boardId}`);
    await cardTitle(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Open where the timeline lives: Daylight's and Paper's What happened, Studio's Log tab.
    const opener = dialog.locator('summary', { hasText: /^What happened/ }).or(dialog.getByRole('tab', { name: /^Log/ }));
    if (await opener.count()) await opener.first().click();
    const head = dialog.locator('button[data-attempt-head]').first();
    if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click();
    await dialog.locator('button[data-attempt-tools]').first().click();
    await dialog.locator('details summary', { hasText: /^Details$/ }).first().click();
    await expect(dialog.getByText(/matches/).first()).toBeVisible();
    const bad = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]')!;
      const edge = d.getBoundingClientRect().right;
      const out: string[] = [];
      for (const e of d.querySelectorAll('*')) {
        const r = e.getBoundingClientRect();
        if (r.width > 0 && r.right > edge + 1) out.push(`${e.tagName}.${(e as HTMLElement).className} right ${Math.round(r.right)} > ${Math.round(edge)}`);
        if (e.scrollWidth > e.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowX)) out.push(`${e.tagName}.${(e as HTMLElement).className} scrolls sideways`);
      }
      return out.slice(0, 5);
    });
    expect(bad, 'nothing runs past the drawer or scrolls sideways').toEqual([]);
  });
}

for (const vibe of ['daylight', 'paper', 'studio', 'quiet'] as const) {
  test(`${vibe} page: long unbroken strings in the timeline wrap inside the card page`, async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setAppearance(page, `${vibe}.light.strong.0`);
    const stages = [{ key: 'research', name: 'Research', order: 0, ownerKind: 'capability', owner: 'research' }, { key: 'done', name: 'Done', order: 1, ownerKind: 'human' }];
    const board = await (await request.post(`${API}/v1/boards`, { headers: TENANT, data: { name: `Wrap ${vibe}`, stages } })).json();
    await request.post(`${API}/v1/boards/${board.boardId}/cards`, { headers: TENANT, data: { title: 'A card to open', ownerUserId: 'usr_a' } });
    const AGENT = { ...TENANT, 'X-Agent-Id': 'agt_r' };
    const claim = await (await request.post(`${API}/v1/boards/${board.boardId}/claims`, { headers: AGENT, data: { capabilities: ['research'] } })).json();
    const post = (data: object) => request.post(`${API}/v1/boards/${board.boardId}/runs/${claim.runId}/activities`, { headers: AGENT, data: { leaseEpoch: claim.leaseEpoch, ...data } });
    await post({ type: 'thought', body: `Looking for ${UNBROKEN}` });
    await post({ type: 'action', action: 'search_files', body: UNBROKEN, parameter: { pattern: UNBROKEN }, result: { matches: [UNBROKEN] } });
    const cards = (await (await request.get(`${API}/v1/boards/${board.boardId}`, { headers: TENANT })).json()) as { cards: Array<{ id: string }> };
    await page.goto(`/b/${board.boardId}/c/${cards.cards[0]!.id}/page`);
    const dialog = page.locator('main').first();
    await expect(dialog).toBeVisible();
    // Open where the timeline lives: Daylight's and Paper's What happened, Studio's Log tab.
    const opener = dialog.locator('summary', { hasText: /^What happened/ }).or(dialog.getByRole('tab', { name: /^Log/ }));
    if (await opener.count()) await opener.first().click();
    const head = dialog.locator('button[data-attempt-head]').first();
    if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click();
    await dialog.locator('button[data-attempt-tools]').first().click();
    await dialog.locator('details summary', { hasText: /^Details$/ }).first().click();
    await expect(dialog.getByText(/matches/).first()).toBeVisible();
    const bad = await page.evaluate(() => {
      const d = document.querySelector('main')!;
      const edge = d.getBoundingClientRect().right;
      const out: string[] = [];
      for (const e of d.querySelectorAll('*')) {
        const r = e.getBoundingClientRect();
        if (r.width > 0 && r.right > edge + 1) out.push(`${e.tagName}.${(e as HTMLElement).className} right ${Math.round(r.right)} > ${Math.round(edge)}`);
        if (e.scrollWidth > e.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowX)) out.push(`${e.tagName}.${(e as HTMLElement).className} scrolls sideways`);
      }
      return out.slice(0, 5);
    });
    expect(bad, 'nothing runs past the page or scrolls sideways').toEqual([]);
  });
}
