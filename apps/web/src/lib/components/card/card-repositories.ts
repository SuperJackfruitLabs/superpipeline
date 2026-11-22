// apps/web/src/lib/components/card/card-repositories.ts
/**
 * The repositories a card works in, on a bench stage whose cards choose them (treaty
 * run-checkpoint-policy.v2). The stage holds the allowlist an admin set; a card picks a subset and,
 * when it picks more than one without the stage's start repository, where its work starts. A card
 * that names none gets the stage's default, or the only repository, and otherwise waits for a
 * person: it is never given the whole list.
 */
import type { Card, Stage } from '$lib/api';

export type ChoosingPolicy = NonNullable<Stage['cardCheckpointPolicy']>;

/** The stage's allowlist when its cards choose, else null. */
export function choosingPolicy(stage: Stage | undefined): ChoosingPolicy | null {
  return stage?.cardCheckpointPolicy ?? null;
}

/** The repository names a card on this board could choose: its stage's, or every choosing stage's. */
export function choosableRepositories(stages: Stage[], currentKey: string): string[] {
  const here = choosingPolicy(stages.find((s) => s.key === currentKey));
  const policies = here ? [here] : stages.map(choosingPolicy).filter((p): p is ChoosingPolicy => p !== null);
  return [...new Set(policies.flatMap((p) => p.repositories.map((r) => r.name)))].toSorted();
}

/** Whether this board has any stage whose cards choose, so the card shows the fact at all. */
export const boardChoosesRepositories = (stages: Stage[]): boolean => stages.some((s) => choosingPolicy(s) !== null);

/** Where the work starts: the card's own primary, the stage's start when chosen, or the only one. */
export function startRepository(chosen: readonly string[], primary: string, policy: ChoosingPolicy | null): string | null {
  if (primary !== '' && chosen.includes(primary)) return primary;
  if (policy && chosen.includes(policy.checkpointRepository)) return policy.checkpointRepository;
  return chosen.length === 1 ? (chosen[0] ?? null) : null;
}

/** Whether a choice needs the person to name its start repository before it can be saved. */
export const needsPrimary = (chosen: readonly string[], primary: string, policy: ChoosingPolicy | null): boolean =>
  chosen.length > 1 && startRepository(chosen, primary, policy) === null;

/**
 * The sentence for a card that will wait for a person at claim: it names none, and its stage has
 * several repositories and no default. Null when the card can be worked as it is.
 */
export function repositoriesWait(card: Pick<Card, 'repositories'>, stage: Stage | undefined): string | null {
  const policy = choosingPolicy(stage);
  if (!policy || card.repositories?.length || policy.defaultRepositories?.length || policy.repositories.length <= 1) return null;
  return 'Waits for a person: choose the repositories this card works in before an agent can take it.';
}

/** The fact's words: "api, app · starts in app", the default it will get, or "none". */
export function repositoriesFact(card: Pick<Card, 'repositories' | 'primaryRepository'>, stage: Stage | undefined): string {
  const policy = choosingPolicy(stage);
  const chosen = card.repositories ?? [];
  if (chosen.length) {
    const start = startRepository(chosen, card.primaryRepository ?? '', policy);
    return chosen.length > 1 && start ? `${chosen.join(', ')} · starts in ${start}` : chosen.join(', ');
  }
  if (policy?.defaultRepositories?.length) return `none chosen · the stage's default: ${policy.defaultRepositories.join(', ')}`;
  if (policy?.repositories.length === 1) return `none chosen · the stage's only one: ${policy.repositories[0]?.name ?? ''}`;
  return 'none';
}

/** The PATCH body for a choice: sorted names with the primary only when it is needed, or a clear. */
export function choicePatch(chosen: readonly string[], primary: string, policy: ChoosingPolicy | null): { repositories: string[] | null; primaryRepository?: string } {
  if (chosen.length === 0) return { repositories: null };
  const repositories = [...new Set(chosen)].toSorted();
  // A primary the stage's own start already gives is not sent: the card says only what it chose.
  const implied = startRepository(repositories, '', policy);
  return primary !== '' && repositories.includes(primary) && primary !== implied ? { repositories, primaryRepository: primary } : { repositories };
}
