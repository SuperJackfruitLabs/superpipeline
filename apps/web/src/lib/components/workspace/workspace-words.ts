// apps/web/src/lib/components/workspace/workspace-words.ts
import type { Member, Role } from '$lib/api';

export const labelsHeading = (n: number) => (n === 0 ? 'No labels yet' : `${n} ${n === 1 ? 'label' : 'labels'}`);
export const peopleHeading = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;

export function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (w.length === 0) return '';
  if (w.length === 1) return w[0]!.slice(0, 2).toUpperCase();
  return `${w[0]![0]}${w[w.length - 1]![0]}`.toUpperCase();
}

export const lastOwner = (m: Member, members: Member[]) => m.role === 'owner' && members.filter((o) => o.role === 'owner').length === 1;

export const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer' };
export const ROLE_ORDER: Role[] = ['owner', 'admin', 'member', 'viewer'];
export const INVITE_ORDER: Role[] = ['member', 'viewer', 'admin', 'owner'];
export const ROLE_HELP: Record<Role, string> = {
  owner: 'everything, including people and deleting boards',
  admin: 'also manages boards, agents and connections',
  member: 'creates, moves and decides cards',
  viewer: 'reads boards and cards, changes nothing',
};
export const roleHelpTitle = (r: Role) => `${ROLE_LABEL[r]}: ${ROLE_HELP[r]}`;
export const roleHint = (r: Role) => `${ROLE_LABEL[r]}: ${ROLE_HELP[r]}. No email is sent — they sign in and find this workspace waiting.`;
export const similarText = (similar: string[]) => `Similar to ${similar.join(', ')}. Routing matches names exactly, so two spellings are two capabilities; remove the new one if you meant an existing one.`;
export const FORGE_HOST_ERROR = 'That is a host, not a URL — forge.example.com.';
/** Used when a new label is added before its swatch was picked; the swatch itself shows the needs mood. */
export const NEW_LABEL_COLOUR = '#ffd9c2';
