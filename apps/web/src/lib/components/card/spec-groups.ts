// apps/web/src/lib/components/card/spec-groups.ts
/**
 * A card's brief, grouped (D-21, D-22, D-26). Rows come from `spec.groups` when the card names its
 * groups, else everything goes under "Other details". Labels: `humanizeKey` (split camelCase,
 * first word capitalised, the rest lower case) unless the card's `spec.fieldLabels` names the key
 * (keys whose label is not mechanical). A long value is stored as its first paragraph and
 * a continuation; the surface shows the first paragraph and "Show more" iff more paragraphs exist.
 */
import { humaniseKey, isEmptyValue, isPlainObject } from './spec-details';

/** Labels come from the card itself (`spec.fieldLabels`), so no person's or agent's name is shipped here. */
export const humanizeKey = (key: string, fieldLabels?: Readonly<Record<string, string>>): string => fieldLabels?.[key] ?? humaniseKey(key);

/** Keys the card surfaces render elsewhere (description, criteria, plan, labels, due, project) or are structure. */
export const SPEC_OWNED_KEYS: ReadonlySet<string> = new Set(['description', 'acceptanceCriteria', 'labels', 'due', 'plan', 'groups', 'project', 'fieldLabels']);

export type SpecValue =
  | { kind: 'text'; shown: string; more: string | null }
  | { kind: 'evidence'; text: string }
  | { kind: 'matrix'; matrixId: string; cardId: string }
  | { kind: 'repo'; repo: string; visibility: string; policyUrl: string | null }
  | { kind: 'structured'; value: unknown };
export interface SpecRow { key: string; label: string; value: SpecValue }
export interface SpecGroup { label: string; rows: SpecRow[] }

export function firstParagraph(s: string): { shown: string; more: string | null } {
  const paras = s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return { shown: paras[0] ?? '', more: paras.length > 1 ? paras.slice(1).join('\n\n') : null };
}

function specValue(v: unknown, criteria: unknown, heading: string): SpecValue {
  if (Array.isArray(v) && Array.isArray(criteria) && JSON.stringify(v) === JSON.stringify(criteria)) {
    return { kind: 'evidence', text: `${v.length} items, listed under ${heading}.` };
  }
  if (typeof v === 'string') return { kind: 'text', ...firstParagraph(v) };
  if (isPlainObject(v) && typeof v.matrixId === 'string' && typeof v.card === 'string') return { kind: 'matrix', matrixId: v.matrixId, cardId: v.card };
  if (isPlainObject(v) && typeof v.repo === 'string' && typeof v.visibility === 'string') {
    return { kind: 'repo', repo: v.repo, visibility: v.visibility, policyUrl: typeof v.policyUrl === 'string' ? v.policyUrl : null };
  }
  return { kind: 'structured', value: v };
}

export function specGroups(spec: Record<string, unknown> | null | undefined, opts: { criteriaHeading: string }): SpecGroup[] {
  if (!spec) return [];
  const usable = (k: string) => !SPEC_OWNED_KEYS.has(k) && k in spec && !isEmptyValue(spec[k]);
  const row = (k: string): SpecRow => ({ key: k, label: humanizeKey(k, (spec.fieldLabels ?? undefined) as Record<string, string> | undefined), value: specValue(spec[k], spec.acceptanceCriteria, opts.criteriaHeading) });
  const declared = Array.isArray(spec.groups)
    ? (spec.groups as Array<{ label?: unknown; keys?: unknown }>).filter((g) => typeof g.label === 'string' && Array.isArray(g.keys))
    : [];
  const placed = new Set<string>();
  const out: SpecGroup[] = [];
  for (const g of declared) {
    const keys = (g.keys as unknown[]).filter((k): k is string => typeof k === 'string' && usable(k));
    keys.forEach((k) => placed.add(k));
    if (keys.length) out.push({ label: g.label as string, rows: keys.map(row) });
  }
  const rest = Object.keys(spec).filter((k) => usable(k) && !placed.has(k));
  if (rest.length) out.push({ label: 'Other details', rows: rest.map(row) });
  return out;
}

export const specRowCount = (groups: SpecGroup[]): number => groups.reduce((n, g) => n + g.rows.length, 0);
