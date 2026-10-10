/**
 * Product strings that change tone by vibe. Each is written four ways with the same meaning and
 * the same placeholders (copy.test.ts). Buttons, fields and badges are NOT here: they read the
 * same in every vibe (spec decision 6). vibekit's own catalogue (say, greeting) covers the suite
 * strings; these are Superpipeline's.
 */
import type { Phase, Vibe } from '@superjackfruit/vibekit';
import type { CardLead, LeadKind } from '$lib/components/card/card-lead';

export type Four = Readonly<Record<Vibe, string>>;
const four = (daylight: string, paper: string, studio: string, quiet: string): Four => ({ daylight, paper, studio, quiet });

export const LEAD_FALLBACK: Readonly<Record<LeadKind, Four>> = {
  question: four("I've got a question for you 🙋", 'I have a question before I go on.', 'QUESTION PENDING.', 'The agent asked a question.'),
  review: four('All done, ready for your review ✨', "It's ready for you to review.", 'AWAITING REVIEW.', 'Waiting for your review.'),
  stopped: four("I've stopped and need you 😕", "I stopped, and I'd rather ask than guess.", 'STOPPED. Needs operator.', 'Stopped. Waiting for you.'),
  failed: four('That run failed 😬', 'The last run failed.', 'FAILED.', 'The run failed.'),
  budget: four("I've hit the budget cap 💸", "I've reached the budget cap.", 'OVER BUDGET.', 'Over its budget cap.'),
  working: four('On it!', "I'm working on it.", 'WORKING.', 'Working.'),
  done: four('Done! 🎉', 'This is done.', 'DONE.', 'Completed.'),
  idle: four('Waiting to be picked up.', 'Waiting to be picked up.', 'QUEUED.', 'Not started.'),
};

export const COPY = {
  'board.wantYou': four('{n} cards want you.', '{n} letters wait on you.', '{n} NEED YOU.', '{n} cards need your decision.'),
  'board.wantYouOne': four('1 card wants you.', 'One letter waits on you.', '1 NEEDS YOU.', '1 card needs your decision.'),
  'board.nothing': four('Nothing needs you.', 'Nothing waits on you.', '0 NEED YOU.', 'No cards need your decision.'),
  'lead.from': four('{agent}', '{agent} wrote', '{agent}', '{agent}'),
} as const satisfies Record<string, Four>;
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

const EMOJI = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)/u;
export function splitEmoji(text: string): Array<{ text: string; emoji: boolean }> {
  return text.split(EMOJI).filter((p) => p !== '').map((p) => ({ text: p, emoji: EMOJI.test(p) }));
}

export const LIGHT_WORDS: Readonly<Record<Phase, string>> = { dawn: 'first light', morning: 'morning light', noon: 'full daylight', golden: 'golden light', dusk: 'evening light', night: 'lamplight' };
