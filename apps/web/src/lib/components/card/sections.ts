// apps/web/src/lib/components/card/sections.ts
/**
 * The card's one composition (composition contract §7 "Card", §11.3): eight blocks in this order on
 * every surface, and where each of the old 23 sections now lives. An element drawn for an old
 * section carries `data-section="<key>"` (an empty one is a hidden marker), and each block carries
 * `data-block="<block>"`; `card-view.svelte.test.ts` holds the view to every key once, in its block.
 */
export const CARD_SECTION_KEYS = [
  'error', 'status', 'facts', 'editButton', 'editForm', 'description', 'delivery', 'resume', 'plan', 'criteria',
  'details', 'project', 'links', 'subtasks', 'activity', 'decisions', 'comments', 'handoff', 'cost', 'attempts',
  'related', 'references', 'cardActions',
] as const;
export type CardSectionKey = (typeof CARD_SECTION_KEYS)[number];

export const CARD_BLOCKS = ['head', 'track', 'state', 'facts', 'brief', 'produced', 'history', 'raw'] as const;
export type CardBlock = (typeof CARD_BLOCKS)[number];

/**
 * §11.3: the state sentence keeps its action (and the panels that replace it); facts take project,
 * sub-tasks, cost, links and references; "Conversation and history" takes attempts, handoff,
 * delivery, related work, comments and the decisions; the brief keeps its details and plan; what
 * the last attempt produced keeps the acceptance criteria. Nothing is dropped.
 */
export const FOLDED: Record<CardSectionKey, CardBlock> = {
  editButton: 'head', editForm: 'head', error: 'head',
  status: 'state', resume: 'state', cardActions: 'state',
  facts: 'facts', project: 'facts', subtasks: 'facts', cost: 'facts', links: 'facts', references: 'facts',
  description: 'brief', details: 'brief', plan: 'brief',
  criteria: 'produced',
  activity: 'history', attempts: 'history', handoff: 'history', delivery: 'history', related: 'history', comments: 'history', decisions: 'history',
};

