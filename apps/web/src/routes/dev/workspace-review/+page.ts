// apps/web/src/routes/dev/workspace-review/+page.ts
import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

/** A review composite of five workspace tabs for the retired pixel harness (no screen captures it now). Dev builds only. */
export const load = () => {
  if (!dev) error(404, 'Not found');
};
