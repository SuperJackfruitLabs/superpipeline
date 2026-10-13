// apps/web/src/lib/components/operate/spend-format.test.ts
import { describe, expect, it } from 'vitest';
import type { BoardEvent, Stage } from '$lib/api';
import {
  avgPerCard, barHeight, barHeightStudio, budgetLine, busiestIndex, busiestLine, capsStatus, cardsWithSpend, chartLabel, compactCount, dayLabel, dayRange,
  eventLabel, last7Days, logMeta, newestFirst, parseCap, pctOf, rawLine, shortId, shortTitle, tokenPair, usd, zeroFill,
} from './spend-format';

const NOW = Date.parse('2026-10-11T08:21:00Z');
const DAYS = last7Days(NOW);
const STAGES = [{ key: 'reported', name: 'Reported', order: 0 }, { key: 'test', name: 'Failing test', order: 2 }] as Stage[];
const ev = (type: string, payload: Record<string, unknown>, ts = '2026-10-10T22:50:12Z'): BoardEvent => ({ seq: 1, type, payload, ts });
const WITH_SPEND_DAYS = [
  { day: '2026-10-05', costUsd: 1.2 }, { day: '2026-10-06', costUsd: 3.4 }, { day: '2026-10-07', costUsd: 0.8 }, { day: '2026-10-08', costUsd: 2.9 },
  { day: '2026-10-09', costUsd: 4.1 }, { day: '2026-10-10', costUsd: 1.0 }, { day: '2026-10-11', costUsd: 0.8 },
];

describe('spend figures', () => {
  it('formats money, shares and token counts', () => {
    expect(usd(14.2)).toBe('$14.20');
    expect(pctOf(14.2, 25)).toBe(57);
    expect([compactCount(1_900_000), compactCount(0), compactCount(950), compactCount(1200)]).toEqual(['1.9M', '0', '950', '1.2k']);
    expect(tokenPair(1_600_000, 300_000)).toBe('1.6M in · 0.3M out');
    expect(tokenPair(0, 0)).toBe('0 in · 0 out');
    expect([cardsWithSpend(0), cardsWithSpend(1), cardsWithSpend(4)]).toEqual(['0 cards with spend in this window', '1 card with spend in this window', '4 cards with spend in this window']);
    expect(avgPerCard(14.2, 4)).toBe('$3.55');
    expect(avgPerCard(0, 0)).toBe('—');
  });
  it('says where the budget stands', () => {
    expect(budgetLine(0, null, false)).toEqual({ text: 'No budget cap set · ', setCap: true });
    expect(budgetLine(14.2, 25, false)).toEqual({ text: 'of a $25.00 board cap · 57% used', setCap: false });
    expect(budgetLine(30, 25, true)).toEqual({ text: 'of a $25.00 board cap · 120% used · over the cap', setCap: false });
    expect(capsStatus(null, null)).toBe('No caps set');
    expect(capsStatus(25, null)).toBe('Board $25.00 · card none');
  });
  it('accepts a cap only in dollars, above zero', () => {
    expect([parseCap(''), parseCap('25'), parseCap('12.50'), parseCap('0'), parseCap('1.234'), parseCap('abc')]).toEqual([null, 25, 12.5, 'invalid', 'invalid', 'invalid']);
  });
});

describe('the seven days', () => {
  it('are the UTC dates ending today', () => {
    expect(DAYS).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']);
    expect(DAYS.map(dayLabel)).toEqual(['Mon 5', 'Tue 6', 'Wed 7', 'Thu 8', 'Fri 9', 'Sat 10', 'Sun 11']);
    expect(dayRange(DAYS)).toBe('Monday 5 to Sunday 11 October');
    expect(dayRange(last7Days(Date.parse('2026-10-04T12:00:00Z')))).toBe('Monday 28 September to Sunday 4 October');
  });
  it('read as the zero branch on the fixture', () => {
    const zero = zeroFill([], DAYS);
    expect(zero.every((d) => d.costUsd === 0)).toBe(true);
    expect(busiestLine(zero)).toBe('No spend recorded in these 7 days.');
    expect(busiestIndex(zero)).toBe(-1);
    expect(chartLabel(zero)).toBe('Spend per day, Mon 5 $0.00, Tue 6 $0.00, Wed 7 $0.00, Thu 8 $0.00, Fri 9 $0.00, Sat 10 $0.00, Sun 11 $0.00');
    expect(zero.map((d) => barHeight(d.costUsd, 0))).toEqual([2, 2, 2, 2, 2, 2, 2]);
    expect(barHeightStudio(0, 0)).toBe(0);
  });
  it('read as the with-spend branch', () => {
    const days = zeroFill(WITH_SPEND_DAYS, DAYS);
    expect(busiestLine(days)).toBe('Busiest: Fri 9 · $4.10');
    expect(days.map((d) => barHeight(d.costUsd, 4.1))).toEqual([50, 141, 33, 120, 170, 41, 33]);
    expect(busiestIndex(zeroFill([{ day: '2026-10-05', costUsd: 2 }, { day: '2026-10-09', costUsd: 2 }], DAYS))).toBe(4);
  });
});

