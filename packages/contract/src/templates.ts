/**
 * Starting pipelines, shared by everything that can create a board.
 *
 * **Moved here from `apps/web/src/lib/api.ts` on 2026-09-20**, when `supi` learned to create
 * boards. Two clients that each carried their own copy would drift, and a template is exactly
 * the kind of thing that drifts invisibly: a stage renamed in one place still creates a board
 * in the other, just a different one.
 *
 * The web app, the CLI and anything else that speaks to `POST /v1/boards` read these.
 */

/**
 * A stage as it is **written into a create request**, which is not the same shape as a stage
 * that has been stored.
 *
 * `Stage` in `entities.ts` is the stored entity: `ownerKind` required, `gate` defaulted. This is
 * the input, where both are optional because the board normalises them on the way in
 * (`board-do.ts`'s `normalizeStageRouting`) — which is why `simple` below can list stages with
 * no `ownerKind` at all and still produce a working board.
 *
 * Kept as a separate type rather than loosening `Stage`: the strictness of the stored shape is
 * what lets every reader assume `ownerKind` is there.
 */
export interface BoardTemplateStage {
  key: string;
  name: string;
  order: number;
  gate?: 'none' | 'approval';
  wipLimit?: number;
  routing?: 'pipeline' | 'manager';
  ownerKind?: 'capability' | 'human';
  owner?: string;
  /**
   * A multi-capability requirement: `all` every member, `any` at least one. Wins over `owner`
   * when present. A sibling of `owner` rather than a widening of it, so a board written before
   * this existed reads back unchanged.
   */
  requires?: { all?: string[]; any?: string[] };
}

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  stages: BoardTemplateStage[];
}

/** The classic Kanban lanes, all human-owned. Also the `simple` template's stages. */
export const DEFAULT_STAGES: BoardTemplateStage[] = [
  { key: 'backlog', name: 'Backlog', order: 0 },
  { key: 'ready', name: 'Ready', order: 1 },
  { key: 'in-progress', name: 'In Progress', order: 2, wipLimit: 3 },
  { key: 'review', name: 'Review', order: 3, gate: 'approval' },
  { key: 'done', name: 'Done', order: 4 },
];

/**
 * **Rewritten 2026-09-03.** The templates that shipped asked for nine capabilities no agent in
 * any fleet held — `publish`, `test`, `deploy`, `triage`, `support`, `send`, `extract`,
 * `transform`, `load` — while the agent-creation UI offered three, of which two overlapped. That
 * gap is where the capability mismatch began: a board created from a template had lanes nothing
 * could ever claim, and nothing said so.
 *
 * These use a small vocabulary an operator can actually staff, and each names the capabilities it
 * needs so the mismatch is visible before the board exists rather than after. A stage whose
 * capability nobody holds is flagged in the dialog — a lane no agent can work is a real state,
 * not an error, but it should never be a surprise.
 */
export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'software',
    name: 'Software delivery',
    description: 'Plan, build, check, ship. Needs: planning, code, security.',
    stages: [
      { key: 'intake', name: 'Intake', order: 0, ownerKind: 'human' },
      { key: 'plan', name: 'Plan', order: 1, ownerKind: 'capability', owner: 'planning' },
      { key: 'build', name: 'Build', order: 2, ownerKind: 'capability', owner: 'code', wipLimit: 3 },
      { key: 'security-review', name: 'Security review', order: 3, ownerKind: 'capability', owner: 'security' },
      { key: 'sign-off', name: 'Sign-off', order: 4, ownerKind: 'human', gate: 'approval' },
      { key: 'shipped', name: 'Shipped', order: 5, ownerKind: 'human' },
    ],
  },
  {
    id: 'research-report',
    name: 'Research report',
    description: 'Question to written answer. Needs: research, analysis, writing.',
    stages: [
      { key: 'question', name: 'Question', order: 0, ownerKind: 'human' },
      { key: 'gather', name: 'Gather', order: 1, ownerKind: 'capability', owner: 'research' },
      { key: 'analyse', name: 'Analyse', order: 2, ownerKind: 'capability', owner: 'analysis' },
      { key: 'draft', name: 'Draft', order: 3, ownerKind: 'capability', owner: 'writing' },
      { key: 'review', name: 'Review', order: 4, ownerKind: 'human', gate: 'approval' },
      { key: 'published', name: 'Published', order: 5, ownerKind: 'human' },
    ],
  },
  {
    id: 'security',
    name: 'Security review',
    description: 'A finding, fixed and verified. Needs: security, code.',
    stages: [
      { key: 'reported', name: 'Reported', order: 0, ownerKind: 'human' },
      { key: 'assess', name: 'Assess', order: 1, ownerKind: 'capability', owner: 'security' },
      { key: 'fix', name: 'Fix', order: 2, ownerKind: 'capability', owner: 'code', wipLimit: 2 },
      { key: 'verify', name: 'Verify', order: 3, ownerKind: 'capability', owner: 'security' },
      { key: 'sign-off', name: 'Sign-off', order: 4, ownerKind: 'human', gate: 'approval' },
      { key: 'closed', name: 'Closed', order: 5, ownerKind: 'human' },
    ],
  },
  {
    id: 'onboarding',
    name: 'Onboarding',
    description: 'Bring someone or something up to working order. Needs: onboarding, writing.',
    stages: [
      { key: 'arrived', name: 'Arrived', order: 0, ownerKind: 'human' },
      { key: 'prepare', name: 'Prepare', order: 1, ownerKind: 'capability', owner: 'onboarding' },
      { key: 'document', name: 'Document', order: 2, ownerKind: 'capability', owner: 'writing' },
      { key: 'check', name: 'Check', order: 3, ownerKind: 'human', gate: 'approval' },
      { key: 'ready', name: 'Ready', order: 4, ownerKind: 'human' },
    ],
  },
  {
    id: 'simple',
    name: 'Simple board',
    description: 'A classic Kanban: Backlog → Ready → In Progress → Review → Done. All human lanes (you move the cards).',
    stages: DEFAULT_STAGES,
  },
];

/** A template by id, or null. Used by every client that offers `--template`. */
export function boardTemplate(id: string): BoardTemplate | null {
  return BOARD_TEMPLATES.find((t) => t.id === id) ?? null;
}
