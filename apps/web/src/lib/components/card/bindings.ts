/**
 * What the card model hands a layout besides itself: the section counts, the agent, and the gate
 * and question bindings. A leaf below both the model and the layout props (`layouts/types.ts`
 * re-exports these), so the model can name them without importing the props that name it.
 */
import type { Mood } from '@superjackfruit/vibekit';
import type { Elicitation, Gate, GateConflict, GateDecision } from '$lib/api';
import type { QuestionAnswer } from './question/question-answer.svelte';

/** `description`, `handoff`, `cost`: whether that section has anything to show. */
export interface CardCounts { criteria: number; planSteps: number; specFields: number; runs: number; links: number; children: number; openChildren: number; decisions: number; refs: number; attempts: number; deliveryActive: boolean; description: boolean; handoff: boolean; cost: boolean }
export interface CardAgent { id: string | null; name: string; iconUrl: string | null; mood: Mood }
export interface GateBinding {
  boardId: string; gate: Gate; error: string | null; conflict: GateConflict | null; conflictWho: string;
  onResponse: (d: GateDecision, r: Response) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}
export interface QuestionBinding { model: QuestionAnswer; elicitation: Elicitation; agent: CardAgent }
