// apps/web/src/lib/components/card/layouts/CardPhone.svelte.test.ts
// @vitest-environment jsdom
process.env.TZ = 'Asia/Kolkata';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, cleanup, fireEvent } from '@testing-library/svelte';
import type { Component } from 'svelte';
import CardPhoneDaylight from './CardPhoneDaylight.svelte';
import CardPhonePaper from './CardPhonePaper.svelte';
import CardPhoneQuiet from './CardPhoneQuiet.svelte';
import CardPhoneStudio from './CardPhoneStudio.svelte';
import { CARD_SECTION_KEYS } from './types';
import { model4605, MEMBERS, AGENTS } from '../phone/phone-card.fixture';

vi.mock('$lib/stores/app.svelte', async () => {
  const f = await import('../phone/phone-card.fixture');
  return { app: { members: f.MEMBERS, agents: f.AGENTS, labels: [], board: { usage: { cardUsdCap: null } }, closeCard: vi.fn() } };
});
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
vi.useFakeTimers({ toFake: ['Date'] });
vi.setSystemTime(new Date('2026-10-11T08:21:00Z'));
afterEach(() => cleanup());

const PHONES = { daylight: CardPhoneDaylight, paper: CardPhonePaper, quiet: CardPhoneQuiet, studio: CardPhoneStudio } as const satisfies Record<string, Component<any>>;
const props = (vibe: keyof typeof PHONES, over: Record<string, unknown> = {}) => ({
  model: model4605(), vibe, phase: 'noon' as const, personName: 'Ira Mehta', gate: null, question: null,
  pageHref: '/b/brd_134a0ddb6d434478/c/card_05823a57e8224605/page', onClose: vi.fn(), ...over,
});

describe.each(Object.keys(PHONES) as (keyof typeof PHONES)[])('%s phone card', (vibe) => {
  it('opens as a page in the same tab', () => {
    render(PHONES[vibe], { props: props(vibe) });
    const link = screen.getByRole('link', { name: 'Open as a page' });
    expect(link.getAttribute('href')).toBe('/b/brd_134a0ddb6d434478/c/card_05823a57e8224605/page');
    expect(link.hasAttribute('target')).toBe(false);
  });
  it('lists all seven stages to resume at, later ones disabled', () => {
    render(PHONES[vibe], { props: props(vibe) });
    const select = screen.getByLabelText('Resume at stage') as HTMLSelectElement;
    expect([...select.options].map((o) => [o.textContent, o.disabled])).toEqual([
      ['1 · Reported', false], ['2 · Reproduce (where it stopped)', false], ['3 · Failing test', true], ['4 · Fix', true],
      ['5 · Integrate', true], ['6 · Signed off', true], ['7 · Shipped', true],
    ]);
  });
  it('sends back to work through the resume model', async () => {
    const p = props(vibe);
    p.model.resume.submit = vi.fn(async () => {});
    render(PHONES[vibe], { props: p });
    await fireEvent.click(screen.getByRole('button', { name: 'Send back to work' }));
    expect(p.model.resume.submit).toHaveBeenCalledOnce();
  });
  it('closes on Close (Esc)', async () => {
    const p = props(vibe);
    render(PHONES[vibe], { props: p });
    await fireEvent.click(screen.getByRole('button', { name: 'Close (Esc)' }));
    expect(p.onClose).toHaveBeenCalledOnce();
  });
  it('renders every section exactly once', async () => {
    const { container } = render(PHONES[vibe], { props: props(vibe) });
    const seen = new Map<string, number>();
    const count = () => container.querySelectorAll('[data-section]').forEach((el) => {
      const k = el.getAttribute('data-section')!;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    });
    if (vibe === 'studio') {
      const persistent = new Set<string>();
      for (const name of ['Spec', 'Log', 'Links', 'Talk', 'Cost']) {
        await fireEvent.click(screen.getByRole('tab', { name: new RegExp(`^${name}`) }));
        container.querySelectorAll('[data-section]').forEach((el) => {
          const k = el.getAttribute('data-section')!;
          if (el.closest('[role="tabpanel"]')) seen.set(k, (seen.get(k) ?? 0) + 1);
          else persistent.add(k);
        });
      }
      for (const k of persistent) seen.set(k, (seen.get(k) ?? 0) + 1);
    } else count();
    expect(Object.fromEntries(CARD_SECTION_KEYS.map((k) => [k, seen.get(k) ?? 0]))).toEqual(Object.fromEntries(CARD_SECTION_KEYS.map((k) => [k, 1])));
  });
});

