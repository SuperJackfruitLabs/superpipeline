import { beforeEach, describe, expect, it, vi } from 'vitest';
const resolveGate = vi.fn();
vi.mock('$lib/api', () => ({ resolveGate: (...a: unknown[]) => resolveGate(...a) }));
import { decisionFor, GateDecisionModel, roleOf, sealOf } from './gate-decision.svelte';

const subject = { id: 'sub_1', digest: '3f9ac21e77', schema: 's', revision: 2, canonical: {} };
const gate = (options: Array<{ name: string; title: string }> = []) => ({ id: 'gat_1', options, approvalSubject: subject }) as never;

describe('GateDecisionModel', () => {
  let onResponse: ReturnType<typeof vi.fn>;
  let m: GateDecisionModel;
  let g = gate();
  beforeEach(() => {
    resolveGate.mockReset().mockResolvedValue({ ok: true });
    onResponse = vi.fn(async () => true);
    g = gate();
    m = new GateDecisionModel(() => ({ boardId: 'brd_1', gate: g, onResponse: onResponse as never }));
  });

  it('falls back to Approve, Request changes, Reject', () => {
    expect(m.options.map((o) => o.title)).toEqual(['Approve', 'Request changes', 'Reject']);
  });

  it('Request changes with no note is refused and asks for one', async () => {
    m.note = '   ';
    await m.decide('request_changes');
    expect(resolveGate).not.toHaveBeenCalled();
    expect(m.needNote).toBe(true);
  });

  it('a decision carries the note as the comment, with the frozen subject', async () => {
    m.note = 'checked the diff';
    await m.decide('approve');
    expect(resolveGate).toHaveBeenCalledWith('brd_1', 'gat_1', 'approve', 'checked the diff', subject);
    expect(m.note).toBe('');
  });

  it('approve variants map to their decisions', () => {
    expect(decisionFor('approve_manual')).toBe('approve_manual');
    expect(decisionFor('approve_automatic')).toBe('approve_automatic');
    expect(decisionFor('reject')).toBe('reject');
    expect(roleOf('approve_manual')).toBe('approve');
    expect(roleOf('something_else')).toBeNull();
  });

  it('submit needs a choice (the radio forms)', async () => {
    await m.submit();
    expect(m.needPick).toBe(true);
    expect(resolveGate).not.toHaveBeenCalled();
    m.selected = 'reject';
    await m.submit();
    expect(resolveGate).toHaveBeenCalledWith('brd_1', 'gat_1', 'reject', undefined, subject);
  });

  it('one decision at a time', async () => {
    let release!: () => void;
    resolveGate.mockReturnValue(new Promise((r) => (release = () => r({ ok: true }))));
    const first = m.decide('approve');
    await m.decide('reject');
    release();
    await first;
    expect(resolveGate).toHaveBeenCalledTimes(1);
  });

  it('a refused decision keeps the note', async () => {
    onResponse.mockResolvedValue(false);
    m.note = 'keep me';
    await m.decide('approve');
    expect(m.note).toBe('keep me');
  });

  it('a different gate starts clean', () => {
    m.follow('gat_1');
    m.note = 'half';
    m.follow('gat_2');
    expect(m.note).toBe('');
  });

  it('the seal is the first eight hex of the digest', () => {
    expect(sealOf('3f9ac21e77')).toBe('3f9a·c21e');
  });
});
