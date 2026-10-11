import { getContext } from 'svelte';
export const PEEK_KEY = Symbol('peek');

/** What a board with a peek offers its tiles. */
export interface PeekHandle {
  /** The eye is on this card (pointer or focus). Debounced, so a pass across the board settles on where it stopped. */
  look(id: string): void;
  /** Show this card in the peek now and move focus to the peek's button: the keyboard's direct way in. */
  pin(id: string): void;
  /** Whether the peek is on screen (it starts at 1440px). */
  readonly available: boolean;
}

/** A tile asks for the board's peek. Outside a board with a peek this is null. Call during component init. */
export function peekNotifier(): PeekHandle | null {
  return getContext<PeekHandle | undefined>(PEEK_KEY) ?? null;
}

/**
 * Focus arriving on a tile from ANOTHER tile is a keyboard user passing through the board, not
 * looking. Tabbing across it used to repin the peek at every stop, so it ended on the last tile.
 */
export function cameFromAnotherTile(e: FocusEvent): boolean {
  const from = e.relatedTarget instanceof Element ? e.relatedTarget.closest('.tile') : null;
  return from !== null && from !== e.currentTarget;
}
