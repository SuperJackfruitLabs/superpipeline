/**
 * Product strings that change tone by vibe. Each is written once per vibe with the same meaning and
 * the same placeholders (copy.test.ts). Buttons, fields and badges are NOT here: they read the
 * same in every vibe (spec decision 6). vibekit's own catalogue (say, greeting) covers the suite
 * strings; these are Superpipeline's.
 */
import type { Phase, Vibe } from '@superjackfruitlabs/vibekit-ui';
import type { CardLead, LeadKind } from '$lib/components/card/card-lead';

export type PerVibe = Readonly<Record<Vibe, string>>;
const perVibe = (daylight: string, paper: string, studio: string, quiet: string, console: string): PerVibe => ({ daylight, paper, studio, quiet, console });

export const LEAD_FALLBACK: Readonly<Record<LeadKind, PerVibe>> = {
  question: perVibe("I've got a question for you 🙋", 'I have a question before I go on.', 'QUESTION PENDING.', 'The agent asked a question.', 'Question: pending.'),
  review: perVibe('All done, ready for your review ✨', "It's ready for you to review.", 'AWAITING REVIEW.', 'Waiting for your review.', 'Review: ready.'),
  stopped: perVibe("I've stopped and need you 😕", "I stopped, and I'd rather ask than guess.", 'STOPPED. Needs operator.', 'Stopped. Waiting for you.', 'Stopped: needs you.'),
  failed: perVibe('That run failed 😬', 'The last run failed.', 'FAILED.', 'The run failed.', 'Run: failed.'),
  budget: perVibe("I've hit the budget cap 💸", "I've reached the budget cap.", 'OVER BUDGET.', 'Over its budget cap.', 'Budget: over cap.'),
  working: perVibe('On it!', "I'm working on it.", 'WORKING.', 'Working.', 'Working.'),
  done: perVibe('Done! 🎉', 'This is done.', 'DONE.', 'Completed.', 'Done.'),
  idle: perVibe('Waiting to be picked up.', 'Waiting to be picked up.', 'QUEUED.', 'Not started.', 'Queued.'),
};

export const COPY = {
  'board.wantYou': perVibe('{n} cards want you.', '{n} letters wait on you.', '{n} NEED YOU.', '{n} cards need your decision.', '{n} need you.'),
  'board.wantYouOne': perVibe('1 card wants you.', 'One letter waits on you.', '1 NEEDS YOU.', '1 card needs your decision.', '1 needs you.'),
  'board.nothing': perVibe('Nothing needs you.', 'Nothing waits on you.', '0 NEED YOU.', 'No cards need your decision.', '0 need you.'),
  'lead.from': perVibe('{agent}', '{agent} wrote', '{agent}', '{agent}', '{agent}'),
} as const satisfies Record<string, PerVibe>;
export type CopyId = keyof typeof COPY;

export function words(id: CopyId, vibe: Vibe, vars: Record<string, string | number> = {}): string {
  return COPY[id][vibe].replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in vars)) throw new Error(`${id} needs {${k}}`);
    return String(vars[k]);
  });
}

export function wantYou(n: number, vibe: Vibe): string {
  if (n <= 0) return words('board.nothing', vibe);
  if (n === 1) return words('board.wantYouOne', vibe);
  return words('board.wantYou', vibe, { n });
}

export const leadText = (lead: Pick<CardLead, 'kind' | 'sentence'>, vibe: Vibe): string => lead.sentence ?? LEAD_FALLBACK[lead.kind][vibe];

const EMOJI = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/u;
export function splitEmoji(text: string): Array<{ text: string; emoji: boolean }> {
  return text.split(EMOJI).filter((p) => p !== '').map((p) => ({ text: p, emoji: EMOJI.test(p) }));
}

export const LIGHT_WORDS: Readonly<Record<Phase, string>> = { dawn: 'first light', morning: 'morning light', noon: 'full daylight', golden: 'golden light', dusk: 'evening light', night: 'lamplight' };
