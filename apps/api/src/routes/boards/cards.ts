// Cards on a board: create, read, edit, move, resume, split, delete, and what they hold.
import { isKnownProvider, providerKeys } from '@superpipeline/contract';
import { authorizeAgentQueue } from '../../auth/agent-queue';
import type { JsonValue } from '../../board/board-do';
import { deleteExternalLinksForCard } from '../../db/card-links-external';
import { tenantById, recordAgentQueue } from '../../db/catalog';
import { unknownLabelIds, resolveLabelNames } from '../../db/labels';
import { projectById, milestoneById } from '../../db/projects';
import { resolveReferenceInput } from '../../references/resolve';
import { statusForCode } from '../errors';
import { isInvalidDueAt } from '../fields';
import type { BoardRequest } from './request';

// POST /v1/boards/:id/cards — create a card (owner defaults to the signed-in user)
export async function cardCreate({ request, env, tenantId, boardId, user, agent, stub }: BoardRequest): Promise<Response> {
  const body = (await request.json()) as {
    title: string;
    ownerUserId?: string;
    spec?: JsonValue;
    priority?: number;
    dueAt?: string;
    stageKey?: unknown;
    labelIds?: unknown;
    projectId?: unknown;
  };
  if (isInvalidDueAt(body.dueAt)) {
    return Response.json(
      { error: { code: 'INVALID_DUE_AT', message: 'dueAt must be null or a date in YYYY-MM-DD form' } },
      { status: 400 },
    );
  }
  // The authority that accompanied the act, recorded with the card. A
  // session-cookie caller carries none, and `undefined` there means "no
  // one with permission asked for this to run" — which is refused under
  // enforcement rather than treated as an empty grant.
  //
  // Built from named fields rather than `...body`: `as` above is a compile-time assertion
  // only — it strips nothing at runtime, so a caller sending ANY key (`projectId` among
  // them: `createCard`'s own input type carries it for `createChildCard`'s internal use
  // alone, board-do.ts) would have had it spread straight through to the DO. A cast is not
  // validation, so the route has to name what it accepts rather than forward what it
  // received.
  /**
   * Who is answerable for this card, and on whose authority it may be dispatched.
   *
   * Two callers now reach here. For a person the two have always been the same value and
   * `ownerUserId` ended with `?? 'usr_dev'`; for an AGENT that literal would have owned real
   * work to a user that exists in no workspace, and `user?.mayDispatch` would have been
   * `undefined` — a null grant, which the control pair refuses at claim time. So an agent
   * could have created cards that nothing could ever claim: queued-looking, and dead.
   */
  // Where the card starts, and what it carries from the first moment. Checked before anything
  // is written, by name, so a typo is a 400 that says which field and not a card in the wrong place.
  if (body.stageKey !== undefined && typeof body.stageKey !== 'string') {
    return Response.json({ error: { code: 'UNKNOWN_STAGE', message: 'stageKey must be a stage key' } }, { status: 400 });
  }
  if (body.labelIds !== undefined) {
    if (!Array.isArray(body.labelIds) || body.labelIds.some((l) => typeof l !== 'string')) {
      return Response.json({ error: { code: 'INVALID_LABELS', message: 'labelIds must be an array of label ids' } }, { status: 400 });
    }
    const unknown = await unknownLabelIds(env.DB, tenantId, body.labelIds as string[]);
    if (unknown.length > 0) {
      return Response.json(
        { error: { code: 'UNKNOWN_LABEL', message: `no such label in this workspace: ${unknown.join(', ')}` } },
        { status: 400 },
      );
    }
  }
  if (body.projectId !== undefined && body.projectId !== null && typeof body.projectId !== 'string') {
    return Response.json({ error: { code: 'INVALID_PROJECT', message: 'projectId must be a project id or null' } }, { status: 400 });
  }
  if (typeof body.projectId === 'string' && !(await projectById(env.DB, tenantId, body.projectId))) {
    return Response.json(
      { error: { code: 'UNKNOWN_PROJECT', message: `no such project in this workspace: ${body.projectId}` } },
      { status: 400 },
    );
  }
  const queueing = agent
    ? await authorizeAgentQueue(env.DB, agent, boardId, body.ownerUserId)
    : null;
  if (queueing && !queueing.ok) {
    return Response.json(
      { error: { code: queueing.code, message: queueing.message } },
      { status: queueing.status },
    );
  }
  const result = await stub.createCard({
    title: body.title,
    spec: body.spec,
    priority: body.priority,
    dueAt: body.dueAt,
    ...(body.stageKey !== undefined ? { stageKey: body.stageKey } : {}),
    ...(body.labelIds !== undefined ? { labels: body.labelIds as string[] } : {}),
    ...(body.projectId !== undefined ? { projectId: body.projectId } : {}),
    ownerUserId: queueing ? queueing.ownerUserId : body.ownerUserId ?? user!.userId,
    queuedGrant: queueing ? queueing.queuedGrant : user?.mayDispatch ?? null,
    queuedGrantOwner: queueing ? queueing.ownerUserId : user?.userId ?? null,
    // Null for a person, and that is the whole signal: every card on every board today was
    // queued by one, and a reader must be able to see at a glance which ones were not.
    queuedBy: queueing ? queueing.queuedBy : null,
    queuedByAgentId: agent?.agentId ?? null,
  });
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  // Written AFTER the card exists, so the ceiling counts cards that were actually created
  // rather than attempts — and so a board that refused the card does not spend the agent's
  // hourly budget on nothing.
  if (agent?.agentId) {
    await recordAgentQueue(env.DB, {
      tenantId,
      agentId: agent.agentId,
      boardId,
      cardId: result.value.id,
    });
  }
  return Response.json({ card: result.value }, { status: 201 });
}

