// apps/web/src/lib/components/operate/operate-words.test.ts
import { describe, expect, it } from 'vitest';
import type { Notification } from '$lib/api';
import { ageShort, ageWords } from '$lib/age';
import {
  attemptsSignalOperate, cut140, daylightCap, daylightGreeting, daylightMeta, dayWords, greetingLabel, kindWord,
  localHM, moveOptionLabel, needCounts, paperCap, paperMastEnd, paperMastLine, paperMeta, quietLede, quietMeta,
  quietSpend, quietLine, resumeOptions, staleLine, stageOwnerText, studioCapFigure, studioHeroTitle, studioOpLine,
  studioSub, summarySentenceDaylight, summarySentenceStudio, when, letters,
} from './operate-words';
import { needRows } from './operate-data';
import { itemsFromBoard, sortAttention } from '$lib/components/attention/attention';
import { C1DFC, C4605, C58F8, C63AC, D5, DX_AGENTS, DX_BOARD, DX_NOTIFICATIONS, DX_NOW, TEXT_B } from '$lib/test/dx-snapshot';

const TZ = 'Asia/Kolkata';
const stage = (key: string) => DX_BOARD.stages.find((s) => s.key === key)!;
const rows = needRows(DX_BOARD, DX_AGENTS, sortAttention(itemsFromBoard(DX_BOARD, DX_AGENTS, DX_NOW), 'stage'), DX_NOW);
const row = (id: string) => rows.find((r) => r.item.cardId === id)!;
const latest = (id: string) => DX_NOTIFICATIONS.filter((n) => n.cardId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]!;

describe('ages (consumed from $lib/age, pinned at the fixture values)', () => {
  it('reads hours under two days and days after', () => {
    expect([33.9, 66.2, 70.5, 1.2, 0.5].map(ageWords)).toEqual(['33 hours', '2 days', '2 days', '1 hour', 'under an hour']);
    expect(ageShort(33.9, false)).toBe('33h');
    expect(ageShort(66.2, false)).toBe('2d');
  });
});

describe('dayWords', () => {
  it('a day, then words, then digits; hours under a day (G-T2)', () => {
    expect([24, 48, 70, 24 * 11, 12].map(dayWords)).toEqual(['a day', 'two days', 'two days', '11 days', '12 hours']);
  });
});

describe('kindWord', () => {
  it('names each kind', () => {
    expect(kindWord('blocked')).toBe('Stopped');
    expect(kindWord('repeated-failure')).toBe('Stopped');
    expect(kindWord('no-owner')).toBe('No owner');
    expect(kindWord('question')).toBe('Asked');
    expect(kindWord('sub-tasks')).toBe('Waiting on sub-tasks');
    expect(kindWord('budget')).toBe('Over budget');
  });
});

describe('stageOwnerText', () => {
  it('capability and the one agent, or how many', () => {
    expect(['reproduce', 'test', 'fix', 'integrate'].map((k) => stageOwnerText(stage(k), DX_AGENTS, 'full'))).toEqual([
      'diagnostics, error-eric', 'testing, tester-tim', 'code, 2 agents', 'integration or api or testing, 3 agents',
    ]);
    expect(['reproduce', 'test', 'fix', 'integrate'].map((k) => stageOwnerText(stage(k), DX_AGENTS, 'agents'))).toEqual(['error-eric', 'tester-tim', '2 agents', '3 agents']);
  });
  it('a move option per vibe', () => {
    expect(moveOptionLabel('daylight', stage('fix'), DX_AGENTS)).toBe('Fix · code, 2 agents');
    expect(moveOptionLabel('paper', stage('reproduce'), DX_AGENTS)).toBe('Reproduce · error-eric');
    expect(moveOptionLabel('quiet', stage('integrate'), DX_AGENTS)).toBe('Integrate (3 agents)');
  });
});

