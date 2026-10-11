// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/svelte';
import CardFacts from './CardFacts.svelte';
import { enforcedBadge } from './card-blocked';

afterEach(cleanup);

const full = (over: Record<string, unknown> = {}) => ({
  priority: 1,
  live: true,
  blocked: enforcedBadge([{ cardId: 'a', title: 'Other card' }, { cardId: 'b', title: 'Third' }]),
  children: { open: 1, total: 3 },
  labels: [{ id: 'l1', name: 'ux', colour: 'teal' }, { id: 'l2', name: 'api', colour: '' }, { id: 'l3', name: 'docs', colour: 'plum' }],
  moreLabels: 2,
  firstRef: { sourceType: 'pull_request', externalId: 'o/r#12', url: 'https://example.com/pr/12', title: null, metadata: { subState: 'pr_open' } },
  queuedBy: { name: 'Sample agent', agent: { id: 'agt_r', iconUrl: null } },
  cost: 1.5,
  overBudget: true,
  cardCap: 2,
  costPct: 75,
  dueAt: '2026-10-10',
  overdue: true,
  ...over,
}) as never;

const texts = () => [...document.querySelectorAll('.card-facts > li')].map((li) => li.textContent!.replace(/\s+/g, ' ').trim());

describe('CardFacts (chips)', () => {
  it('shows every fact the tile shows, in order', () => {
    render(CardFacts, { s: full(), tone: 'chips' });
    expect(texts()).toEqual([
      'P1Priority 1',
      'Agent working',
      '⛔ Blocked',
      '1/3',
      'ux',
      'api',
      'docs',
      '+2',
      'PR #12 open',
      'S asked by Sample agent',
      '$1.50',
      '', // the cost meter
      '⚠ 2026-10-10',
    ]);
    expect(screen.getByText('Priority 1').className).toContain('sr-only');
    expect(screen.getByText('⛔ Blocked').getAttribute('title')).toBe(enforcedBadge([{ cardId: 'a', title: 'Other card' }, { cardId: 'b', title: 'Third' }])!.tooltip);
    expect(screen.getByText('1/3').getAttribute('title')).toBe('1 of 3 sub-tasks still open');
    expect(screen.getByText('+2').getAttribute('title')).toBe('2 more labels');
    const link = screen.getByRole('link', { name: /PR #12/ });
    expect(link.getAttribute('href')).toBe('https://example.com/pr/12');
    expect(within(link.closest('li')!).getByText('open')).toBeTruthy();
    expect(screen.getByText('asked by Sample agent').closest('li')!.getAttribute('title')).toBe('Queued by Sample agent, not by you');
    const cost = screen.getByText('$1.50');
    expect(cost.className).toContain('text-signal-text');
    expect(cost.getAttribute('title')).toBe('Agent cost on this card');
    const meter = screen.getByRole('meter');
    expect(meter.getAttribute('aria-valuenow')).toBe('75');
    expect(meter.getAttribute('title')).toBe('$1.50 of the $2.00 card cap');
  });

  it('shows nothing for a bare card, and drops the face when the queuing agent is gone', () => {
    render(CardFacts, {
      s: full({ priority: 0, live: false, blocked: null, children: null, labels: [], moreLabels: 0, firstRef: null, cost: 0, overBudget: false, costPct: null, dueAt: null, overdue: false, queuedBy: { name: 'Gone agent', agent: null } }),
    });
    expect(texts()).toEqual(['asked by Gone agent']);
  });

  it('shows a ref with no link when the url is not safe, and a plain future date', () => {
    render(CardFacts, { s: full({ firstRef: { sourceType: 'pull_request', externalId: 'o/r#3', url: 'javascript:alert(1)', title: null, metadata: {} }, overdue: false, overBudget: false }) });
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(/PR #3/)).toBeTruthy();
    expect(screen.getByText('· 2026-10-10')).toBeTruthy();
    expect(screen.getByText('$1.50').className).not.toContain('text-signal-text');
  });
});

describe('CardFacts (singular)', () => {
  it('says "1 more label" for one', () => {
    render(CardFacts, { s: full({ moreLabels: 1 }) });
    expect(screen.getByText('+1').getAttribute('title')).toBe('1 more label');
  });
});

describe('CardFacts (text)', () => {
  it('carries the same words without chips, and the meter becomes "75% of cap"', () => {
    render(CardFacts, { s: full(), tone: 'text' });
    expect(texts()).toEqual([
      'P1Priority 1',
      'Agent working',
      '⛔ Blocked',
      '1/3',
      'ux',
      'api',
      'docs',
      '+2',
      'PR #12 open',
      'S asked by Sample agent',
      '$1.50',
      '75% of cap',
      '⚠ 2026-10-10',
    ]);
    expect(document.querySelector('.blk-pill, .child-pill, .lbl-pill, .refchip, .queuedchip, .costbar')).toBeNull();
    expect(screen.queryByRole('meter')).toBeNull();
    expect(screen.getByText('75% of cap').getAttribute('title')).toBe('$1.50 of the $2.00 card cap');
  });
});
