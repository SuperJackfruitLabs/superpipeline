// apps/web/src/lib/components/card/layouts/types.ts
/**
 * What a card surface is handed (spec §7.5, amendments §7.3–§7.4). The model owns the data and
 * every control; a layout only draws it. Every element a layout draws for one of the 23 sections
 * carries `data-section="<key>"` (an empty one is `<span hidden data-section>`), and
 * `card-layouts.svelte.test.ts` holds every layout to each key exactly once.
 */
import type { Mood, Phase, Vibe } from '@superjackfruit/vibekit';
import type { Elicitation, Gate, GateConflict, GateDecision } from '$lib/api';
import type { CardModel } from '../card-model.svelte';
import type { QuestionAnswer } from '../question/question-answer.svelte';

export const CARD_SECTION_KEYS = [
  'error', 'status', 'facts', 'editButton', 'editForm', 'description', 'delivery', 'resume', 'plan', 'criteria',
  'details', 'project', 'links', 'subtasks', 'activity', 'decisions', 'comments', 'handoff', 'cost', 'attempts',
  'related', 'references', 'cardActions',
] as const;
export type CardSectionKey = (typeof CARD_SECTION_KEYS)[number];

/** `description`, `handoff`, `cost`: whether that section has anything to show. */
export interface CardCounts { criteria: number; planSteps: number; specFields: number; runs: number; links: number; children: number; openChildren: number; decisions: number; refs: number; attempts: number; deliveryActive: boolean; description: boolean; handoff: boolean; cost: boolean }
export interface CardAgent { id: string | null; name: string; iconUrl: string | null; mood: Mood }
export interface GateBinding {
  boardId: string; gate: Gate; error: string | null; conflict: GateConflict | null; conflictWho: string;
  onResponse: (d: GateDecision, r: Response) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}
export interface QuestionBinding { model: QuestionAnswer; elicitation: Elicitation; agent: CardAgent }

export interface CardLayoutProps {
  model: CardModel;
  vibe: Vibe;
  phase: Phase;
  /** `app.user?.name ?? app.user?.login ?? 'there'` */
  personName: string;
  gate: GateBinding | null;
  question: QuestionBinding | null;
  /** `/b/{boardId}/c/{cardId}/page` */
  pageHref: string;
  onClose: () => void;
}
export type CardPageProps = Omit<CardLayoutProps, 'onClose'> & { boardHref: string };
export type CardStateCellKey = 'gate' | 'question' | 'archived' | 'done' | 'error' | 'loading';
export interface CardStateCell { model: CardModel; gate: GateBinding | null; question: QuestionBinding | null }
export interface CardStatesProps { cells: Record<CardStateCellKey, CardStateCell>; vibe: Vibe; phase: Phase }
