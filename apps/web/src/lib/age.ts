import { plural } from './words';

/** How long something has sat, the way the needs-you rows already say it, plus minutes. */
export function ageLabel(hours: number | null): string | null {
  if (hours === null || !Number.isFinite(hours)) return null;
  if (hours < 1 / 60) return 'just now';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}


/** Long age: `under an hour`, `1 hour`, `33 hours` below two days, then `2 days`. */
export function ageWords(hours: number): string {
  if (!Number.isFinite(hours) || hours < 1) return 'under an hour';
  if (hours < 48) return plural(Math.floor(hours), 'hour', 'hours');
  return plural(Math.floor(hours / 24), 'day', 'days');
}

/** `ageWords`, or a dash when the age is unknown. */
export function ageLong(hours: number | null): string {
  return hours === null ? '—' : ageWords(hours);
}

/**
 * How long a card has been in its stage, as the peek says it: the drawer's thresholds (`ageWords`: under
 * an hour, hours below two days, then days) in the tile's short form. A done card is not counted in
 * whole days here: it moved when it moved, and the drawer says "under an hour" for one moved seconds ago.
 */
export function ageStage(hours: number | null): string {
  if (hours === null || !Number.isFinite(hours)) return '—';
  return hours < 1 ? ageWords(hours) : ageShort(hours);
}

/** Tile age: open `33h` / `2d`; a done card counts whole days, at least `1d`; unknown is a dash. */
export function ageShort(hours: number | null, done = false): string {
  if (hours === null || !Number.isFinite(hours)) return '—';
  if (done) return `${Math.max(1, Math.floor(hours / 24))}d`;
  if (hours < 1) return 'just now';
  if (hours < 48) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * Past tense. Open cards count hours below two days ("33 hours ago"), as `ageWords` does; a done
 * card finished between one and two days ago says "yesterday".
 */
export function agoWords(hours: number | null, done = false): string {
  if (hours === null || !Number.isFinite(hours)) return '—';
  if (hours < 1) return 'just now';
  if (hours < 24) return `${plural(Math.floor(hours), 'hour', 'hours')} ago`;
  if (hours < 48 && !done) return `${Math.floor(hours)} hours ago`;
  const d = Math.floor(hours / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
