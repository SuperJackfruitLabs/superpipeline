// apps/web/src/lib/components/board/phone/phone-words.test.ts
import { describe, it, expect } from 'vitest';
import { DX, DETAIL_4605 as D4605, DETAIL_58F8 as D58F8, DETAIL_1DFC as D1DFC, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel, unitOf } from '../board-model';
import {
  wantsOrder, isStopped, needsCounts, phoneHello, phoneHelloP, wantsIntro, phoneLede, quietPhoneHeader,
  phoneTitleLabel, usd, laneNote, blockedChip, blockedByChip, pdStageLine, actionWord, personStageText, pdDue,
  paperWaitingHeading, paperSig, paperQuote, paperFacts, paperEntryBy, paperEntryFacts, pipelineRest,
  studioRowLabel, studioNext, studioFacts, studioDue, studioFigs, studioStageO, smAria, stagesSummaryRight, rowIndex,
  quietMeta, quietReason, quietFacts, quietAction, quietCount,
} from './phone-words';

const dxRows = () => buildBoardModel(DX, DX.cards, boardCtx()).ordered;
const byId = (short: string) => dxRows().find((r) => r.id.endsWith(short))!;

describe('wantsOrder', () => {
  it('puts stopped cards first by age, then no-owner, then the rest in desktop order', () => {
    // dxRows() is the desktop `ordered` list: 63ac, 58f8, 1dfc, 4605, f83f, 481f, 9ed9.
    expect(wantsOrder(dxRows()).map((r) => r.id.slice(-4))).toEqual(['4605', '58f8', '1dfc', '63ac', 'f83f', '481f', '9ed9']);
  });
  it('keeps questions and reviews after no-owner, oldest first', () => {
    const rows = [
      { id: 'q', urgency: 'needs' as const, kind: 'question' as const, ageHours: 90 },
      { id: 'n', urgency: 'needs' as const, kind: 'no-owner' as const, ageHours: 1 },
      { id: 'b', urgency: 'needs' as const, kind: 'blocked' as const, ageHours: 2 },
      { id: 'r', urgency: 'needs' as const, kind: 'review' as const, ageHours: 95 },
    ];
    expect(wantsOrder(rows).map((r) => r.id)).toEqual(['b', 'n', 'r', 'q']);
  });
});

describe('greeting band (Daylight phone)', () => {
  it('greets by first name', () => {
    expect(phoneHello('noon', 'Ira')).toBe('Good afternoon, Ira.');
  });
  it('says what wants you, in words', () => {
    expect(needsCounts(dxRows())).toEqual({ needs: 4, stopped: 3, noOwner: 1, questions: 0, reviews: 0 });
    expect(phoneHelloP(needsCounts(dxRows()))).toEqual({ strong: '4 cards want you.', rest: "Three agents stopped and one card waits in a person's stage." });
    expect(phoneHelloP({ needs: 0, stopped: 0, noOwner: 0, questions: 0, reviews: 0 })).toEqual({ strong: 'Nothing needs you.', rest: '' });
    expect(phoneHelloP({ needs: 1, stopped: 0, noOwner: 0, questions: 1, reviews: 0 })).toEqual({ strong: '1 card wants you.', rest: 'One asked a question.' });
  });
  it('introduces the wants lane', () => {
    expect(wantsIntro(4)).toBe('From four stages, most urgent first.');
    expect(wantsIntro(1)).toBe('From one stage, most urgent first.');
  });
});

describe('Daylight phone tiles', () => {
  it('reads the stage line', () => {
    expect(pdStageLine(byId('4605'))).toBe('Reproduce · stage 2 of 7 · 2d');
    expect(pdStageLine(byId('58f8'))).toBe('Failing test · stage 3 of 7 · 33h');
    expect(pdStageLine(byId('1dfc'))).toBe('Fix · stage 4 of 7 · 33h');
    expect(pdStageLine(byId('63ac'))).toBe("Reported · a person's stage · 2d");
    expect(pdStageLine(byId('f83f'))).toBe('Queued · 2d');
    expect(pdStageLine(byId('481f'))).toBe('Queued · 33h');
    expect(pdStageLine(byId('9ed9'))).toBe('Done · 1d ago · 15 attempts');
  });
  it('names the title button for a screen reader', () => {
    expect(phoneTitleLabel(byId('4605'))).toBe('Diagnose Melissa and Anna Supermessage silence — trace actual failing hop, in Reproduce. Enter to open, M to move, Alt with left or right arrow to move between stages.');
  });
  it('picks the action word and the person-stage sentence', () => {
    expect(isStopped(byId('4605'))).toBe(true);
    expect(isStopped(byId('63ac'))).toBe(false);
    expect(actionWord(byId('58f8'))).toBe('Resume');
    expect(actionWord(byId('63ac'))).toBe('Open');
    expect(personStageText('Reported')).toBe("Reported is a person's stage. Waiting for you to pick it up or move it on.");
  });
  it('writes due, cost and lane notes', () => {
    expect(pdDue(byId('63ac'))).toEqual({ text: 'Due 6 Oct, overdue', overdue: true });
    expect(usd(0)).toBe('$0.00');
    expect(laneNote(1, 0)).toBe('1 card, waiting on you above.');
    expect(laneNote(1, 2)).toBe('1 card is waiting on you above. 2 are queued here.');
    expect(laneNote(0, 2)).toBeNull();
    expect(blockedChip(2)).toEqual({ text: '2 blocked', title: '2 cards wait on other cards' });
    expect(blockedByChip(['AgentPod: connector interface and generic effects ledger, state machine and executor'])).toEqual({
      text: 'Blocked by 1 card',
      title: 'Waits on AgentPod: connector interface and generic effects ledger, state machine and executor',
    });
    expect(blockedByChip(['a', 'b', 'c']).text).toBe('Blocked by 3 cards');
    expect(blockedByChip(['a', 'b', 'c']).title).toBe('Waits on 3 cards: a; b; c');
  });
});

