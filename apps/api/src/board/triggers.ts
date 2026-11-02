import type { JsonValue } from '../json';
import { mapForgeEvent } from '../references/forge-events';
import { mapGithubEvent, type WebhookPayload } from '../references/github-events';
import { verifyForgeSignature, verifyGithubSignature } from '../references/github-signature';
import type { BoardContext } from './context';
import type { CardView, Result } from './model';
import type { ReferenceView } from './views';

/**
 * Cards that arrive from outside: GitHub and Forgejo webhooks, and the grant they queue with.
 */

/** What triggers needs from the rest of the board. */
export type TriggersDeps = Pick<
  BoardContext,
  | 'addReference'
  | 'createCard'
  | 'createCardFromTrigger'
  | 'emit'
  | 'getMeta'
  | 'mustGetReference'
  | 'now'
  | 'setMeta'
  | 'sql'
>;

/** Store/rotate this board's GitHub webhook secret (docs/06 §3, §6). */
export async function setForgeSecret(deps: TriggersDeps, secret: string): Promise<Result<{ configured: true }>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  // Its own secret, never the GitHub one. A board may legitimately receive from both — a repo
  // that is forge-primary and mirrored — and one shared secret would mean revoking either
  // side's access revokes the other's.
  deps.setMeta('forgeWebhookSecret', secret);
  return { ok: true, value: { configured: true } };
}

/**
 * An inbound Forgejo webhook.
 *
 * Deliberately parallel to `handleGithubWebhook` and deliberately not shared with it. The
 * dedupe table, the fail-closed delivery check and the reference update are identical; the
 * signature spelling and the event vocabulary are not, and those are exactly the parts that
 * fail silently when assumed (Forgejo sends `synchronized`, GitHub `synchronize`).
 *
 * Deliveries share one table with GitHub's on purpose: a delivery id is a delivery id, and a
 * board receiving from a forge-primary repository AND its GitHub mirror should not process the
 * same underlying change twice because the two arrived by different doors.
 */
export async function handleForgeWebhook(deps: TriggersDeps, input: {
  rawBody: string;
  signature: string | null;
  deliveryId: string | null;
  event: string;
}): Promise<Result<{ deduped: boolean; matched: number; modeled: boolean }>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  const secret = deps.getMeta('forgeWebhookSecret');
  if (!secret) {
    return { ok: false, code: 'NOT_CONFIGURED', message: 'no forge webhook secret configured for this board' };
  }
  if (!(await verifyForgeSignature(secret, input.rawBody, input.signature))) {
    return { ok: false, code: 'INVALID_SIGNATURE', message: 'invalid X-Forgejo-Signature' };
  }
  // Fail closed, for the reason the GitHub path gives: a missing delivery id would silently
  // disable replay protection. Recorded only after the signature verifies, so an unverified
  // request can never poison the table.
  if (!input.deliveryId) {
    return { ok: false, code: 'INVALID_DELIVERY', message: 'missing X-Forgejo-Delivery' };
  }
  const seen = deps.sql.exec(`SELECT 1 FROM webhook_deliveries WHERE delivery_id = ?`, input.deliveryId).toArray()[0];
  if (seen) return { ok: true, value: { deduped: true, matched: 0, modeled: false } };
  deps.sql.exec(`INSERT INTO webhook_deliveries (delivery_id, received_at) VALUES (?, ?)`, input.deliveryId, deps.now());

  let payload: unknown;
  try {
    const raw = input.rawBody;
    const jsonText = raw.startsWith('payload=') ? (new URLSearchParams(raw).get('payload') ?? raw) : raw;
    payload = JSON.parse(jsonText);
  } catch {
    return { ok: true, value: { deduped: false, matched: 0, modeled: false } };
  }

  const mapped = mapForgeEvent(input.event, payload);
  if (!mapped) return { ok: true, value: { deduped: false, matched: 0, modeled: false } };

  const now = deps.now();
  // Matched by provider AS WELL AS external_id. `externalId` is `owner/repo#n` for GitHub and
  // for forge alike, and a push mirror mirrors git refs — not pull requests — so a forge PR #7
  // and a GitHub PR #7 on a mirrored repository are DIFFERENT objects sharing an id. Without the
  // provider, a delivery from one writes its state onto the other's reference: a wrong
  // enrichment, which is harder to notice than a missing one.
  const rows = deps.sql
    .exec(`SELECT * FROM card_references WHERE external_id = ? AND provider = 'forge'`, mapped.externalId)
    .toArray();
  for (const row of rows) {
    const current = (row.metadata_json ? JSON.parse(row.metadata_json as string) : {}) as Record<string, unknown>;
    const merged = { ...current, ...mapped.metadata, subState: mapped.subState };
    deps.sql.exec(
      `UPDATE card_references SET metadata_json = ?, sync_state = 'synced', last_synced_at = ?, updated_at = ? WHERE id = ?`,
      JSON.stringify(merged),
      now,
      now,
      row.id,
    );
    deps.emit('reference.updated', { reference: deps.mustGetReference(row.id as string) });
  }
  return { ok: true, value: { deduped: false, matched: rows.length, modeled: true } };
}