// POST /v1/boards/:id/cards/:cardId/move — move a card
export async function cardMove({ request, env, boardId, user, agent, stub }: BoardRequest, moveMatch: RegExpMatchArray): Promise<Response> {
  const body = (await request.json()) as { toStageKey: string };
  // The mover is passed through: whoever moves a card into a dispatchable
  // stage is the one dispatching it now, and the control pair needs a
  // principal to check at claim time. `moveCard` has always accepted an
  // actor; this route never sent one, so every move looked anonymous.
  /**
   * Moving a card into a dispatchable stage IS dispatching it — `moveCard` stamps `queued_by`
   * and `queued_grant` for exactly that reason. So an AGENT mover goes through the same gate a
   * create does: the board allowlist, an owner, a real grant, and the hourly ceiling.
   *
   * Without this an agent could launder authority: move a card it could never have queued, and
   * the card would keep the last human's grant while the agent chose the work. `user!` here
   * would also have thrown — a 500 rather than a refusal — the moment this route admitted one.
   */
  const mover = agent ? await authorizeAgentQueue(env.DB, agent, boardId) : null;
  if (mover && !mover.ok) {
    return Response.json(
      { error: { code: mover.code, message: mover.message } },
      { status: mover.status },
    );
  }
  const result = await stub.moveCard(
    moveMatch[1],
    body.toStageKey,
    mover ? mover.queuedBy : user!.userId,
    mover ? mover.queuedGrant : user?.mayDispatch ?? null,
    mover ? agent!.agentId : null,
    mover ? mover.ownerUserId : user?.userId ?? null,
  );
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json({ card: result.value });
}