describe('Paper phone', () => {
  it('heads the letters column', () => {
    expect(paperWaitingHeading(4)).toBe('Waiting on you · 4 letters');
    expect(paperWaitingHeading(0)).toBe('Waiting on you');
  });
  it('signs each letter', () => {
    expect(paperSig(byId('4605'))).toEqual({ face: { id: 'agt_fx_error_eric', name: 'error-eric', mood: 'needs' }, em: 'error-eric', rest: ' · Reproduce · 2 days ago · attempt 2' });
    expect(paperSig(byId('58f8')).rest).toBe(' · Failing test · 33 hours ago');
    expect(paperSig(byId('1dfc')).rest).toBe(' · Fix · 33 hours ago · attempt 5');
    expect(paperSig(byId('63ac'))).toEqual({ face: { id: 'agt_bb586732b807460c', name: 'super-chotu', mood: 'resting' }, em: 'asked by super-chotu', rest: ' · Reported · 2 days ago' });
  });
  it('quotes the agent, sentence-cased', () => {
    expect(paperQuote(byId('1dfc'))).toBe('“This stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit.”');
    expect(paperQuote(byId('4605'))).toBe(`“${'N' + D4605.slice(1)}”`);
    expect(paperQuote(byId('63ac'))).toBe("“Waiting to be picked up.” Reported is a person's stage.");
  });
  it('lists the facts', () => {
    expect(paperFacts(byId('4605'))).toEqual([{ text: 'P3' }, { text: 'asked by super-chotu' }, { text: '$0.00' }, { text: 'AgentPod v0.1.91 Matrix inbound bridge contract', cls: 'ref' }]);
    expect(paperFacts(byId('1dfc'))).toEqual([{ text: '$0.00' }, { text: 'test(api): pin manual delivery reminder', cls: 'ref' }]);
    expect(paperFacts(byId('63ac'))).toEqual([
      { text: 'P1' }, { text: 'clean-room' }, { text: 'evidence-required' }, { text: 'superpipeline' },
      { text: '+1', title: '1 more label' }, { text: 'Due 6 Oct · overdue', cls: 'od' },
    ]);
  });
  it('writes the entries', () => {
    expect(paperEntryBy(byId('f83f'))).toEqual({ em: 'Not picked up yet', rest: ' · Failing test · 2 days' });
    expect(paperEntryBy(byId('481f'))).toEqual({ em: 'Not picked up yet', rest: ' · Failing test · 33 hours' });
    expect(paperEntryBy(byId('9ed9'))).toEqual({ em: null, rest: 'Done yesterday · after 15 attempts' });
    expect(paperEntryFacts(byId('f83f'))).toEqual(['P2', 'Blocked by 3 cards', 'asked by super-chotu']);
    expect(paperEntryFacts(byId('481f'))).toEqual(['Blocked by 1 card']);
    expect(paperEntryFacts(byId('9ed9'))).toEqual(['P2', '$0.00']);
  });
  it('reads the pipeline', () => {
    expect(pipelineRest({ count: 3, blocked: 2 }, 'testing · tester-tim')).toBe(' · 3 · 2 blocked · testing · tester-tim');
    expect(pipelineRest({ count: 0, blocked: 0 }, 'integration')).toBe(' · empty · integration');
    expect(pipelineRest({ count: 1, blocked: 0 }, 'a person')).toBe(' · 1 · a person');
  });
});

