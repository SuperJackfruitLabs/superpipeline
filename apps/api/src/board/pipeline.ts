import { capabilityTag, normalizeRequirement, returnStageError } from '@superpipeline/contract';
import type { BoardContext } from './context';
import { boardDecisionTimeout, cleanTimeout, timeoutError } from './decision-timeouts';
import type { BoardEvent, BoardInit, ProfileInput, ProfileView, Result, StageDef, StageEditor, StagePatch } from './model';
import type { BoardSnapshot } from './views';

/**
 * The board itself: initialising it, its stages and name, its agent profiles, its event log and
 * the snapshot a client loads.
 */

/** What the pipeline needs from the rest of the board. */
export type PipelineDeps = Pick<
  BoardContext,
  | 'allCards'
  | 'allReferences'
  | 'boardUsage'
  | 'countInStage'
  | 'ctx'
  | 'emit'
  | 'env'
  | 'getMeta'
  | 'now'
  | 'pendingElicitations'
  | 'pendingGates'
  | 'setMeta'
  | 'sql'
  | 'stages'
  | 'staleSettings'
  | 'triggerGrant'
>;

export const STAGE_INSTRUCTIONS_MAX = 4000;

/** The longest a stage's one-line summary may be, matching `Stage.summary` in `@superpipeline/contract`. */
export const STAGE_SUMMARY_MAX = 200;

/**
 * What is wrong with one stage's own fields, or null.
 *
 * Shared by `setStages` (which replaces the pipeline) and `updateStage` (which patches one), so a
 * rule a patch accepts is a rule a replace would accept too. Two copies of this drift, and the
 * copy that drifts is the one nobody is looking at.
 *
 * Checked HERE rather than only in `@superpipeline/contract` because the routes cast rather than
 * parse: a cap enforced only in the schema is a cap nothing enforces.
 */
/**
 * What is wrong with a completion requirement's SHAPE, or null.
 *
 * Checked on the way in because the evaluator is total: handed `handoff: "url"` instead of
 * `["url"]` it reads a list, finds none, and blocks every run on the stage forever. A rule nothing
 * can satisfy is worse than no rule, and it fails at the far end — on an agent's run — rather than
 * here, where the person who typed it is standing.
 */
export function completionShapeError(c: unknown): string | null {
  if (typeof c !== 'object' || c === null || Array.isArray(c)) {
    return 'completion must be an object';
  }
  const r = c as Record<string, unknown>;
  if (r.handoff !== undefined) {
    if (!Array.isArray(r.handoff) || !r.handoff.every((k) => typeof k === 'string' && k.trim() !== '')) {
      return 'completion.handoff must be a list of non-empty key names';
    }
  }
  if (r.reference !== undefined) {
    if (typeof r.reference !== 'object' || r.reference === null || Array.isArray(r.reference)) {
      return 'completion.reference must be an object naming a provider and/or a sourceType';
    }
  }
  if (r.live !== undefined && (typeof r.live !== 'string' || r.live.trim() === '')) {
    return 'completion.live must name a handoff key';
  }
  return null;
}

export function stageFieldError(s: Pick<StageDef, 'key' | 'wipLimit' | 'instructions' | 'summary' | 'timeout'>): string | null {
  if (s.timeout !== undefined) {
    const bad = timeoutError(s.timeout, `stage "${s.key}" timeout`);
    if (bad) return bad;
  }
  if (s.summary !== undefined && (typeof s.summary !== 'string' || s.summary.length > STAGE_SUMMARY_MAX)) {
    return `stage "${s.key}" summary must be a string of at most ${STAGE_SUMMARY_MAX} characters`;
  }
  if (s.wipLimit !== undefined && (!Number.isInteger(s.wipLimit) || s.wipLimit < 1)) {
    return `stage "${s.key}" needs a WIP limit of at least 1, or none`;
  }
  if (s.instructions !== undefined) {
    // Blank is refused: AgentPod gives instructions their own heading, and a heading with nothing
    // under it reads to an agent as "there was nothing to do here", which is a different claim
    // from "this was not provided".
    if (typeof s.instructions !== 'string' || s.instructions.trim() === '') {
      return `stage "${s.key}" has empty instructions — leave them out instead`;
    }
    if (s.instructions.length > STAGE_INSTRUCTIONS_MAX) {
      return `stage "${s.key}" has ${s.instructions.length} characters of instructions; the limit is ${STAGE_INSTRUCTIONS_MAX}. A rule this long is a document, and belongs in a reference.`;
    }
  }
  return null;
}

