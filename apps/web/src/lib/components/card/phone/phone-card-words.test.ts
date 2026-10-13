// apps/web/src/lib/components/card/phone/phone-card-words.test.ts
process.env.TZ = 'Asia/Kolkata';
import { describe, it, expect } from 'vitest';
import { model4605, MEMBERS, AGENTS, D4605 } from './phone-card.fixture';
import {
  STOP_COPY, RESUME_PLACEHOLDER, phoneCardView, trackAria, daylightCaption, paperCaption, studioCaption, dockHeading, resumeOptions,
  attemptWord, attemptReason, dayShort, detailValue, studioDetailsSummary, paperDay, paperEye, paperScFacts, paperEnclosures,
  quietLead, quietMetaTail, quietState, quietAgent, quietAskedBy, quietInStage, quietStages, codeTokens, studioFigs, studioClock, studioWhen,
  usdShort, linkRows, triesWord, trackStagesLabel,
} from './phone-card-words';

const NOW = Date.parse('2026-10-11T08:21:00Z');
const view = () => phoneCardView(model4605(), { members: MEMBERS, agents: AGENTS, cardCap: null, nowMs: NOW });
const STAGES = model4605().stages;

describe('stage track words', () => {
  it('labels the bars and writes the caption, per vibe', () => {
    expect(trackAria(STAGES, 1, 'stopped')).toBe('Stage 2 of 7, Reproduce, stopped here');
    expect(trackAria(STAGES, 1, 'stopped', { here: false })).toBe('Stage 2 of 7, Reproduce, stopped');
    expect(trackAria(STAGES, 1, 'stopped', { archived: true })).toBe('Stopped at stage 2 of 7, Reproduce, archived');
    expect(daylightCaption(STAGES, 1, 'stopped', false)).toEqual({ lead: 'Stage 2 of 7 · ', bold: 'Reproduce, stopped here', tail: ' · next: Failing test, Fix, Integrate, Signed off, Shipped' });
    expect(daylightCaption(STAGES, 1, 'stopped', true).bold).toBe('Reproduce, where it stopped');
    expect(daylightCaption(STAGES, 6, 'done', false).tail).toBe('');
    expect(paperCaption(STAGES, 1, true)).toBe('Stage 2 of 7 · Reproduce, where it stopped · then Failing test');
    expect(paperCaption(STAGES, 1, false)).toBe('Stage 2 of 7 · Reproduce, now · then Failing test');
    expect(paperCaption(STAGES, 6, false)).toBe('Stage 7 of 7 · Shipped, now');
    expect(studioCaption(STAGES, 1, 'stopped')).toEqual({ bold: 'Reproduce · stopped here', tail: ' · next Failing test' });
  });
});

describe('studio track label', () => {
  it('names every stage with its state', () => {
    expect(trackStagesLabel(STAGES, 1, 'stopped')).toBe('1 Reported, done; 2 Reproduce, stopped here; 3 Failing test; 4 Fix; 5 Integrate; 6 Signed off; 7 Shipped');
    expect(trackStagesLabel(STAGES, 1, 'stopped', true)).toContain('2 Reproduce, where it stopped, archived');
  });
});

describe('resume form', () => {
  it('heads the dock and lists every stage, later ones disabled', () => {
    expect(dockHeading('stopped', 2)).toEqual({ title: 'Stopped, waiting on you', small: '2 tries so far' });
    expect(dockHeading('failed', 1)).toEqual({ title: 'Failed, waiting on you', small: '1 try so far' });
    expect(triesWord(2)).toBe('2 tries');
    expect(resumeOptions(model4605().resume.targets)).toEqual([
      { value: 'reported', label: '1 · Reported', disabled: false },
      { value: 'reproduce', label: '2 · Reproduce (where it stopped)', disabled: false },
      { value: 'test', label: '3 · Failing test', disabled: true },
      { value: 'fix', label: '4 · Fix', disabled: true },
      { value: 'integrate', label: '5 · Integrate', disabled: true },
      { value: 'signed-off', label: '6 · Signed off', disabled: true },
      { value: 'shipped', label: '7 · Shipped', disabled: true },
    ]);
    expect(RESUME_PLACEHOLDER).toBe('For example: what you checked, and what the agent should look at next.');
  });
});

