// apps/web/src/lib/components/workspace/workspace-words.ts
import type { AgentSummary, Member, Role } from '$lib/api';
import { agentState } from './agent-status';

/** Crew's page head: what the page is for, in one line, and the one link to more. */
export const CREW_EYEBROW = 'Crew · shared by every board';
export const CREW_LEDE = "The agents who claim cards on your boards, and the people who share them. A card in a stage goes to an agent holding that stage's capability.";
export const CREW_HELP = { label: 'How agents pick cards', href: 'https://docs.superpipeline.dev/use/agents/' } as const;

/** What an empty tab says; its one action is the tab's New. */
export const CREW_EMPTY = {
  agents: 'No agents yet. An agent gets a token to reach this workspace and claims cards at the stages that ask for its capabilities.',
  people: 'Nobody is in this workspace yet. Add the people who decide and review cards.',
  capabilities: 'No capabilities yet. A board stage asks for one, and an agent holding it claims the card.',
} as const;
export const CREW_LOADING = { agents: 'Loading agents…', people: 'Loading people…', capabilities: 'Loading capabilities…' } as const;
export const CREW_FAILED = { agents: "Couldn't load the agents.", people: "Couldn't load people.", capabilities: "Couldn't load capabilities." } as const;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** The footer line: "14 agents · 2 need you · 12 resting" (a part that counts nobody is left out). */
export function crewFooter(agents: Pick<AgentSummary, 'claimedCount' | 'workingCount'>[]): string {
  const n = (s: ReturnType<typeof agentState>) => agents.filter((a) => agentState(a) === s).length;
  const parts = [plural(agents.length, 'agent', 'agents')];
  if (n('needs') > 0) parts.push(`${n('needs')} ${n('needs') === 1 ? 'needs' : 'need'} you`);
  if (n('working') > 0) parts.push(`${n('working')} working`);
  if (n('resting') > 0) parts.push(`${n('resting')} resting`);
  return parts.join(' · ');
}
export const askedByText = (n: number) => (n === 0 ? 'No board asks' : plural(n, 'board', 'boards'));

export const labelsHeading = (n: number) => (n === 0 ? 'No labels yet' : `${n} ${n === 1 ? 'label' : 'labels'}`);
export const peopleHeading = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;

export function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (w.length === 0) return '';
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
  return `${w[0][0]}${w[w.length - 1][0]}`.toUpperCase();
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