describe('Studio phone', () => {
  it('writes the lede', () => {
    expect(phoneLede({ stopped: 3, noOwner: 1, daysOverdue: 5, queuedBlocked: 2, done: 1 })).toBe(
      'Three stopped and need resuming; one sits in your own stage and is five days overdue. Two are queued behind a blocker; one has shipped.',
    );
    expect(phoneLede({ stopped: 0, noOwner: 0, daysOverdue: 0, queuedBlocked: 0, done: 0 })).toBe('Nothing needs you.');
    expect(phoneLede({ stopped: 1, noOwner: 0, daysOverdue: 0, queuedBlocked: 0, done: 2 })).toBe('One stopped and needs resuming. Two have shipped.');
  });
  it('labels each row', () => {
    expect(studioRowLabel(byId('4605'))).toEqual({ text: 'Needs you · stopped', needs: true });
    expect(studioRowLabel(byId('63ac'))).toEqual({ text: 'Needs you · your stage', needs: true });
    expect(studioRowLabel(byId('f83f'))).toEqual({ text: 'Queued · blocked by 3', needs: false });
    expect(studioRowLabel(byId('481f'))).toEqual({ text: 'Queued · blocked by 1', needs: false });
    expect(studioRowLabel(byId('9ed9'))).toEqual({ text: 'Done', needs: false });
    expect(rowIndex(0)).toBe('01');
    expect(unitOf(byId('4605'))).toBe('needs');
    expect(unitOf(byId('f83f'))).toBe('blocked');
    expect(unitOf(byId('9ed9'))).toBe('done');
  });
  it('says what comes next on each row (the seeded summary wins over the fallback)', () => {
    expect(studioNext(byId('4605'))).toEqual({ text: 'No fresh DM event to trace; needs one per agent.', q: false });
    expect(studioNext(byId('58f8'))).toEqual({ text: 'Needs a writable Forge URL for agentpod.', q: false });
    expect(studioNext(byId('1dfc'))).toEqual({ text: 'Missing commit ×2.', q: false });
    expect(studioNext(byId('63ac'))).toEqual({ text: 'Pick it up or move it on. Overdue since 6 Oct.', q: false });
    expect(studioNext(byId('f83f'))).toEqual({ text: 'auto · waits on 3 cards · not picked up yet · $0.00', q: true });
    expect(studioNext(byId('481f'))).toEqual({ text: 'auto · waits on 1 card · not picked up yet · $0.00', q: true });
    expect(studioNext(byId('9ed9'))).toEqual({ text: '15 tries · $0.00', q: true });
    expect(studioNext({ ...byId('4605'), summaryLine: null })).toEqual({
      text: 'Not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs.',
      q: false,
    });
  });
  it('lists the facts and the due cell', () => {
    expect(studioFacts(byId('4605'))).toEqual([{ text: 'P3', p: true }, { text: 'AgentPod v0.1.91 Matrix inbound bridge contract' }, { text: 'asked by super-chotu' }]);
    expect(studioFacts(byId('63ac'))).toEqual([
      { text: 'P1', p: true }, { text: 'clean-room' }, { text: 'evidence-required' }, { text: 'superpipeline' }, { text: '+1', title: '1 more label' }, { text: 'asked by super-chotu' },
    ]);
    expect(studioFacts(byId('481f'))).toEqual([]);
    expect(studioFacts(byId('9ed9'))).toEqual([{ text: 'P2', p: true }]);
    expect(studioDue(byId('63ac'))).toEqual({ text: '6 Oct, overdue', sig: true });
    expect(studioDue(byId('4605'))).toEqual({ text: '—', sig: false });
  });
  it('reads the figures, the multiples and the stages list', () => {
    expect(studioFigs({ spend: 0, overBudget: 0, overdue: 1, stages: 7, blocked: 2 })).toEqual([
      { value: '$0.00', label: 'Spend · 7 days', z: true, sig: false },
      { value: '0', label: 'Over budget', z: true, sig: false },
      { value: '1', label: 'Overdue', z: false, sig: true },
      { value: '7', small: 'stages', label: '2 blocked', z: false, sig: false },
    ]);
    expect(smAria(3, 'Failing test', 3)).toBe('Stage 3, Failing test: 3 cards');
    expect(smAria(5, 'Integrate', 0)).toBe('Stage 5, Integrate: 0 cards');
    expect(studioStageO({ count: 3, blocked: 2, gate: false }, 'testing · tester-tim')).toEqual({ gate: false, text: '2 blocked · testing · tester-tim' });
    expect(studioStageO({ count: 0, blocked: 0, gate: false }, 'integration')).toEqual({ gate: false, text: 'integration · empty' });
    expect(studioStageO({ count: 0, blocked: 0, gate: true }, 'gate · approval by a person')).toEqual({ gate: true, text: ' approval by a person · empty' });
    expect(stagesSummaryRight(2, false)).toBe('2 blocked · show');
    expect(stagesSummaryRight(2, true)).toBe('2 blocked · hide');
    expect(stagesSummaryRight(0, false)).toBe('show');
  });
});