export async function setGithubSecret(deps: TriggersDeps, secret: string): Promise<Result<{ configured: true }>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  deps.setMeta('githubWebhookSecret', secret);
  return { ok: true, value: { configured: true } };
}

/** Configure GitHub integration: webhook secret + whether opened issues auto-create cards (docs/05 §6). */
export async function setGithubConfig(deps: TriggersDeps, input: {
  secret?: string;
  issueTrigger?: boolean;
  /** See `triggerGrant()` — the standing authority for cards nobody is present to queue. */
  triggerGrant?: string[] | null;
}): Promise<Result<{ ok: true }>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  if (input.secret !== undefined) deps.setMeta('githubWebhookSecret', input.secret);
  if (input.issueTrigger !== undefined) deps.setMeta('githubIssueTrigger', input.issueTrigger ? '1' : '0');
  if (input.triggerGrant !== undefined) setTriggerGrant(deps, input.triggerGrant);
  return { ok: true, value: { ok: true } };
}

/**
 * The authority a card gets when nobody is present to carry one.
 *
 * Every other queueing path has a live human on the request, so the grant that
 * accompanies the act is read off their token. A GitHub webhook has none: the
 * person who wired the repository to this board is long gone by the time an
 * issue is opened. That wiring IS the act of authorising automated dispatch,
 * so the grant is captured then and stored here — the same answer, written
 * down while it was still askable, which is the whole shape of the control
 * pair (charter decisions/2026-08-13-ecosystem-identity.md, Decision 4).
 *
 * `null` stays an ordinary answer. A standalone board whose operator never
 * held a hub token records nothing, and under enforcement its trigger-born
 * cards park in `input-required` and say why — which is the honest outcome,
 * and is what the audit found happening silently to every such card.
 */
