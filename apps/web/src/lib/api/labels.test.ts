import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listLabels } from './labels';
import { forgetHubToken } from '../hub-token';

beforeEach(() => {
  vi.restoreAllMocks();
  // `hubToken()` caches across calls by design; a token left over from one test
  // would let the next one pass without ever asking for authority.
  forgetHubToken();
});

describe('listLabels', () => {
  it('reads the tenant label catalogue', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ labels: [{ id: 'lbl_1', tenantId: 't1', name: 'urgent', colour: '#f00', origin: 'declared', createdAt: '2026-01-01' }] }), { status: 200 })),
    );

    expect(await listLabels()).toEqual([{ id: 'lbl_1', tenantId: 't1', name: 'urgent', colour: '#f00', origin: 'declared', createdAt: '2026-01-01' }]);
  });

  it('throws when the read is refused, so a failure is never drawn as "No labels yet"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    await expect(listLabels()).rejects.toMatchObject({ status: 500 });
  });
});
