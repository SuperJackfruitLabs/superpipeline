// apps/web/src/lib/components/shell/crew.ts
/**
 * The agents a board involves, in the order the board reads (shell-and-board §3.3): the agents of
 * cards waiting on you (`lastAgentId`, since a stopped card has no delegate), then those working,
 * then whoever queued the work. Daylight's rail draws the first three faces and counts them all.
 */
import type { Mood } from '@superjackfruit/vibekit';
import type { AgentSummary, BoardSnapshot } from '$lib/api';
import { displayAgent } from '$lib/names';
import { joinAnd, plural } from '$lib/words';
import { isTerminal } from './shell-words';

export interface CrewMember { id: string; name: string; iconUrl: string | null; mood: Mood; role: 'needs' | 'working' | 'queuer' }

export function crewOf(board: Pick<BoardSnapshot, 'cards'>, agents: AgentSummary[], needIds: ReadonlySet<string>): CrewMember[] {
  const live = board.cards
    .filter((c) => !c.archivedAt && !isTerminal(c))
    .sort((a, b) => Number(needIds.has(b.id)) - Number(needIds.has(a.id)) || a.createdAt.localeCompare(b.createdAt));
  const out = new Map<string, CrewMember>();
  const add = (id: string | null | undefined, role: CrewMember['role'], mood: Mood) => {
    if (!id || out.has(id)) return;
    out.set(id, { id, name: displayAgent(id, agents), iconUrl: agents.find((a) => a.id === id)?.iconUrl ?? null, mood, role });
  };
  for (const c of live) if (needIds.has(c.id)) add(c.lastAgentId, 'needs', 'needs');
  for (const c of live) if (c.state === 'working') add(c.delegateAgentId ?? c.lastAgentId, 'working', 'working');
  for (const c of live) add(c.queuedByAgentId, 'queuer', 'resting');
  return [...out.values()];
}

const named = (crew: CrewMember[], role: CrewMember['role']) => crew.filter((m) => m.role === role).map((m) => m.name);

export function crewCount(crew: CrewMember[]): string {
  return plural(crew.length, 'agent', 'agents');
}
export function crewLine(crew: CrewMember[]): string {
  const needs = named(crew, 'needs').length;
  if (needs > 0) return `${needs} ${needs === 1 ? 'waits' : 'wait'} on you`;
  const working = named(crew, 'working').length;
  return working > 0 ? `${working} at work` : 'resting';
}
export function crewTitle(crew: CrewMember[]): string {
  const n = named(crew, 'needs');
  const w = named(crew, 'working');
  const q = named(crew, 'queuer');
  return [
    n.length ? `${joinAnd(n)} ${n.length === 1 ? 'waits' : 'wait'} on you` : null,
    w.length ? `${joinAnd(w)} ${w.length === 1 ? 'is' : 'are'} at work` : null,
    q.length ? `${joinAnd(q)} ${q.length === 1 ? 'queues' : 'queue'} the work` : null,
  ].filter(Boolean).join('; ');
}
