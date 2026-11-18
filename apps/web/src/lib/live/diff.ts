// apps/web/src/lib/live/diff.ts
/**
 * A live update as a diff, not a repaint (contract rule 9): which keyed rows entered, which left,
 * which changed and the order they now stand in. The page animates each part (rise, fade, flash,
 * flip); `applyDiff` turns a list into the next one while unchanged rows keep their identity.
 */
export interface Keyed { key: string }
export interface Diff<T extends Keyed> { enter: T[]; leave: string[]; change: { key: string; from: T; to: T }[]; order: string[] }

export function diffKeyed<T extends Keyed>(prev: T[], next: T[], same: (a: T, b: T) => boolean): Diff<T> {
  const before = new Map(prev.map((r) => [r.key, r]));
  const after = new Set(next.map((r) => r.key));
  const enter: T[] = [];
  const change: { key: string; from: T; to: T }[] = [];
  for (const r of next) {
    const was = before.get(r.key);
    if (!was) enter.push(r);
    else if (!same(was, r)) change.push({ key: r.key, from: was, to: r });
  }
  const leave = prev.filter((r) => !after.has(r.key)).map((r) => r.key);
  return { enter, leave, change, order: next.map((r) => r.key) };
}

/** The list after a diff: entered and changed rows from the diff, every other row as it was (same object). */
export function applyDiff<T extends Keyed>(prev: T[], diff: Diff<T>): T[] {
  const rows = new Map(prev.map((r) => [r.key, r]));
  for (const r of diff.enter) rows.set(r.key, r);
  for (const c of diff.change) rows.set(c.key, c.to);
  return diff.order.map((k) => rows.get(k)).filter((r): r is T => r !== undefined);
}
