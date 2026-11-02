import type { BoardContext } from './context';
import { type LinkKind, type LinkRow, wouldCycle } from './links';
import type { LinkInput, LinkView, Result, Row } from './model';
import { RESOLVED_SQL } from './rules';

/**
 * What holds a card back: its blockers and its open children, and the links that record them.
 */

/** What holds needs from the rest of the board. */
export type HoldsDeps = Pick<
  BoardContext,
  | 'emit'
  | 'getCardRow'
  | 'getMeta'
  | 'notifyWorkAvailable'
  | 'now'
  | 'resumeParentAdvanceIfFree'
  | 'scheduleReclaim'
  | 'sql'
>;

/**
 * The WHERE fragment deciding whether a card may be handed out, shared by the claim query and the
 * work-discovery count so the two cannot drift apart.
 *
 * They were independent copies of `state = 'submitted' AND current_stage_key IN (…)`. Every
 * condition added to claim from here on — archived here, blocked and parent-with-open-children via
 * `blockedWhere()` (Task 13) — has to be invisible to `list_work` as well, or the board advertises
 * work it will not hand out. The table is aliased `c` in both callers so this fragment can qualify
 * its columns.
 */
export function claimableWhere(placeholders: string): string {
  return `c.state = 'submitted' AND c.archived_at IS NULL
    AND c.current_stage_key IN (${placeholders})
    AND ${blockedWhere()}`;
}

/**
 * An unresolved `blocks` edge pointing at `c.id` — the enforced dependency. Correlated on the
 * alias `c`, so it only composes where the cards table is aliased `c` (`blockedWhere`,
 * `isHeldBack`). Extracted (Task 17) so `CardView.blockedBy`'s batch query can select the same
 * blocker rows this EXISTS clause tests for, instead of restating the predicate.
 */
function unresolvedBlockerExists(): string {
  return `EXISTS (
      SELECT 1 FROM card_links l
        JOIN cards b ON b.id = l.from_card_id
       WHERE l.to_card_id = c.id AND l.kind = 'blocks'
         AND b.state NOT IN ${RESOLVED_SQL}
    )`;
}

/**
 * An unresolved child of `c.id` (the `parent` edge) — surfaced to readers as `openChildCount`,
 * never as a `blockedBy` entry: it is a different fact with a different badge. Extracted (Task 17)
 * alongside `unresolvedBlockerExists` so `blockedWhere` composes from two named fragments instead
 * of two inline `NOT EXISTS` clauses.
 */
function openChildExists(): string {
  return `EXISTS (
      SELECT 1 FROM card_links l
        JOIN cards ch ON ch.id = l.to_card_id
       WHERE l.from_card_id = c.id AND l.kind = 'parent'
         AND ch.state NOT IN ${RESOLVED_SQL}
    )`;
}

/**
 * Whether nothing holds `c` back from being handed out: no unresolved blocker (`blocks`), and no
 * open child (`parent`). Parameterless and correlated on the alias `c`, so it composes directly
 * into `claimableWhere`'s SELECT and into `isHeldBack`'s single-card check below, without either
 * restating the rule. TRUE means eligible — `claimableWhere` ANDs it straight into its WHERE
 * clause, and `isHeldBack` inverts the question to ask it about one card.
 *
 * One definition, three readers — the claim query (via `claimableWhere`), the discovery count
 * (`countReadyForCapabilities`, which calls `claimableWhere` too), and `notifyWorkAvailable`'s JS
 * gate, which reaches it through `isHeldBack` rather than mirroring the SQL by hand. A fourth
 * reader, `CardView.blockedBy`, reuses `unresolvedBlockerExists`'s predicate directly rather than
 * this composed form — it needs the `blocks` half only, never the `parent` half.
 */
function blockedWhere(): string {
  return `NOT ${unresolvedBlockerExists()} AND NOT ${openChildExists()}`;
}

/** The same rule, asked about one card, for callers that are not a SELECT over the stage set. */
export function isHeldBack(deps: HoldsDeps, cardId: string): boolean {
  return (
    deps.sql.exec(`SELECT 1 FROM cards c WHERE c.id = ? AND (${blockedWhere()})`, cardId).toArray().length ===
    0
  );
}

/**
 * Every card this one directly holds back: the cards it blocks (`blocks`, this card as source),
 * and its own parent, if it has one (`parent`, this card as the child/target) — a parent may now
 * have lost its last open child. Called once a card reaches a genuinely resolved state
 * (`completed`/`canceled`), to re-issue `work.available` pings that `notifyWorkAvailable`
 * correctly suppressed while this card was still open. Without this fan-out, a push-subscribed
 * agent waiting on a dependent never hears that it unblocked — only `list_work` polling would
 * ever find it, which is the same shape of silent gap Phase 1 fixed for the archived exclusion.
 *
 * `notifyWorkAvailable` re-checks eligibility itself (`isHeldBack`, stage ownership, budget), so
 * calling it here for a card that is STILL blocked by something else (e.g. a second unresolved
 * blocker) is safe — it just no-ops.
 */
