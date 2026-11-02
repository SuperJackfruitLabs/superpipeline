// Sign-in: the organization plane's, GitHub's, and the hub token handoff.
import { handleHubRoute } from '../auth/hub-oauth';
import { handlePlaneSignInRoute, handleSessionRenewal } from '../auth/plane-signin';
import { handleAuthRoute } from '../auth/routes';
import { NEXT, type Next, type WorkerRequest } from './router';

// Organization-plane sign-in owns /auth/login, /auth/callback, /auth/logout and /hub/{token,
// connect,callback} once ORG_PLANE_ISSUER is set; it answers null otherwise, and the GitHub and
// hub-handoff routes below run exactly as before.
export async function planeSignIn({ request, env, path }: WorkerRequest): Promise<Response | Next> {
  // Background renewal of a lapsed session (POST only; plane sign-in, else no_refresh).
  if (path === '/hub/session') return handleSessionRenewal(request, env);
  const res = await handlePlaneSignInRoute(request, env, path);
  if (res) return res;
  return NEXT;
}

// Human auth (GitHub OAuth → session): /auth/login · /auth/callback · /auth/me · /auth/logout.
export async function githubSignIn({ request, env, path }: WorkerRequest): Promise<Response | Next> {
  const res = await handleAuthRoute(request, env, path);
  if (res) return res;
  return NEXT;
}

// The hub token handoff: /hub/connect · /hub/callback · /hub/token (auth/hub-oauth.ts).
//
// Not part of `/auth/*` above, deliberately. Those routes establish who you are HERE — a
// superpipeline session, from GitHub. These carry authority from somewhere else: the hub is the
// issuer, superpipeline is not, and nothing under this prefix creates or reads a superpipeline session.
// The separate prefix is also what `run_worker_first` in wrangler.jsonc names, so the SPA's
// index.html fallback cannot shadow a callback the hub redirected a browser to.
export async function hubHandoff({ request, env, path }: WorkerRequest): Promise<Response | Next> {
  const res = await handleHubRoute(request, env, path);
  if (res) return res;
  return NEXT;
}