export function triggerGrant(deps: TriggersDeps): string[] | null {
  const raw = deps.getMeta('triggerGrant');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

function setTriggerGrant(deps: TriggersDeps, grant: string[] | null): void {
  // Cleared by deleting the row rather than storing "null": `getMeta` answers
  // null for an absent key, so an absent row and a cleared grant read the same
  // — one state, not two that a later reader has to tell apart.
  if (grant === null) deps.sql.exec(`DELETE FROM meta WHERE k = ?`, 'triggerGrant');
  else deps.setMeta('triggerGrant', JSON.stringify(grant));
}

/**
 * Ingest a GitHub webhook (docs/06 §3): verify the HMAC signature over the raw body, dedup on the
 * delivery id, then apply the draft-PR sub-state machine to every reference matching the event's
 * externalId. Verification + dedup + mutation are co-located here because the DO owns both the
 * board's secret and the references.
 */
export async function handleGithubWebhook(deps: TriggersDeps, input: {
  rawBody: string;
  signature: string | null;
  deliveryId: string | null;
  event: string;
}): Promise<Result<{ deduped: boolean; matched: number; modeled: boolean }>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  const secret = deps.getMeta('githubWebhookSecret');
  if (!secret) {
    return { ok: false, code: 'NOT_CONFIGURED', message: 'no github webhook secret configured for this board' };
  }
  if (!(await verifyGithubSignature(secret, input.rawBody, input.signature))) {
    return { ok: false, code: 'INVALID_SIGNATURE', message: 'invalid X-Hub-Signature-256' };
  }
  // Fail closed: GitHub always sends X-GitHub-Delivery, so a missing one means replay protection
  // would be silently disabled — reject rather than accept-without-dedup. (Dedup is recorded only
  // after signature verification, so an unverified request can never poison this table.)
  if (!input.deliveryId) {
    return { ok: false, code: 'INVALID_DELIVERY', message: 'missing X-GitHub-Delivery' };
  }
  const seen = deps.sql.exec(`SELECT 1 FROM webhook_deliveries WHERE delivery_id = ?`, input.deliveryId).toArray()[0];
  if (seen) return { ok: true, value: { deduped: true, matched: 0, modeled: false } };
  deps.sql.exec(`INSERT INTO webhook_deliveries (delivery_id, received_at) VALUES (?, ?)`, input.deliveryId, deps.now());

  let payload: unknown;
  try {
    // Accept both webhook content types. GitHub's default (application/x-www-form-urlencoded) sends
    // `payload=<url-encoded json>`; application/json sends the raw JSON. The signature was already
    // verified over the raw body above, so unwrapping the form encoding here is safe.
    const raw = input.rawBody;
    const jsonText = raw.startsWith('payload=') ? (new URLSearchParams(raw).get('payload') ?? raw) : raw;
    payload = JSON.parse(jsonText);
  } catch {
    return { ok: true, value: { deduped: false, matched: 0, modeled: false } };
  }

  // Inbound trigger (docs/05 §6): an opened issue auto-creates a card when enabled for this board.
  const p = payload as WebhookPayload;
  if (input.event === 'issues' && p.action === 'opened' && deps.getMeta('githubIssueTrigger') === '1') {
    const issue = p.issue;
    const fullName = p.repository?.full_name;
    if (issue && typeof issue.number === 'number' && fullName) {
      const externalId = `${fullName.toLowerCase()}#${issue.number}`;
      // Idempotency: don't create a second card if one already references this issue (a redelivery
      // with a fresh delivery-id, or a re-opened issue, would otherwise duplicate).
      // Provider-qualified for the same reason the matchers are: a forge issue #12 must not
      // suppress the card a GitHub issue #12 should have created.
      const exists = deps.sql
        .exec(`SELECT 1 FROM card_references WHERE external_id = ? AND provider = 'github' LIMIT 1`, externalId)
        .toArray()[0];
      if (!exists) {
        await deps.createCardFromTrigger({
          title: (issue.title as string) ?? `Issue #${issue.number}`,
          ownerUserId: 'usr_github',
          source: { url: issue.html_url as string, provider: 'github', sourceType: 'issue', externalId },
        });
      }
    }
  }

  const mapped = mapGithubEvent(input.event, payload);
  if (!mapped) return { ok: true, value: { deduped: false, matched: 0, modeled: false } };

  const now = deps.now();
  // Matched by provider AS WELL AS external_id. `externalId` is `owner/repo#n` for GitHub and
  // for forge alike, and a push mirror mirrors git refs — not pull requests — so a forge PR #7
  // and a GitHub PR #7 on a mirrored repository are DIFFERENT objects sharing an id. Without the
  // provider, a delivery from one writes its state onto the other's reference: a wrong
  // enrichment, which is harder to notice than a missing one.
  const rows = deps.sql
    .exec(`SELECT * FROM card_references WHERE external_id = ? AND provider = 'github'`, mapped.externalId)
    .toArray();
  for (const row of rows) {
    const current = (row.metadata_json ? JSON.parse(row.metadata_json as string) : {}) as Record<string, unknown>;
    const merged = { ...current, ...mapped.metadata, subState: mapped.subState };
    deps.sql.exec(
      `UPDATE card_references SET metadata_json = ?, sync_state = 'synced', last_synced_at = ?, updated_at = ? WHERE id = ?`,
      JSON.stringify(merged),
      now,
      now,
      row.id,
    );
    deps.emit('reference.updated', { reference: deps.mustGetReference(row.id as string) });
  }
  // `modeled: true` with `matched: 0` means "a known event for a PR/issue no card references yet"
  // — distinct from an unmodeled event or a parse miss (both `modeled: false`).
  return { ok: true, value: { deduped: false, matched: rows.length, modeled: true } };
}

/**
 * The one inbound-trigger path (docs/05 §6): every source (API, GitHub issue, Slack, schedule)
 * funnels here — create a card and attach the originating resource as a provenance reference.
 */
export async function createCardFromTrigger(deps: TriggersDeps, input: {
  title: string;
  ownerUserId: string;
  spec?: JsonValue;
  /**
   * The authority the caller carried, when there was a caller. A live human on
   * `POST /v1/boards/:id/triggers` has one; a GitHub webhook does not, and
   * falls back to the board's standing grant below.
   */
  queuedGrant?: string[] | null;
  source?: { url: string; provider?: string; sourceType?: string; externalId?: string; title?: string; metadata?: JsonValue };
}): Promise<Result<{ card: CardView; reference: ReferenceView | null; referenceError?: string }>> {
  const created = await deps.createCard({
    title: input.title,
    ownerUserId: input.ownerUserId,
    spec: input.spec,
    // Without this the automation path produced cards that could never be
    // claimed under enforcement — created, visible on the board, and parked on
    // first claim forever, on the one path with no human watching.
    queuedGrant: input.queuedGrant ?? triggerGrant(deps),
  });
  if (!created.ok) return { ok: false, code: created.code, message: created.message };
  let reference: ReferenceView | null = null;
  let referenceError: string | undefined;
  if (input.source) {
    const ref = await deps.addReference({
      cardId: created.value.id,
      url: input.source.url,
      provider: input.source.provider ?? 'url',
      sourceType: input.source.sourceType ?? 'url',
      externalId: input.source.externalId,
      title: input.source.title,
      metadata: input.source.metadata,
      addedBy: 'agent',
    });
    // The card is created either way; surface a dropped reference (e.g. a bad source url) so the
    // caller knows provenance was not attached, rather than silently returning an unprovenanced card.
    if (ref.ok) reference = ref.value;
    else referenceError = ref.code;
  }
  return { ok: true, value: { card: created.value, reference, ...(referenceError ? { referenceError } : {}) } };
}
