// apps/web/src/lib/words.test.ts
import { describe, expect, it } from 'vitest';
import { firstSentence, joinAnd, lcFirst, numWord, plural, remainder, sentenceCase } from './words';

const D_58F8 =
  "Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim's station write access. The matching URL ssh://git@forge.superjackfruit.com:2222/SuperJackfruitLabs/agentpod.git authenticates as tester-tim and is readable, but push is refused with “Mirror Repository SuperJackfruitLabs/agentpod is read-only”. Local red-test commit 7a444f3a and verbatim failure evidence are preserved at https://app.superlibrary.dev/a/itm_569034f61d1b4b1a; no GitHub push was attempted.";
const D_1DFC =
  'this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit';
const D_4605 =
  'Not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs. No Accounts defect established; no issue filed.';

describe('numWord', () => {
  it('spells nought to ten and prints digits past it', () => {
    expect(numWord(4, true)).toBe('Four');
    expect(numWord(5)).toBe('five');
    expect(numWord(0)).toBe('no');
    expect(numWord(12)).toBe('12');
  });
});

describe('plural', () => {
  it('picks the form by the count', () => {
    expect(plural(1, 'card', 'cards')).toBe('1 card');
    expect(plural(7, 'card', 'cards')).toBe('7 cards');
    expect(plural(0, 'card', 'cards')).toBe('0 cards');
  });
});

describe('sentenceCase', () => {
  it('capitalises and closes an agent’s words, keeping a straight apostrophe', () => {
    expect(sentenceCase(D_1DFC)).toBe(
      'This stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit.',
    );
    expect(sentenceCase('already done.')).toBe('Already done.');
    expect(sentenceCase('  ')).toBe('');
  });
});

describe('firstSentence / remainder', () => {
  it('cuts at the first full stop past forty characters', () => {
    expect(firstSentence(D_58F8)).toBe(
      "Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim's station write access.",
    );
    expect(remainder(sentenceCase(D_4605))).toBe('No Accounts defect established; no issue filed.');
  });
  it('keeps one-sentence text whole and has no remainder', () => {
    expect(firstSentence(D_1DFC)).toBe(D_1DFC);
    expect(remainder(D_1DFC)).toBeNull();
  });
  it('does not cut at an early abbreviation', () => {
    expect(firstSentence('Fix it. Then ship the whole thing to the people who asked for it. Done.')).toBe(
      'Fix it. Then ship the whole thing to the people who asked for it.',
    );
  });
});

describe('lcFirst / joinAnd', () => {
  it('lower-cases the first letter', () => expect(lcFirst('Needs a writable Forge URL for agentpod.')).toBe('needs a writable Forge URL for agentpod.'));
  it('joins names with commas and a final "and"', () => {
    expect(joinAnd([])).toBe('');
    expect(joinAnd(['tester-tim'])).toBe('tester-tim');
    expect(joinAnd(['Integrate', 'Signed off'])).toBe('Integrate and Signed off');
    expect(joinAnd(['tester-tim', 'coder-kai', 'error-eric'])).toBe('tester-tim, coder-kai and error-eric');
  });
});