// POST /v1/boards/:id/cards/:cardId/resume — return a card waiting on a person to its stage
// (or an earlier one), with a comment the next agent reads. A person only: the agent branch
// above refuses every agent token, and the human branch requires `work`, the role a move needs.
export async function cardResume({ request, user, stub }: BoardRequest, resumeMatch: RegExpMatchArray): Promise<Response> {
  if (!user) return Response.json({ error: 'only a person resumes a card' }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { comment?: unknown; toStageKey?: unknown } | null;
  if (!body || typeof body !== 'object' || typeof body.comment !== 'string') {
    return Response.json({ error: { code: 'INVALID_COMMENT', message: 'send { "comment": "<what changed>", "toStageKey"?: "<stage>" }' } }, { status: 400 });
  }
  if (body.toStageKey !== undefined && typeof body.toStageKey !== 'string') {
    return Response.json({ error: { code: 'UNKNOWN_STAGE', message: '`toStageKey` must be a stage key' } }, { status: 400 });
  }
  const result = await stub.resumeCard({
    cardId: resumeMatch[1],
    comment: body.comment,
    ...(body.toStageKey !== undefined ? { toStageKey: body.toStageKey } : {}),
    actor: { id: user.userId, name: user.name ?? user.login ?? null },
    queuedGrant: user.mayDispatch ?? null,
    queuedGrantOwner: user.userId,
  });
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json(result.value);
}

// GET /v1/boards/:id/cards/:cardId — one card · PATCH — edit it · DELETE — remove it
/**
 * The read arm did not exist until #90, so `supi card` — which has requested exactly this
 * path since it was written — answered 405 on every invocation, for every board and every
 * card, while `supi --help` advertised it as "one card in full". The subroutes below
 * (`/attempts`, `/activities`, `/estimate`) all serve GET; the card itself was the one
 * thing under this prefix nobody could read, and the absence was routed around by filtering
 * the whole board snapshot client-side.
 *
 * Bodied as `{ card }`, which is what PATCH already answers with, so one client parses both.
 */
export async function cardRead({ stub }: BoardRequest, cardMatch: RegExpMatchArray): Promise<Response> {
  const result = await stub.getCardView(cardMatch[1]);
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json({ card: result.value });
}

export async function cardEdit({ request, env, tenantId, user, stub }: BoardRequest, cardMatch: RegExpMatchArray): Promise<Response> {
  const body = (await request.json()) as {
    title?: string;
    spec?: JsonValue;
    priority?: number;
    ownerUserId?: string;
    labels?: string[];
    /**
     * The free-text names `CardDrawer.svelte`'s comma-separated Labels input sends —
     * resolved to catalogue ids here rather than in the client, since the resolver both
     * reads and writes D1 (`resolveLabelNames`, `src/db/labels.ts`). A name not yet in the
     * catalogue is created with `origin: 'inferred'` (migration 0011), the same treatment
     * `capabilities` gives a tag "registered on first use". Sent instead of `labels`, never
     * alongside it — the drawer is the one caller, and it only ever has names.
     */
    labelNames?: string[];
    dueAt?: string | null;
    archivedAt?: string | null;
    /** Cross-board project/milestone membership (migration 0013; Task 19). `null` clears it. */
    projectId?: string | null;
    milestoneId?: string | null;
    /** A precondition: the card's `updatedAt` as last read. A mismatch is a 409 `CARD_CHANGED`. */
    expectedUpdatedAt?: string | null;
  };
  if (body.expectedUpdatedAt !== undefined && body.expectedUpdatedAt !== null && typeof body.expectedUpdatedAt !== 'string') {
    return Response.json(
      { error: { code: 'INVALID_PRECONDITION', message: 'expectedUpdatedAt must be null or the card\'s updatedAt string' } },
      { status: 400 },
    );
  }
  if (body.ownerUserId !== undefined && (typeof body.ownerUserId !== 'string' || body.ownerUserId.trim() === '')) {
    return Response.json({ error: 'ownerUserId must be a non-empty user id' }, { status: 400 });
  }
  if (isInvalidDueAt(body.dueAt)) {
    return Response.json(
      { error: { code: 'INVALID_DUE_AT', message: 'dueAt must be null or a date in YYYY-MM-DD form' } },
      { status: 400 },
    );
  }
  if (
    body.archivedAt !== undefined &&
    body.archivedAt !== null &&
    (typeof body.archivedAt !== 'string' || Number.isNaN(Date.parse(body.archivedAt)))
  ) {
    return Response.json(
      { error: { code: 'INVALID_ARCHIVED_AT', message: 'archivedAt must be null or an ISO timestamp' } },
      { status: 400 },
    );
  }
  if (body.labelNames !== undefined) {
    if (!Array.isArray(body.labelNames) || body.labelNames.some((n) => typeof n !== 'string')) {
      return Response.json(
        { error: { code: 'INVALID_LABELS', message: 'labelNames must be an array of strings' } },
        { status: 400 },
      );
    }
    // Resolved BEFORE the unknown-id check below, so a freshly created id still passes it —
    // it was just inserted into the same tenant's catalogue this request resolved against.
    body.labels = await resolveLabelNames(env.DB, tenantId, body.labelNames, user?.userId ?? null);
  }

  // The DO does not validate label ids — it cannot reach D1 usefully on a hot path — so the
  // route checks here, before the write lands, that every id names a real label in this
  // workspace's catalogue.
  if (body.labels !== undefined) {
    // The type guard is not decoration. Without it, `labels: "urgent"` skips this whole check
    // and reaches `[...new Set(patch.labels)]` in the DO, where a string is iterable and spreads
    // into ['u','r','g','e','n','t'] — written to storage, no error raised. A plain object
    // throws an unhandled TypeError inside the DO instead. Neither answers 400.
    if (!Array.isArray(body.labels) || body.labels.some((l) => typeof l !== 'string')) {
      return Response.json(
        { error: { code: 'INVALID_LABELS', message: 'labels must be an array of label ids' } },
        { status: 400 },
      );
    }
    const unknown = await unknownLabelIds(env.DB, tenantId, body.labels);
    if (unknown.length > 0) {
      return Response.json(
        { error: { code: 'UNKNOWN_LABEL', message: `no such label in this workspace: ${unknown.join(', ')}` } },
        { status: 400 },
      );
    }
  }
  // Milestones are in D1; the DO cannot check that a milestone belongs to the project it is
  // attached under, so the route does — the same shape `labels` just took above. Unlike
  // labels, this is a RELATIONSHIP check, not an existence check: a `projectId` that no
  // longer resolves is a normal state here (see the long comment on `deleteProject` in
  // `db/projects.ts`), and nothing above refuses it. A `milestoneId`, though, is only ever
  // meaningful alongside the project it was created under.
  //
  // Checked whenever EITHER half of the pair could change, not only when `milestoneId` is in
  // the body — `PATCH { projectId: B }` on a card carrying `{ projectId: A, milestoneId: mA
  // }` changes the pair just as much as sending `milestoneId` would, and silently leaving
  // `mA` (project A's milestone) attached to a card now in project B is the same invariant
  // violation. Refused, not silently cleared: clearing would discard a commitment the caller
  // never asked to drop.
  if (body.milestoneId !== undefined || body.projectId !== undefined) {
    let effectiveMilestoneId = body.milestoneId;
    let effectiveProjectId = body.projectId;
    if (effectiveMilestoneId === undefined || effectiveProjectId === undefined) {
      const current = await stub.getCardView(cardMatch[1]);
      if (!current.ok) return Response.json({ error: current }, { status: statusForCode(current.code) });
      if (effectiveMilestoneId === undefined) effectiveMilestoneId = current.value.milestoneId;
      if (effectiveProjectId === undefined) effectiveProjectId = current.value.projectId;
    }
    if (effectiveMilestoneId) {
      const milestone = effectiveProjectId ? await milestoneById(env.DB, tenantId, effectiveMilestoneId) : null;
      if (!milestone || milestone.projectId !== effectiveProjectId) {
        return Response.json(
          {
            error: {
              code: 'MILESTONE_NOT_IN_PROJECT',
              message: "milestoneId does not belong to the card's project",
            },
          },
          { status: 400 },
        );
      }
    }
  }
  // Built from named fields rather than forwarding `body` whole: the cast above strips
  // nothing at runtime, so the route has to name what `updateCard` accepts rather than
  // forward what it received — `labelNames` is deliberately excluded here, since it was
  // already resolved into `body.labels` above and `updateCard`'s patch type has no field for
  // it at all.
  const result = await stub.updateCard(cardMatch[1], {
    title: body.title,
    spec: body.spec,
    priority: body.priority,
    ownerUserId: body.ownerUserId,
    labels: body.labels,
    dueAt: body.dueAt,
    archivedAt: body.archivedAt,
    projectId: body.projectId,
    milestoneId: body.milestoneId,
    expectedUpdatedAt: body.expectedUpdatedAt,
  });
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json({ card: result.value });
}

export async function cardDelete({ env, tenantId, stub }: BoardRequest, cardMatch: RegExpMatchArray): Promise<Response> {
  const result = await stub.deleteCard(cardMatch[1]);
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  // `deleteCard` cleans the DO's own same-board `card_links` in both directions, for a
  // reason that applies identically to Task 16's cross-board advisory store: a lingering
  // edge would point at a card that no longer exists. The DO cannot reach D1, so this is
  // that same cleanup's other half, run here once the DO has confirmed the card existed.
  await deleteExternalLinksForCard(env.DB, tenantId, cardMatch[1]);
  return new Response(null, { status: 204 });
}

// POST /v1/boards/:id/cards/:cardId/split — decompose a card into claimable children, one
// per (non-blank) line (Task 15, spec §3.4). A human/web route: the agent path reaches
// `splitCard` through `superpipeline_split_card` (scope `run`) instead, calling the same DO
// method directly — this route and that tool are the same contract on two wires.
export async function cardSplit({ request, user, stub }: BoardRequest, splitMatch: RegExpMatchArray): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { titles?: unknown } | null;
  if (!body || typeof body !== 'object') {
    return Response.json({ error: { message: 'Expected a JSON object.' } }, { status: 400 });
  }
  // Shape-checked here — the DO trusts its callers by design — so a malformed body answers
  // 400 rather than reaching `splitCard` and failing in a way that points at the wrong layer.
  if (!Array.isArray(body.titles) || body.titles.some((t) => typeof t !== 'string')) {
    return Response.json({ error: { message: '`titles` is required and must be an array of strings.' } }, { status: 400 });
  }
  const result = await stub.splitCard(splitMatch[1], body.titles as string[], user?.userId ?? 'usr_dev');
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json({ children: result.value.children }, { status: 201 });
}

