import { describe, expect, it } from 'vitest';
import registry from '@superjackfruitlabs/treaty-contracts/data/contracts/error-codes.json';
import { ROUTE_ERROR_STATUS, statusFor, type ApiErrorCode, type RouteErrorCode } from '../src/api-errors';
import type { BoardErrorCode } from '../src/board/board-do';

// Treaty phase 1, ruling 1: every code SuperPipeline can return is in treaty's
// `contracts/error-codes.json`, owned by superpipeline, in the error.v1 envelope, with the status
// this API gives it.

/** Every `BoardErrorCode`. A type error when the union gains or loses one, so the list stays whole. */
const BOARD_CODES: Record<BoardErrorCode, true> = {
  CHECKPOINT_SETTLEMENT_DISABLED: true,
  CHECKPOINT_SETTLEMENT_FAILED: true,
  COMPLETION_REQUIRED: true,
  APPROVAL_SUBJECT_REQUIRED: true,
  INVALID_COMPLETION_STATE: true,
  INVALID_CHECKPOINT_STATE: true,
  INVALID_CHECKPOINT: true,
  CHECKPOINT_CONFLICT: true,
  CHECKPOINT_RECEIPT_MISSING: true,
  CHECKPOINT_RECEIPT_NOT_SAVED: true,
  INVALID_CHECKPOINT_RECEIPT: true,
  CHECKPOINT_REFERENCE_MAPPING_REQUIRED: true,
  INVALID_CHECKPOINT_REFERENCE: true,
  CHECKPOINT_REFERENCE_NOT_SAVED: true,
  CHECKPOINT_SOURCE_DISABLED: true,
  INVALID_CHECKPOINT_SOURCE: true,
  NOT_CHECKPOINT_REPORTER: true,
  CHECKPOINT_SOURCE_CONFLICT: true,
  CHECKPOINT_SOURCE_MISSING: true,
  CHECKPOINT_SOURCE_NOT_SAVED: true,
  CHECKPOINT_SOURCE_FAILED: true,
  NOT_INITIALIZED: true,
  WORKSPACE_ADMIN_REQUIRED: true,
  UNKNOWN_STAGE: true,
  WIP_LIMIT: true,
  REPOSITORY_CHOICE_REFUSED: true,
  CARD_NOT_FOUND: true,
  RUN_NOT_FOUND: true,
  NOT_RUN_OWNER: true,
  STALE_LEASE: true,
  GATE_NOT_FOUND: true,
  GATE_NOT_PENDING: true,
  GATE_DECISION_NOT_ALLOWED: true,
  INVALID_APPROVAL_SUBJECT: true,
  APPROVAL_DECIDER_NOT_ALLOWED: true,
  APPROVAL_SUBJECT_MISMATCH: true,
  APPROVAL_SUBJECT_NOT_VERIFIED: true,
  APPROVAL_SUBJECT_EXPIRED: true,
  APPROVAL_DELIVERY_NOT_AVAILABLE: true,
  APPROVAL_DELIVERY_NOT_MANUAL: true,
  APPROVAL_DELIVERY_STARTED: true,
  APPROVAL_DELIVERY_DELIVERED: true,
  INVALID_APPROVAL_DELIVERY: true,
  INVALID_LIVE_URL: true,
  ELICITATION_NOT_FOUND: true,
  ELICITATION_NOT_PENDING: true,
  INVALID_ANSWER: true,
  INVALID_ELICITATION: true,
  INVALID_STRICT_DECISION: true,
  DECISION_CONFLICT: true,
  DECISION_EXPIRED: true,
  QUORUM_ALREADY_APPROVED: true,
  APPROVAL_HELD: true,
  APPROVAL_RELEASED: true,
  GATE_NOT_HELD: true,
  APPROVAL_RELEASE_AFTER_EXPIRY: true,
  CHECK_NOT_FOUND: true,
  CHECK_NOT_OPEN: true,
  CHECK_OVERRIDE_NOT_ALLOWED: true,
  CARD_NOT_WAITING: true,
  WAIT_CHANGED: true,
  INVALID_APPROVAL_REQUEST: true,
  REQUEST_ID_CONFLICT: true,
  APPROVAL_REQUEST_NOT_FOUND: true,
  SEPARATION_OF_DUTIES: true,
  INVALID_URL: true,
  UNKNOWN_EVENT: true,
  INVALID_SIGNATURE: true,
  NOT_CONFIGURED: true,
  INVALID_DELIVERY: true,
  INVALID_USAGE: true,
  INVALID_STAGES: true,
  STAGE_NOT_EMPTY: true,
  BUDGET_EXCEEDED: true,
  INVALID_RULE: true,
  INVALID_TIMEZONE: true,
  SCHEDULE_NOT_FOUND: true,
  INVALID_SCHEDULE: true,
  NO_SUCH_CARD: true,
  LINK_WOULD_CYCLE: true,
  ALREADY_HAS_PARENT: true,
  CARD_BLOCKED: true,
  TOO_MANY_CHILDREN: true,
  NOTHING_TO_SPLIT: true,
  INVALID_COMMENT: true,
  CHECKPOINT_REQUIRED: true,
  INVALID_OUTCOME: true,
  COMMENT_NOT_FOUND: true,
  NOT_COMMENT_AUTHOR: true,
  NO_RUN_ON_CARD: true,
  CARD_CHANGED: true,
  INVALID_RESUME: true,
  QUESTION_PENDING: true,
  GATE_PENDING: true,
  INVALID_STALE_SETTINGS: true,
  INVALID_TIMEOUT: true,
  CARD_NOT_CLAIMABLE: true,
  AGENT_NOT_ELIGIBLE: true,
  CARD_RESERVED: true,
  INVALID_RESERVATION: true,
  INVALID_SCHEDULING: true,
};

/**
 * Codes SuperPipeline returns that treaty's registry does not hold yet: reported, to be registered
 * in treaty (then removed here). May only shrink; a code listed here that the registry now holds
 * fails the test below.
 */
const NOT_YET_REGISTERED: readonly ApiErrorCode[] = [];

interface Entry { code: string; owner: string; envelope?: string; status: number }
const registered = new Map((registry.codes as Entry[]).filter((c) => c.owner === 'superpipeline').map((c) => [c.code, c]));
const ALL: ApiErrorCode[] = [
  ...Object.keys(BOARD_CODES).filter((c): c is BoardErrorCode => c in BOARD_CODES),
  ...Object.keys(ROUTE_ERROR_STATUS).filter((c): c is RouteErrorCode => c in ROUTE_ERROR_STATUS),
];

describe('every error code is in treaty\'s registry', () => {
  it.each(ALL.filter((c) => !NOT_YET_REGISTERED.includes(c)))('%s: owner superpipeline, envelope error.v1, the same status', (code) => {
    const entry = registered.get(code);
    expect(entry, `${code} is not in treaty's error-codes.json under superpipeline`).toBeDefined();
    expect(entry?.envelope ?? 'error.v1').toBe('error.v1');
    expect(entry?.status).toBe(statusFor(code));
  });

  it('the not-yet-registered list is not stale', () => {
    expect(NOT_YET_REGISTERED.filter((c) => registered.has(c))).toEqual([]);
    expect(NOT_YET_REGISTERED.filter((c) => !ALL.includes(c))).toEqual([]);
  });

  it('every superpipeline code in the registry is one this API can return', () => {
    expect([...registered.keys()].filter((c) => !(ALL as string[]).includes(c))).toEqual([]);
  });
});
