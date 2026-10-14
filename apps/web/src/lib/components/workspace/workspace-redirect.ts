// apps/web/src/lib/components/workspace/workspace-redirect.ts
/** Where an old `/workspace/:tab` link lands since nav v2. */
export function workspaceRedirect(tab: string): string {
  if (tab === 'needs-you') return '/inbox';
  if (tab === 'labels') return '/settings#labels';
  if (tab === 'connections') return '/settings#connections';
  if (tab === 'agents' || tab === 'people' || tab === 'capabilities') return `/crew/${tab}`;
  return '/crew/agents';
}
