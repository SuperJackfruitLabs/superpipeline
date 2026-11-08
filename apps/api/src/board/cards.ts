import { newId } from '../ids';
import type { JsonValue } from '../json';
import { notifyAttentionPending, waitChangedError } from './attention';
import type { BoardContext } from './context';
import type { CardView, Result } from './model';
import { COMMENT_MAX_BYTES } from './rules';
import type { CommentView } from './views';

/**
 * Creating, editing, splitting and deleting cards.
 */

/** What cards needs from the rest of the board. */
export type CardsDeps = Pick<
  BoardContext,
  | 'addComment'
  | 'decisionDeadline'
  | 'startDecisionWait'
  | 'addLink'
  | 'createCard'
  | 'createChildCard'
  | 'ctx'
  | 'emit'
  | 'endReviewsOfArchivedCard'
  | 'getCard'
  | 'getCardRow'
  | 'getMeta'
  | 'invalidateApprovalSubject'
  | 'mustGetCard'
  | 'notifyWorkAvailable'
  | 'now'
  | 'parentIdOf'
  | 'resumeParentAdvanceIfFree'
  | 'scheduleReclaim'
  | 'sql'
  | 'stages'
>;

/**
 * Strip the pre-migration keys `spec.due` and `spec.labels` from a spec, once the once-per-board
 * backfill has already run.
 *
 * `backfillDueDates`/`backfillLabelNames` move these onto `due_at`/`labels` exactly once per
 * board (`dueBackfillDone`), and BEFORE that pass a card legitimately carries them — that is what
 * the backfill exists to find. Nothing stopped a caller — an API or MCP client posting raw `spec`
 * JSON, or `CardDrawer.saveCard`'s `...card.spec` spread carrying a stale key forward — from
 * writing `spec.due`/`spec.labels` again AFTER that pass, and the backfill's own guard
 * (`WHERE due_at IS NULL`) then skips that card forever: the same save that writes the stale spec
 * key also writes `due_at` directly, so the key is not "cleared at the next tick" — it is
 * permanent. Stripped here (once the guard says there is nothing left to migrate) rather than
 * refused with a 400: a 400 would break saving any card that still carries a stale key for an
 * unrelated reason, whereas stripping is self-healing and closes a door the backfill cannot reach.
 */
function stripStaleSpecKeys(spec: JsonValue | undefined): JsonValue | undefined {
  if (spec === undefined || spec === null || typeof spec !== 'object' || Array.isArray(spec)) return spec;
  if (!('due' in spec) && !('labels' in spec)) return spec;
  const { due: _due, labels: _labels, ...rest } = spec;
  return rest;
}

/**
 * Turn one pasted/typed line into a title, the way `splitCard` (Task 15) does for every line it is
 * given. The input is whatever a human or an agent pasted — often a markdown checklist — so
 * `- [ ] Write the spec` must not become a card titled `- [ ] Write the spec`.
 *
 * Stripped in order: a leading `-`/`*`/`<digit>.` bullet, then a `[ ]`/`[x]` checkbox, then
 * whitespace. A line that is blank before or after stripping comes back `''`, which `splitCard`
 * filters out rather than turning into an untitled card.
 *
 * Both marker regexes require `\s+` (one-or-more), not `\s*` (zero-or-more), after the marker —
 * markdown's own rule is that a bullet/checkbox is followed by a SEPARATING space, and without
 * that requirement this silently mangled caller data that merely started with a similar character:
 * `2.0 launch plan` → `0 launch plan`, `1.5x throughput` → `5x throughput`, `-fix the bug` →
 * `fix the bug`, `**bold title**` → `*bold title**`. None of those are bullets; a version number,
 * a measurement, a hyphenated word and a bold marker all happen to start the same way a real
 * bullet does, and the caller got no signal that its title had been rewritten — that mangled name
 * is what the next agent's prompt would carry.
 *
 * Deliberately does NOT trim `raw` as one whole-string operation before stripping (only the final
 * return trims): an earlier version did, and that pre-trim consumed the separating space `\s+`
 * needs to see, so a line that was JUST a checkbox with a trailing space (`'- [ ] '`) stopped
 * stripping to `''` — the one-space requirement above only works if that space is still there when
 * the checkbox regex runs. `'- [ ] '` stripping to `''` is not a bug to guard against, it is the
 * spec: a marker with no title text is blank, the same as an empty line — see the "ignores blank
 * lines" test, which asserts exactly this input is dropped.
 *
 * Each marker regex instead carries its OWN leading `\s*`, rather than one whole-string pre-trim,
 * so an indented bullet/checkbox — the ordinary shape of a nested markdown checklist (`- [ ] parent`
 * with `  - [ ] child` under it) — still unwraps. This differs from the removed pre-trim in the one
 * way that matters: `\s*` at the FRONT of a regex only ever consumes LEADING characters at THAT
 * match's own start position; it cannot reach into the string's trailing end the way a whole-string
 * `.trim()` did, so it cannot repeat the original bug of eating the checkbox's separating space
 * before the checkbox regex gets to run. Verified empirically against every case above plus
 * indentation (leading spaces, a leading tab, a nested item) before shipping — see the fix-round
 * report.
 */
