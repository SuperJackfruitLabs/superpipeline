// apps/web/e2e/visual/steps.ts — what a visual screen does after the page is ready and before the shot:
// open a dialog, fill a form, expire the session. Each ends blurred, so no focus ring is captured.
import type { Page } from '@playwright/test';

export const DX = '/b/brd_134a0ddb6d434478';
export const CARD_4605 = `${DX}/c/card_05823a57e8224605`;
/** Drop focus, so no focus ring is captured. */
export const blurActive = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

/** SP-Dlg-Reconnect: signed in, then every renewal refused and every API call 401 (no fixture variant). */
export async function expireSession(page: Page): Promise<void> {
  await page.route('**/hub/session', (r) => r.fulfill({ status: 200, json: { ok: false, reason: 'login_required', issuer: 'accounts.superjackfruit.com', reauthorize: '/auth/login' } }));
  await page.route('**/v1/**', (r) => r.fulfill({ status: 401, json: { error: 'unauthorized' } }));
  await page.evaluate(() => (window as unknown as { __spDev: { refresh(): Promise<void> } }).__spDev.refresh());
  await page.getByRole('alertdialog', { name: 'Sign in again to keep going' }).waitFor();
  await blurActive(page);
}

const BRIEF = `Done looks like:
• The blocker is reproduced from a clean room and named in one sentence.
• A failing test lands first, with the red run attached as evidence.
• The fix turns that test green and changes nothing else.

Do not:
• Push to the Forge mirror or to GitHub without an approval.
• Close the card without the evidence link.`;

/** SP-Dlg-NewCard: the composer filled in, labels picked. */
export async function fillNewCard(page: Page): Promise<void> {
  await page.keyboard.press('n');
  const d = page.getByRole('dialog', { name: 'What needs doing?' });
  await d.getByRole('textbox', { name: 'Describe it in a sentence' }).fill('Fix the highest-severity blocker found in the clean-room journey, with red-test evidence before any fix.');
  await d.getByRole('textbox', { name: 'Card title' }).fill('Fix the highest-severity blocker found in the clean-room journey');
  // The brief's heading names the agent only when an agent works the first stage (#11).
  await d.getByRole('textbox', { name: /^(Brief for the agent|What this card asks)$/ }).fill(BRIEF);
  await d.getByLabel('Due (optional)').fill('2026-10-18');
  await d.getByRole('radio', { name: 'P1' }).click();
  for (const name of ['clean-room', 'evidence-required', 'superpipeline']) {
    await d.getByRole('button', { name: 'Add label' }).click();
    await d.getByRole('option', { name, exact: true }).click();
  }
  await page.keyboard.press('Escape'); // closes only the label picker
  // Each field scrolled to its start.
  await d.locator('textarea, input').evaluateAll((els) => { for (const e of els as HTMLTextAreaElement[]) { e.scrollTop = 0; e.scrollLeft = 0; } });
  await blurActive(page);
}

/** SP-Dlg-Move: the Move dialog for the stopped Failing test card, Fix picked. */
export async function openMoveStep(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: /^Move AgentPod: connector interface/ }).first();
  await btn.hover();
  await btn.click();
  await page.getByRole('radio', { name: /^Fix/ }).check();
  await blurActive(page);
}
