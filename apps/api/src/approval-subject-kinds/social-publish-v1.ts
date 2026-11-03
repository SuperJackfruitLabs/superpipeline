import type { JsonValue } from '../json';
import { nonEmptyString, publicDigest, record, type ApprovalSubjectKind } from './kind';

/** Validate the complete public social-publish/v1 payload before any durable write. */
function validationError(value: unknown): string | null {
  const payload = record(value);
  if (!payload) return 'publicationPayload must be an object';
  if (payload.channel !== 'x') return 'publicationPayload.channel must be "x"';

  const account = record(payload.account);
  if (!account || account.platform !== 'x' || !nonEmptyString(account.userId) || !nonEmptyString(account.username)) {
    return 'publicationPayload.account must identify an x userId and username';
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) return 'publicationPayload.items must not be empty';
  for (let position = 0; position < payload.items.length; position += 1) {
    const item = record(payload.items[position]);
    if (!item || !Number.isInteger(item.index) || item.index !== position || !nonEmptyString(item.text)) {
      return `publicationPayload.items[${position}] needs its ordered index and exact text`;
    }
    if (!Array.isArray(item.media)) return `publicationPayload.items[${position}].media must be an array`;
    for (let mediaIndex = 0; mediaIndex < item.media.length; mediaIndex += 1) {
      const media = record(item.media[mediaIndex]);
      if (
        !media ||
        !nonEmptyString(media.objectRef) ||
        typeof media.sha256 !== 'string' ||
        !/^[0-9a-f]{64}$/.test(media.sha256) ||
        !nonEmptyString(media.mime) ||
        typeof media.size !== 'number' ||
        !Number.isInteger(media.size) ||
        media.size < 0 ||
        typeof media.altText !== 'string' ||
        !nonEmptyString(media.rightsRef)
      ) {
        return `publicationPayload.items[${position}].media[${mediaIndex}] is incomplete`;
      }
    }
    for (const key of ['replyToPostId', 'quotePostId'] as const) {
      if (item[key] !== null && !nonEmptyString(item[key])) {
        return `publicationPayload.items[${position}].${key} must be null or a post id`;
      }
    }
  }

  const timing = record(payload.timing);
  if (
    !timing ||
    (timing.mode !== 'immediate' && timing.mode !== 'scheduled') ||
    (timing.notBefore !== null && !nonEmptyString(timing.notBefore)) ||
    !nonEmptyString(timing.expiresAt) ||
    Number.isNaN(Date.parse(timing.expiresAt)) ||
    (timing.notBefore !== null && Number.isNaN(Date.parse(timing.notBefore))) ||
    (timing.mode === 'scheduled' && timing.notBefore === null)
  ) {
    return 'publicationPayload.timing is invalid';
  }
  if (!Array.isArray(payload.evidenceRefs) || !payload.evidenceRefs.every(nonEmptyString)) {
    return 'publicationPayload.evidenceRefs must be an array of references';
  }
  const policy = record(payload.policy);
  if (
    !policy ||
    typeof policy.allowThread !== 'boolean' ||
    !nonEmptyString(policy.duplicatePolicyId) ||
    !nonEmptyString(policy.floodPolicyId)
  ) {
    return 'publicationPayload.policy is invalid';
  }
  return null;
}

export const SOCIAL_PUBLISH_V1: ApprovalSubjectKind = {
  schema: 'social-publish/v1',
  executorCapabilities: ['x-publish'],
  payload: (handoff: Record<string, JsonValue>) => handoff.publicationPayload,
  validationError,
  canReadBack: (url: URL) => url.hostname === 'x.com' || url.hostname.endsWith('.x.com') || url.hostname === 'twitter.com' || url.hostname.endsWith('.twitter.com'),
  readBackDigest: publicDigest,
};
