import { describe, expect, it } from 'vitest';
import { parseGateConflict } from './api';

describe('parseGateConflict', () => {
  it('reads the 409 body', async () => {
    const res = new Response(JSON.stringify({ error: { code: 'GATE_NOT_PENDING', reason: 'decided', message: 'gate is already resolved', decidedBy: 'usr_b19776fac3c94df4', decidedAt: '2026-10-11T07:32:00Z', via: 'matrix' } }), { status: 409 });
    expect(await parseGateConflict(res)).toEqual({ decidedBy: 'usr_b19776fac3c94df4', decidedAt: '2026-10-11T07:32:00Z', via: 'matrix' });
  });
  it('is null for any other refusal', async () => {
    expect(await parseGateConflict(new Response(JSON.stringify({ error: { code: 'SEPARATION_OF_DUTIES' } }), { status: 409 }))).toBeNull();
    expect(await parseGateConflict(new Response('{}', { status: 200 }))).toBeNull();
    // A cancelled gate shares the code but names no decider.
    expect(await parseGateConflict(new Response(JSON.stringify({ error: { code: 'GATE_NOT_PENDING', reason: 'cancelled' } }), { status: 409 }))).toBeNull();
  });
});
