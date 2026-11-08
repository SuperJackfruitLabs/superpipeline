import { z } from 'zod';
import { boundedPreview, record, type PreviewBlock } from '../approval-subject-kinds/kind';
import type { JsonValue } from '../json';
import type { GateOption, OptionScope } from './gate-option';
import type { ApprovalDetail, StrictDecision } from './strict-decision';
import type { ApprovalSubjectEnvelope, GateOptionMeaning } from './views';

/**
 * A question's subject: the exact thing an approving answer approves (charter: decisions/
 * 2026-11-07-strict-decisions-and-permissions-bind-their-subject.md).
 *
 * Two kinds reach a question. A strict decision's `salaam-operation/v1` subject is built here from
 * the offer the board stored. A board-dispatched harness permission's `harness-permission/v1`
 * subject is the poster's own, validated and bounded here. Either way the digest is opaque: it is
 * compared byte for byte and never computed.
 */

export const SALAAM_OPERATION_SCHEMA = 'salaam-operation/v1';
export const HARNESS_PERMISSION_SCHEMA = 'harness-permission/v1';

const MEANINGS: ReadonlySet<unknown> = new Set<GateOptionMeaning>(['approve', 'reject', 'choose', 'revise', 'defer']);
const SCOPES: ReadonlySet<unknown> = new Set<OptionScope>(['once', 'run', 'always']);

export function isOptionMeaning(v: unknown): v is GateOptionMeaning {
  return MEANINGS.has(v);
}

export function isOptionScope(v: unknown): v is OptionScope {
  return SCOPES.has(v);
}

/**
 * The longest string a poster's preview block may carry before the wire bounds cut it. Past the
 * wire's own bounds a block is cut and the preview marked incomplete; past this one the post is
 * refused, so a subject cannot turn the board into a document store either.
 */
const POSTED_STRING_MAX = 16_000;
const POSTED_BLOCKS_MAX = 64;
const posted = z.string().max(POSTED_STRING_MAX);
const PostedBlock = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), label: posted.optional(), text: posted }).strict(),
  z.object({ type: z.literal('field'), label: posted, value: posted }).strict(),
  z.object({ type: z.literal('link'), label: posted, url: posted }).strict(),
]);

/** A poster's subject, in the charter's own spelling (gate.v2 §3). */
export const PosterSubject = z.object({
  schema: z.literal(HARNESS_PERMISSION_SCHEMA),
  id: z.string().min(1).max(256),
  digest: z.string().min(1).max(256),
  revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  expires_at: z.iso.datetime({ offset: true }),
  preview: z.array(PostedBlock).max(POSTED_BLOCKS_MAX),
  preview_complete: z.boolean(),
}).strict();
export type PosterSubject = z.infer<typeof PosterSubject>;

/** Why an ordinary question's post is refused, or null. A strict decision is checked elsewhere. */
export function questionPostError(parameter: JsonValue | null | undefined, options: GateOption[]): { code: 'INVALID_ELICITATION' | 'INVALID_APPROVAL_SUBJECT'; message: string } | null {
  const offered = record(parameter);
  const rawOptions = Array.isArray(parameter) ? parameter : Array.isArray(offered?.options) ? offered.options : [];
  for (const raw of rawOptions) {
    const o = record(raw);
    if (!o) continue;
    if ('meaning' in o && !isOptionMeaning(o.meaning)) return { code: 'INVALID_ELICITATION', message: 'an option meaning is one of approve, reject, choose, revise or defer' };
    if ('scope' in o && !isOptionScope(o.scope)) return { code: 'INVALID_ELICITATION', message: 'an option scope is one of once, run or always' };
  }
  if (!offered || !('subject' in offered)) return null;
  if (!PosterSubject.safeParse(offered.subject).success) {
    return { code: 'INVALID_APPROVAL_SUBJECT', message: `a question's subject is a well-formed ${HARNESS_PERMISSION_SCHEMA} subject` };
  }
  // A binding is enforced on approving options, so every option must say whether it approves.
  if (options.length === 0 || options.some((o) => o.meaning === undefined)) {
    return { code: 'INVALID_ELICITATION', message: 'a question with a subject says what every option means' };
  }
  return null;
}

/** The poster's subject on a question's `parameter`, already checked by `questionPostError`. */
export function posterSubject(parameter: JsonValue | null | undefined): PosterSubject | null {
  const offered = record(parameter);
  if (!offered || !('subject' in offered)) return null;
  const parsed = PosterSubject.safeParse(offered.subject);
  return parsed.success ? parsed.data : null;
}

