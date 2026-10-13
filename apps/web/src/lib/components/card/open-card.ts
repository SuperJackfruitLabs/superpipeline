// apps/web/src/lib/components/card/open-card.ts
/**
 * A brief value can name a card on another board ("onboarding card") by its id alone. Find the
 * board that holds it and go there; the board list is the person's own, so this never reaches
 * a board they cannot see.
 */
import { goto as svelteGoto } from '$app/navigation';
import { getBoard as apiGetBoard } from '$lib/api';
import { app } from '$lib/stores/app.svelte';

export interface OpenCardDeps {
  boards: () => Array<{ id: string }>;
  getBoard: (id: string) => Promise<{ cards: Array<{ id: string }> }>;
  goto: (href: string) => Promise<void>;
}
const DEFAULT_DEPS: OpenCardDeps = { boards: () => app.boards, getBoard: apiGetBoard, goto: (h) => svelteGoto(h) };

export async function openCardAnywhere(cardId: string, deps: OpenCardDeps = DEFAULT_DEPS): Promise<void> {
  for (const b of deps.boards()) {
    try {
      if ((await deps.getBoard(b.id)).cards.some((c) => c.id === cardId)) {
        await deps.goto(`/b/${b.id}/c/${cardId}`);
        return;
      }
    } catch {
      // A board that will not load is skipped, not an error the reader must handle.
    }
  }
}
