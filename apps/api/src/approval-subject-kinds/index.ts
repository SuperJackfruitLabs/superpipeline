import type { ApprovalSubjectKind } from './kind';
import { SOCIAL_PUBLISH_V1 } from './social-publish-v1';

const KINDS = new Map<string, ApprovalSubjectKind>([[SOCIAL_PUBLISH_V1.schema, SOCIAL_PUBLISH_V1]]);

/** The one lookup the board engine uses; kind-specific validation and executor rules stay here. */
export function approvalSubjectKind(schema: string | null | undefined): ApprovalSubjectKind | null {
  return schema ? (KINDS.get(schema) ?? null) : null;
}

export type { ApprovalSubjectKind } from './kind';
export { nonEmptyString } from './kind';
