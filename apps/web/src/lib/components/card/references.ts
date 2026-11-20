// apps/web/src/lib/components/card/references.ts
/** What a reference is, in words. `refLabel`/`subStateLabel` moved here verbatim from CardDrawer. */
import type { Reference } from '$lib/api';

export const SUB_STATE_LABELS: Readonly<Record<string, string>> = {
  draft_pr_open: 'draft', pr_open: 'open', agent_iterating: 'iterating', awaiting_review: 'review', merged: 'merged',
  closed: 'closed', agent_working: 'working', issue_open: 'open', issue_closed: 'closed',
};

export function subStateLabel(ref: Reference): string | null {
  const s = ref.metadata?.subState;
  return typeof s === 'string' ? (SUB_STATE_LABELS[s] ?? s) : null;
}

export function refLabel(ref: Reference): string {
  if (ref.sourceType === 'pull_request') return `PR ${ref.externalId?.split('#')[1] ? `#${ref.externalId.split('#')[1]}` : ''}`.trim();
  if (ref.sourceType === 'issue') return `Issue ${ref.externalId?.split('#')[1] ? `#${ref.externalId.split('#')[1]}` : ''}`.trim();
  if (ref.sourceType === 'repo') return ref.externalId ?? 'repo';
  return ref.title ?? ref.sourceType;
}

/** "github · agentpod · inbound.ts lines 379–786" for a GitHub blob URL; else the host (D-24). */
export function referenceSource(ref: Pick<Reference, 'url'>): string {
  let u: URL;
  try {
    u = new URL(ref.url);
  } catch {
    return ref.url;
  }
  const blob = u.hostname === 'github.com' ? /^\/[^/]+\/([^/]+)\/blob\/[^/]+\/(.+)$/.exec(u.pathname) : null;
  if (!blob) return u.hostname;
  const file = blob[2].split('/').at(-1)!;
  const lines = /^#L(\d+)(?:-L(\d+))?$/.exec(u.hash);
  const where = !lines ? '' : lines[2] ? ` lines ${lines[1]}–${lines[2]}` : ` line ${lines[1]}`;
  return `github · ${blob[1]} · ${file}${where}`;
}

/** A produced document, as the card lists it: a title, where it lives, and the link that opens it (pinned to its version). */
export interface ArtifactRow { id: string; title: string; url: string; version: string | null; meta: string }

const versionValue = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return value;
  return null;
};
const PROVIDER: Readonly<Record<string, string>> = { superlibrary: 'SuperLibrary', github: 'GitHub' };

/** A Superlibrary item link is pinned to the version the run recorded; a malformed link stays as it was. */
export function artifactRow(reference: Reference): ArtifactRow {
  let url = reference.url;
  let version: string | null = null;
  try {
    const parsed = new URL(reference.url);
    const pinned = parsed.pathname.match(/^(\/a\/[^/]+)\/v\/([1-9]\d*)\/?$/);
    if (pinned?.[2]) version = pinned[2];
    else if (reference.provider === 'superlibrary') {
      const itemPath = parsed.pathname.match(/^(\/a\/[^/]+)\/?$/)?.[1];
      version = versionValue(reference.metadata?.version);
      if (itemPath && version) {
        parsed.pathname = `${itemPath}/v/${version}`;
        parsed.search = '';
        parsed.hash = '';
        url = parsed.toString();
      }
    }
  } catch {
    // Keep a malformed legacy link visible; the browser still has the original href.
  }
  const where = PROVIDER[reference.provider ?? ''] ?? referenceSource(reference);
  return {
    id: reference.id,
    title: reference.title?.trim() || reference.subtitle?.trim() || reference.url,
    url,
    version,
    meta: [version ? `version ${version}` : null, where].filter(Boolean).join(' · '),
  };
}