/** A poster's subject as the push carries it: bounded, and complete only if the poster said so too. */
export function posterSubjectEnvelope(subject: PosterSubject): ApprovalSubjectEnvelope {
  const bounded = boundedPreview(subject.preview);
  return {
    id: subject.id,
    digest: subject.digest,
    schema: subject.schema,
    revision: subject.revision,
    expiresAt: subject.expires_at,
    preview: bounded.blocks,
    previewComplete: subject.preview_complete && bounded.complete,
  };
}

/** What a strict decision's offer said about one file. */
type DetailFile = ApprovalDetail['files'][number];

/**
 * Whether a person could not see all of a file. Said outright by `preview_truncated`; inferred for
 * an offer made before that flag existed: a file larger than its preview, or an unshown create or
 * edit. A delete shows nothing and hides nothing.
 */
function fileCut(file: DetailFile): boolean {
  if (file.preview_truncated !== undefined) return file.preview_truncated;
  if (file.preview === null) return file.change !== 'delete';
  return file.bytes !== null && file.bytes > file.preview.length;
}

function fileLine(file: DetailFile): string {
  return [file.path, file.change, ...(file.bytes === null ? [] : [`${file.bytes} bytes`])].join(' · ');
}

/**
 * A strict decision's subject (charter §3): the approval's identity on the board (the offer's
 * request id), the decision digest, revision 1 (a changed operation is a new offer, never a
 * revision), the offer's expiry, and the stored detail as a preview.
 */
export function strictSubjectEnvelope(binding: StrictDecision, detail: ApprovalDetail | undefined): ApprovalSubjectEnvelope {
  const blocks: PreviewBlock[] = [];
  if (detail) {
    blocks.push({ type: 'text', text: detail.summary });
    if (detail.reason !== null) blocks.push({ type: 'text', label: 'Reason', text: detail.reason });
    for (const f of detail.files) {
      blocks.push({ type: 'field', label: 'File', value: fileLine(f) });
      if (f.preview !== null) blocks.push({ type: 'text', text: f.preview });
    }
  }
  const bounded = boundedPreview(blocks);
  return {
    id: binding.request_id,
    digest: binding.decision_digest,
    schema: SALAAM_OPERATION_SCHEMA,
    revision: 1,
    expiresAt: new Date(binding.expires_at).toISOString(),
    preview: bounded.blocks,
    // No detail is never complete (an empty preview never is), nor is any cut file.
    previewComplete: bounded.complete && !(detail?.files ?? []).some(fileCut),
  };
}

/**
 * What an option means. A strict decision offers only approving options and `deny`
 * (`postStrictDecision` refuses anything else), so its `deny` rejects and every other option
 * approves. Otherwise the poster's meaning, and a choice when it gave none.
 */
export function questionOptionMeaning(option: GateOption, strict: boolean): GateOptionMeaning {
  if (strict) return option.name === 'deny' ? 'reject' : 'approve';
  return option.meaning ?? 'choose';
}

/** How far an option reaches: fixed by name on a strict decision, the poster's word otherwise. */
export function questionOptionScope(option: GateOption, strict: boolean): OptionScope | undefined {
  if (!strict) return option.scope;
  if (option.name === 'approve-run') return 'run';
  if (option.name === 'always') return 'always';
  return 'once';
}

/**
 * Why an answer does not bind the question's subject, or null (charter §4). An expired subject
 * takes no answer. A binding, when given, must match byte for byte; an approving answer must
 * give one. A rejecting answer may come without.
 */
export function subjectAnswerError(
  subject: ApprovalSubjectEnvelope,
  meaning: GateOptionMeaning,
  binding: { id: string; digest: string } | undefined,
  nowMs: number,
): { code: 'DECISION_EXPIRED' | 'APPROVAL_SUBJECT_MISMATCH'; message: string } | null {
  if (subject.expiresAt !== null && Date.parse(subject.expiresAt) <= nowMs) return { code: 'DECISION_EXPIRED', message: 'decision deadline expired' };
  if (binding && (binding.id !== subject.id || binding.digest !== subject.digest)) {
    return { code: 'APPROVAL_SUBJECT_MISMATCH', message: 'this answer is bound to a different subject than the one waiting' };
  }
  if (!binding && meaning === 'approve') {
    return { code: 'APPROVAL_SUBJECT_MISMATCH', message: 'an approving answer must carry the subject it approves (id and digest)' };
  }
  return null;
}
