/** How long something has sat, the way the needs-you rows already say it, plus minutes. */
export function ageLabel(hours: number | null): string | null {
  if (hours === null || !Number.isFinite(hours)) return null;
  if (hours < 1 / 60) return 'just now';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}
