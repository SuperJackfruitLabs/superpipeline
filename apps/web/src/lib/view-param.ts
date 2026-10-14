// apps/web/src/lib/view-param.ts
/**
 * `?view=list` (or `board`): a link that names a view opens it. `?view=projects` was a board view
 * until nav v2 made Projects Plan's own section; `isOldProjectsLink` sends it to `/plan/projects`.
 */
import type { View } from '$lib/stores/app.svelte';
export function viewFromSearch(search: URLSearchParams): View | null {
  const v = search.get('view');
  return v === 'board' || v === 'list' ? v : null;
}

/** A board link to its old Projects view (`?view=projects`), which now lives at `/plan/projects`. */
export function isOldProjectsLink(search: URLSearchParams): boolean {
  return search.get('view') === 'projects';
}