/**
 * Canonicalise a stage's routing fields.
 *
 * Both write boundaries — `init` and `setStages` — pass every capability a stage mentions through
 * the one spelling, because routing is exact string equality and a stage typed "Code Review" that
 * stores `Code Review` is a lane no agent can ever claim, with nothing to say why. A requirement
 * that normalises to nothing is dropped, so a stray `{}` from an editor falls back to `owner`
 * rather than becoming a lane nobody can work.
 */
function normalizeStageRouting(s: StageDef): StageDef {
  if (s.ownerKind !== 'capability') return s;
  const out: StageDef = { ...s };
  if (s.owner) out.owner = capabilityTag(s.owner);
  const req = normalizeRequirement(s.requires);
  if (req) out.requires = req;
  else delete out.requires;
  return out;
}

export async function init(deps: PipelineDeps, board: BoardInit): Promise<BoardSnapshot> {
  if (!deps.getMeta('boardId')) {
    // Same normalisation as `setStages`: a board created with a mis-spelled capability owner is
    // a board whose lane no agent can ever claim from.
    const stages = [...board.stages]
      .map(normalizeStageRouting)
      .toSorted((a, b) => a.order - b.order);
    deps.setMeta('boardId', board.id);
    deps.setMeta('tenantId', board.tenantId);
    deps.setMeta('name', board.name);
    deps.setMeta('stages', JSON.stringify(stages));
    if (board.intro) deps.setMeta('intro', JSON.stringify(board.intro));
    deps.emit('board.initialized', { boardId: board.id, tenantId: board.tenantId });
  }
  return snapshot(deps);
}

/** The fields of a stage that say how a decision on it is made. A member may change none of them. */
function decisionPolicyOf(stage: StageDef | undefined): string {
  return JSON.stringify({
    gate: stage?.gate === 'approval' ? 'approval' : 'none',
    approvalSubjectSchema: stage?.approvalSubjectSchema ?? null,
    approvalDeciderPrincipalIds: [...(stage?.approvalDeciderPrincipalIds ?? [])].toSorted(),
    timeout: stage?.timeout ? cleanTimeout(stage.timeout) : null,
  });
}

/**
 * Refuse a stage change that alters any stage's decision policy, unless the editor may. Adding a
 * gated stage or removing one changes policy too: a stage that is absent has no gate.
 */
export function refuseDecisionPolicyChange(before: StageDef[], after: StageDef[], editor: StageEditor): Result<never> | null {
  if (editor.mayChangeDecisionPolicy) return null;
  const keys = new Set([...before.map((s) => s.key), ...after.map((s) => s.key)]);
  for (const key of keys) {
    const was = before.find((s) => s.key === key);
    const is = after.find((s) => s.key === key);
    if (decisionPolicyOf(was) !== decisionPolicyOf(is)) {
      return {
        ok: false,
        code: 'WORKSPACE_ADMIN_REQUIRED',
        message: `only a workspace owner or admin can change how decisions are made on stage "${key}" (its gate, approval subject, deciders or timeout)`,
      };
    }
  }
  return null;
}

/** Rename the board (the catalog row is renamed alongside, by the Worker). */
/**
 * Rework the board's pipeline, after it exists.
 *
 * Stages were written once — in `init`, and mirrored into the catalog row — and there was no
 * update route and no method here. Not one field could be changed afterwards: name, order, WIP
 * limit, approval gate, owner, routing. A mistyped stage name or a WIP limit set one too low
 * meant recreating the board and losing every card on it.
 *
 * **A stage key is identity, not a label.** Cards carry `current_stage_key`, runs carry
 * `stage_key`, and gates carry it too; renaming a key in place would orphan all three silently.
 * So every field is editable EXCEPT the key, and changing a key is expressed as adding one
 * stage and removing another — which the emptiness rule below then makes safe.
 *
 * **A stage that still holds cards cannot be removed.** Refusing is the only honest answer: the
 * alternatives are deleting the operator's work without being asked, or moving it somewhere
 * this method has no basis for choosing. The caller empties the stage and tries again.
 *
 * The whole payload is the new pipeline — a PUT, not a patch — because order is a property of
 * the list rather than of any stage in it, and a partial update cannot express a reorder.
 */