describe('runs and attempts', () => {
  it('words each attempt', () => {
    const [a1, a2] = model4605().attempts;
    expect(attemptWord(a1, false, 'stopped')).toBe('Sent back');
    expect(attemptWord(a2, true, 'stopped')).toBe('Stopped');
    expect(attemptReason(a1, 'Sent back')).toBe('Sent back: repro and observed missing');
    expect(attemptReason(a2, 'Stopped')).toBe('Stopped: waiting on you');
    expect(attemptReason({ failureReason: null }, 'Done')).toBe('Done');
  });
  it('prints the day on a run’s first row and the time after it', () => {
    expect(dayShort('2026-10-08T13:20:00Z')).toBe('Thu 8 Oct');
  });
  it('builds the run list newest first, with the stop row in product words', () => {
    const v = view();
    expect(v.runs.map((r) => [r.title, r.meta, r.open])).toEqual([
      ['Run 2 · Reproduce', 'error-eric · Stopped · attempt 2', true],
      ['Run 1 · Reproduce', 'error-eric · Sent back · attempt 1', false],
    ]);
    expect(v.runs[0].rows).toEqual([
      { key: 1, verb: 'Started', body: 'Rework run on this card session; read prior persisted evidence first.', time: 'Thu 8 Oct', stop: false, parameter: null, result: null },
      { key: 14, verb: 'Stopped', body: STOP_COPY, time: '19:41', stop: true, parameter: null, result: null },
    ]);
    expect(v.runs[1].rows).toEqual([{ key: 1, verb: 'Sent back', body: 'The board refused completion: repro and observed were missing.', time: 'Thu 8 Oct', stop: false, parameter: null, result: null }]);
    expect(v.attemptRows.map((a) => [a.n, a.agentName, a.mood, a.usd, a.text])).toEqual([
      [1, 'error-eric', 'resting', '$0.00', 'Sent back: repro and observed missing'],
      [2, 'error-eric', 'needs', '$0.00', 'Stopped: waiting on you'],
    ]);
  });
  it('shows every row when tool calls are on', () => {
    const m = model4605();
    m.showToolCalls = true;
    expect(phoneCardView(m, { members: MEMBERS, agents: AGENTS, cardCap: null, nowMs: NOW }).runs[0].rows).toHaveLength(14);
  });
});

