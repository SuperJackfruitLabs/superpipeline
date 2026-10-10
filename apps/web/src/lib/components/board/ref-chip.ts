import type { Reference } from '$lib/api';

/** Reference chip helpers, shared by every board layout. */
export const SUB_STATE_LABELS: Record<string, string> = {
  draft_pr_open: 'draft',
  pr_open: 'open',
  agent_iterating: 'iterating',
  awaiting_review: 'review',
  merged: 'merged',
  closed: 'closed',
  agent_working: 'working',
  issue_open: 'open',
  issue_closed: 'closed',
};

export function subStateLabel(ref: Reference): string | null {
  const s = ref.metadata?.subState;
  return typeof s === 'string' ? (SUB_STATE_LABELS[s] ?? s) : null;
}

export function refLabel(ref: Reference): string {
  if (ref.sourceType === 'pull_request') {
    const num = ref.externalId?.split('#')[1];
    return `PR${num ? ` #${num}` : ''}`.trim();
  }
  if (ref.sourceType === 'issue') {
    const num = ref.externalId?.split('#')[1];
    return `Issue${num ? ` #${num}` : ''}`.trim();
  }
  if (ref.sourceType === 'repo') return ref.externalId ?? 'repo';
  return ref.title ?? ref.sourceType;
}

export function subStateClass(sub: string): string {
  if (sub === 'draft' || sub === 'draft_pr_open') return 'refchip-st refchip-st-draft';
  if (sub === 'open' || sub === 'ready' || sub === 'review' || sub === 'iterating' || sub === 'working') return 'refchip-st refchip-st-ready';
  if (sub === 'merged') return 'refchip-st refchip-st-merged';
  return 'refchip-st refchip-st-draft';
}

export function safeHref(url: string): string | null {
  return /^https?:\/\//i.test(url) ? url : null;
}
