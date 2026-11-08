/**
 * The order in which the Worker's `fetch` (src/index.ts, before Phase 3) tries its routes, written
 * down from that code as method, pattern and what answers. A method of `*` is any method; a
 * pattern is matched against the URL's pathname, and for a board route against what follows
 * `/v1/boards/:id/`. A route whose handler declines the request (the dev fixture on another path,
 * the sign-in routes on an unknown path, the plane entitlement check when it has nothing to say)
 * lets the routes after it try.
 *
 * Where two patterns overlap, the earlier wins: `/v1/capabilities/implications` before
 * `/v1/capabilities/:id`, `/v1/agents/:id/card` before `/v1/agents/:id`, a card's `resume`
 * POST before its any-method 405, `runs/:id/evidence-reference` and
 * `runs/:id/approval-subject/verify` before `runs/:id/:verb`, and `gates/pending` before
 * `gates/:id`.
 */
export const WORKER_ROUTES: readonly (readonly [method: string, pattern: RegExp, handler: string])[] = [
  ['GET', /^\/health$/, 'health'],
  ['*', /^\/v1\/dev\//, 'devFixture'],
  ['*', /^/, 'orgPlaneEntitlement'],
  ['*', /^\/(?:auth|hub)\//, 'planeSignIn'],
  ['*', /^\/auth\//, 'githubSignIn'],
  ['*', /^\/hub\//, 'hubHandoff'],
  ['GET', /^\/\.well-known\/oauth-protected-resource/, 'protectedResource'],
  ['*', /^\/mcp$/, 'mcp'],
  ['*', /^\/v1\/tenant\/forge$/, 'tenantForge'],
  ['*', /^\/v1\/tenant$/, 'tenantSettings'],
  ['*', /^\/v1\/members(?:\/([^/]+))?$/, 'memberRoster'],
  ['*', /^\/v1\/capabilities\/implications$/, 'implications'],
  ['*', /^\/v1\/capabilities(?:\/([^/]+))?$/, 'capabilities'],
  ['*', /^\/v1\/labels(?:\/([^/]+))?$/, 'labels'],
  ['*', /^\/v1\/admin\/superwitness\/backfill$/, 'superwitnessBackfill'],
  ['*', /^\/v1\/stale$/, 'staleAcrossBoards'],
  ['*', /^\/v1\/projects(?:\/([^/]+)(?:\/(milestones|rollup))?)?$/, 'projects'],
  ['*', /^\/v1\/milestones\/([^/]+)$/, 'milestone'],
  ['*', /^\/v1\/agents\/([^/]+)\/card$/, 'agentCard'],
  ['*', /^\/v1\/agents(?:\/([^/]+)(?:\/(tokens)(?:\/([^/]+))?)?)?$/, 'agentRegistry'],
  ['*', /^\/v1\/boards(?:\/([^/]+))?(?:\/(.*))?$/, 'boards'],
];

/** What answers a request no route above takes: the web app's static assets, or a bare 404. */
export const WORKER_OTHERWISE = 'webApp';

/**
 * Inside `/v1/boards/:id`, once the caller is resolved and the board is not the collection: the
 * board routes in the order the old code tried them, against the rest of the path.
 */
export const BOARD_ROUTES: readonly (readonly [method: string, pattern: RegExp, handler: string])[] = [
  ['*', /^ws$/, 'liveFeed'],
  ['GET', /^$/, 'boardSnapshot'],
  ['PATCH', /^$/, 'boardRename'],
  ['PATCH', /^stages\/([^/]+)$/, 'stageEdit'],
  ['PUT', /^stages$/, 'stagesReplace'],
  ['DELETE', /^$/, 'boardDelete'],
  ['POST', /^cards$/, 'cardCreate'],
  ['POST', /^cards\/([^/]+)\/move$/, 'cardMove'],
  ['POST', /^cards\/([^/]+)\/resume$/, 'cardResume'],
  ['*', /^cards\/([^/]+)\/resume$/, 'methodNotAllowed'],
  ['POST', /^cards\/([^/]+)\/archive$/, 'cardArchive'],
  ['GET', /^cards\/([^/]+)$/, 'cardRead'],
  ['PATCH', /^cards\/([^/]+)$/, 'cardEdit'],
  ['DELETE', /^cards\/([^/]+)$/, 'cardDelete'],
  ['GET', /^cards\/([^/]+)\/comments$/, 'commentsList'],
  ['POST', /^cards\/([^/]+)\/comments$/, 'commentAdd'],
  ['*', /^cards\/([^/]+)\/comments$/, 'methodNotAllowed'],
  ['DELETE', /^cards\/([^/]+)\/comments\/([^/]+)$/, 'commentDelete'],
  ['*', /^cards\/([^/]+)\/comments\/([^/]+)$/, 'commentNeverEdited'],
  ['POST,DELETE', /^links$/, 'linksEdit'],
  ['POST', /^cards\/([^/]+)\/split$/, 'cardSplit'],
  ['PUT', /^cards\/([^/]+)\/references$/, 'cardReference'],
  ['GET', /^cards\/([^/]+)\/attempts$/, 'cardAttempts'],
  ['GET', /^cards\/([^/]+)\/activities$/, 'cardActivities'],
  ['GET', /^cards\/([^/]+)\/estimate$/, 'cardEstimate'],
  ['GET', /^cards\/([^/]+)\/links$/, 'cardLinks'],
  ['GET', /^events$/, 'boardEvents'],
  ['GET', /^usage$/, 'boardUsage'],
  ['GET', /^notifications$/, 'notificationsList'],
  ['POST', /^notifications\/(\d+)\/read$/, 'notificationRead'],
  ['GET', /^profiles$/, 'profilesList'],
  ['POST', /^profiles$/, 'profileSet'],
  ['*', /^schedules(?:\/([^/]+))?$/, 'schedules'],
  ['POST', /^push-configs$/, 'pushConfigRegister'],
  ['POST', /^push\/dispatch$/, 'pushDispatch'],
  ['GET', /^push\/deliveries$/, 'pushDeliveries'],
  ['PUT', /^stale$/, 'staleSettings'],
  ['PUT', /^decision-timeout$/, 'decisionTimeoutSet'],
  ['PUT', /^budget$/, 'budgetSet'],
  ['PUT', /^github$/, 'githubConfig'],
  ['POST', /^triggers$/, 'triggerCreate'],
  ['PUT', /^forge$/, 'forgeSecret'],
  ['POST', /^webhooks\/forge$/, 'forgeWebhook'],
  ['POST', /^webhooks\/github$/, 'githubWebhook'],
  ['POST', /^claims$/, 'claim'],
  ['GET', /^runs\/([^/]+)$/, 'runRead'],
  ['GET', /^runs\/([^/]+)\/attempts$/, 'runAttempts'],
  ['POST', /^runs\/([^/]+)\/evidence-reference$/, 'evidenceReference'],
  ['POST', /^runs\/([^/]+)\/approval-subject\/verify$/, 'approvalSubjectVerify'],
  ['POST', /^runs\/([^/]+)\/([^/]+)$/, 'runVerb'],
  ['GET', /^gates\/pending$/, 'gatesPending'],
  ['GET', /^gates\/([^/]+)$/, 'gateRead'],
  ['POST', /^gates\/([^/]+)\/resolve$/, 'gateResolve'],
  ['POST', /^gates\/([^/]+)\/delivery$/, 'gateDelivery'],
  ['GET', /^deliveries\/pending$/, 'deliveriesPending'],
  ['GET', /^elicitations\/pending$/, 'elicitationsPending'],
  ['GET', /^attention\/pending$/, 'attentionPending'],
  ['POST', /^elicitations\/([^/]+)\/answer$/, 'elicitationAnswer'],
];

/** What answers a board path no board route takes. */
export const BOARD_OTHERWISE = 'methodNotAllowed';
