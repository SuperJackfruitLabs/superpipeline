// apps/web/src/routes/dev/workspace-review/+page.ts
import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

/** A review composite of five workspace tabs for the pixel harness. Dev builds only. */
export const load = () => {
  if (!dev) error(404, 'Not found');
};
