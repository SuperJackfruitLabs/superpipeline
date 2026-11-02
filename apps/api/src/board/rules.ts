import type { GateDecision } from '@superpipeline/contract';

/**
 * Limits and small rules more than one board module shares.
 */

/** How long an agent may go without a heartbeat before its run is reclaimed (docs/08 §3, ⚠️ OPEN). */
export const HEARTBEAT_TIMEOUT_MS = 15 * 60 * 1000;

/** Consecutive failed/reclaimed runs before a card auto-blocks for a human (docs/08 §4, ⚠️ OPEN). */
export const CIRCUIT_BREAKER_LIMIT = 2;

/** Push delivery attempts before a delivery is dead-lettered (docs/05 §4). */
export const MAX_PUSH_ATTEMPTS = 5;

/**
 * How much of the previous stage's handoff a gate carries into a room.
 *
 * A room is not a document store, and supermessage caps a custom event's
 * content at 8 KiB before a renderer ever sees it — so this is cut somewhere
 * regardless. Better to cut it deliberately here, where the whole value is
 * still in hand, than to have a client truncate a blob it cannot interpret.
 */
export const HANDOFF_SUMMARY_MAX_CHARS = 600;

/**
 * The part of a handoff worth showing a reviewer.
 *
 * A handoff is arbitrary JSON — whatever the previous stage chose to hand
 * forward. Agents overwhelmingly put the readable part under `summary` or
 * `output`, so those are preferred; anything else is compacted so the reviewer
 * at least sees the shape rather than nothing.
 *
 * Returns null rather than "{}" for an empty handoff: a card carrying nothing
 * should show no summary row at all, not an empty one that reads like a bug.
 */
export function handoffSummary(raw: string | null): string | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not JSON at all. Show it anyway — it is still what was handed forward.
    parsed = raw;
  }
  let text: string;
  if (typeof parsed === 'string') {
    text = parsed;
  } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const o = parsed as Record<string, unknown>;
    const preferred = [o.summary, o.output, o.result, o.text].find((v) => typeof v === 'string' && v.trim() !== '');
    text = typeof preferred === 'string' ? preferred : JSON.stringify(o);
    if (text === '{}') return null;
  } else {
    text = JSON.stringify(parsed);
  }
  text = text.trim();
  if (text === '') return null;
  return text.length > HANDOFF_SUMMARY_MAX_CHARS
    ? text.slice(0, HANDOFF_SUMMARY_MAX_CHARS - 1) + '…'
    : text;
}

export function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** The longest either line of a board's introduction may be. */
export const BOARD_INTRO_MAX = 400;

/** What is wrong with a board introduction, or null. */
export function boardIntroError(i: unknown): string | null {
  if (typeof i !== 'object' || i === null || Array.isArray(i)) return 'intro must be an object with a lede and a composeHint';
  const r = i as Record<string, unknown>;
  for (const k of ['lede', 'composeHint'] as const) {
    if (typeof r[k] !== 'string' || (r[k] as string).trim() === '') return `intro.${k} must be a non-empty string`;
    if ((r[k] as string).length > BOARD_INTRO_MAX) return `intro.${k} is over ${BOARD_INTRO_MAX} characters`;
  }
  return null;
}

/** The largest comment body, in UTF-8 bytes. */
export const COMMENT_MAX_BYTES = 8192;

export function isApproveDecision(decision: GateDecision): boolean {
  return decision === 'approve' || decision === 'approve_manual' || decision === 'approve_automatic';
}

/** A card state that no longer holds anything back, as a SQL list. */
export const RESOLVED_SQL = "('completed', 'canceled')";
