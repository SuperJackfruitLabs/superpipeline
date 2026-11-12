/**
 * A stage's `placement`: what a station must have to work this stage, for a placement service
 * (SuperDispatch) to filter candidates on. The affordance sense of "capability" (charter
 * 2026-09-02): tool and credential ids from AgentPod's capability catalog (charter 2026-11-13),
 * not the skill tags `owner` and `requires` route on.
 *
 * Advice only. The board never checks it on a claim: an agent that claims by pull is not refused
 * for it, and a board with no placement service behaves exactly as without the field.
 */
import type { StagePlacement } from './model';

/** Isolation levels, weakest first, as AgentPod's catalog names them. */
export const PLACEMENT_ISOLATION = ['host', 'container', 'sandbox'] as const;

/** The most ids any one list may hold. */
export const PLACEMENT_LIST_MAX = 20;
/** The longest one id may be. */
export const PLACEMENT_ID_MAX = 200;

const LISTS = ['models', 'tools', 'credentials'] as const;

/** What is wrong with a placement's shape, or null. */
export function placementError(p: unknown, at: string): string | null {
  if (typeof p !== 'object' || p === null || Array.isArray(p)) return `${at} must be an object`;
  const r: Record<string, unknown> = { ...p };
  const unknown = Object.keys(r).filter((k) => k !== 'isolation' && !(LISTS as readonly string[]).includes(k));
  if (unknown.length > 0) return `${at} has unknown fields: ${unknown.join(', ')} (isolation, models, tools, credentials)`;
  if (r.isolation !== undefined && !(PLACEMENT_ISOLATION as readonly unknown[]).includes(r.isolation)) {
    return `${at}.isolation must be one of ${PLACEMENT_ISOLATION.join(', ')}`;
  }
  for (const list of LISTS) {
    const v = r[list];
    if (v === undefined) continue;
    if (!Array.isArray(v) || !v.every((x) => typeof x === 'string' && x.trim() !== '' && x.length <= PLACEMENT_ID_MAX)) {
      return `${at}.${list} must be a list of non-empty ids of at most ${PLACEMENT_ID_MAX} characters`;
    }
    if (v.length > PLACEMENT_LIST_MAX) return `${at}.${list} may name at most ${PLACEMENT_LIST_MAX}`;
  }
  return null;
}

/**
 * One spelling: ids trimmed, duplicates dropped, empty lists left out. A placement that states
 * nothing is no placement (null), so `{}` from an editor removes the field rather than storing it.
 */
export function cleanPlacement(p: StagePlacement): StagePlacement | null {
  const out: StagePlacement = {};
  if (p.isolation !== undefined) out.isolation = p.isolation;
  for (const list of LISTS) {
    const ids = [...new Set((p[list] ?? []).map((x) => x.trim()))];
    if (ids.length > 0) out[list] = ids;
  }
  return Object.keys(out).length > 0 ? out : null;
}
