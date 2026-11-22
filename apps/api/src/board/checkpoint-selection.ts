/**
 * Cards that choose their repositories (treaty run-checkpoint-policy.v2, card-repositories.v1 and
 * run-checkpoint-selection.v1; charter decision 2026-11-15, amended 2026-11-22).
 *
 * A stage's `cardCheckpointPolicy` holds the admin allowlist. A card names a subset and, when it
 * chooses more than one, where its work starts. The claim narrows the allowlist to that choice and
 * freezes the result: a plain checkpoint-policy.v1 the rest of the checkpoint path reads unchanged,
 * beside the selection that says how it was chosen. Narrowing only removes write reach; it never
 * adds a repository the allowlist does not hold, and a card that names none never gets the whole
 * allowlist by default.
 */
import { Validator, type Schema } from '@cfworker/json-schema';
import cardSchema from './checkpoint-contract/card-repositories.v1.json';
import policyV2Schema from './checkpoint-contract/run-checkpoint-policy.v2.json';
import selectionSchema from './checkpoint-contract/run-checkpoint-selection.v1.json';
import { parseCheckpointJSON } from './checkpoint-json';
import type { CheckpointPolicy } from './checkpoint-proposal';

export interface CardCheckpointPolicy {
  version: 'superpipeline.checkpoint-policy.v2';
  kind: 'superbench';
  repositorySelection: 'card';
  allowUnchanged: boolean;
  repositories: CheckpointPolicy['repositories'];
  checkpointRepository: string;
  reporterPrincipalId: string;
  nodeId: string;
  executors: CheckpointPolicy['executors'];
  defaultRepositories?: string[];
}

/** A card's choice (card-repositories.v1). Absent on a card that names none. */
export interface CardRepositories {
  repositories: string[];
  primaryRepository?: string;
}

export interface CheckpointSelection {
  version: 'superpipeline.checkpoint-selection.v1';
  stagePolicyDigest: string;
  source: 'card' | 'default' | 'single';
  repositories: string[];
  checkpointRepository: string;
}

/** The most repositories a stage allowlist, a default or a card's choice may hold. */
export const MAX_REPOSITORIES = 32;

/** Why a narrowing gave no policy, in the words of treaty's selection vectors. */
export type NarrowingRefusal =
  | 'needs-person'
  | 'repository-not-allowed'
  | 'primary-not-chosen'
  | 'no-primary'
  | 'repositories-not-canonical';

/** Why a stage's v2 policy is refused when it is written, in the words of the vectors. */
export type PolicyRelationRefusal =
  | 'repositories-not-canonical'
  | 'checkpoint-repository-not-allowed'
  | 'default-not-canonical'
  | 'default-not-allowed'
  | 'default-without-start';

// Static schema bytes are pinned by CI (scripts/checkpoint-contract-pin.test.mjs).
function pinned(value: unknown): value is Schema {
  return typeof value === 'object' && value !== null;
}
if (!pinned(policyV2Schema) || !pinned(cardSchema) || !pinned(selectionSchema)) throw new Error('invalid pinned schema');
const policyV2 = new Validator(policyV2Schema, '2020-12', false);
const card = new Validator(cardSchema, '2020-12', false);
const selection = new Validator(selectionSchema, '2020-12', false);

function isPolicyV2(value: unknown): value is CardCheckpointPolicy {
  return policyV2.validate(value).valid;
}
export function isCardRepositories(value: unknown): value is CardRepositories {
  return card.validate(value).valid;
}
export function isCheckpointSelection(value: unknown): value is CheckpointSelection {
  return selection.validate(value).valid;
}

function canonicalNames(names: readonly string[]): boolean {
  return names.every((name, i) => i === 0 || (names[i - 1] ?? '') < name);
}

/** The relations JSON Schema cannot state (treaty selection.json `policyRelations`). */
export function cardPolicyRelationError(policy: CardCheckpointPolicy): PolicyRelationRefusal | null {
  const names = policy.repositories.map((r) => r.name);
  if (!canonicalNames(names)) return 'repositories-not-canonical';
  if (!names.includes(policy.checkpointRepository)) return 'checkpoint-repository-not-allowed';
  const defaults = policy.defaultRepositories;
  if (defaults !== undefined) {
    if (!canonicalNames(defaults)) return 'default-not-canonical';
    if (defaults.some((name) => !names.includes(name))) return 'default-not-allowed';
    // The default must resolve a start repository: it holds the stage's, or has exactly one.
    if (!defaults.includes(policy.checkpointRepository) && defaults.length !== 1) return 'default-without-start';
  }
  return null;
}

/** Why a stage's v2 policy is refused: `invalid` for its shape, or the relation that fails. */
export function cardCheckpointPolicyError(raw: Uint8Array): 'invalid' | PolicyRelationRefusal | null {
  let value: unknown;
  try { value = parseCheckpointJSON(raw); } catch { return 'invalid'; }
  if (!isPolicyV2(value)) return 'invalid';
  const relation = cardPolicyRelationError(value);
  if (relation) return relation;
  const executors = value.executors.map((e) => e.agentId + '\0' + e.stationId);
  if (new Set(executors).size !== executors.length) return 'invalid';
  return null;
}

/** Strict, bounded parse of a stage's v2 policy: schema, relations, unique executors. */
export function parseCardCheckpointPolicy(raw: Uint8Array): CardCheckpointPolicy {
  if (cardCheckpointPolicyError(raw) !== null) throw new Error('INVALID_CHECKPOINT');
  const value = parseCheckpointJSON(raw);
  if (!isPolicyV2(value)) throw new Error('INVALID_CHECKPOINT');
  return value;
}