export async function setStages(deps: PipelineDeps, stages: StageDef[], editor: StageEditor): Promise<Result<{ stages: StageDef[] }>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  if (!Array.isArray(stages) || stages.length === 0) {
    return { ok: false, code: 'INVALID_STAGES', message: 'a board needs at least one stage' };
  }
  for (const s of stages) {
    if (!s || typeof s.key !== 'string' || s.key.trim() === '') {
      return { ok: false, code: 'INVALID_STAGES', message: 'every stage needs a key' };
    }
    if (typeof s.name !== 'string' || s.name.trim() === '') {
      return { ok: false, code: 'INVALID_STAGES', message: `stage "${s.key}" needs a name` };
    }
    const invalid = stageFieldError(s);
    if (invalid) return { ok: false, code: 'INVALID_STAGES', message: invalid };
    // Also here, not only in the PATCH: a check the whole-pipeline write skips is a check with
    // a documented way around it.
    if (s.completion !== undefined) {
      const bad = completionShapeError(s.completion);
      if (bad) return { ok: false, code: 'INVALID_STAGES', message: `stage "${s.key}": ${bad}` };
    }
  }
  const keys = stages.map((s) => s.key);
  const duplicate = keys.find((k, i) => keys.indexOf(k) !== i);
  if (duplicate) {
    // Two stages sharing a key is not a pipeline: `stages().find(...)` would resolve every card
    // in both to whichever came first, and the other would be unreachable.
    return { ok: false, code: 'INVALID_STAGES', message: `two stages share the key "${duplicate}"` };
  }
  // Across the NEW pipeline, so removing or reordering the stage another one returns to is
  // refused here rather than leaving a judge whose failing verdict has nowhere to go.
  for (const s of stages) {
    const bad = returnStageError(s, stages);
    if (bad) return { ok: false, code: 'INVALID_STAGES', message: bad };
  }

  const kept = new Set(keys);
  for (const existing of deps.stages()) {
    if (kept.has(existing.key)) continue;
    const held = deps.countInStage(existing.key);
    if (held > 0) {
      return {
        ok: false,
        code: 'STAGE_NOT_EMPTY',
        message: `stage "${existing.key}" still holds ${held} card${held === 1 ? '' : 's'} — move them before removing it`,
      };
    }
  }

  // A capability owner is normalised with the same function that spells an agent's
  // capabilities, because matching is exact string equality — a stage whose owner is typed
  // "Code Review" must carry `code-review`, or no agent can ever claim it and nothing says why.
  //
  // WHAT is matched is `stageCapabilitiesMet` (@superpipeline/contract): a stage's `requires`
  // when it has one — `all` every member, `any` at least one — and `owner` only when it does
  // not. This comment used to say routing was `agent.capabilities.includes(stage.owner)`, full
  // stop, which stopped being true when requirements shipped on 2026-09-03 and was still here
  // three weeks later. It sits where somebody asking "how does routing work" reads, so it was
  // believed over the code, and issue #88 was filed against behaviour that already worked.
  // `test/claim-honours-requires.test.ts` pins the real answer at the claim boundary.
  const ordered = [...stages]
    .map(normalizeStageRouting)
    .toSorted((a, b) => a.order - b.order);
  const refused = refuseDecisionPolicyChange(deps.stages(), ordered, editor);
  if (refused) return refused;
  deps.setMeta('stages', JSON.stringify(ordered));
  deps.emit('board.stages_changed', { stages: ordered });
  return { ok: true, value: { stages: ordered } };
}

/**
 * Change one stage without rewriting the pipeline.
 *
 * `setStages` replaces every stage, so adjusting one field meant reading them all, mutating
 * one, and writing them all back — which discards any concurrent edit to a stage the caller
 * never touched. This writes the one stage named and leaves its neighbours exactly as found.
 *
 * Validation is the same function the whole-pipeline write uses, so a rule accepted here is a
 * rule that would survive a replace.
 */