function stripListLineSyntax(raw: string): string {
  let s = raw.replace(/^\s*(?:[-*]|\d+\.)\s+/, ''); // optional indent, then bullet: "-", "*", or "2.", each followed by a space
  s = s.replace(/^\s*\[[ xX]\]\s+/, ''); // optional indent, then checkbox: "[ ]" or "[x]"/"[X]", followed by a space
  return s.trim();
}

/** The most children one `splitCard` call may create — see its doc comment. */
const MAX_SPLIT_CHILDREN = 20;

export async function createCard(deps: CardsDeps, input: {
  /** What the queuer was permitted to dispatch, as granted at this moment. */
  queuedGrant?: string[] | null;
  /** Whose grant `queuedGrant` is; recorded as `CardView.queuedGrantOwner`. */
  queuedGrantOwner?: string | null;
  /**
   * The principal who dispatched this card, when it is not the owner.
   *
   * Defaults to `ownerUserId`, which is what it has always been: a person creating a card is
   * both answerable for it and the authority behind it. An agent-queued card is the case where
   * the two come apart — the human owns it, the agent's principal authorised it — and the
   * control pair checks THIS value at claim time, so conflating them would check the wrong one.
   */
  queuedBy?: string | null;
  /** The agent that queued it, if an agent did. See `CardView.queuedByAgentId`. */
  queuedByAgentId?: string | null;
  title: string;
  ownerUserId: string;
  spec?: JsonValue;
  priority?: number;
  /**
   * Set at creation rather than requiring create-then-patch: a second round trip means a
   * failure between the two silently drops the due date. Validated at the route (same rule as
   * `PATCH /cards/:id`'s `dueAt`), so this DO trusts a bare `YYYY-MM-DD` string.
   */
  dueAt?: string;
  /**
   * NOT part of the public `createCard` surface (`BoardStub`'s own `createCard` doesn't carry
   * it) — `createChildCard` is the one internal caller, passing the parent's `projectId` along
   * (see that method's comment). A generic `POST /cards` taking `projectId` directly is Task
   * 21's, parked deliberately rather than added here.
   */
  projectId?: string | null;
  /** The stage to start in; the first stage when absent. Must be one of the board's stage keys. */
  stageKey?: string;
  /** Label ids to attach at creation. The route has already checked they are the workspace's. */
  labels?: string[];
}): Promise<Result<CardView>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  const first = input.stageKey !== undefined ? deps.stages().find((st) => st.key === input.stageKey) : deps.stages()[0];
  if (input.stageKey !== undefined && !first) {
    return { ok: false, code: 'UNKNOWN_STAGE', message: `no such stage on this board: ${input.stageKey}` };
  }
  if (!first) return { ok: false, code: 'NOT_INITIALIZED', message: 'board has no stages' };
  const id = newId('card');
  const contextId = newId('ctx');
  const now = deps.now();
  deps.sql.exec(
    `INSERT INTO cards
      (id, title, spec_json, owner_user_id, current_stage_key, state, priority, context_id, created_at, updated_at, queued_by, queued_by_agent_id, queued_grant, due_at, project_id, queued_grant_owner, stage_since, labels)
     VALUES (?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.title,
    JSON.stringify((deps.getMeta('dueBackfillDone') ? stripStaleSpecKeys(input.spec) : input.spec) ?? {}),
    input.ownerUserId,
    first.key,
    input.priority ?? 0,
    contextId,
    now,
    now,
    // Creating a card in the first stage IS queueing it: it is claimable the
    // moment it exists, so the creator is the principal who dispatched it —
    // unless the caller names a different one, which is the agent case.
    input.queuedBy ?? input.ownerUserId,
    input.queuedByAgentId ?? null,
    input.queuedGrant ? JSON.stringify(input.queuedGrant) : null,
    input.dueAt ?? null,
    input.projectId ?? null,
    input.queuedGrantOwner ?? null,
    now,
    JSON.stringify([...new Set(input.labels ?? [])]),
  );
  const card = deps.mustGetCard(id);
  deps.emit('card.created', { card });
  deps.notifyWorkAvailable(id);
  return { ok: true, value: card };
}

/**
 * Split a card into a sub-task (spec §3.4, Task 14 / 15). A real, independently claimable card —
 * built on `createCard` plus a `parent` edge (`addLink`), not a lighter-weight "checklist item"
 * type.
 *
 * Inherits `priority` (unless the caller overrides it) because a sub-task of an urgent card is
 * itself urgent. Deliberately does NOT inherit `labels` or `dueAt`: a label describes what a card
 * IS, not what its parent is, and a sub-task's own deadline is not its parent's — Linear inherits
 * neither either.
 *
 * `projectId` IS inherited (Task 19 follow-up): a sub-task is part of the same body of work as
 * its parent, so the project follows — without this, decomposing a card would silently shrink
 * the project it belongs to, under-counting both `cardsTotal` and `costUsd` in the rollup, which
 * is exactly the "silently under-counting a project's cost" failure `overBudget` exists to
 * prevent elsewhere. `milestoneId` is deliberately left null, NOT inherited: a milestone is a
 * narrower, dated commitment the PARENT made, and silently enrolling a brand-new child into it
 * would let decomposition inflate a milestone nobody re-committed to.
 *
 * ALSO inherits `queuedGrant` — not optional, not overridable by the caller. The parent's grant
 * IS the authority under which this work exists, the same reasoning `moveCard` already applies
 * when it preserves `queued_grant` across a re-queue. Before this, a child was created with
 * `queued_grant = NULL` — under `ENFORCE_CONTROL_PAIR` that made EVERY child unclaimable, because
 * `grantPermitsAgent(null, …)` is unconditionally false, which silently broke the promise
 * `splitCard`'s tool description makes ("each becomes a real card that can be claimed
 * separately"). Phase 2 shipped the identical bug for scheduled cards (`triggerGrant()` null on a
 * board that had never saved GitHub settings); the fix there was the same shape — record and
 * carry forward the authorising grant rather than leaving a creation path to default to none.
 */
export async function createChildCard(deps: CardsDeps, parentCardId: string, input: { title: string; ownerUserId: string; spec?: JsonValue; priority?: number }): Promise<Result<CardView>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  const parent = deps.getCard(parentCardId);
  if (!parent) return { ok: false, code: 'NO_SUCH_CARD', message: `card not found: ${parentCardId}` };
  const created = await deps.createCard({
    title: input.title,
    ownerUserId: input.ownerUserId,
    spec: input.spec,
    priority: input.priority ?? parent.priority,
    queuedGrant: parent.queuedGrant,
    queuedGrantOwner: parent.queuedGrantOwner,
    // Same reasoning one step further: a sub-task of a card the coordinator asked for was not
    // asked for by a person, and `queuedBy` has to follow or the child's authority would be the
    // owner's rather than the authority the parent's grant was issued against.
    queuedBy: parent.queuedBy,
    queuedByAgentId: parent.queuedByAgentId,
    projectId: parent.projectId,
  });
  if (!created.ok) return created;
  const linked = await deps.addLink({ fromCardId: parentCardId, toCardId: created.value.id, kind: 'parent' });
  if (!linked.ok) return { ok: false, code: linked.code, message: linked.message };
  return { ok: true, value: deps.mustGetCard(created.value.id) };
}

/**
 * Split a card into several children at once — the tool that makes the parent/child construct
 * worth having (Task 15, spec §3.4): an agent decomposing the card it is working on into pieces
 * different capabilities can pick up in parallel, mid-run. Built on `createChildCard` (one call
 * per line), not on `addLink` directly, so it inherits that method's parentage and priority rules
 * unchanged.
 *
 * `agentId` (present only on the MCP/agent path — see the `BoardStub` doc comment) gates this to
 * "the card YOU are working on": without it, any `run`-scoped token could split any card in the
 * workspace, and the consequence is worse than an ordinary unauthorized write — creating a child
 * makes the target fail `blockedWhere`, so it drops out of `claim` and `list_work` and
 * `advanceCard` parks it, until that child resolves. One agent could freeze another team's card
 * indefinitely by giving it a child nobody will complete. Checked against `delegateAgentId`
 * (who currently holds the card's active run), not `ownerUserId` — the same identity `claim`
 * stamps onto the card and clears when the run ends.
 *
 * All-or-nothing on the two refusals:
 *  - more than `MAX_SPLIT_CHILDREN` lines ⇒ `TOO_MANY_CHILDREN`, before anything is created.
 *    Partially creating 20 of 21 would be worse than refusing outright, because the caller could
 *    not tell which of its lines had succeeded.
 *  - every line blank (before or after stripping) ⇒ `NOTHING_TO_SPLIT`, rather than silently
 *    succeeding with an empty `children` array.
 *
 * Deliberately NOT idempotent: calling this twice with the same titles creates two separate sets
 * of children. De-duplicating by title would silently drop a legitimately repeated sub-task — the
 * tool description tells the caller to call it once, and the UI confirms before a second call.
 *
 * The loop below creates children one at a time and returns early on the first failure (line
 * below: `if (!created.ok) return created;`), which WOULD be a partial-creation hole — k children
 * left behind, with the caller told nothing about them — except it is unreachable today:
 * `createChildCard`'s two failure modes beyond `NO_SUCH_CARD` (already checked above, before this
 * loop starts) are `addLink`'s `ALREADY_HAS_PARENT` and `LINK_WOULD_CYCLE`, and both require a
 * PRE-EXISTING edge that a brand-new leaf card — created fresh, one line above, with no links of
 * its own yet — cannot have. This is the sentence a refactor should have to falsify: if
 * `createChildCard` (or whatever this loop calls) ever gains a failure mode that a fresh child CAN
 * hit, this early-return stops being merely theoretical and the loop needs to collect-then-commit
 * or roll back what it already created.
 */
export async function splitCard(deps: CardsDeps, cardId: string, titles: string[], actorUserId: string, agentId?: string | null): Promise<Result<{ children: CardView[] }>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  const card = deps.getCard(cardId);
  if (!card) {
    return { ok: false, code: 'NO_SUCH_CARD', message: `card not found: ${cardId}` };
  }
  if (agentId !== undefined && agentId !== null && card.delegateAgentId !== agentId) {
    return { ok: false, code: 'NOT_RUN_OWNER', message: 'this card is not your active run' };
  }
  if (titles.length > MAX_SPLIT_CHILDREN) {
    return {
      ok: false,
      code: 'TOO_MANY_CHILDREN',
      message: `a card may be split into at most ${MAX_SPLIT_CHILDREN} children in one call, not ${titles.length}`,
    };
  }
  const cleanedTitles = titles.map(stripListLineSyntax).filter((t) => t.length > 0);
  if (cleanedTitles.length === 0) {
    return { ok: false, code: 'NOTHING_TO_SPLIT', message: 'every line was blank — nothing to split into' };
  }
  // A child's owner must be a HUMAN, because `owner_user_id` is what `notify()` files
  // gate/park/overdue notifications under and `getNotifications` reads back for the requesting
  // human — an id nobody can sign in as leaves that feed with no recipient. On the REST/human
  // path (no `agentId`), `actorUserId` already names the signed-in human and is used as before.
  // On the MCP/agent path (`agentId` present — the same signal the ownership check above uses),
  // `actorUserId` IS the calling agent's own id (`mcp/tools.ts` passes `auth.agentId` for both
  // parameters), so the PARENT's own owner is used instead: `card` above is that parent, already
  // fetched, and it is presumed to carry a human owner because nothing on any path can make
  // `ownerUserId` an agent id except this one now-closed hole.
  const childOwnerUserId = agentId ? card.ownerUserId : actorUserId;
  const children: CardView[] = [];
  for (const title of cleanedTitles) {
    const created = await deps.createChildCard(cardId, { title, ownerUserId: childOwnerUserId });
    if (!created.ok) return created;
    children.push(created.value);
  }
  return { ok: true, value: { children } };
}

export async function updateCard(deps: CardsDeps, cardId: string, patch: {
    title?: string;
    spec?: JsonValue;
    priority?: number;
    ownerUserId?: string;
    labels?: string[];
    dueAt?: string | null;
    archivedAt?: string | null;
    projectId?: string | null;
    milestoneId?: string | null;
    /**
     * A precondition, not a field: the card's `updatedAt` as the caller last read it. When
     * present and the card has moved on since, nothing is written and `CARD_CHANGED` comes back.
     * A read-modify-write (`supi edit-card --merge-spec`) sends it so it cannot overwrite an edit
     * it never saw. Absent, the patch applies as it always has.
     */
    expectedUpdatedAt?: string | null;
  }): Promise<Result<CardView>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  const existing = deps.getCard(cardId);
  if (!existing) return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${cardId}` };
  if (patch.expectedUpdatedAt !== undefined && patch.expectedUpdatedAt !== existing.updatedAt) {
    return {
      ok: false,
      code: 'CARD_CHANGED',
      message: `card ${cardId} changed since it was read (updatedAt is now ${existing.updatedAt ?? 'null'})`,
    };
  }
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.title !== undefined) {
    sets.push('title = ?');
    vals.push(patch.title);
  }
  const normalizedSpec =
    patch.spec === undefined
      ? undefined
      : deps.getMeta('dueBackfillDone')
        ? stripStaleSpecKeys(patch.spec)
        : patch.spec;
  if (patch.spec !== undefined) {
    sets.push('spec_json = ?');
    vals.push(JSON.stringify(normalizedSpec));
  }
  if (patch.priority !== undefined) {
    sets.push('priority = ?');
    vals.push(patch.priority);
  }
  if (patch.ownerUserId !== undefined) {
    sets.push('owner_user_id = ?');
    vals.push(patch.ownerUserId);
  }
  if (patch.labels !== undefined) {
    sets.push('labels = ?');
    vals.push(JSON.stringify([...new Set(patch.labels)]));
  }
  if (patch.dueAt !== undefined) {
    sets.push('due_at = ?');
    // Validation lives at the route (`PATCH /cards/:id` in index.ts) — this DO is reachable from
    // more than one caller, so a non-string here is stored as-is rather than crashing `.trim()`.
    const normalizedDueAt = patch.dueAt === null || typeof patch.dueAt !== 'string' ? patch.dueAt : patch.dueAt.trim();
    vals.push(normalizedDueAt);
    // A changed date is a new chance to be told about it — but `dueAt` is sent on EVERY save
    // (CardDrawer.svelte), not only when the date itself changed, so this must compare against
    // the value actually stored rather than fire on `patch.dueAt !== undefined` alone. Otherwise
    // editing a card's title re-arms the overdue nag and the next sweep spams the owner again.
    if (normalizedDueAt !== existing.dueAt) {
      sets.push('overdue_notified_at = NULL'); // no placeholder, so no `vals` entry
    }
  }
  if (patch.archivedAt !== undefined) {
    sets.push('archived_at = ?');
    vals.push(patch.archivedAt);
    // Archiving ends a wait and restoring starts a new one (charter: waiting cards reach chat §2):
    // a fresh id either way, so an answer given before the archive never matches after it.
    sets.push(`needs_human_id = CASE WHEN needs_human_json IS NULL THEN NULL ELSE 'wait_' || lower(hex(randomblob(8))) END`);
  }
  if (patch.projectId !== undefined) {
    sets.push('project_id = ?');
    vals.push(patch.projectId);
  }
  if (patch.milestoneId !== undefined) {
    sets.push('milestone_id = ?');
    vals.push(patch.milestoneId);
  }
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    // Strictly after the stored value, never equal to it: `expectedUpdatedAt` compares
    // timestamps, and Workers freezes the clock inside a request, so two edits in one window
    // would otherwise carry the same `updatedAt` and a stale precondition would pass.
    const nowMs = Date.parse(deps.now());
    const prevMs = existing.updatedAt ? Date.parse(existing.updatedAt) : Number.NaN;
    vals.push(new Date(Number.isNaN(prevMs) ? nowMs : Math.max(nowMs, prevMs + 1)).toISOString());
    const archiving = typeof patch.archivedAt === 'string';
    deps.ctx.storage.transactionSync(() => {
      deps.invalidateApprovalSubject(
        cardId,
        archiving ? 'card.archived' : patch.spec !== undefined ? 'card.spec_changed' : 'card.changed',
        null,
      );
      deps.sql.exec(`UPDATE cards SET ${sets.join(', ')} WHERE id = ?`, ...vals, cardId);
      // After the write, so the card is already archived when its reviews end: the reason that
      // records is not a wait chat is told about (an archived card waits on nobody).
      if (archiving) deps.endReviewsOfArchivedCard(cardId);
    });
  }
  // A restored card still waiting on a person is a new wait chat is told about, as a park is.
  if (patch.archivedAt === null && existing.archivedAt) notifyAttentionPending(deps, cardId);
  const card = deps.mustGetCard(cardId);
  deps.emit('card.updated', { card });
  return { ok: true, value: card };
}

