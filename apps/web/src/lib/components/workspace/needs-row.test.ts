// apps/web/src/lib/components/workspace/needs-row.test.ts
import { describe, expect, it } from 'vitest';
import type { AttentionItem } from '$lib/components/attention/attention';
import { actionLink, chipClass, clip, metaLine, needsHeadMeta, sortOldestFirst, studioUnit, unansweredFoot, WS_KIND_LABEL } from './needs-row';

const DX = 'brd_134a0ddb6d434478';
const D58F8 = "Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim's station write access. The matching URL ssh://git@forge.superjackfruit.com:2222/SuperJackfruitLabs/agentpod.git authenticates as tester-tim and is readable, but push is refused with “Mirror Repository SuperJackfruitLabs/agentpod is read-only”. Local red-test commit 7a444f3a and verbatim failure evidence are preserved at https://app.superlibrary.dev/a/itm_569034f61d1b4b1a; no GitHub push was attempted.";
const D1DFC = 'this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit';
const D4605 = 'not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs. No Accounts defect established; no issue filed.';
const blocked = 'stopped and is waiting on you';
const I = (cardId: string, title: string, kind: AttentionItem['kind'], stageName: string, headline: string, ageHours: number | null, detail: string | null = null): AttentionItem => ({
  id: `${kind}:${DX}:${cardId}`, kind, boardId: DX, boardName: 'Developer Experience', cardId, title, stageKey: stageName.toLowerCase(), stageName,
  headline, detail, instruction: '', actions: kind === 'no-owner' ? ['open'] : ['resume', 'open'], ageHours,
});
const R63AC = I('card_ace250c9c25363ac', 'Fix the highest-severity blocker found in the clean-room journey', 'no-owner', 'Reported', 'nothing claims the Reported stage', 70.5);
const R4605 = I('card_05823a57e8224605', 'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop', 'blocked', 'Reproduce', blocked, 66.2, D4605);
const R58F8 = I('card_9ac2116a050858f8', 'AgentPod: connector interface and generic effects ledger, state machine and executor', 'blocked', 'Failing test', blocked, 33.9, D58F8);
const R1DFC = I('card_e10fb4fe39a91dfc', 'Superpipeline: manual-delivery completion and approval-subject hardening', 'blocked', 'Fix', blocked, 33.6, D1DFC);

describe('workspace needs rows', () => {
  it('prints the meta line the reference prints', () => {
    expect(metaLine(R63AC)).toBe('Developer Experience · nothing claims the Reported stage · 2d');
    expect(metaLine(R4605)).toBe('Developer Experience · Reproduce · stopped and is waiting on you · 2d');
    expect(metaLine(R58F8)).toBe('Developer Experience · Failing test · stopped and is waiting on you · 33h');
    expect(metaLine(R1DFC)).toBe('Developer Experience · Fix · stopped and is waiting on you · 33h');
    expect(metaLine({ ...R1DFC, ageHours: 0.4 })).toBe('Developer Experience · Fix · stopped and is waiting on you · just now');
    expect(metaLine({ ...R1DFC, ageHours: null })).toBe('Developer Experience · Fix · stopped and is waiting on you');
  });
  it('sorts oldest first, unknown ages last, ties by title', () => {
    expect(sortOldestFirst([R58F8, R63AC, R1DFC, R4605]).map((r) => r.cardId.slice(-4))).toEqual(['63ac', '4605', '58f8', '1dfc']);
    expect(sortOldestFirst([{ ...R1DFC, ageHours: null }, R58F8]).map((r) => r.cardId.slice(-4))).toEqual(['58f8', '1dfc']);
  });
  it('clips a long reason to its first sentence, or to 140 characters when the sentence is too long', () => {
    expect(clip(D58F8)).toEqual({ shown: "Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim's station write access…", long: true });
    expect(clip(D1DFC)).toEqual({ shown: D1DFC, long: false });
    expect(clip(D4605)).toEqual({ shown: 'not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, w…', long: true });
  });
  it('keeps signal for the kinds that need a person, and labels every kind', () => {
    expect(chipClass('blocked')).toBe('chip-signal');
    expect(chipClass('no-owner')).toBe('chip-line');
    expect(chipClass('question')).toBe('chip-line');
    expect(studioUnit('blocked')).toBe('needs');
    expect(studioUnit('no-owner')).toBe('off');
    expect([WS_KIND_LABEL.blocked, WS_KIND_LABEL['no-owner'], WS_KIND_LABEL['repeated-failure']]).toEqual(['Blocked', 'Unowned', 'Failing']);
  });
  it('says whether every board answered', () => {
    expect(needsHeadMeta(0)).toBe('Oldest first. Every board answered.');
    expect(needsHeadMeta(1)).toBe('Oldest first. 1 board did not answer.');
    expect(unansweredFoot(1)).toBe('1 board did not answer; this list may be incomplete.');
    expect(unansweredFoot(2)).toBe('2 boards did not answer; this list may be incomplete.');
  });
  it('turns actions into links', () => {
    expect(actionLink(R1DFC, 'open')).toEqual({ label: 'Open', href: `/b/${DX}/c/card_e10fb4fe39a91dfc`, primary: false });
    expect(actionLink(R1DFC, 'log')).toEqual({ label: 'Open log', href: `/b/${DX}/c/card_e10fb4fe39a91dfc?tab=attempts`, primary: false });
    expect(actionLink(R1DFC, 'staff')).toEqual({ label: 'Staff an agent', href: '/workspace/capabilities', primary: false });
    expect(actionLink(R1DFC, 'review')).toEqual({ label: 'Review', href: `/b/${DX}/c/card_e10fb4fe39a91dfc`, primary: true });
    expect(actionLink(R1DFC, 'resume')).toBeNull();
  });
});