export async function updateStage(deps: PipelineDeps, stageKey: string, patch: StagePatch, editor: StageEditor): Promise<Result<{ stage: StageDef }>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  const stages = deps.stages();
  const index = stages.findIndex((s) => s.key === stageKey);
  if (index === -1) {
    // Named rather than created. A patch that invents a stage puts a lane on the board that no
    // card can reach and nothing asked for, and a typo is the likeliest way to get here.
    return { ok: false, code: 'UNKNOWN_STAGE', message: `unknown stage: ${stageKey}` };
  }

  const next: StageDef = { ...stages[index] };
  if (patch.name !== undefined) {
    if (typeof patch.name !== 'string' || patch.name.trim() === '') {
      return { ok: false, code: 'INVALID_STAGES', message: `stage "${stageKey}" needs a name` };
    }
    next.name = patch.name;
  }
  if (patch.ownerKind !== undefined) next.ownerKind = patch.ownerKind;
  if (patch.owner !== undefined) next.owner = patch.owner;
  if (patch.gate !== undefined) next.gate = patch.gate;
  // `null` is the removal. `undefined` cannot be, because it is what an absent field already
  // means — a caller sending JSON has no other way to say "take this off".
  if (patch.requires !== undefined) {
    if (patch.requires === null) delete next.requires;
    else next.requires = patch.requires;
  }
  if (patch.wipLimit !== undefined) {
    if (patch.wipLimit === null) delete next.wipLimit;
    else next.wipLimit = patch.wipLimit;
  }
  if (patch.instructions !== undefined) {
    if (patch.instructions === null) delete next.instructions;
    else next.instructions = patch.instructions;
  }
  if (patch.summary !== undefined) {
    if (patch.summary === null) delete next.summary;
    else next.summary = patch.summary;
  }
  if (patch.completion !== undefined) {
    if (patch.completion === null) delete next.completion;
    else {
      const invalid = completionShapeError(patch.completion);
      if (invalid) return { ok: false, code: 'INVALID_STAGES', message: `stage "${stageKey}": ${invalid}` };
      next.completion = patch.completion;
    }
  }

  if (patch.returnStage !== undefined) {
    if (patch.returnStage === null) delete next.returnStage;
    else next.returnStage = patch.returnStage;
  }
  if (patch.timeout !== undefined) {
    if (patch.timeout === null) delete next.timeout;
    else next.timeout = patch.timeout;
  }

  const invalid = stageFieldError(next);
  if (invalid) return { ok: false, code: 'INVALID_STAGES', message: invalid };
  const badReturn = returnStageError(next, stages);
  if (badReturn) return { ok: false, code: 'INVALID_STAGES', message: badReturn };

  const normalized = normalizeStageRouting(next);
  const ordered = stages.map((s, i) => (i === index ? normalized : s));
  const refused = refuseDecisionPolicyChange(stages, ordered, editor);
  if (refused) return refused;
  deps.setMeta('stages', JSON.stringify(ordered));
  deps.emit('board.stages_changed', { stages: ordered });
  return { ok: true, value: { stage: normalized } };
}

export async function setName(deps: PipelineDeps, name: string): Promise<Result<{ ok: true }>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  deps.setMeta('name', name);
  deps.emit('board.renamed', { name });
  return { ok: true, value: { ok: true } };
}

export async function getState(deps: PipelineDeps): Promise<BoardSnapshot> {
  return snapshot(deps);
}

/**
 * Erase this board.
 *
 * `DELETE /v1/boards/:id` removed the catalog row and nothing else, so the Durable Object and
 * every card, run, activity, gate, reference and usage record it held survived — unreachable
 * through any route, undeleted, and still billing storage. A person who deleted a board had
 * every reason to believe its contents were gone.
 *
 * Rows are deleted rather than `storage.deleteAll()`. On a SQLite-backed DO `deleteAll` drops
 * the tables themselves, and the schema is created in the constructor — so the live instance
 * would go on serving requests against tables that no longer exist, answering 500 where it
 * should answer "no such board". Emptying every table leaves `meta` with no `boardId`, which is
 * precisely how an uninitialised board already reads.
 *
 * The alarm goes too: a reclaim scheduled for a board that no longer exists would wake this
 * object for nothing, on a timer, forever.
 */
