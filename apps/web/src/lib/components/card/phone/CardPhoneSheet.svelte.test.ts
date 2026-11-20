// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import CardPhoneSheet from './CardPhoneSheet.svelte';
import { mountModel } from '../testing/mount-model.svelte';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('../testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('../testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
afterEach(() => cleanup());

describe('CardPhoneSheet', () => {
  it('is a modal dialog named by the card title, focused on open, scrolled to the top, drawing the card view', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const { model, dispose } = mountModel({ holdDetail: true });
    render(CardPhoneSheet, { props: { model, gate: null, question: null, pageHref: '/x', boardHref: '/b', onClose: vi.fn() } });
    const dialog = screen.getByRole('dialog', { name: 'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(dialog);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(dialog.querySelector('.cv[data-surface="phone"]')).toBeTruthy();
    dispose();
  });
});
