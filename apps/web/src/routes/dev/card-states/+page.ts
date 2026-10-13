// apps/web/src/routes/dev/card-states/+page.ts
import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';

export const load = () => {
  if (!dev) error(404, 'Not found');
  return { shell: 'bare' as const };
};