export async function destroy(deps: PipelineDeps): Promise<{ ok: true }> {
  for (const t of [
    'usage_records',
    'activities',
    'runs',
    'gates',
    'elicitations',
    'card_references',
    'notifications',
    'push_deliveries',
    'push_configs',
    'run_reports',
    'profiles',
    'webhook_deliveries',
    'events',
    'cards',
    'meta',
  ]) {
    deps.sql.exec(`DELETE FROM ${t}`);
  }
  await deps.ctx.storage.deleteAlarm();
  return { ok: true };
}

export async function getEvents(deps: PipelineDeps, limit = 100): Promise<BoardEvent[]> {
  return deps.sql
    .exec(`SELECT seq, type, payload_json, ts FROM events ORDER BY seq DESC LIMIT ?`, limit)
    .toArray()
    .toReversed()
    .map((r) => ({
      seq: Number(r.seq),
      type: r.type as string,
      payload: JSON.parse(r.payload_json as string),
      ts: r.ts as string,
    }));
}

/** Define or replace an agent profile by key (docs/05 §7). */
export async function setProfile(deps: PipelineDeps, input: ProfileInput): Promise<Result<{ key: string }>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  deps.sql.exec(
    `INSERT INTO profiles (key, name, harness, model, permission_policy, autonomy_level, capabilities_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET name = excluded.name, harness = excluded.harness, model = excluded.model,
       permission_policy = excluded.permission_policy, autonomy_level = excluded.autonomy_level, capabilities_json = excluded.capabilities_json`,
    input.key,
    input.name ?? null,
    input.harness ?? null,
    input.model ?? null,
    input.permissionPolicy ?? null,
    input.autonomyLevel ?? null,
    JSON.stringify(input.capabilities ?? []),
    deps.now(),
  );
  return { ok: true, value: { key: input.key } };
}

/** List the board's agent profiles (docs/05 §7). */
export async function getProfiles(deps: PipelineDeps): Promise<ProfileView[]> {
  return deps.sql
    .exec(`SELECT * FROM profiles ORDER BY key ASC`)
    .toArray()
    .map((r) => ({
      key: r.key as string,
      name: (r.name as string | null) ?? null,
      harness: (r.harness as string | null) ?? null,
      model: (r.model as string | null) ?? null,
      permissionPolicy: (r.permission_policy as string | null) ?? null,
      autonomyLevel: (r.autonomy_level as string | null) ?? null,
      capabilities: JSON.parse(r.capabilities_json as string) as string[],
    }));
}

export function snapshot(deps: PipelineDeps): BoardSnapshot {
  const boardId = deps.getMeta('boardId');
  const introJson = deps.getMeta('intro');
  const intro = introJson ? (JSON.parse(introJson) as { lede: string; composeHint: string }) : null;
  const tenantId = deps.getMeta('tenantId');
  const decisionTimeout = boardDecisionTimeout(deps);
  return {
    boardId,
    tenantId,
    name: deps.getMeta('name'),
    stages: deps.stages(),
    ...(intro ? { intro } : {}),
    cards: boardId ? deps.allCards() : [],
    gates: boardId ? deps.pendingGates() : [],
    elicitations: boardId ? deps.pendingElicitations() : [],
    references: boardId ? deps.allReferences() : [],
    usage: boardId ? deps.boardUsage() : { totalCostUsd: 0, estimatedCostUsd: 0, budgetUsd: null, cardUsdCap: null, overBudget: false },
    github: {
      issueTrigger: deps.getMeta('githubIssueTrigger') === '1',
      webhookConfigured: deps.getMeta('githubWebhookSecret') !== null,
      webhookUrl: `${deps.env.PUBLIC_APP_ORIGIN ?? 'https://app.superpipeline.dev'}/v1/boards/${boardId}/webhooks/github?tenant=${tenantId}`,
      triggerGrantCount: deps.triggerGrant()?.length ?? null,
    },
    stale: deps.staleSettings(),
    // Only when set, so a board without one reads exactly as before.
    ...(decisionTimeout ? { decisionTimeout } : {}),
  };
}
