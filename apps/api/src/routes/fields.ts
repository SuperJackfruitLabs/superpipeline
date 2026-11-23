// Field checks more than one route family makes.
import { cardRepositoriesShapeError, isCardRepositories, type CardRepositories } from '../board/checkpoint-selection';

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

/**
 * A card's repository choice as a create or an edit sends it: `repositories` (sorted names from a
 * bench stage's allowlist) and, optionally, `primaryRepository`, written together. Absent leaves
 * it; on an edit `repositories: null` clears both. The shape is treaty's card-repositories.v1; the
 * allowlist itself is the board's to check, since only it holds the stage policy.
 */
export function cardRepositoriesInput(
  body: { repositories?: unknown; primaryRepository?: unknown },
  clearable: boolean,
): { ok: true; value: CardRepositories | null | undefined } | { ok: false; message: string } {
  if (body.repositories === undefined) {
    if (body.primaryRepository !== undefined) return { ok: false, message: 'primaryRepository is sent with repositories, never alone' };
    return { ok: true, value: undefined };
  }
  if (body.repositories === null) {
    if (!clearable) return { ok: false, message: 'repositories must be a list of repository names' };
    if (body.primaryRepository !== undefined && body.primaryRepository !== null) return { ok: false, message: 'primaryRepository is cleared with repositories' };
    return { ok: true, value: null };
  }
  const choice = { repositories: body.repositories, ...(body.primaryRepository !== undefined && body.primaryRepository !== null ? { primaryRepository: body.primaryRepository } : {}) };
  const bad = cardRepositoriesShapeError(choice);
  if (bad || !isCardRepositories(choice)) return { ok: false, message: bad ?? 'repositories are invalid' };
  return { ok: true, value: choice };
}
