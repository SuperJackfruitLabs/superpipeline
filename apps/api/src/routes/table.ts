// The Worker's top-level route table (index.ts dispatches through it; the board routes are in
// boards/table.ts). The tables replaced one if-chain in `fetch` and keep its order.
import { MCP_PROTECTED_RESOURCE_PATH } from '../mcp/auth';
import { staleAcrossBoards, superwitnessBackfill } from './admin';
import { agentCard, agentLoadRead, agentRegistry } from './agents';
import { githubSignIn, hubHandoff, planeSignIn } from './auth';
import { boards } from './boards/entry';
import { capabilities, implications } from './capabilities';
import { labels } from './labels';
import { mcp, protectedResource } from './mcp';
import { memberRoster } from './members';
import { milestone, projects } from './projects';
import { route, type Route, type WorkerRequest } from './router';
import { devFixture, health, orgPlaneEntitlement } from './system';
import { tenantForge, tenantSettings } from './tenant';

/** A pattern matching every path that starts with `literal`. */
const startsWith = (literal: string): RegExp => new RegExp('^' + literal.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'));

/**
 * The Worker's routes, in the order they are tried against the URL's path. Where two patterns
 * overlap the earlier wins (`/v1/capabilities/implications` before `/v1/capabilities/:id`,
 * `/v1/agents/:id/card` before `/v1/agents/:id`); a route that declines (the dev fixture on
 * another path, a sign-in prefix on a path it does not own, the entitlement check with nothing to
 * refuse) lets the routes after it try. Everything else is the web app.
 */
export const ROUTES: readonly Route<WorkerRequest>[] = [
  route('GET', /^\/health$/, health),
  route('*', /^\/v1\/dev\//, devFixture),
  // Every route below this one is behind the plane entitlement check.
  route('*', /^/, orgPlaneEntitlement),
  route('*', /^\/(?:auth|hub)\//, planeSignIn),
  route('*', /^\/auth\//, githubSignIn),
  route('*', /^\/hub\//, hubHandoff),
  route('GET', startsWith(MCP_PROTECTED_RESOURCE_PATH), protectedResource),
  route('*', /^\/mcp$/, mcp),
  route('*', /^\/v1\/tenant\/forge$/, tenantForge),
  route('*', /^\/v1\/tenant$/, tenantSettings),
  route('*', /^\/v1\/members(?:\/([^/]+))?$/, memberRoster),
  route('*', /^\/v1\/capabilities\/implications$/, implications),
  route('*', /^\/v1\/capabilities(?:\/([^/]+))?$/, capabilities),
  route('*', /^\/v1\/labels(?:\/([^/]+))?$/, labels),
  route('*', /^\/v1\/admin\/superwitness\/backfill$/, superwitnessBackfill),
  route('*', /^\/v1\/stale$/, staleAcrossBoards),
  route('*', /^\/v1\/projects(?:\/([^/]+)(?:\/(milestones|rollup))?)?$/, projects),
  route('*', /^\/v1\/milestones\/([^/]+)$/, milestone),
  route('GET', /^\/v1\/agents\/load$/, agentLoadRead),
  route('*', /^\/v1\/agents\/([^/]+)\/card$/, agentCard),
  route('*', /^\/v1\/agents(?:\/([^/]+)(?:\/(tokens)(?:\/([^/]+))?)?)?$/, agentRegistry),
  route('*', /^\/v1\/boards(?:\/([^/]+))?(?:\/(.*))?$/, boards),
];
