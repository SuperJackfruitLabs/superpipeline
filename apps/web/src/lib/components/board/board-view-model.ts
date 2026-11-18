// apps/web/src/lib/components/board/board-view-model.ts
/**
 * What the board page draws, as pure functions of the board model: the stage track (every stage,
 * its count and who works it), the lanes (only stages holding cards, and the last stage), the
 * attention line and the footer. The same in every vibe.
 */
import type { StageDetail } from '@superjackfruitlabs/vibekit-ui';
import type { ShellStatus } from '$lib/components/shell/shell-words';
import type { BoardModel, BoardStage } from './board-model';
import { attentionLine, laneWho } from './board-words';
import type { CardSummary } from './card-summary';

/** The last stage folds its finished work to this many tiles, when it holds more than one more. */
export const TERMINAL_FOLD = 3;

export interface LaneView {
  stage: BoardStage;
  /** People needed first (the board's order). */
  cards: CardSummary[];
  count: number;
  who: string;
  /** Tiles shown before "Show N more"; null shows them all. */
  fold: number | null;
}

export interface BoardView {
  stageNames: string[];
  details: StageDetail[];
  lanes: LaneView[];
  needs: number;
  attention: string;
}

export function trackDetails(stages: readonly BoardStage[]): StageDetail[] {
  return stages.map((st) => ({ count: st.count, who: st.ownerShort, needs: st.units.includes('needs') }));
}

export function lanesOf(m: BoardModel): LaneView[] {
  return m.laneStages.map((stage) => {
    const cards = m.ordered.filter((s) => s.stageKey === stage.key);
    return { stage, cards, count: cards.length, who: laneWho(stage), fold: stage.terminal && cards.length > TERMINAL_FOLD + 1 ? TERMINAL_FOLD : null };
  });
}

export function boardView(m: BoardModel): BoardView {
  return {
    stageNames: m.stages.map((s) => s.name),
    details: trackDetails(m.stages),
    lanes: lanesOf(m),
    needs: m.counts.needs,
    attention: attentionLine(m.counts.needs),
  };
}

/** The footer: the shell's board status words (this board's cards, who they need, synced), one line. */
export const footerLine = (status: ShellStatus): string => status.items.map((i) => i.text).join(' · ');
