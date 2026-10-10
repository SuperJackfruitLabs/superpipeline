import type { Phase, Vibe } from '@superjackfruit/vibekit';
import type { AttentionItem } from '$lib/components/attention/attention';
import type { CardSummary, StageSummary } from '../card-summary';

export interface BoardLayoutProps {
  summaries: CardSummary[];
  stages: StageSummary[];
  attention: AttentionItem[];
  phase: Phase;
  vibe: Vibe;
  boardName: string;
  cardCount: number;
  onCompose: () => void;
}