describe('phoneCardView (4605)', () => {
  it('names the people and the grant', () => {
    const v = view();
    expect(v.ownerName).toBe('Ira Mehta');
    expect(v.queuer).toEqual({ id: 'agt_bb586732b807460c', name: 'super-chotu', byAgent: true });
    expect(v.grantLine).toBe("Queued by super-chotu on Ira Mehta's grant · 32 agents may be dispatched.");
    expect(v.grantTitle).toBe("Queued on Ira Mehta's grant");
    expect(v.speaker).toBe('error-eric');
    expect(v.live).toBe(true);
  });
  it('words the state row and facts', () => {
    const v = view();
    expect([v.stateWord, v.claim, v.priorityWord, v.dueWord, v.labelsWord, v.ageWords]).toEqual(['Waiting on you', 'Unclaimed', 'P3', null, null, '2 days']);
  });
  it('words the sections', () => {
    const v = view();
    expect(v.cost).toEqual({ amount: '$0.00', rest: ' spent · no estimate · no card cap set' });
    expect(v.subtasks).toEqual({ count: '0/0', line: '0 of 0 open. No sub-tasks yet.' });
    expect(v.project).toEqual({ summary: 'Melissa and Anna onboarding', line: 'Marketing & Community — Melissa and Anna onboarding · no milestone' });
    expect(v.handoff).toEqual({ summary: 'from Reported', text: 'From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.' });
    expect([v.planSummary, v.fieldsCount, v.groups.map((g) => g.label)]).toEqual(['none yet', 10, ['What to do', 'Who it is about', 'Background', 'Rules', 'Where work goes']]);
    expect(v.refs.map((r) => [r.title, r.subtitle, r.source])).toEqual([
      ['AgentPod v0.1.91 Matrix inbound bridge contract', 'DM ingress → room lookup → Accounts identity/grant → ACP dispatch', 'github · agentpod · inbound.ts lines 379–786'],
      ['AgentPod v0.1.91 Matrix reply delivery contract', 'ACP chunks buffered and flushed via bridge-owned Matrix identity', 'github · agentpod · outbound.ts lines 373–486'],
      ['AgentPod v0.1.91 ACP transport contract', 'acp.open/attach and bidirectional broker framing', 'github · agentpod · acp-transport.ts lines 90–248'],
      ['Accounts current claims/grant contract', 'Fresh tokens read the stored grant; bridge authorization reads Accounts principal view directly', 'github · accounts · claims.ts lines 17–43'],
      ['Hermes ACP adapter at the reproduced build', 'Hermes streams agent_message_chunk and returns end_turn over ACP stdio', 'github · hermes-agent · server.py lines 818–883'],
    ]);
    expect(v.links).toEqual([]);
  });
});

describe('detail values', () => {
  const crit = model4605().acceptanceCriteria!;
  it('shows the first paragraph and offers the rest', () => {
    expect(detailValue('Shown part.\n\nThe rest.', crit, 'Things to prove')).toEqual({ kind: 'text', shown: 'Shown part.', more: 'The rest.' });
    expect(detailValue('One paragraph.', crit, 'Things to prove')).toEqual({ kind: 'text', shown: 'One paragraph.', more: null });
  });
  it('says where the required evidence is listed, per surface', () => {
    expect(detailValue(crit, crit, 'Things to prove')).toEqual({ kind: 'evidence', text: '5 items, listed under Things to prove.' });
  });
  it('renders the structured shapes', () => {
    expect(detailValue({ matrixId: '@agent_message-melissa:id.agentpod.dev', card: 'card_f180b1627c594b41' }, crit, 'x')).toEqual({ kind: 'matrix', id: '@agent_message-melissa:id.agentpod.dev', card: 'card_f180b1627c594b41' });
    expect(detailValue({ repo: 'SuperJackfruitLabs/atelier', visibility: 'private', policyUrl: 'https://github.com/SuperJackfruitLabs/atelier/blob/main/AGENTS.md' }, crit, 'x')).toEqual({
      kind: 'repo', text: 'SuperJackfruitLabs/atelier · private · ', href: 'https://github.com/SuperJackfruitLabs/atelier/blob/main/AGENTS.md',
    });
  });
  it('summarises the Studio details disclosure', () => {
    expect(studioDetailsSummary(['What to do', 'Who it is about', 'Background', 'Rules', 'Where work goes'], 10)).toBe('10 fields · what to do, who, background, rules, where work goes');
  });
});

describe('Paper phone', () => {
  it('heads the letter', () => {
    expect(paperDay(new Date(NOW), 'noon')).toBe('Sunday, in full daylight');
    expect(paperEye(true, null)).toBe('A letter that needs a reply');
    expect(paperEye(false, '2026-10-08T10:00:00Z')).toBe('Archived on 8 October');
    expect(paperEye(false, null)).toBeNull();
  });
  it('prints the small-caps facts', () => {
    const v = view();
    expect(paperScFacts(v, model4605())).toEqual(['Waiting on you', 'P3', 'no due date', 'no labels', 'in Reproduce 2 days', 'attempt 2', 'owner Ira Mehta', 'asked by super-chotu', 'unclaimed']);
  });
  it('summarises the five enclosures', () => {
    expect(paperEnclosures(view(), model4605())).toEqual({
      brief: '5 things to prove · 10 details · project',
      happened: '2 runs · 2 attempts · no decisions · $0.00',
      waiting: 'no links · no sub-tasks',
      attached: '5 references · no related prior work',
      correspondence: 'no comments yet',
    });
  });
});

