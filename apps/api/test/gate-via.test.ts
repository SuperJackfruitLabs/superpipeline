import { describe, expect, it } from 'vitest';
import { viaFor } from '../src/auth/resolve';
import { flatError } from '../src/flat-error';

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

describe('flatError', () => {
  it('lifts detail beside the code but never lets it overwrite code, message or ok', () => {
    const out = flatError({ ok: false, code: 'GATE_NOT_PENDING', message: 'gate is already resolved', detail: { code: 'EVIL', message: 'evil', ok: true, reason: 'decided' } });
    expect(out).toMatchObject({ ok: false, code: 'GATE_NOT_PENDING', message: 'gate is already resolved', reason: 'decided' });
  });
});
