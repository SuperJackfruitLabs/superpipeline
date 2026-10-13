// apps/web/src/lib/view-param.ts
/** `?view=list` (or `board`, `projects`): a link that names a view opens it. */
import type { View } from '$lib/stores/app.svelte';
export function viewFromSearch(search: URLSearchParams): View | null {
  const v = search.get('view');
  return v === 'board' || v === 'list' || v === 'projects' ? v : null;
}
