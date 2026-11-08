// The board routes' door: the caller is resolved here, before any board route runs.
import { resolveUser, resolveAgent, type UserPrincipal, type AgentPrincipal, resolveHubUser, resolveHubAgent } from '../../auth/resolve';
import { requiredScope, scopePermits, SCOPE_FORBIDDEN } from '../../auth/scopes';
import { boardStub } from '../../board/stub';
import type { Capability } from '../../db/members';
import { serviceRoute } from '../../service-routes';
import { touchOnSuccess } from '../activity';
import { refuseByRole } from '../callers';
import { unexpected, methodNotAllowed } from '../errors';
import { dispatch, type WorkerRequest } from '../router';
import { boardCollection } from './collection';
import { runEvidence } from './evidence';
import { BOARD_ROUTES } from './table';

/**
 * /v1/boards[/:id[/...]] — the board collection and everything on one board.
 *
 * A service reading a run's evidence, or a service token on the routes it may read, is answered
 * before any caller is resolved. Then the caller is resolved by the kind of route (an agent route,
 * a webhook that authenticates itself, or a person), and the board routes (`./table.ts`) are
 * tried in order. An error none of them planned for is a 500 with the usual shape.
 */
export async function boards({ request, env, url, path }: WorkerRequest, match: RegExpMatchArray): Promise<Response> {
  const boardId = match[1];
  const rest = match[2] ?? '';

  // Before the agent/human split below, which classifies every `runs/*` path as an agent route.
  const evidenceMatch = boardId && request.method === 'GET' ? rest.match(/^runs\/([^/]+)\/(evidence|evidence-v1)$/) : null;
  if (evidenceMatch) return runEvidence(request, env, boardId, evidenceMatch[1], evidenceMatch[2] === 'evidence-v1');

  // A service token (Superlibrary) reading cards or registering a push config; any other bearer falls through.
  const asService = await serviceRoute(request, env, path);
  if (asService) return asService;

  // Resolve the caller by route type: agent routes carry a token; the GitHub webhook
  // self-authenticates (HMAC) and carries ?tenant=; everything else is a human (session cookie).
  // `gates/pending` joins `claims` and `runs/*` as an agent route. It is a
  // read that names nobody and carries no authority — the widening is one
  // GET, not the surface. The alternative was for agentpod's bridge to mint
  // an assertion for a human on a timer so it could use the human-routed
  // board snapshot, which would make "a service may speak as a person" a
  // background job rather than the carrying of an answer that person gave.
  // `gates/pending` is readable by EITHER an agent or a human. It was widened to agents for
  // the bridge (above); classifying it as agent-only then refused the people whose decisions
  // it lists, because agent routes reject human credentials. `supi gates <boardId>` answered
  // 401 for every human token as a result. Whoever must make the decision has at least as much
  // business reading this as the service that relays it.
  // Reading ONE gate joins `gates/pending` on the same footing, and for the same reason: a
  // gate names nobody and carries no authority, and the caller that needs it is the hub asking
  // "is the gate I put in a room still open, and if not, what was decided?" — after which it
  // stops offering buttons for a decision already made. Deciding a gate stays human-only.
  // `elicitations/pending` joins them, and for exactly the reasons written above: it is the
  // same reconciliation read made by the same sweep, it names nobody and carries no authority,
  // and the people whose answers it lists have at least as much business reading it. Classifying
  // it human-only shipped on 2026-10-03 and every sweep pass 401'd within minutes — silently,
  // because the sweep settles nothing for a board it could not read.
  // `deliveries/pending` joins them for the same reasons: the same sweep's read of the follow-up
  // a manual approval owes. It names nobody, and acting on it stays on the human delivery route.
  const isEitherRoute =
    !!boardId &&
    (rest === 'gates/pending' ||
      rest === 'elicitations/pending' ||
      rest === 'deliveries/pending' ||
      // `attention/pending` too: the same sweep's read of cards waiting on a person (charter:
      // waiting cards reach chat §1). Resuming or archiving one stays on the human routes.
      rest === 'attention/pending' ||
      /^gates\/[^/]+$/.test(rest));
  /**
   * What a COORDINATOR agent reaches: the board, one card, and creating a card.
   *
   * These are routes PEOPLE live on, so they join `gates/pending` as open to either — never as
   * agent-only. The first cut of this classified them as agent routes, and the comment three
   * paragraphs up had already written down why that is wrong: "classifying it as agent-only
   * then refused the people whose decisions it lists, because agent routes reject human
   * credentials." The failure was worse than a refusal. `resolveAgent`'s dev-header path
   * manufactures an agent out of `X-Tenant-Id` alone, and a dev-header agent carries no scopes
   * — which `scopePermits` reads as unscoped-and-therefore-unrestricted — so a VIEWER posting
   * to `cards` skipped `refuseByRole` entirely and got a 201. A role gate that a path can route
   * around is not a role gate.
   *
   * Method-scoped here as well as in `requiredScope`: a credential that may read a board must
   * not reach the agent branch to DELETE it. The two checks fail differently — this one picks
   * the branch, that one picks the scope — and a route admitted here with no scope opinion
   * would be a route an agent reaches unchecked.
   */
  const isCoordinatorRoute =
    // `/v1/boards` itself: GET lists them on `read`, POST composes one on `compose`.
    // `requiredScope` tells them apart from the board-scoped routes via `hasBoardId`, because
    // `rest` is empty for both `/v1/boards` and `/v1/boards/:id`.
    (!boardId && rest === '' && (request.method === 'GET' || request.method === 'POST')) ||
    (!!boardId &&
      ((request.method === 'GET' &&
        (rest === '' ||
          /^cards\/[^/]+$/.test(rest) ||
          /^cards\/[^/]+\/(activities|attempts|estimate)$/.test(rest))) ||
        (request.method === 'POST' && rest === 'cards') ||
        // A card's comment thread: read on `read`, posted to on `run` — and then only by the agent
        // whose live run holds that card, which the board checks (`addComment`).
        ((request.method === 'GET' || request.method === 'POST') && /^cards\/[^/]+\/comments$/.test(rest)) ||
        // `plan`: rearranging work that already exists. `requiredScope` decides which of these
        // needs which scope, and refuses the methods none of them may use.
        (request.method === 'PATCH' && /^cards\/[^/]+$/.test(rest)) ||
        (request.method === 'POST' && /^cards\/[^/]+\/move$/.test(rest)) ||
        // Resume is listed so that an agent's bearer lands in the agent branch and is refused there
        // by scope (403), rather than reaching the human branch and reading as "sign in" (401).
        // `requiredScope` forbids it on every scope: resuming is the human half of a block.
        (request.method === 'POST' && /^cards\/[^/]+\/resume$/.test(rest)) ||
        // Archive, the chat answer's other half, for the same reason as resume.
        (request.method === 'POST' && /^cards\/[^/]+\/archive$/.test(rest)) ||
        ((request.method === 'POST' || request.method === 'DELETE') && rest === 'links') ||
        // ONE stage's prose, on `compose`. The body is then authorised field by field, so this
        // door opens for `instructions` and refuses every routing key behind it.
        (request.method === 'PATCH' && /^stages\/[^/]+$/.test(rest))));
  /**
   * Was an agent credential actually OFFERED?
   *
   * On a route open to both, the credential decides the branch rather than the path. A person
   * carries a session cookie or dev headers and must land in the human branch with its role
   * check; only a bearer token can be an agent's. A bearer that turns out to be a HUMAN's hub
   * token resolves no agent and falls through to the human branch, which knows how to read it.
   */
  const offersBearer = /^Bearer\s+\S/i.test(request.headers.get('Authorization') ?? '');
  /**
   * An agent subscribing ITSELF to a board's push (docs/05 §4: a config is "registered per
   * agent/board").
   *
   * This was a human route only, with the subscriber named by a caller-asserted `X-Agent-Id`, and
   * the one party that needs a subscription — the hub's bridge — holds an agent credential and
   * nothing else. So nobody ever registered one: every production board's delivery queue was
   * empty and a gate reached its room only when the hub's five-minute sweep found it. With a
   * bearer it resolves like a coordinator route — an agent token subscribes its own agent, and a
   * bearer that names no agent falls through to the human branch unchanged.
   */
  const isSubscriptionRoute = !!boardId && request.method === 'POST' && rest === 'push-configs';
  const isAgentRoute =
    (!!boardId && (rest === 'claims' || rest.startsWith('runs/') || isEitherRoute)) ||
    ((isCoordinatorRoute || isSubscriptionRoute) && offersBearer);
  // Both webhook doors self-authenticate by HMAC inside the DO, so neither carries a session.
  const isWebhook = !!boardId && (rest === 'webhooks/github' || rest === 'webhooks/forge');
  let tenantId: string;
  let user: UserPrincipal | null = null;
  let agent: AgentPrincipal | null = null;

  /**
   * Resolve the person behind this request and check their role, or return the refusal.
   *
   * One function because TWO arms need it. A route open to both agents and humans reaches the
   * agent arm first, and when no agent credential resolves there, the person on the other end
   * must get the whole human treatment — not a shortened version of it. The shortened version
   * is what let a viewer create a card.
   *
   * Returns the principal, or the `Response` to send instead. Returned rather than assigned to
   * `user` from inside the closure: TypeScript's control-flow analysis cannot see a write made
   * in a callback, so it kept `user` narrowed to `null` and every later `user?.userId` in this
   * handler became an error on type `never`. The compiler was right — a value set in a closure
   * is not a value this flow can prove is set.
   */
  const resolveHumanOrRefuse = async (): Promise<UserPrincipal | Response> => {
    let human = await resolveUser(request, env);
    // A hub-issued token is accepted on the human routes too, because the
    // routes that QUEUE work are where authority has to arrive: the grant is
    // recorded with the card and outlives the token that carried it.
    if (!human) human = await resolveHubUser(request, env);
    if (!human) return Response.json({ error: 'sign in to continue' }, { status: 401 });
    // A viewer reads the board; working it — creating, moving, editing and deleting cards,
    // resolving gates, answering an agent's question — is `member`, and reworking the board
    // itself is `admin`. GET is almost the whole read surface, so the method is the right
    // discriminator rather than a list of paths that would drift from the routes below it.
    //
    // Marking a notification read is the exception: it is a POST that changes nothing about the
    // board, only about what its recipient has already seen. A viewer who was assigned a card
    // receives notifications for it, and being unable to clear them would leave a badge they
    // can never dismiss.
    // Commenting is the other exception, deliberately: a comment is a remark about the work, not a
    // change to it, so anyone who may read the board may post one (and delete their own).
    const needed: Capability =
      request.method === 'GET' || rest.startsWith('notifications/') || /^cards\/[^/]+\/comments(\/[^/]+)?$/.test(rest)
        ? 'read'
        : rest === '' || rest === 'stages' || rest === 'github' || rest === 'budget' || rest === 'stale' || rest === 'decision-timeout' || rest === 'profiles' || rest.startsWith('schedules')
          ? 'manage'
          : 'work';
    return refuseByRole(human, needed) ?? human;
  };

  if (isWebhook) {
    const t = url.searchParams.get('tenant');
    if (!t || t.trim() === '') return Response.json({ error: 'tenant required' }, { status: 400 });
    tenantId = t;
  } else if (isAgentRoute) {
    agent = await resolveAgent(request, env);
    // Mirrors the human fallback below: a node can now exchange its own credential for a
    // short-lived hub token whose sub is an agent principal, and superpipeline must accept it as
    // that agent — capabilities still come from superpipeline's own agents row, never the claim.
    if (!agent) agent = await resolveHubAgent(request, env);
    // A route open to both resolves as a human when no agent credential was offered, and falls
    // through to the human branch's own 401 rather than reporting "a valid agent token is
    // required" to a person who holds no agent token and needs none.
    if (!agent && (isEitherRoute || isCoordinatorRoute || isSubscriptionRoute)) {
      // Not a shortcut past the human branch — the SAME branch. A coordinator route reached
      // with a bearer that names no agent is still a person creating a card, and a person
      // creating a card is `work`. The earlier version of this resolved a user and stopped,
      // which on a GET was survivable and on `POST cards` would have been a role check skipped.
      const resolved = await resolveHumanOrRefuse();
      if (resolved instanceof Response) return resolved;
      user = resolved;
      tenantId = resolved.tenantId;
    } else {
      if (!agent) return Response.json({ error: 'a valid agent token is required' }, { status: 401 });
      // Scopes stop being decoration here. Every `spa_` token has carried a scope set since
      // migration 0001, the resolver has always returned it, and nothing compared it to the action
      // being attempted — so a token minted to claim drove every run verb. A recorded permission
      // nobody checks reads as protection that does not exist (auth/scopes.ts).
      const needed = requiredScope(rest, request.method, { hasBoardId: !!boardId });
      if (needed === SCOPE_FORBIDDEN) {
        return Response.json(
          { error: `an agent token cannot ${request.method} this route` },
          { status: 403 },
        );
      }
      if (needed && !scopePermits(agent.scopes, needed)) {
        return Response.json({ error: `this token is not permitted to ${needed}` }, { status: 403 });
      }
      tenantId = agent.tenantId;
    }
  } else {
    const resolved = await resolveHumanOrRefuse();
    if (resolved instanceof Response) return resolved;
    user = resolved;
    tenantId = resolved.tenantId;
  }

  try {
    if (!boardId) return await boardCollection({ request, env, url, tenantId, user, agent });

    const stub = boardStub(env, tenantId, boardId);
    // Only CARD writes (cards, claims, runs, gates) move `lastActivityAt`. Board-level writes (stage
    // edits, labels, settings, rename) deliberately do not: the switcher's "Today" means work happened.
    // Any successful write that can change a card moves the board's "last activity" (see the
    // wrapper in index.ts, which acts once the response is known to be a success).
    if (request.method !== 'GET' && /^(cards|claims|runs|gates)(\/|$)/.test(rest)) {
      touchOnSuccess.set(request, { tenantId, boardId });
    }

    return await dispatch(BOARD_ROUTES, { request, env, url, tenantId, boardId, rest, user, agent, stub }, rest, request.method, methodNotAllowed);
  } catch (err) {
    return unexpected(err);
  }
}