/** Why a card's choice is malformed before any allowlist is consulted, or null. */
export function cardRepositoriesShapeError(value: unknown): string | null {
  if (!isCardRepositories(value)) {
    return `repositories must be 1 to ${MAX_REPOSITORIES} repository names (lower case letters, digits, "-" and "_"), with an optional primaryRepository that is one of them, and nothing else`;
  }
  if (!canonicalNames(value.repositories)) return 'repositories must be sorted by name, each name once';
  return null;
}

export type Narrowed =
  | { ok: true; policy: CheckpointPolicy; selection: Omit<CheckpointSelection, 'stagePolicyDigest'> }
  | { ok: false; refusal: NarrowingRefusal };

/**
 * Narrow a stage allowlist to a card's choice, exactly as treaty's selection vectors say.
 *
 * The narrowed policy keeps the allowlist's order and every field but `repositories` and
 * `checkpointRepository`. The start repository is the card's `primaryRepository`; otherwise the
 * stage's `checkpointRepository` when chosen; otherwise the only one chosen; otherwise refused. A
 * card that names none gets the stage default, or the allowlist when it holds one repository, and
 * otherwise waits for a person.
 */
export function narrowCheckpointPolicy(stage: CardCheckpointPolicy, choice: CardRepositories | null): Narrowed {
  let chosen: string[];
  let source: CheckpointSelection['source'];
  let primary: string | undefined;
  if (choice) {
    if (!canonicalNames(choice.repositories)) return { ok: false, refusal: 'repositories-not-canonical' };
    const allowed = new Set(stage.repositories.map((r) => r.name));
    if (choice.repositories.some((name) => !allowed.has(name))) return { ok: false, refusal: 'repository-not-allowed' };
    if (choice.primaryRepository !== undefined && !choice.repositories.includes(choice.primaryRepository))
      return { ok: false, refusal: 'primary-not-chosen' };
    chosen = choice.repositories;
    source = 'card';
    primary = choice.primaryRepository;
  } else if (stage.defaultRepositories !== undefined) {
    chosen = stage.defaultRepositories;
    source = 'default';
  } else if (stage.repositories.length === 1 && stage.repositories[0]) {
    chosen = [stage.repositories[0].name];
    source = 'single';
  } else {
    return { ok: false, refusal: 'needs-person' };
  }
  const start = primary ?? (chosen.includes(stage.checkpointRepository) ? stage.checkpointRepository : chosen.length === 1 ? chosen[0] : undefined);
  if (start === undefined) return { ok: false, refusal: 'no-primary' };
  const policy: CheckpointPolicy = {
    version: 'superpipeline.checkpoint-policy.v1',
    kind: stage.kind,
    allowUnchanged: stage.allowUnchanged,
    repositories: stage.repositories.filter((r) => chosen.includes(r.name)).map((r) => ({ ...r })),
    checkpointRepository: start,
    reporterPrincipalId: stage.reporterPrincipalId,
    nodeId: stage.nodeId,
    executors: stage.executors.map((e) => ({ ...e })),
  };
  return {
    ok: true,
    policy,
    selection: {
      version: 'superpipeline.checkpoint-selection.v1',
      source,
      repositories: policy.repositories.map((r) => r.name),
      checkpointRepository: start,
    },
  };
}

/** A card's refusal on entry to a stage whose cards choose, or null. A card that names none enters. */
export function entryRefusal(stage: CardCheckpointPolicy, choice: CardRepositories | null): NarrowingRefusal | null {
  if (!choice) return null;
  const narrowed = narrowCheckpointPolicy(stage, choice);
  return narrowed.ok ? null : narrowed.refusal;
}

/** What a person reads when a card is refused on entry or parked at claim. */
export function narrowingWords(refusal: NarrowingRefusal, stageName: string, choice: CardRepositories | null, stage: CardCheckpointPolicy): string {
  const allowed = stage.repositories.map((r) => r.name);
  if (refusal === 'needs-person')
    return `this card names no repository, and stage "${stageName}" offers ${allowed.length} with no default: choose the repositories it works in`;
  if (refusal === 'repository-not-allowed') {
    const outside = (choice?.repositories ?? []).filter((name) => !allowed.includes(name));
    return `stage "${stageName}" does not allow ${outside.join(', ')}; it allows ${allowed.join(', ')}`;
  }
  if (refusal === 'primary-not-chosen') return `the primary repository ${choice?.primaryRepository ?? ''} is not one the card chose`;
  if (refusal === 'no-primary')
    return `this card chose ${choice?.repositories.length ?? 0} repositories without ${stage.checkpointRepository}, stage "${stageName}"'s start repository: name the primary one`;
  return 'repositories must be sorted by name, each name once';
}

/** A card row's stored choice. The column holds canonical card-repositories.v1 JSON, or null. */
export function cardRepositoriesOf(row: Record<string, SqlStorageValue>): CardRepositories | null {
  const raw = row.repositories_json;
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') throw new Error('INVALID_CARD_REPOSITORIES');
  const value: unknown = JSON.parse(raw);
  if (!isCardRepositories(value)) throw new Error('INVALID_CARD_REPOSITORIES');
  return value;
}

/** The stage's v2 policy, parsed, or undefined when the stage has none. */
export function stageCardPolicy(stage: { cardCheckpointPolicy?: CardCheckpointPolicy } | undefined): CardCheckpointPolicy | undefined {
  if (stage?.cardCheckpointPolicy === undefined) return undefined;
  return parseCardCheckpointPolicy(new TextEncoder().encode(JSON.stringify(stage.cardCheckpointPolicy)));
}
