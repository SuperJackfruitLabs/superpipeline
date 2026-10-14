/**
 * Which ids are new since a list was first shown: the first read (a page load, the first board read) is never an
 * arrival, and an id is new only once. Drives use:attention on the Inbox's Needs-you rows; the row's words and the
 * count already say it, so the pulse is never the only signal.
 */
export function arrivals(): (ids: readonly string[]) => Set<string> {
  let seen: Set<string> | null = null;
  return (ids) => {
    if (seen === null) {
      seen = new Set(ids);
      return new Set();
    }
    const fresh = ids.filter((id) => !seen!.has(id));
    for (const id of ids) seen.add(id);
    return new Set(fresh);
  };
}
