export type Row = Record<string, string | number | null>;
export interface FixtureBoard {
  meta: Record<string, string>;
  cards: Row[];
  runs: Row[];
  activities: Row[];
  events: Array<{ type: string; payload: unknown; ts: string }>;
  notifications: Array<{ kind: string; card_id: string; user_id: string; body: string; read: 0 | 1; created_at: string }>;
  gates: Row[];
  approvalSubjects: Array<Row & { canonical_bytes_b64: string }>;
  elicitations: Row[];
  references: Row[];
  links: Array<{ from_card_id: string; to_card_id: string; kind: string; created_at: string; created_by: string | null }>;
  comments: Row[];
}
export interface FixtureWorld {
  tenant: { id: string; slug: string; name: string; forgeHost: string | null; externalId: string | null; externalSource: string | null; createdAt: string };
  user: { id: string; email: string; name: string; createdAt: string };
  membership: { id: string; role: 'owner' | 'admin' | 'member' | 'viewer'; createdAt: string };
  boards: Array<{ id: string; name: string; stages: unknown[]; createdAt: string; updatedAt: string; createdBy: string }>;
  agents: Array<{ id: string; name: string; capabilities: string[]; externalId: string; ownerUserId: string; mayQueueTo: string[] | null; createdAt: string; tokens: number; role?: string | null }>;
  capabilities: Array<{ key: string; description: string | null; origin: 'declared' | 'inferred'; createdAt: string }>;
  implications: Array<{ from: string; to: string; createdAt: string }>;
  labels: Array<{ id: string; name: string; colour: string; origin: 'declared' | 'inferred'; createdAt: string }>;
  projects: Array<{ id: string; name: string; description: string | null; targetDate: string | null; state: string; health: string | null; leadUserId: string; createdAt: string }>;
  milestones: Array<{ id: string; projectId: string; name: string; targetDate: string | null; sortOrder: number; createdAt: string }>;
  externalLinks: Array<{ fromBoardId: string; fromCardId: string; toBoardId: string; toCardId: string; kind: 'blocks' | 'relates'; createdAt: string }>;
  dos: Record<string, FixtureBoard>;
}
