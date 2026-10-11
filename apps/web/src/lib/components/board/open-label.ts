export const openLabel = (s: { title: string; stageName: string }): string =>
  `${s.title}, in ${s.stageName}. Enter to open, M to move, Alt with left or right arrow to move between stages.`;

export function cardKeys(e: KeyboardEvent, h: { open(): void; toggleMove(): void; step(delta: -1 | 1): void }): void {
  if (e.key === 'Enter') { e.preventDefault(); h.open(); return; }
  if (!e.altKey && !e.metaKey && !e.ctrlKey && (e.key === 'm' || e.key === 'M')) { e.preventDefault(); h.toggleMove(); return; }
  if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); h.step(e.key === 'ArrowLeft' ? -1 : 1); }
}