export function notifyDependents(deps: HoldsDeps, cardId: string): void {
  for (const row of deps.sql.exec(`SELECT to_card_id FROM card_links WHERE from_card_id = ? AND kind = 'blocks'`, cardId).toArray()) {
    deps.notifyWorkAvailable(row.to_card_id as string);
  }
  const parentId = parentIdOf(deps, cardId);
  if (parentId) deps.notifyWorkAvailable(parentId);
}

/**
 * `cardId`'s parent, via its `parent` edge (`cardId` as `to_card_id`) — or null if it has none.
 * One spelling of the lookup, used by `CardView.parentCardId` (`rowToCard`), `notifyDependents`'s
 * fan-out, and `resumeDeferredParentAdvance`'s trigger (Task 14).
 */
export function parentIdOf(deps: HoldsDeps, cardId: string): string | null {
  return (
    (deps.sql
      .exec(`SELECT from_card_id FROM card_links WHERE to_card_id = ? AND kind = 'parent'`, cardId)
      .toArray()[0]?.from_card_id as string | undefined) ?? null
  );
}

/**
 * How many of `cardId`'s children (via the `parent` edge, `cardId` as source) are still
 * unresolved. Originally used only by `moveCard`'s advance refusal — deliberately NOT
 * `blockedWhere()`, which also folds in the `blocks` condition that `moveCard` must NOT refuse on
 * (Principle 3). Task 14 gave it two more callers: `advanceCard`'s deferral (the same "is this
 * card held back by an open child" question, asked of the agent path) and `CardView.openChildCount`
 * (`rowToCard`), a read-only surfacing of the same count for the UI.
 */
export function openChildCount(deps: HoldsDeps, cardId: string): number {
  return Number(
    deps.sql
      .exec(
        `SELECT COUNT(*) AS n FROM card_links l JOIN cards ch ON ch.id = l.to_card_id
          WHERE l.from_card_id = ? AND l.kind = 'parent' AND ch.state NOT IN ${RESOLVED_SQL}`,
        cardId,
      )
      .one().n,
  );
}

/**
 * `cardId`'s open children (via the `parent` edge), id and title, oldest first — for the
 * deferred-advance park notification (`advanceCard`). A card can be "open" here forever without
 * ever resolving: `rejected` is deliberately outside `RESOLVED_SQL` (a rejected blocker must keep
 * blocking, same reasoning as a failed one), and an archived child is excluded from `claimableWhere`
 * so it can never be claimed to completion either. Both are recoverable with existing verbs
 * (delete the child, `removeLink` it, un-archive and finish it), but neither is visible from the
 * parked parent alone — hence naming the children, not just the count.
 */
export function openChildren(deps: HoldsDeps, cardId: string): { id: string; title: string }[] {
  return deps.sql
    .exec(
      `SELECT ch.id, ch.title FROM card_links l JOIN cards ch ON ch.id = l.to_card_id
         WHERE l.from_card_id = ? AND l.kind = 'parent' AND ch.state NOT IN ${RESOLVED_SQL}
         ORDER BY ch.created_at ASC`,
      cardId,
    )
    .toArray()
    .map((r) => ({ id: r.id as string, title: r.title as string }));
}

/**
 * How many unresolved blockers (via the `blocks` edge, `cardId` as target) `cardId` has. Used
 * only to decide whether `moveCard`'s human-override notification fires — a `blocks` edge never
 * refuses the move itself.
 */
export function unresolvedBlockerCount(deps: HoldsDeps, cardId: string): number {
  return Number(
    deps.sql
      .exec(
        `SELECT COUNT(*) AS n FROM card_links l JOIN cards b ON b.id = l.from_card_id
          WHERE l.to_card_id = ? AND l.kind = 'blocks' AND b.state NOT IN ${RESOLVED_SQL}`,
        cardId,
      )
      .one().n,
  );
}

/**
 * `cardId`'s unresolved blockers (the `blocks` edge, `cardId` as target), id and title — the same
 * `kind = 'blocks'` + `RESOLVED_SQL` predicate as `unresolvedBlockerExists()`, as a SELECT rather
 * than an EXISTS, for `CardView.blockedBy`'s single-card fallback (`rowToCard`, no `pre`). The
 * batched board read (`allCards`) asks this same question in one grouped query instead of calling
 * this once per card — see the note on `blockersByCard` there.
 */
export function blockersOf(deps: HoldsDeps, cardId: string): Array<{ cardId: string; title: string }> {
  return deps.sql
    .exec(
      `SELECT b.id, b.title FROM card_links l JOIN cards b ON b.id = l.from_card_id
        WHERE l.to_card_id = ? AND l.kind = 'blocks' AND b.state NOT IN ${RESOLVED_SQL}`,
      cardId,
    )
    .toArray()
    .map((r) => ({ cardId: r.id as string, title: r.title as string }));
}

