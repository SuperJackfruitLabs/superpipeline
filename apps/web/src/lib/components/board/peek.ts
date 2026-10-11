import { getContext } from 'svelte';
export const PEEK_KEY = Symbol('peek');
/** A tile tells the board it is being looked at. Outside a board with a peek this is a no-op. Call during component init. */
export function peekNotifier(): (id: string) => void {
  return getContext<((id: string) => void) | undefined>(PEEK_KEY) ?? (() => {});
}
