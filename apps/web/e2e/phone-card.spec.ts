import { expect, test } from '@playwright/test';
import { AGENT, API, openBoard, seedBoard, setAppearance, TENANT } from './support/seed';

// Every vibe's phone card: the sheet is one document, and the last control can be reached with nothing over it
// (the fixed tab bar included). Same elementFromPoint hit-test as studio-card.spec.
const PIPELINE = [
  { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
];

for (const vibe of ['daylight', 'paper', 'studio', 'quiet']) {
  test(`${vibe} phone card: every control can be reached and nothing covers it`, async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setAppearance(page, `${vibe}.light.strong.0`);
    const boardId = await seedBoard(request, `Phone card ${vibe}`, PIPELINE);
    await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title: 'Rotate the keys', ownerUserId: 'usr_a' } });
    const claim = await (await request.post(`${API}/v1/boards/${boardId}/claims`, { headers: AGENT, data: { capabilities: ['build'] } })).json();
    await request.post(`${API}/v1/boards/${boardId}/runs/${claim.runId}/block`, {
      headers: AGENT,
      data: { leaseEpoch: claim.leaseEpoch, reason: 'the vault is sealed and nobody on the rota holds a key; '.repeat(6) },
    });
    await openBoard(page, boardId);
    await page.getByRole('button', { name: /^Rotate the keys, in / }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // The card's sections appear when its log has arrived (data-ready waits for it): measuring before then
    // counts controls that move or appear mid-loop, which a slow runner makes visible.
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
    const covered = (el: Element): string | null => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return top && (top === el || el.contains(top)) ? null : `${top?.tagName.toLowerCase()}.${top?.className}`;
    };
    // Studio keeps its controls in tabs; the others are one scroll. Visit every tab when there are tabs.
    const tabs = await dialog.getByRole('tab').count();
    for (let t = 0; t < Math.max(tabs, 1); t++) {
      if (tabs) await dialog.getByRole('tab').nth(t).click();
      const scope = tabs ? dialog.getByRole('tabpanel') : dialog;
      // Open every disclosure so their controls count.
      await scope.locator('details:not([open]) > summary').evaluateAll((els) => els.forEach((e) => (e as HTMLElement).click()));
      const controls = scope.locator('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
      const n = await controls.count();
      for (let i = 0; i < n; i++) {
        const c = controls.nth(i);
        if (!(await c.isVisible())) continue;
        await c.evaluate((el) => el.scrollIntoView({ block: 'end' }));
        await expect(c, `${vibe} #${i}: in the viewport`).toBeInViewport();
        expect(await c.evaluate(covered), `${vibe} #${i}: nothing covers it`).toBeNull();
      }
    }
    // The last control on the page clears the fixed bar at the page's very end.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const last = dialog.locator('button:not([disabled]), a[href]').last();
    expect(await last.evaluate(covered)).toBeNull();
  });
}

for (const vibe of ['daylight', 'paper', 'studio', 'quiet']) {
  test(`${vibe} phone card: closing returns focus to the card that opened it`, async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setAppearance(page, `${vibe}.light.strong.0`);
  const boardId = await seedBoard(request, 'Phone focus', PIPELINE);
  await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title: 'Return focus', ownerUserId: 'usr_a' } });
  await openBoard(page, boardId);
  const opener = page.locator('[data-card-open][aria-label^="Return focus"]').first();
  const id = await opener.getAttribute('data-card-open');
  expect(id).toBeTruthy();
  await opener.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close (Esc)' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(`[data-card-open="${id}"]`)).toBeFocused();
});
}
