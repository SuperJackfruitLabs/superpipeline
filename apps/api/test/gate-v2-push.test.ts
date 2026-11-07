/**
 * gate.v2 on the push (charter: decisions/2026-11-07-gate-v2-is-the-decision-envelope.md).
 *
 * A subject-bound gate reached the operator's room with only Request changes and Reject, and
 * without the text it asked them to approve: the push carried the options as bare ids and no
 * preview. The push now says what each option means, and carries the subject's preview — the
 * exact post — and expiry. v1 readers ignore the new fields; `handoffSummary` carries the
 * preview's text for them.
 */
import { runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { boundedPreview, PREVIEW_BLOCKS_MAX, PREVIEW_TEXT_MAX, type PreviewBlock } from '../src/approval-subject-kinds/kind';
import { SOCIAL_PUBLISH_V1 } from '../src/approval-subject-kinds/social-publish-v1';
import type { BoardDO } from '../src/board/board-do';
import { PREVIEW_SHORTENED_NOTE } from '../src/board/gates';
import { addBoundCard, boardStub, payload, STAGES } from './approval-subject-fixtures';

const HOOK = 'https://hub.example/api/bridge/superpipeline/push';

describe('gate.v2 — a subject-bound gate on the push', () => {
  it('carries the exact post, the expiry, and what each option means', async () => {
    await runInDurableObject(boardStub('gate-v2-push'), async (board: BoardDO, state) => {
      await board.init({ id: 'brd_v2push', tenantId: 'tnt_fixture', name: 'Fixture board', stages: STAGES });
      await board.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events: ['gate.pending'] });
      await addBoundCard(board, state);

      const [delivery] = await board.getPushDeliveries();
      expect(delivery).toBeDefined();
      const body: unknown = JSON.parse(delivery?.body ?? '{}');
      const text = payload().items[0]?.text;

      expect(body).toMatchObject({
        approvalSubject: {
          schema: 'social-publish/v1',
          digest: expect.stringMatching(/^sha256:/),
          expiresAt: '2030-01-02T03:04:05Z',
          previewComplete: true,
          // The exact text, character for character — spacing, Unicode and the line break kept.
          preview: expect.arrayContaining([
            { type: 'text', label: 'Post', text },
            { type: 'field', label: 'Account', value: '@fixture_account on X' },
            { type: 'field', label: 'Approval expires', value: '2030-01-02T03:04:05Z' },
          ]),
        },
        // A v1 client draws only handoffSummary: it now shows the post instead of nothing.
        handoffSummary: text,
      });
      expect(body).toHaveProperty('options', [
        { id: 'approve_manual', label: "Approve — I'll post it myself", meaning: 'approve', needsComment: false, delivery: 'manual' },
        { id: 'approve_automatic', label: 'Approve — post automatically', meaning: 'approve', needsComment: false, delivery: 'automatic' },
        { id: 'request_changes', label: 'Request changes', meaning: 'revise', needsComment: true },
        { id: 'reject', label: 'Reject', meaning: 'reject', needsComment: false },
      ]);
    });
  });
});

describe('gate.v2 — a preview that had to be cut', () => {
  it('says so to a v2 client, and to a v1 client through handoffSummary', async () => {
    await runInDurableObject(boardStub('gate-v2-cut'), async (board: BoardDO, state) => {
      await board.init({ id: 'brd_v2cut', tenantId: 'tnt_fixture', name: 'Fixture board', stages: STAGES });
      await board.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events: ['gate.pending'] });
      const base = payload();
      const [item] = base.items;
      await addBoundCard(board, state, { publicationPayload: { ...base, items: [{ ...item, text: 'y'.repeat(PREVIEW_TEXT_MAX + 10) }] } });

      const [delivery] = await board.getPushDeliveries();
      const body: unknown = JSON.parse(delivery?.body ?? '{}');
      expect(body).toMatchObject({ approvalSubject: { previewComplete: false } });
      // A v1 client draws only handoffSummary and cannot read previewComplete: the note is how it knows.
      expect(body).toHaveProperty('handoffSummary', expect.stringContaining(PREVIEW_SHORTENED_NOTE));
    });
  });
});

describe('a subject preview stays bounded', () => {
  it('clamps long text and drops blocks past the limit', () => {
    const long = 'x'.repeat(PREVIEW_TEXT_MAX + 50);
    const fields: PreviewBlock[] = Array.from({ length: PREVIEW_BLOCKS_MAX + 5 }, (_, i) => ({ type: 'field', label: `f${i}`, value: 'v' }));
    const { blocks, complete } = boundedPreview([{ type: 'text', text: long }, ...fields]);
    expect(blocks).toHaveLength(PREVIEW_BLOCKS_MAX);
    const first = blocks[0];
    expect(first?.type === 'text' ? first.text.length : 0).toBe(PREVIEW_TEXT_MAX);
    // Cut text means the person cannot see everything they would approve.
    expect(complete).toBe(false);
  });

  it('is complete when nothing had to be cut', () => {
    expect(boundedPreview([{ type: 'text', label: 'Post', text: 'short' }]).complete).toBe(true);
  });

  it('is incomplete when only a block past the limit was dropped', () => {
    const many: PreviewBlock[] = Array.from({ length: PREVIEW_BLOCKS_MAX + 1 }, (_, i) => ({ type: 'field', label: `f${i}`, value: 'v' }));
    expect(boundedPreview(many).complete).toBe(false);
  });

  it('labels each post of a thread', () => {
    const p = payload();
    const [only] = p.items;
    const thread = { ...p, items: [only, { ...only, index: 1, text: 'second', media: [] }] };
    const texts = SOCIAL_PUBLISH_V1.preview(thread).filter((b) => b.type === 'text');
    expect(texts.map((b) => (b.type === 'text' ? b.label : ''))).toEqual(['Post 1 of 2', 'Post 2 of 2']);
  });
});
