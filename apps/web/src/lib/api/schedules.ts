/** Recurring cards. */
import { fetch, headers } from './client';

/**
 * A recurring card, and the cadence that fires it (Task 8/9's `ScheduleView`, routed by Task 10).
 *
 * `timezone` is stored and echoed back exactly as the operator typed it — never the runtime's
 * `resolvedOptions().timeZone`, which ICU can canonicalise to a different spelling of the same
 * zone (`Asia/Kolkata` → `Asia/Calcutta`). `skipCount` is the signal that this schedule is
 * fighting an open card: the previous instance was still open when the next fire came due.
 */
export interface Schedule {
  id: string;
  enabled: boolean;
  title: string;
  spec: Record<string, unknown> | null;
  priority: number;
  labels: string[];
  stageKey: string | null;
  rule: string;
  timezone: string;
  overlap: 'skip' | 'allow';
  nextFireAt: string;
  lastFiredAt: string | null;
  lastCardId: string | null;
  skipCount: number;
  /** Who declared this schedule, and who every card it mints is owned by. */
  createdBy: string | null;
}

/** A board's schedules. Answers an empty list rather than throwing when the read is refused. */
export async function getSchedules(boardId: string): Promise<Schedule[]> {
  const res = await fetch(`/v1/boards/${boardId}/schedules`, { headers });
  if (!res.ok) return [];
  return ((await res.json()) as { schedules: Schedule[] }).schedules;
}

/**
 * Declare a schedule. Returns the raw response so the caller can show the parser's own message —
 * "the shortest interval is 5 minutes" is the sentence that tells the author what to type instead,
 * and a generic failure would hide it.
 */
export function createSchedule(
  boardId: string,
  input: {
    title: string;
    rule: string;
    timezone: string;
    overlap?: 'skip' | 'allow';
    stageKey?: string | null;
    priority?: number;
    labels?: string[];
    spec?: Record<string, unknown>;
  },
): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/schedules`, { method: 'POST', headers, body: JSON.stringify(input) });
}

/** Edit a schedule, or pause/resume it with `{ enabled }`. */
export function updateSchedule(
  boardId: string,
  scheduleId: string,
  patch: Partial<{
    title: string;
    rule: string;
    timezone: string;
    overlap: 'skip' | 'allow';
    stageKey: string | null;
    priority: number;
    labels: string[];
    spec: Record<string, unknown>;
    enabled: boolean;
  }>,
): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/schedules/${scheduleId}`, { method: 'PATCH', headers, body: JSON.stringify(patch) });
}

export function deleteSchedule(boardId: string, scheduleId: string): Promise<Response> {
  return fetch(`/v1/boards/${boardId}/schedules/${scheduleId}`, { method: 'DELETE', headers });
}
