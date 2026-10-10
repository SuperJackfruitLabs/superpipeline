/**
 * What a card layout is handed (spec §3.5, §7.5). The drawer shell owns the data and every
 * control; a layout only chooses where each of the 23 sections goes and how the question and the
 * gate are drawn. `layout-parity.test.ts` holds every layout to rendering each section once.
 */
import type { Snippet } from 'svelte';
import type { Mood, Phase, Vibe } from '@superjackfruit/vibekit';
import type { Card, Elicitation, Gate, GateDecision, Stage } from '$lib/api';
import type { CardLead } from '../card-lead';
import type { QuestionAnswer } from '../question/question-answer.svelte';

export const CARD_SECTION_KEYS = [
  'error', 'status', 'facts', 'editButton', 'editForm', 'description', 'delivery', 'resume', 'plan', 'criteria',
  'details', 'project', 'links', 'subtasks', 'activity', 'decisions', 'comments', 'handoff', 'cost', 'attempts',
  'related', 'references', 'cardActions',
] as const;
export type CardSectionKey = (typeof CARD_SECTION_KEYS)[number];
export type CardSections = Readonly<Record<CardSectionKey, Snippet>>;

export interface CardCounts { criteria: number; planSteps: number; specFields: number; runs: number; links: number; children: number; openChildren: number; decisions: number; refs: number; attempts: number; deliveryActive: boolean }
export interface CardAgent { id: string | null; name: string; iconUrl: string | null; mood: Mood }
export interface GateBinding { boardId: string; gate: Gate; error: string | null; onResponse: (d: GateDecision, r: Response) => Promise<boolean> }
export interface QuestionBinding { model: QuestionAnswer; elicitation: Elicitation; agent: CardAgent }

export interface CardLayoutProps {
  card: Card;
  vibe: Vibe;
  phase: Phase;
  boardName: string;
  personName: string;
  stages: Stage[];
  stageIndex: number;
  stageName: string;
  ageHours: number | null;
  lead: CardLead;
  agent: CardAgent;
  sections: CardSections;
  counts: CardCounts;
  editing: boolean;
  gate: GateBinding | null;
  question: QuestionBinding | null;
}
