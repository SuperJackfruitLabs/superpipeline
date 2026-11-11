/**
 * A subject's expiry is an RFC 3339 date-time with seconds and an offset, on the way in and on the
 * way out. A strict reader of a decision event (`subject.expires_at` as JSON-Schema `date-time`)
 * drops an event whose expiry is spelled loosely, so the board refuses a loose spelling at the
 * boundary instead of accepting what `Date.parse` happens to read.
 *
 * Regression caught here: social-publish/v1 accepted any `timing.expiresAt` `Date.parse` could
 * read (`2030-01-02`, `Jan 2 2030`), and a question subject accepted an expiry without seconds.
 */
import { runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { emittedExpiry, isSubjectExpiry } from '../src/approval-subject-kinds/kind';
import { SOCIAL_PUBLISH_V1 } from '../src/approval-subject-kinds/social-publish-v1';
import type { BoardDO } from '../src/board/board-do';
import { posterSubjectEnvelope, questionPostError, type PosterSubject } from '../src/board/question-subject';
import { subjectEnvelope } from '../src/board/subject-envelope';
import { PRODUCER, STAGES, boardStub, payload } from './approval-subject-fixtures';

const ACCEPTED = ['2030-01-02T03:04:05Z', '2030-01-02T03:04:05.123Z', '2030-01-02T08:34:05+05:30', '2030-01-01T22:04:05-05:00'];
const REFUSED = [
  '2030-01-02',
  'Jan 2 2030',
  'Wed, 02 Jan 2030 03:04:05 GMT',
  '2030-01-02T03:04:05',
  '2030-01-02T03:04Z',
  '2030-01-02 03:04:05Z',
  '2030-01-02T03:04:05+0530',
  '1893553445000',
  '',
];
const MESSAGE = 'publicationPayload.timing.expiresAt must be an RFC 3339 date-time with seconds and a time zone, such as 2030-01-02T03:04:05Z';

describe('a subject expiry', () => {
  it.each(ACCEPTED)('accepts %s', (v) => expect(isSubjectExpiry(v)).toBe(true));
  it.each(REFUSED)('refuses %j', (v) => expect(isSubjectExpiry(v)).toBe(false));
  it('refuses a value that is not a string', () => {
    for (const v of [null, undefined, 1893553445000, {}]) expect(isSubjectExpiry(v)).toBe(false);
  });
});

describe('social-publish/v1 timing.expiresAt', () => {
  it.each(ACCEPTED)('accepts %s', (v) => expect(SOCIAL_PUBLISH_V1.validationError(payload(v))).toBeNull());
  it.each(REFUSED)('refuses %j, naming the field and the form', (v) => expect(SOCIAL_PUBLISH_V1.validationError(payload(v))).toBe(MESSAGE));

  it.each(['2030-01-02', 'Jan 2 2030'])('a completion carrying %j is refused before anything is frozen', async (expiresAt) => {
    await runInDurableObject(boardStub(`subject-expiry-${expiresAt}`), async (board: BoardDO, state) => {
      await board.init({ id: 'brd_subject_expiry', tenantId: 'tnt_fixture', name: 'Expiry fixture', stages: STAGES });
      const made = await board.createCard({ title: 'Expiry fixture', ownerUserId: 'usr_fixture_owner', projectId: 'prj_fixture' });
      if (!made.ok) throw new Error(made.message);
      const claim = await board.claim({ agentId: PRODUCER, capabilities: ['writing'] });
      if (!claim.claimed) throw new Error('fixture draft was not claimable');
      const completed = await board.complete({ runId: claim.runId, leaseEpoch: claim.leaseEpoch, handoff: { publicationPayload: payload(expiresAt) } });
      expect(completed).toEqual({ ok: false, code: 'INVALID_APPROVAL_SUBJECT', message: MESSAGE });
      expect(state.storage.sql.exec('SELECT id FROM approval_subjects').toArray()).toHaveLength(0);
      expect(state.storage.sql.exec('SELECT id FROM gates').toArray()).toHaveLength(0);
      expect(state.storage.sql.exec('SELECT current_stage_key FROM cards WHERE id = ?', made.value.id).one()).toEqual({ current_stage_key: 'draft' });
    });
  });
});

const posterSubject = (expires_at: string): PosterSubject => ({
  schema: 'harness-permission/v1', id: 'ses_1:7', digest: 'd'.repeat(64), revision: 1, expires_at, preview: [], preview_complete: true,
});

describe('a question subject expires_at', () => {
  const options = [{ name: 'allow', title: 'Allow', meaning: 'approve' as const }, { name: 'deny', title: 'Deny', meaning: 'reject' as const }];

  it('refuses an expiry without seconds, which the date-time check alone let through', () => {
    expect(questionPostError({ options, subject: posterSubject('2030-01-02T03:04Z') }, options)).toMatchObject({ code: 'INVALID_APPROVAL_SUBJECT' });
    expect(questionPostError({ options, subject: posterSubject('2030-01-02T03:04:05.000Z') }, options)).toBeNull();
  });
});

describe('an expiry on the way out', () => {
  it('passes a strict expiry through unchanged', () => {
    for (const v of ACCEPTED) expect(emittedExpiry(v)).toBe(v);
  });

  it('sends a loosely spelled stored expiry as the same instant in UTC', () => {
    expect(emittedExpiry('Wed, 02 Jan 2030 03:04:05 GMT')).toBe('2030-01-02T03:04:05.000Z');
    expect(emittedExpiry('2030-01-02T03:04Z')).toBe('2030-01-02T03:04:00.000Z');
    expect(emittedExpiry('not a date')).toBeNull();
    expect(emittedExpiry(undefined)).toBeNull();
  });

  it('a gate subject frozen with a loose expiry goes out strict', () => {
    const canonical = { ...payload(), timing: { mode: 'immediate', notBefore: null, expiresAt: 'Wed, 02 Jan 2030 03:04:05 GMT' } };
    const deps = { approvalSubjectView: () => ({ id: 'aps_1', digest: 'sha256:x', schema: 'social-publish/v1', revision: 1, canonical }) };
    expect(subjectEnvelope(deps, 'aps_1')?.expiresAt).toBe('2030-01-02T03:04:05.000Z');
  });

  it('a stored poster subject without seconds goes out strict', () => {
    expect(posterSubjectEnvelope(posterSubject('2030-01-02T03:04Z')).expiresAt).toBe('2030-01-02T03:04:00.000Z');
  });
});