describe('Quiet phone', () => {
  it('heads the board', () => {
    expect(quietPhoneHeader(7, 4)).toBe('Superpipeline · 7 cards · 4 need your decision');
    expect(quietPhoneHeader(20, 0)).toBe('Superpipeline · 20 cards');
  });
  it('writes each item meta line', () => {
    expect(quietMeta(byId('4605'))).toEqual({ face: { id: 'agt_fx_error_eric', name: 'error-eric', mood: 'needs' }, text: 'error-eric · Reproduce · 2 days · attempt 2' });
    expect(quietMeta(byId('58f8')).text).toBe('tester-tim · Failing test · 33 hours');
    expect(quietMeta(byId('1dfc')).text).toBe('coder-kai · Fix · 33 hours · attempt 5');
    expect(quietMeta(byId('63ac'))).toEqual({ face: { id: 'agt_bb586732b807460c', name: 'super-chotu', mood: 'resting' }, text: 'asked by super-chotu · Reported · 2 days' });
    expect(quietMeta(byId('f83f'))).toEqual({ face: null, text: 'Not picked up yet · Failing test · 2 days' });
    expect(quietMeta(byId('9ed9'))).toEqual({ face: null, text: 'Completed yesterday · Shipped · 15 attempts' });
  });
  it('gives the reason, first sentence first', () => {
    expect(quietReason(byId('58f8'))).toEqual({
      lead: "Stopped. Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim's station write access.",
      more: 'The matching URL ssh://git@forge.superjackfruit.com:2222/SuperJackfruitLabs/agentpod.git authenticates as tester-tim and is readable, but push is refused with “Mirror Repository SuperJackfruitLabs/agentpod is read-only”. Local red-test commit 7a444f3a and verbatim failure evidence are preserved at https://app.superlibrary.dev/a/itm_569034f61d1b4b1a; no GitHub push was attempted.',
    });
    expect(quietReason(byId('4605'))!.more).toBe('No Accounts defect established; no issue filed.');
    expect(quietReason(byId('1dfc'))).toEqual({ lead: 'Stopped. This stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit.', more: null });
    expect(quietReason(byId('63ac'))).toEqual({ lead: "Not started. Reported is a person's stage.", more: null });
    expect(quietReason(byId('f83f'))).toBeNull();
  });
  it('writes the facts line', () => {
    expect(quietFacts(byId('4605'))).toEqual([{ text: 'Priority 3 · asked by super-chotu · $0.00 · AgentPod v0.1.91 Matrix inbound bridge contract' }]);
    expect(quietFacts(byId('1dfc'))).toEqual([{ text: 'No priority · $0.00 · test(api): pin manual delivery reminder' }]);
    expect(quietFacts(byId('63ac'))).toEqual([{ text: 'Priority 1 · labels: clean-room, evidence-required, superpipeline, and 1 more · ' }, { text: 'Due 6 October, overdue', od: true }]);
    expect(quietFacts(byId('f83f'))).toEqual([{ text: 'Priority 2 · blocked by 3 cards · asked by super-chotu' }]);
    expect(quietFacts(byId('481f'))).toEqual([{ text: 'Blocked by 1 card' }]);
    expect(quietFacts(byId('9ed9'))).toEqual([{ text: 'Priority 2 · $0.00' }]);
  });
  it('picks the action and the table counts', () => {
    expect(quietAction(byId('4605'))).toBe('Decide');
    expect(quietAction(byId('63ac'))).toBe('Open');
    expect(quietAction({ urgency: 'needs', kind: 'question' })).toBe('Answer');
    expect(quietAction({ urgency: 'needs', kind: 'review' })).toBe('Review');
    expect(quietCount({ count: 3, blocked: 2 })).toBe('3, 2 blocked');
    expect(quietCount({ count: 0, blocked: 0 })).toBe('empty');
    expect(quietCount({ count: 1, blocked: 0 })).toBe('1');
  });
});

describe('an agent that is not listed', () => {
  it('reads "an agent" on every phone line, never a short id', () => {
    const gone = { ...byId('58f8'), lastAgent: null };
    expect(quietMeta(gone).text).toBe('an agent · Failing test · 33 hours');
    expect(paperSig(gone).em).toBe('an agent');
    expect(paperEntryBy({ ...byId('58f8'), lastAgent: null, urgency: 'working' as const }).em).toBe('an agent');
  });
});

// The fixture's agent text is the stored text: lower-case 4605 and 1dfc, as the API returns them.
describe('fixture sanity', () => {
  it('stores agent text as the API does', () => {
    expect(D4605.startsWith('not reproduced end-to-end')).toBe(true);
    expect(D1DFC.startsWith('this stage')).toBe(true);
    expect(D58F8.startsWith('Blocked on')).toBe(true);
  });
});