// PUT /v1/boards/:id/cards/:cardId/references — idempotent reference upsert (docs/06 §1)
export async function cardReference({ request, env, tenantId, stub }: BoardRequest, refMatch: RegExpMatchArray): Promise<Response> {
  const body = (await request.json()) as {
    url: string;
    provider?: string;
    sourceType?: string;
    title?: string;
    subtitle?: string;
    externalId?: string;
    metadata?: Record<string, unknown>;
    addedBy?: 'agent' | 'user';
  };
  // Parsed, not cast. `ReferenceProvider` documented a constraint nothing imposed — the
  // routes cast request bodies — so `provider: "web"` reached a live card on 2026-09-28.
  // Checked HERE and nowhere else on this path, because this is the only door a caller
  // supplies a provider through.
  //
  // A WRITE rule only: rows written before this exists are read back untouched, and a read
  // that threw on them would turn a tightening into an outage.
  // oxlint-disable-next-line typescript/no-unnecessary-type-conversion -- the body is cast, not parsed: String() is the parse
  if (body.provider !== undefined && !isKnownProvider(String(body.provider))) {
    return Response.json(
      // oxlint-disable-next-line typescript/no-unnecessary-type-conversion -- the body is cast, not parsed: String() is the parse
      { error: `unknown reference provider: ${String(body.provider)}. Known: ${providerKeys().join(', ')}` },
      { status: 400 },
    );
  }

  // The tenant's forge host is read here rather than held in the DO: it is a workspace
  // fact, and a board that cached it would keep enriching against a host the workspace had
  // already changed.
  const refTenant = await tenantById(env.DB, tenantId);
  // Built from named fields rather than `{ cardId, ...body }`: the spread came AFTER the path
  // segment, and `resolveReferenceInput` reads `cardId` off its argument — so a body carrying
  // its own `cardId` won outright and the reference attached to a card the URL never named.
  // The cast above does not even declare `cardId`; it arrived as an extra key, because `as`
  // strips nothing at runtime. A cast is not validation, so the route has to name what it
  // accepts rather than forward what it received — the same lesson as the `provider: "web"`
  // incident this route's comment above already records.
  const result = await stub.addReference(
    resolveReferenceInput(
      {
        cardId: refMatch[1],
        url: body.url,
        provider: body.provider,
        sourceType: body.sourceType,
        title: body.title,
        subtitle: body.subtitle,
        externalId: body.externalId,
        metadata: body.metadata,
        addedBy: body.addedBy,
      },
      refTenant?.forgeHost ?? null,
    ),
  );
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json({ reference: result.value });
}

// GET /v1/boards/:id/cards/:cardId/attempts — attempts comparison (docs/07 §5)
export async function cardAttempts({ stub }: BoardRequest, attemptsMatch: RegExpMatchArray): Promise<Response> {
  return Response.json({ attempts: await stub.getAttempts(attemptsMatch[1]) });
}

// GET /v1/boards/:id/cards/:cardId/activities — session-replay timeline + handoff (docs/07 §4)
export async function cardActivities({ stub }: BoardRequest, cardActMatch: RegExpMatchArray): Promise<Response> {
  return Response.json(await stub.getCardActivities(cardActMatch[1]));
}

// GET /v1/boards/:id/cards/:cardId/estimate — pre-run cost estimate (docs/07 §6)
export async function cardEstimate({ stub }: BoardRequest, estimateMatch: RegExpMatchArray): Promise<Response> {
  const result = await stub.estimateCardCost(estimateMatch[1]);
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json(result.value);
}
