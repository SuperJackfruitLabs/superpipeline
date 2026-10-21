// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

it.each(['superpipeline.com', 'localhost.example.com', '127.0.0.1.example.com'])('compiled app at %s ignores fixture identity and exposes no refresh hook', async hostname => {
  vi.resetModules();
  vi.stubEnv('DEV', false);
  const getItem = vi.fn(() => 'fixture-principal-must-not-leak');
  vi.stubGlobal('localStorage', { getItem });
  vi.stubGlobal('location', { hostname });
  const remoteWindow = { location: { hostname } };
  vi.stubGlobal('window', remoteWindow);
  const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ agents: [] }), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  const api = await import('./api');
  await api.getAgents();
  expect(getItem).not.toHaveBeenCalled();
  const headers = new Headers(fetch.mock.calls[0]![1]?.headers);
  expect(headers.has('X-User-Id')).toBe(false);
  expect(headers.get('X-Tenant-Id')).not.toBe('fixture-principal-must-not-leak');
  await import('./stores/app.svelte');
  expect(remoteWindow).not.toHaveProperty('__spDev');
});

it('compiled literal-loopback rehearsal reads fixture identity but readiness still waits for reads and card log', async () => {
  vi.resetModules();
  vi.stubEnv('DEV', false);
  vi.stubGlobal('location', { hostname: '127.0.0.1' });
  const localWindow = { location: { hostname: '127.0.0.1' } };
  vi.stubGlobal('window', localWindow);
  vi.stubGlobal('localStorage', { getItem: (key: string) => key.endsWith('devUser') ? 'usr_fixture' : 'tnt_fixture' });
  const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ agents: [] }), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  const api = await import('./api');
  await api.getAgents();
  const headers = new Headers(fetch.mock.calls[0]![1]?.headers);
  expect(headers.get('X-User-Id')).toBe('usr_fixture');
  expect(headers.get('X-Tenant-Id')).toBe('tnt_fixture');
  const { app } = await import('./stores/app.svelte');
  expect(localWindow).toHaveProperty('__spDev.refresh');
  app.authState = 'ready';
  app.needsBoard = true;
  app.openCardId = 'card_fixture';
  app.cardDetailFor = null;
  app.noteLoaded();
  expect(document.documentElement.dataset.ready).toBe('false');
  app.cardDetailFor = 'card_fixture';
  let release!: () => void;
  const busy = app.markBusy(new Promise<void>(resolve => { release = resolve; }));
  expect(document.documentElement.dataset.ready).toBe('false');
  release(); await busy;
  expect(document.documentElement.dataset.ready).toBe('true');
});
