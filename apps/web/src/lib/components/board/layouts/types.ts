// apps/web/src/lib/components/board/layouts/types.ts
import type { Phase, Vibe } from '@superjackfruit/vibekit';
import type { BoardModel } from '../board-model';

export interface BoardLayoutProps {
  model: BoardModel;
  vibe: Vibe;
  phase: Phase;
  onCompose: () => void;
}
