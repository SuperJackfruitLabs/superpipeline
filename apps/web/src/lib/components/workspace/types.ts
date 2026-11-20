// apps/web/src/lib/components/workspace/types.ts
/**
 * The workspace panels outside Crew (Needs you, Labels, Connections) take these; only the dev review
 * route passes `review` (a tag above the panel and a note) and `initial` (the card id whose resume
 * form starts open, with `resumeText` in it).
 */
export interface WorkspaceTabProps { review?: { tag: string; note?: string }; initial?: { expandedResume?: string; resumeText?: string } }
