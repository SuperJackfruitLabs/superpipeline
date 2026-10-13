// apps/web/e2e/pixel/fixture/snapshots.ts — read bulky fields (spec, queuedGrant, references, stages) from the scrubbed captures.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export interface SnapshotCard { id: string; title: string; spec: unknown; queuedGrant: string[] | null; contextId: string; createdAt: string }
export interface SnapshotRef { id: string; cardId: string; url: string; title: string | null; subtitle: string | null; provider: string; sourceType: string; externalId: string | null; metadata: unknown; syncState: string; lastSyncedAt: string | null; addedBy: string; runId: string | null; createdAt: string; updatedAt: string | null }
export interface Snapshot { boardId: string; name: string; stages: Array<Record<string, unknown>>; cards: SnapshotCard[]; references: SnapshotRef[] }

const cache = new Map<string, Snapshot>();
export function snapshot(boardId: string): Snapshot {
  let s = cache.get(boardId);
  if (!s) { s = JSON.parse(readFileSync(join(HERE, 'source', `after_${boardId}.json`), 'utf8')) as Snapshot; cache.set(boardId, s); }
  return s;
}
export function snapshotCard(boardId: string, productionId: string): SnapshotCard {
  const c = snapshot(boardId).cards.find((x) => x.id === productionId);
  if (!c) throw new Error(`snapshot ${boardId} has no card ${productionId}`);
  return c;
}
/** Reference rows for one card, re-keyed to the fixture card id, as DO `card_references` rows. */
export function snapshotRefs(boardId: string, productionId: string, fixtureId: string): Array<Record<string, string | null>> {
  return snapshot(boardId).references.filter((r) => r.cardId === productionId).map((r) => ({
    id: r.id, card_id: fixtureId, url: r.url, title: r.title, subtitle: r.subtitle, provider: r.provider, source_type: r.sourceType,
    external_id: r.externalId, metadata_json: r.metadata == null ? null : JSON.stringify(r.metadata), sync_state: r.syncState,
    last_synced_at: r.lastSyncedAt, added_by: r.addedBy, created_at: r.createdAt, updated_at: r.updatedAt, run_id: r.runId,
  }));
}
