import { approvalSubjectKind } from '../approval-subject-kinds';
import { boundedPreview, PREVIEW_TOTAL_BYTES, type PreviewBlock } from '../approval-subject-kinds/kind';
import type { BoardContext } from './context';
import type { GateVariant } from './gate-choice';
import { record } from './rules';
import type { ApprovalSubjectEnvelope, VariantSubjectsEnvelope } from './views';

/**
 * A subject as a decision envelope carries it, for a gate, its variants and the manual-delivery
 * follow-up, so the three cannot disagree on what a person was shown (charter: gate.v2 §3).
 */

type EnvelopeDeps = Pick<BoardContext, 'approvalSubjectView'>;

/** Said to a v1 client when the preview had to be cut, which it otherwise could not know. */
export const PREVIEW_SHORTENED_NOTE = 'This preview was shortened. Open the card to see everything before approving.';

/**
 * The preview's text blocks as one string, for a v1 client that draws only `handoffSummary`.
 * When the bounds cut anything the note says so: a v1 client cannot read `previewComplete`.
 */
export function previewSummary(blocks: PreviewBlock[], complete: boolean): string | null {
  const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n\n');
  if (text.length === 0) return complete ? null : PREVIEW_SHORTENED_NOTE;
  return complete ? text : `${text}\n\n${PREVIEW_SHORTENED_NOTE}`;
}

/**
 * A subject as a decision envelope carries it, or null when there is no such subject.
 *
 * The full canonical payload stays behind the authenticated route; only the kind's bounded
 * preview travels. `totalBytes` bounds the whole preview too (a variant's share of the budget).
 */
export function subjectEnvelope(deps: EnvelopeDeps, subjectId: string | null, totalBytes?: number): ApprovalSubjectEnvelope | null {
  const subject = subjectId ? deps.approvalSubjectView(subjectId) : null;
  if (!subject) return null;
  const kind = approvalSubjectKind(subject.schema);
  const canonical = record(subject.canonical);
  const timing = canonical ? record(canonical.timing) : null;
  // No kind or no readable payload means no preview at all, which is never complete.
  const bounded = kind && canonical ? boundedPreview(kind.preview(canonical), totalBytes) : { blocks: [], complete: false };
  return {
    id: subject.id,
    digest: subject.digest,
    schema: subject.schema,
    revision: subject.revision,
    expiresAt: timing && typeof timing.expiresAt === 'string' ? timing.expiresAt : null,
    preview: bounded.blocks,
    // False when the bounds cut or dropped anything: a client must then not offer an
    // approving option, because the person could not see everything they would approve.
    previewComplete: bounded.complete,
  };
}

/**
 * A variant gate's subject on the push (charter 2026-11-09, decisions 4 and 6): every variant with
 * its own envelope, each preview bounded to an equal share of the carrier's budget so no variant
 * is cut to make room for another, and no top-level `id` or `digest`. Null when a variant's subject
 * cannot be read, which never happens to a gate the board froze.
 */
export function variantsEnvelope(deps: EnvelopeDeps, variants: GateVariant[]): VariantSubjectsEnvelope | null {
  const share = Math.floor(PREVIEW_TOTAL_BYTES / Math.max(variants.length, 1));
  const out: VariantSubjectsEnvelope['variants'] = [];
  for (const v of variants) {
    const subject = subjectEnvelope(deps, v.subjectId, share);
    if (!subject) return null;
    out.push({ id: v.variantId, label: v.label, subject });
  }
  return { variants: out };
}

/**
 * What a v1 client shows for a variant gate: the choice, by label, and where to make it. It never
 * offers a subject approval (charter decision 6), so it is told to open the card.
 */
export function variantsSummary(variants: GateVariant[]): string {
  return `Choose one of ${variants.length} variants: ${variants.map((v) => `"${v.label}"`).join(', ')}. Open the card to see them before approving.`;
}
