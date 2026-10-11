/** `peek` names the P key, only where a peek is on screen to receive it. */
export const openLabel = (s: { title: string; stageName: string; peek?: boolean }): string =>
  `${s.title}, in ${s.stageName}. Enter to open, M to move, Alt with left or right arrow to move between stages.${s.peek ? ' P to show it in the peek.' : ''}`;

export function cardKeys(e: KeyboardEvent, h: { open(): void; toggleMove(): void; step(delta: -1 | 1): void; peek?(): void }): void {
  if (e.key === 'Enter') { e.preventDefault(); h.open(); return; }
  const bare = !e.altKey && !e.metaKey && !e.ctrlKey;
  if (bare && (e.key === 'm' || e.key === 'M')) { e.preventDefault(); h.toggleMove(); return; }
  if (bare && h.peek && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); h.peek(); return; }
  if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); h.step(e.key === 'ArrowLeft' ? -1 : 1); }
}