describe('resumeOptions', () => {
  it('every stage in order, the current one marked', () => {
    expect(resumeOptions(DX_BOARD.stages, 'test').map((o) => o.label)).toEqual(['Reported', 'Reproduce', 'Failing test (where it stopped)', 'Fix', 'Integrate', 'Signed off', 'Shipped']);
  });
});

describe('cut140 and the attempts signal', () => {
  it('cuts at 140 and adds an ellipsis', () => {
    expect(cut140(D5)).toBe('not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, w…');
    expect(cut140(row(C58F8.id).item.detail!)).toBe('Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod a…');
    expect(cut140(TEXT_B)).toBe(TEXT_B);
  });
  it('signals three attempts or more (OP-G13)', () => {
    expect([5, 2, 1, 3].map(attemptsSignalOperate)).toEqual([true, false, false, true]);
  });
});

describe('when and staleLine (classified by the attention kind, O-9)', () => {
  it('UTC hours and minutes', () => {
    expect(when(latest(C1DFC.id))).toBe('22:50');
    expect(when(latest(C4605.id))).toBe('14:11');
  });
  it('Daylight', () => {
    expect(staleLine(latest(C1DFC.id), 'daylight', 'blocked')).toBe('Still stopped a day later in Fix.');
    expect(staleLine(latest(C63AC.id), 'daylight', 'no-owner')).toBe('Still unclaimed after two days in Reported.');
  });
  it('Paper', () => {
    expect(staleLine(latest(C4605.id), 'paper', 'blocked')).toBe(' — still stopped a day later in Reproduce. ');
    expect(staleLine(latest(C63AC.id), 'paper', 'no-owner')).toBe(' — still unclaimed after two days in Reported. ');
  });
  it('Studio', () => {
    expect(staleLine(latest(C1DFC.id), 'studio', 'blocked')).toBe('Still stopped 24h later in Fix. ');
    expect(staleLine(latest(C58F8.id), 'studio', 'blocked')).toBe('Still stopped 24h later in Failing test. ');
    expect(staleLine(latest(C63AC.id), 'studio', 'no-owner')).toBe('Still unclaimed 48h in Reported. ');
  });
  it('Quiet, with the pointer to the reason', () => {
    expect(quietLine(latest(C4605.id), 'blocked', true)).toBe('14:11 UTC: still stopped a day later in Reproduce. The reason is under Needs your decision.');
    expect(quietLine(latest(C63AC.id), 'no-owner', true)).toBe('09:55 UTC: still unclaimed after two days in Reported. The reason is under Needs your decision.');
  });
  it('anything that is not a stale notice reads verbatim', () => {
    const rework = DX_NOTIFICATIONS.find((n) => n.kind === 'rework')!;
    expect(staleLine(rework, 'daylight', 'blocked')).toBeNull();
    expect(quietLine(rework, 'blocked', false)).toBe('21:30 UTC: Sent back for one automatic rework: the handoff is missing commit');
    const odd: Notification = { ...rework, kind: 'stale', body: 'Stale for a while' };
    expect(staleLine(odd, 'studio', 'blocked')).toBeNull();
  });
});

