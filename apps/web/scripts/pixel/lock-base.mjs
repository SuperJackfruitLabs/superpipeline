// apps/web/scripts/pixel/lock-base.mjs — the commit check-lock-change.mjs compares against.
// CI passes the PR base sha or the push's `before`; a new branch push sends all zeros and a
// manual run sends nothing, so fall back to where HEAD left origin/main.
export function chooseBase(arg, mergeBase) {
  const a = (arg ?? '').trim();
  if (a && !/^0+$/.test(a)) return a;
  return mergeBase();
}