/**
 * Archive a card as a person: the `archive` answer to a waiting card (charter: waiting cards and
 * broker approvals reach chat §2), and the board's own archive with a remark.
 *
 * It archives exactly as the card PATCH does (`archivedAt`), so a pending review or question ends
 * the same way. `expectedWaitId` names the wait the person answered; a card no longer in that wait
 * refuses `WAIT_CHANGED` and nothing is written. Without it, an already archived card is returned
 * unchanged rather than archived again. A comment, when given, joins the card's thread.
 */
export async function archiveCard(deps: CardsDeps, input: {
  cardId: string;
  actor: { id: string; name: string | null };
  expectedWaitId?: string;
  comment?: string;
}): Promise<Result<{ card: CardView; comment: CommentView | null }>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  const card = deps.getCard(input.cardId);
  if (!card) return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${input.cardId}` };
  const changed = waitChangedError(deps.getCardRow(card.id), input.expectedWaitId);
  if (changed) return changed;
  const remark = input.comment?.trim() ?? '';
  const bytes = new TextEncoder().encode(remark).length;
  if (bytes > COMMENT_MAX_BYTES) return { ok: false, code: 'INVALID_COMMENT', message: `a comment is at most ${COMMENT_MAX_BYTES} bytes; this one is ${bytes}` };
  if (card.archivedAt) return { ok: true, value: { card, comment: null } };
  const archived = await updateCard(deps, card.id, { archivedAt: deps.now() });
  if (!archived.ok) return archived;
  if (remark === '') return { ok: true, value: { card: archived.value, comment: null } };
  const comment = await deps.addComment({ cardId: card.id, author: { kind: 'human', ...input.actor }, body: remark });
  if (!comment.ok) return comment;
  return { ok: true, value: { card: deps.mustGetCard(card.id), comment: comment.value } };
}

/** Delete a card and everything scoped to it (references, runs, activities, gates, usage, notifications, links). */
export async function deleteCard(deps: CardsDeps, cardId: string): Promise<Result<{ ok: true }>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  if (!deps.getCard(cardId)) return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${cardId}` };
  // Captured before the edge is deleted below — a deleted card may be the last open child of a
  // parent parked on a deferred advance (Task 14 step 3), which `resumeParentAdvanceIfFree` needs
  // to know to check.
  const parentId = deps.parentIdOf(cardId);
  for (const t of ['usage_records', 'activities', 'runs', 'gates', 'elicitations', 'card_references', 'notifications', 'card_comments']) {
    deps.sql.exec(`DELETE FROM ${t} WHERE card_id = ?`, cardId);
  }
  // Both directions. A deleted card's edges must go with it: a lingering `blocks` row points at a
  // card that no longer exists, and the drawer would render a blocker nobody can open or resolve.
  // `card_links` is keyed on two columns, so it cannot join the single-column loop above.
  deps.sql.exec(`DELETE FROM card_links WHERE from_card_id = ? OR to_card_id = ?`, cardId, cardId);
  deps.sql.exec(`DELETE FROM cards WHERE id = ?`, cardId);
  deps.emit('card.deleted', { cardId });
  if (parentId) deps.resumeParentAdvanceIfFree(parentId);
  await deps.scheduleReclaim();
  return { ok: true, value: { ok: true } };
}

/**
 * Edit a card's title / spec / priority / owner (human, docs/07 §4).
 *
 * `ownerUserId` is here because a card's owner was fixed to whoever created it, with no
 * reassign, no "assign to me" and no unassign — on a board whose whole purpose is handing work
 * between people and agents. It is deliberately NOT `queued_by`: who is answerable for a card
 * and who authorised its dispatch are different questions, and reassignment must not silently
 * rewrite the recorded authority a claim is checked against.
 */
/**
 * One card, read.
 *
 * The projection is `getCard`'s, which is `allCards`', which is the snapshot's — deliberately,
 * so a client reading one card and a client reading the board never disagree about it. Nothing
 * new is computed here; this exists because the REST prefix served `PATCH` and `DELETE` and had
 * no way to read (#90), while its own subroutes — `/attempts`, `/activities`, `/estimate` — all
 * did.
 */
export async function getCardView(deps: CardsDeps, cardId: string): Promise<Result<CardView>> {
  if (!deps.getMeta('boardId')) return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  const card = deps.getCard(cardId);
  if (!card) return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${cardId}` };
  return { ok: true, value: card };
}