describe('vibe specifics', () => {
  it('Daylight: sentence-cases the bubble and keeps Session activity open', () => {
    const { container } = render(CardPhoneDaylight, { props: props('daylight') });
    expect(container.querySelector('.bub')!.textContent!.startsWith('Not reproduced end-to-end:')).toBe(true);
    const open = [...container.querySelectorAll('details.sec')].filter((d) => (d as HTMLDetailsElement).open).map((d) => d.querySelector('summary')!.textContent);
    expect(open).toEqual(['Session activity 2 runs']);
    expect(screen.getByRole('heading', { level: 3, name: 'Stopped, waiting on you 2 tries so far' })).toBeTruthy();
  });
  it('Paper: addresses the person and keeps Correspondence open', () => {
    const { container } = render(CardPhonePaper, { props: props('paper') });
    expect(screen.getByText('Dear Ira,')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Re: Diagnose Melissa and Anna Supermessage silence — trace actual failing hop');
    expect([...container.querySelectorAll('details.en')].filter((d) => (d as HTMLDetailsElement).open).map((d) => d.querySelector('summary b')!.textContent)).toEqual(['Correspondence']);
    expect(screen.getByText('diagnostics, on Reproduce · Thursday 8 October, 19:41')).toBeTruthy();
  });
  it('Quiet: a plain fieldset with a described note', () => {
    render(CardPhoneQuiet, { props: props('quiet') });
    const fs = screen.getByRole('group', { name: 'Your decision is needed' });
    expect(within(fs).getByText('Stopped. Waiting for you. 2 tries so far.')).toBeTruthy();
    const note = within(fs).getByLabelText('Note for error-eric');
    expect(document.getElementById(note.getAttribute('aria-describedby')!)!.textContent).toBe('Say what changed, or what to do differently. error-eric reads this.');
    expect(screen.getByText('card_05823a57e8224605')).toBeTruthy();
  });
  it('Studio: the track label carries every stage and its state', () => {
    render(CardPhoneStudio, { props: props('studio') });
    const track = screen.getByRole('img', { name: /^1 Reported, done; 2 Reproduce, stopped here;/ });
    expect(track.getAttribute('aria-label')).toBe('1 Reported, done; 2 Reproduce, stopped here; 3 Failing test; 4 Fix; 5 Integrate; 6 Signed off; 7 Shipped');
  });
  it('Studio: roving tabs, Spec first', async () => {
    render(CardPhoneStudio, { props: props('studio') });
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Spec10', 'Log2 runs', 'Links5', 'Talk0', 'Cost$0']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    await fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /^Log/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel', { name: 'Log' })).toBeTruthy();
    expect(screen.getByText('13:51 · midday').getAttribute('aria-label')).toBe('13:51, midday');
  });
});

describe('phone names (R3, O12/O13)', () => {
  it('Paper phone salutes by first name, and says Hello when only an email is known', () => {
    render(CardPhonePaper, { props: props('paper') });
    expect(screen.getByText('Dear Ira,')).toBeTruthy();
    cleanup();
    render(CardPhonePaper, { props: props('paper', { personName: 'ira@vibes-fixture.invalid' }) });
    expect(screen.getByText('Hello,')).toBeTruthy();
    expect(document.body.textContent).not.toContain('Dear ira@');
  });
  it('Studio phone names an agent comment author from the roster', async () => {
    const m = props('studio').model;
    (m.comments as { comments: unknown[] }).comments = [{ id: 'cmt_1', cardId: 'card_05823a57e8224605', author: { kind: 'agent', id: 'agt_fx_error_eric', name: null }, body: 'From a known agent.', createdAt: '2026-10-10T08:00:00Z', editedAt: null, deletedAt: null }];
    render(CardPhoneStudio, { props: props('studio', { model: m }) });
    const talk = [...document.querySelectorAll<HTMLElement>('[role="tab"], button')].find((b) => /^Talk/.test(b.textContent!.trim()));
    if (talk) await fireEvent.click(talk);
    expect(document.body.textContent).toMatch(/error-eric\s*From a known agent\./);
  });
});

describe.each(Object.keys(PHONES) as (keyof typeof PHONES)[])('%s phone: empty sections (R2)', (vibe) => {
  it('hides an absent plan and no decisions', () => {
    render(PHONES[vibe], { props: props(vibe) });
    expect(document.body.textContent).not.toMatch(/did not post a plan|No decisions on this card/);
    for (const key of ['plan', 'decisions']) for (const el of document.querySelectorAll<HTMLElement>(`[data-section="${key}"]`)) expect(el.hidden, key).toBe(true);
  });
});
