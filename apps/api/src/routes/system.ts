// The Worker's own routes: health, the dev fixture, the plane entitlement check, and the web app.
import { entitlementRefusal } from '../auth/org-plane-resolve';
import { handleDevFixture } from '../dev/fixture';
import { NEXT, type Next, type WorkerRequest } from './router';

export async function health(): Promise<Response> {
  return Response.json({ ok: true, service: 'superpipeline-api', phase: 'P8' });
}

// Dev only: the pixel suite's fixture world (src/dev/fixture.ts). 404 unless DEV_AUTH and
// FIXTURE_IMPORT are both "true" — exactly like an unknown path.
export async function devFixture({ request, env, path }: WorkerRequest): Promise<Response | Next> {
  const res = await handleDevFixture(request, env, path);
  if (res) return res;
  return NEXT;
}

// Contract §2: a plane token whose `ent` lacks superpipeline is told so, by name, before any
// route can turn it into a generic 401/403. Inert unless ORG_PLANE_ISSUER is set.
export async function orgPlaneEntitlement({ request, env }: WorkerRequest): Promise<Response | Next> {
  const notEnabled = await entitlementRefusal(request, env);
  if (notEnabled) return notEnabled;
  return NEXT;
}

// Anything that isn't an API route is the web app: hand it to the static assets (SPA fallback).
export async function webApp({ request, env }: WorkerRequest): Promise<Response> {
  if (env.ASSETS) return env.ASSETS.fetch(request);
  return new Response('Not Found', { status: 404 });
}