describe('Quiet phone', () => {
  it('writes the fieldset and the details rows', () => {
    expect(quietLead('stopped', 2)).toBe('Stopped. Waiting for you. 2 tries so far.');
    expect(quietMetaTail('stopped', '2 days')).toBe('Stopped 2 days ago');
    expect(quietState('stopped', true, false)).toBe('Stopped, waiting on you');
    expect(quietState('stopped', true, true)).toBe('Archived (was stopped, waiting on you)');
    expect(quietAgent(null, 'error-eric')).toBe('error-eric (last run). Unclaimed.');
    expect(quietAgent('coder-kai', 'coder-kai')).toBe('coder-kai, working it.');
    expect(quietAskedBy('super-chotu', 'Ira Mehta')).toBe("super-chotu, on Ira Mehta's grant");
    expect(quietInStage('Reproduce', '2 days', 2)).toBe('Reproduce for 2 days, attempt 2');
    expect(quietStages(STAGES, 1)).toBe('1 Reported (done), 2 Reproduce (here), 3 Failing test, 4 Fix, 5 Integrate, 6 Signed off, 7 Shipped');
  });
});

describe('Studio phone', () => {
  it('marks code tokens in the readout, display only', () => {
    const parts = codeTokens(`N${D4605.slice(1)}`);
    expect(parts.filter((p) => p.code).map((p) => p.text)).toEqual([
      'acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023', 'event_id/room_id/timestamp', 'matrix-inbound/control-pair/ACP/matrix-outbound', 'matrix_rooms',
    ]);
    expect(parts.map((p) => p.text).join('')).toBe(`N${D4605.slice(1)}`);
  });
  it('reads the figures', () => {
    expect(studioFigs({ stageIndex: 1, stageCount: 7, attempts: 2, kind: 'stopped', ageHours: 66.15, cost: 0, estimateUsd: null, blocks: 0, openSub: 0, totalSub: 0 })).toEqual([
      { dt: 'Stage', value: '2', small: '/7', z: false },
      { dt: 'Tries', value: '2', z: false },
      { dt: 'Stopped for', value: '2', small: 'days', z: false },
      { dt: 'Cost · no est.', value: '$0.00', z: true },
      { dt: 'Blocks', value: '0', z: true },
      { dt: 'Sub-tasks', value: '0', small: '/0', z: true },
    ]);
  });
  it('tells the time and the quote time', () => {
    expect(studioClock('2026-10-11T08:21:00Z', 'noon')).toEqual({ text: '13:51 · midday', aria: '13:51, midday' });
    expect(studioWhen('2026-10-08T14:11:45Z')).toBe('Thu 08 Oct 19:41');
    expect(usdShort(0)).toBe('$0');
    expect(usdShort(1.5)).toBe('$1.50');
  });
  it('labels link rows by kind', () => {
    expect(linkRows({ blockedBy: [{ cardId: 'card_x', title: 'X', badge: { glyph: '⛔', label: 'Blocked', tooltip: '' }, remove: { kind: 'blocks', otherCardId: 'card_x' } as never }], resolvedBlockedBy: [], blocks: [], relates: [], supersedes: [], advisory: [] }, 'brd_1')).toEqual([
      { key: 'blockedBy:card_x', label: 'Blocked by', title: 'X', href: '/b/brd_1/c/card_x', remove: { kind: 'blocks', otherCardId: 'card_x' } },
    ]);
  });
});
