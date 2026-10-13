// apps/web/src/lib/components/card/phone/CardPhoneSheet.svelte.test.ts
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import CardPhoneSheet from './CardPhoneSheet.svelte';
import { model4605 } from './phone-card.fixture';

vi.mock('$lib/stores/app.svelte', async () => {
  const f = await import('./phone-card.fixture');
  return { app: { members: f.MEMBERS, agents: f.AGENTS, labels: [], board: { usage: { cardUsdCap: null } }, closeCard: vi.fn() } };
});
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
afterEach(() => cleanup());

describe('CardPhoneSheet', () => {
  it('is a modal dialog named by the card title, focused on open, scrolled to the top', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    render(CardPhoneSheet, { props: { model: model4605(), vibe: 'quiet', phase: 'noon', personName: 'Ira Mehta', gate: null, question: null, pageHref: '/x', onClose: vi.fn() } });
    const dialog = screen.getByRole('dialog', { name: 'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(dialog);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