/**
 * Declare an edge between two cards on this board (spec §3.4). `blocks` and `parent` both order
 * work and so can deadlock; `relates` is decoration and is exempt from both checks below.
 *
 * Idempotent on the primary key: re-declaring the exact same (from, to, kind) is a no-op, not an
 * error — the same reasoning as `addImplication` (`db/implications.ts`).
 *
 * Refusals are one distinct code per reason, not a generic one, because a caller needs to know
 * what to do next: `NO_SUCH_CARD` (either end is missing), `ALREADY_HAS_PARENT` (a card may have
 * at most one `parent` edge pointing at it — enforced again by `card_links_one_parent` for any
 * caller that reaches the table directly), `LINK_WOULD_CYCLE` (this edge would close a loop among
 * the ordering kinds — see `links.ts#wouldCycle`).
 */
export async function addLink(deps: HoldsDeps, input: LinkInput): Promise<Result<LinkView>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  if (!deps.getCardRow(input.fromCardId)) {
    return { ok: false, code: 'NO_SUCH_CARD', message: `card not found: ${input.fromCardId}` };
  }
  if (!deps.getCardRow(input.toCardId)) {
    return { ok: false, code: 'NO_SUCH_CARD', message: `card not found: ${input.toCardId}` };
  }
  if (input.kind === 'parent') {
    const existingParent = deps.sql
      .exec(`SELECT from_card_id FROM card_links WHERE to_card_id = ? AND kind = 'parent'`, input.toCardId)
      .toArray()[0];
    if (existingParent && (existingParent.from_card_id as string) !== input.fromCardId) {
      return {
        ok: false,
        code: 'ALREADY_HAS_PARENT',
        message: `card ${input.toCardId} already has a parent (${existingParent.from_card_id as string})`,
      };
    }
  }
  const candidate: LinkRow = { fromCardId: input.fromCardId, toCardId: input.toCardId, kind: input.kind };
  if (wouldCycle(allLinks(deps), candidate)) {
    return {
      ok: false,
      code: 'LINK_WOULD_CYCLE',
      message: `linking ${input.fromCardId} -> ${input.toCardId} (${input.kind}) would close a cycle`,
    };
  }
  const now = deps.now();
  deps.sql.exec(
    `INSERT INTO card_links (from_card_id, to_card_id, kind, created_at, created_by)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (from_card_id, to_card_id, kind) DO NOTHING`,
    input.fromCardId,
    input.toCardId,
    input.kind,
    now,
    input.createdBy ?? null,
  );
  const link = mustGetLink(deps, input.fromCardId, input.toCardId, input.kind);
  deps.emit('link.added', { link });
  return { ok: true, value: link };
}

/** Remove an edge. Deleting a link that does not exist is not an error — the end state is what was asked for. */
export async function removeLink(deps: HoldsDeps, fromCardId: string, toCardId: string, kind: LinkKind): Promise<Result<{ ok: true }>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  deps.sql.exec(`DELETE FROM card_links WHERE from_card_id = ? AND to_card_id = ? AND kind = ?`, fromCardId, toCardId, kind);
  deps.emit('link.removed', { fromCardId, toCardId, kind });
  // Un-parenting a card is the other way (besides completion) it can stop counting as an open
  // child — see `resumeParentAdvanceIfFree`'s note. `fromCardId` IS the parent for a `parent` edge.
  if (kind === 'parent') deps.resumeParentAdvanceIfFree(fromCardId);
  await deps.scheduleReclaim();
  return { ok: true, value: { ok: true } };
}

/** Every edge touching `cardId`, either as source or target — what the drawer renders. */
export async function listLinks(deps: HoldsDeps, cardId: string): Promise<LinkView[]> {
  return deps.sql
    .exec(
      `SELECT * FROM card_links WHERE from_card_id = ? OR to_card_id = ? ORDER BY created_at ASC`,
      cardId,
      cardId,
    )
    .toArray()
    .map((r) => rowToLink(r));
}

function rowToLink(row: Row): LinkView {
  return {
    fromCardId: row.from_card_id as string,
    toCardId: row.to_card_id as string,
    kind: row.kind as LinkKind,
    createdAt: row.created_at as string,
    createdBy: (row.created_by as string | null) ?? null,
  };
}

function mustGetLink(deps: HoldsDeps, fromCardId: string, toCardId: string, kind: LinkKind): LinkView {
  const row = deps.sql
    .exec(`SELECT * FROM card_links WHERE from_card_id = ? AND to_card_id = ? AND kind = ?`, fromCardId, toCardId, kind)
    .toArray()[0];
  if (!row) throw new Error(`invariant violation: link ${fromCardId}->${toCardId} (${kind}) missing immediately after write`);
  return rowToLink(row);
}

/** Every edge on the board, as the pure `wouldCycle` predicate wants them — no DO-specific shape. */
function allLinks(deps: HoldsDeps): LinkRow[] {
  return deps.sql
    .exec(`SELECT from_card_id, to_card_id, kind FROM card_links`)
    .toArray()
    .map((r) => ({
      fromCardId: r.from_card_id as string,
      toCardId: r.to_card_id as string,
      kind: r.kind as LinkKind,
    }));
}
