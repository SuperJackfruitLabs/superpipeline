// Field checks more than one route family makes.

const DUE_AT_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `due_at` drives claim order and the overdue cron sweep on a board that runs unattended
 * (board-do.ts `claimableWhere`/`sweepBoard`), so garbage here does not fail loudly at write time
 * — it silently misorders or mis-fires later. Only a bare date (the column's own shape) or `null`
 * is accepted. Shared by the card PATCH route and `createCard` so there is exactly one rule.
 */
export function isInvalidDueAt(value: unknown): boolean {
  return value !== undefined && value !== null && (typeof value !== 'string' || !DUE_AT_RE.test(value));
}
