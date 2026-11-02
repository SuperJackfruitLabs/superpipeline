import { newId } from '../ids';
import type { JsonValue } from '../json';
import type { ReferenceInput } from '../references/input';
import type { BoardContext } from './context';
import type { Result, Row, RunVerbInput } from './model';
import type { ReferenceView } from './views';

/**
 * External references attached to a card (pull requests, issues, documents).
 */

/** What references needs from the rest of the board. */
export type ReferencesDeps = Pick<
  BoardContext,
  | 'addReference'
  | 'authorizeRun'
  | 'emit'
  | 'getCardRow'
  | 'getMeta'
  | 'now'
  | 'sql'
>;

/**
 * Idempotent upsert of a first-class reference, keyed on (cardId, url) (docs/06 §1).
 *
 * **Full-replace (PUT) semantics**: a re-add overwrites the mutable fields (title, subtitle,
 * provider, sourceType, externalId, metadata, syncState) with what's supplied — omitted optionals
 * become null. Callers (and the P5.2 sync worker) must send the complete current record. The
 * identity fields (id, created_at, added_by) are preserved across updates.
 *
 * Only `http(s)` urls are accepted: a reference url renders as an outbound link in the board UI,
 * so rejecting other schemes (`javascript:`, `data:`, …) at the write boundary forecloses stored
 * XSS and is the first slice of the §6 SSRF allowlist.
 */
/**
 * The run holder links something it produced (a SuperLibrary item) from its own card. The lease
 * and the claiming agent authorize it; the card is always the run's own, whatever the caller
 * named, and the reference is always the agent's.
 */
export async function addRunReference(deps: ReferencesDeps, input: RunVerbInput & { reference: ReferenceInput }): Promise<Result<ReferenceView>> {
  const auth = deps.authorizeRun(input);
  if (!auth.ok) return auth;
  return deps.addReference({ ...input.reference, cardId: auth.run.card_id as string, addedBy: 'agent' });
}

export async function addReference(deps: ReferencesDeps, input: ReferenceInput): Promise<Result<ReferenceView>> {
  if (!deps.getMeta('boardId')) {
    return { ok: false, code: 'NOT_INITIALIZED', message: 'board is not initialized' };
  }
  let scheme = '';
  try {
    scheme = new URL(input.url).protocol;
  } catch {
    scheme = '';
  }
  if (scheme !== 'http:' && scheme !== 'https:') {
    return { ok: false, code: 'INVALID_URL', message: `unsupported reference url scheme: ${input.url}` };
  }
  if (!deps.getCardRow(input.cardId)) {
    return { ok: false, code: 'CARD_NOT_FOUND', message: `card not found: ${input.cardId}` };
  }
  const now = deps.now();
  const metadataJson = input.metadata === undefined ? null : JSON.stringify(input.metadata);
  const existing = deps.sql
    .exec(`SELECT id FROM card_references WHERE card_id = ? AND url = ?`, input.cardId, input.url)
    .toArray()[0];

  if (existing) {
    const id = existing.id as string;
    deps.sql.exec(
      `UPDATE card_references
         SET title = ?, subtitle = ?, provider = ?, source_type = ?, external_id = ?,
             metadata_json = ?, sync_state = ?, last_synced_at = ?, updated_at = ?
       WHERE id = ?`,
      input.title ?? null,
      input.subtitle ?? null,
      input.provider,
      input.sourceType,
      input.externalId ?? null,
      metadataJson,
      input.syncState ?? 'synced',
      input.lastSyncedAt ?? null,
      now,
      id,
    );
    const ref = mustGetReference(deps, id);
    deps.emit('reference.updated', { reference: ref });
    return { ok: true, value: ref };
  }

  const id = newId('ref');
  deps.sql.exec(
    `INSERT INTO card_references
      (id, card_id, url, title, subtitle, provider, source_type, external_id, metadata_json, sync_state, last_synced_at, added_by, run_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.cardId,
    input.url,
    input.title ?? null,
    input.subtitle ?? null,
    input.provider,
    input.sourceType,
    input.externalId ?? null,
    metadataJson,
    input.syncState ?? 'synced',
    input.lastSyncedAt ?? null,
    input.addedBy ?? 'agent',
    input.runId ?? null,
    now,
  );
  const ref = mustGetReference(deps, id);
  deps.emit('reference.added', { reference: ref });
  return { ok: true, value: ref };
}

export function rowToReference(row: Row): ReferenceView {
  return {
    id: row.id as string,
    cardId: row.card_id as string,
    url: row.url as string,
    title: (row.title as string | null) ?? null,
    subtitle: (row.subtitle as string | null) ?? null,
    provider: row.provider as string,
    sourceType: row.source_type as string,
    externalId: (row.external_id as string | null) ?? null,
    metadata: row.metadata_json ? (JSON.parse(row.metadata_json as string) as JsonValue) : null,
    syncState: row.sync_state as 'synced' | 'stale' | 'error',
    lastSyncedAt: (row.last_synced_at as string | null) ?? null,
    addedBy: row.added_by as 'agent' | 'user',
    runId: (row.run_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string | null) ?? null,
  };
}

export function mustGetReference(deps: ReferencesDeps, id: string): ReferenceView {
  const row = deps.sql.exec(`SELECT * FROM card_references WHERE id = ?`, id).toArray()[0];
  if (!row) throw new Error(`invariant violation: reference ${id} missing immediately after write`);
  return rowToReference(row);
}

export function allReferences(deps: ReferencesDeps): ReferenceView[] {
  return deps.sql
    .exec(`SELECT * FROM card_references ORDER BY created_at ASC`)
    .toArray()
    .map((r) => rowToReference(r));
}