describe('sentences', () => {
  const counts = needCounts(rows);
  it('counts the stopped, the unclaimed and the rest', () => expect(counts).toEqual({ s: 3, o: 1, other: 0 }));
  it('Daylight greeting and summary', () => {
    expect(greetingLabel('noon')).toBe('Good afternoon');
    expect(daylightGreeting('noon', 'Rakesh', 4)).toBe('Good afternoon, Rakesh. 4 cards want you.');
    expect(daylightGreeting('noon', 'Rakesh', 1)).toBe('Good afternoon, Rakesh. 1 card wants you.');
    expect(daylightGreeting('noon', 'Rakesh', 0)).toBe('Good afternoon, Rakesh. Nothing needs you.');
    expect(daylightGreeting('noon', '', 0)).toBe('Good afternoon. Nothing needs you.');
    expect(summarySentenceDaylight(counts, 0)).toBe('Three agents stopped and are waiting on you, and one card has nobody to pick it up. Nothing is running.');
    expect(summarySentenceDaylight({ s: 1, o: 0, other: 0 }, 2)).toBe('One agent stopped and is waiting on you. Two agents are working.');
  });
  it('Paper masthead', () => {
    expect(paperMastLine(DX_NOW, 'noon', 4, 0, TZ)).toBe('Sunday 11 October, in full daylight. Four letters wait for you; no one is at work.');
    expect(paperMastLine(DX_NOW, 'noon', 1, 1, TZ)).toBe('Sunday 11 October, in full daylight. One letter waits for you; one agent is at work.');
    expect(paperMastEnd('Developer Experience', 7)).toBe('Developer Experience · 7 cards');
    expect(letters(4)).toBe('4 letters');
  });
  it('Studio hero, summary and op line', () => {
    expect(studioHeroTitle(4, 0)).toEqual({ sr: '4 ', text: 'cards on this board need you, and nothing is running' });
    expect(studioHeroTitle(0, 0)).toEqual({ sr: '', text: 'Nothing on this board needs you' });
    expect(summarySentenceStudio(counts, 0, 0)).toBe('Three stopped and are waiting to be resumed; one sits in a stage no agent works and needs moving. No agent is working anything, and nothing has been spent this week.');
    expect(studioOpLine(DX_NOW, 'noon', TZ)).toBe('13:51 · midday · times UTC');
    expect(localHM(DX_NOW, TZ)).toBe('13:51');
  });
  it('Quiet lede', () => {
    expect(quietLede('Developer Experience', 4, 0)).toBe('Developer Experience. 4 cards need you. No agent is working. Times are in UTC. ');
  });
});

describe('row meta per vibe', () => {
  it('Daylight', () => {
    expect(daylightMeta(row(C4605.id))).toBe('stopped in Reproduce · 2 days ago · attempt 2');
    expect(daylightMeta(row(C58F8.id))).toBe('stopped in Failing test · 33 hours ago · attempt 1');
    expect(daylightMeta(row(C63AC.id))).toBe('in Reported · 2 days, overdue since 6 Oct');
  });
  it('Paper', () => {
    expect(paperMeta(row(C4605.id))).toEqual(['Stopped', '· Reproduce', '· 2 days ago', '· attempt 2']);
    expect(paperMeta(row(C63AC.id))).toEqual(['No owner', '· Reported', '· 2 days', '· due 6 Oct, overdue']);
  });
  it('Quiet', () => {
    expect(quietMeta(row(C4605.id))).toBe('Stopped in Reproduce · 2 days · 2 attempts · ');
    expect(quietMeta(row(C58F8.id))).toBe('Stopped in Failing test · 33 hours · 1 attempt · ');
    expect(quietMeta(row(C63AC.id))).toBe('No owner in Reported · 2 days · due 6 October, overdue · ');
  });
  it('Studio sub-line', () => {
    expect(studioSub(row(C63AC.id))).toBe('Reported · due 2026-10-06, overdue');
    expect(studioSub(row(C4605.id))).toBe('Reproduce');
  });
});

describe('spend words', () => {
  it('no cap, then a cap', () => {
    expect(daylightCap(null)).toBe('No cap set');
    expect(daylightCap(25)).toBe('of $25.00 cap');
    expect(paperCap(null)).toBe('No cap set.');
    expect(paperCap(25)).toBe('Capped at $25.00.');
    expect(studioCapFigure(null)).toEqual({ value: '—', label: 'Budget cap · none set', zero: true });
    expect(studioCapFigure(25)).toEqual({ value: '$25.00', label: 'Budget cap', zero: false });
  });
  it('Quiet sentence', () => {
    expect(quietSpend(null, [])).toBe('. No budget cap is set. No agent has spent anything.');
    expect(quietSpend(25, [{ name: 'coder-kai', costUsd: 1.5 }])).toBe('. The budget cap is $25.00. coder-kai spent the most.');
  });
});
