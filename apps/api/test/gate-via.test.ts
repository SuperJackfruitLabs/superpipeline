import { describe, expect, it } from 'vitest';
import { viaFor } from '../src/auth/resolve';
import { errorBody } from '../src/api-errors';

describe('viaFor — the surface comes from the principal, never the body', () => {
  it('a hub token is matrix', () => expect(viaFor({ via: 'matrix' }, null)).toBe('matrix'));
  it('an agent or API credential is api, whatever else is present', () => {
    expect(viaFor(null, { agentId: 'agt_x' })).toBe('api');
    expect(viaFor({ via: 'matrix' }, { agentId: 'agt_x' })).toBe('api');
  });
  it('a browser session, the app token or dev headers are web', () => {
    expect(viaFor({}, null)).toBe('web');
    expect(viaFor({ via: 'web' }, null)).toBe('web');
    expect(viaFor(null, null)).toBe('web');
  });
});

describe('errorBody', () => {
  it('lifts detail beside the code but never lets it overwrite code, message or ok', () => {
    const out = errorBody({ ok: false, code: 'GATE_NOT_PENDING', message: 'gate is already resolved', detail: { code: 'EVIL', message: 'evil', ok: true, reason: 'decided' } }).error;
    expect(out).toMatchObject({ ok: false, code: 'GATE_NOT_PENDING', message: 'gate is already resolved', reason: 'decided' });
  });
  it('also carries detail under `detail`, as treaty error.v1 has it', () => {
    const out = errorBody({ ok: false, code: 'APPROVAL_RELEASED', message: 'released', detail: { releasedAt: '2026-11-22T10:00:00.000Z' } }).error;
    expect(out).toEqual({ ok: false, code: 'APPROVAL_RELEASED', message: 'released', releasedAt: '2026-11-22T10:00:00.000Z', detail: { releasedAt: '2026-11-22T10:00:00.000Z' } });
  });
  it('carries no `detail` key when there is none', () => {
    expect(errorBody({ code: 'UNAUTHORIZED', message: 'sign in to continue' })).toEqual({ error: { code: 'UNAUTHORIZED', message: 'sign in to continue' } });
  });
});