describe('the board log', () => {
  it('labels events in words', () => {
    expect(eventLabel(ev('notification', { kind: 'stale', cardId: 'card_e10fb4fe39a91dfc', body: 'Stuck 24h in Fix: this stage was not finished twice' }), STAGES)).toBe('Notification: stuck 24h in Fix');
    expect(eventLabel(ev('notification', { kind: 'stale', body: 'Stuck 24h in Failing test: Blocked on the forge' }), STAGES)).toBe('Notification: stuck 24h in Failing test');
    expect(eventLabel(ev('notification', { kind: 'stale', body: 'Stuck 48h in Reported: nothing claims it' }), STAGES)).toBe('Notification: stuck 48h in Reported');
    expect(eventLabel(ev('notification', { kind: 'blocked' }), STAGES)).toBe('Notification: stopped');
    expect(eventLabel(ev('cards.stale_digest', {}), STAGES)).toBe('Stale-card digest sent');
    expect(eventLabel(ev('card.moved', { cardId: 'card_482b4aa0bdd6481f', to: 'test', from: 'reported' }), STAGES)).toBe('Moved to Failing test');
    expect(eventLabel(ev('link.added', {}), STAGES)).toBe('Link added');
    expect(eventLabel(ev('gate.decided', {}), STAGES)).toBe('Gate decided');
  });
  it('keeps the raw names', () => {
    expect(rawLine(ev('link.added', { to: 'card_482b4aa0bdd6481f', from: 'card_9ac2116a050858f8' }))).toBe('link.added to=card_482b4aa0bdd6481f · from=card_9ac2116a050858f8');
    expect(rawLine(ev('card.moved', { cardId: 'card_482b4aa0bdd6481f', to: 'test', from: 'reported' }))).toBe('card.moved cardId=card_482b4aa0bdd6481f · to=test · from=reported');
    expect(rawLine(ev('cards.stale_digest', {}))).toBe('cards.stale_digest');
    expect(rawLine(ev('notification', { cardId: 'card_e10fb4fe39a91dfc', kind: 'stale', body: 'x' }))).toBe('notification cardId=card_e10fb4fe39a91dfc');
  });
  it('shortens card ids and titles', () => {
    expect(['card_e10fb4fe39a91dfc', 'card_9ac2116a050858f8', 'card_05823a57e8224605', 'card_ace250c9c25363ac'].map(shortId)).toEqual(['e10fb4', '9ac211', '05823a', 'ace250']);
    expect(shortTitle('Superpipeline: manual-delivery completion and approval-subject hardening')).toBe('Superpipeline: manual-delivery completion…');
    expect(shortTitle('AgentPod: connector interface and generic effects ledger, state machine and executor')).toBe('AgentPod: connector interface…');
    expect(shortTitle('Fix the highest-severity blocker found in the clean-room journey')).toBe('Fix the highest-severity blocker…');
    expect(shortTitle('Diagnose Melissa and Anna Supermessage silence — trace actual failing hop')).toBe('Diagnose Melissa and Anna…');
    expect(shortTitle('Short title')).toBe('Short title');
  });
  it('reads newest first, a digest before the notification it sent in the same second', () => {
    const e = (seq: number, type: string, ts: string): BoardEvent => ({ seq, type, payload: {}, ts });
    expect(newestFirst([e(1, 'card.moved', '2026-10-10T09:55:20Z'), e(2, 'cards.stale_digest', '2026-10-10T22:50:12Z'), e(3, 'notification', '2026-10-10T22:50:12Z')]).map((x) => x.seq)).toEqual([2, 3, 1]);
  });
  it('counts what it shows', () => {
    expect(logMeta(60)).toBe('last 60 events, newest first · times in UTC');
    expect(logMeta(1)).toBe('last 1 event, newest first · times in UTC');
  });
});
