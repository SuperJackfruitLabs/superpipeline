# Changelog

All notable changes to superpipeline are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Entries go under
`## Unreleased`; a release-prep PR stamps them `## vX.Y.Z — YYYY-MM-DD`
(`sh .github/release/prep-release.sh vX.Y.Z`), and the release notes quote that section.

> **The product was called Kaambaan until 2026-09-16.** Entries below that
> predate the rename name the packages and hosts they actually shipped with —
> `@kaambaan/*`, `kaambaan-api.…` — because that is what existed at the time.
> Everything current is `superpipeline`, and an agent token now starts `spa_`
> rather than `kbn_`, with no fallback.

## Unreleased

- A fifth vibe, Console: dense, dark-first, monospaced, with every page's keys in the footer.

- A person moving a card while its run is working ends that run (`status: ended`, a new run outcome `moved`, reported to SuperWitness as cancelled). It used to stay `working` with no card naming it and hold the agent's concurrency until the 15-minute heartbeat timeout reclaimed it. Later verbs on the run are refused `409 STALE_LEASE`.

- Reclaiming a lapsed run counts a failure against its card only while the card still names that run. A run its card had left bumped the card's failure count and requeued it, even from a finished stage.

- The agent of a run a person ended by moving its card may still post a plain note on that run (an activity with no question and no usage) for 10 minutes after the move, so a closing note such as where it saved partial work reaches the card. Every other verb on the run, and a note after the window or on a run ended any other way, is still `409 STALE_LEASE`.

- A caller without a service token on a service-only route (approval requests, approval-subject verify and delivery) is refused `401 UNAUTHORIZED`; it answered `405`.

- Bad input is a 400, never a 500 and never a different action. Malformed JSON is `400 INVALID_JSON` on every board and service route that reads a body (it was a 500 on the run verbs, gate resolve, answering a question and approval-subject verify; `INVALID_APPROVAL_REQUEST` on creating an approval request; `INVALID_INPUT` on the evidence reference). Archiving a card with a malformed body no longer archives it. A gate decision outside `approve`, `approve_manual`, `approve_automatic`, `request_changes` and `reject`, or none, is `400 GATE_DECISION_NOT_ALLOWED` on every gate; on a plain gate it used to reject the card. The approval-subject verify and delivery service routes answer each refusal at its code's status (`INVALID_LIVE_URL` 400, `APPROVAL_SUBJECT_NOT_VERIFIED` and `APPROVAL_HELD` 409) instead of 403. A claim with no agent identity is `401 UNAUTHORIZED` (was 400).

- Every error from the board and service routes is one shape, `{ "error": { "code", "message", "detail"? } }` (treaty `error.v1`). Refusals that answered a plain sentence now carry a code: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `METHOD_NOT_ALLOWED` (405), `UNKNOWN_RUN_ACTION` (404), `BOARD_NOT_FOUND` (404), `INVALID_BODY` or `INVALID_INPUT` (400), and an unplanned failure is `UNEXPECTED` (500). A refusal's `detail` is under `detail` and, as before, beside `code` too. The sign-in and role refusals on the workspace routes (projects, labels, members, capabilities, agents) take the same shape; those routes' own refusals are unchanged.

## v0.0.34 — 2026-11-21

- Every page is one composition, the same in every vibe: the Inbox, the Board, the List, the Card, Crew, Settings and Board settings, Projects, Spend in detail and the board log. A vibe changes how a page looks and how its headline is set, never what it says or where its actions are. The board shows every stage in one track, with its count and who works it, and draws lanes only for the stages that hold cards. The card is the same in the drawer, on a phone and on its own page: one sentence says where it is, for how long and what is wanted, beside the one action that answers it, and Review, Answer and Resume open in its place. The Inbox groups what wants you by what you must do (Review, Answer, Resume a stopped agent, Over budget, Nobody works these stages), with Running, Spend and Activity as tabs. Crew and Settings are tabs with their counts and one table each.

- Live changes move instead of repainting: Inbox rows slide in and out and flash once when they change. The Live pill in the header pauses updates. While paused it counts what is waiting and offers Apply, which plays the changes in order; resuming plays the rest. Your own actions still show at once, and the choice is remembered in this browser.

- Filters hide behind one Filter control beside the page's tabs, which counts the filters that are on; F opens it. On the Inbox it holds find, the group chips, the Agent, Label and Priority menus and the sort. The List keeps Group by and Sort by beside Board | List. Studio's List loses its own quick filter: use Filter.

- Long lists and lanes fold behind "Show N more" and say who is waiting. An Inbox group, the Running tab and a board lane show five cards, then twenty more at a time, and the button says how many of the next cards want you ("Show 6 more · 2 want you"). The List shows 30 rows, Crew ten agents, Settings six labels, Activity twenty entries and the board log fifty. A lane's count is still the whole lane, and a card dropped on a folded lane lands there.

- Pages say what they are waiting for. Crew, Settings, the board's schedules and the card show a short placeholder, after 8 seconds say the server is slow, and offer Try again; a read that fails says so and offers Try again. A card shows its title and track at once while the rest loads. A schedules list that could not be read no longer says the board has none, and Connections no longer says "Not linked" when it could not ask. On a phone the header no longer jumps when the Live pill changes its word.

- Every page's footer names the keys that work on it (hidden on a phone). On the Inbox, J / K pick a row, O opens it, M moves it, R resumes it and F opens the filter. On the List, J / K pick a row, Enter opens it, M moves it, S changes the sort and R the grouping, so G stays the G I / G P / G C shortcut to Inbox, Plan and Crew. Esc closes the card.

- Fixes you would notice: a card opened from its link closes with Esc or Close and stays closed, and its link or ⌘K opens it again. Esc leaves the card's own page from anywhere on it. Cards that another person or window adds keep arriving live, on the board and in the Inbox, even while the page is still opening.

- The board moves on live changes too: a card someone else or an agent moves fades out of its lane and rises into its new one while the others glide, a card whose line changes flashes once, and the lane and stage counts tick. On the List, a row that moved glides and a row that changed flashes. Under reduced motion nothing moves.

- Paused, the board's footer says "paused" where it said when it last synced, as the Inbox's does, and the Live pill no longer counts an update that your own change has already shown.

- The Inbox names agents, never ids: an agent the workspace cannot name reads "An agent" in its rows, Running, Activity, Spend, the Agent filter and a question's headline, as the card already did.

- Keep disabled checkpoint integration dormant: ordinary boards create no checkpoint claim tables or triggers, generic claims retain their original behavior, and policy-less claim/run context JSON omits checkpoint markers, including legacy nulls.

- Add separate default-off proposed checkpoint policy administration with strict bounded input, workspace admin checks at the Worker and Board boundaries, and refusal to change an affected stage while work is active. No pilot or deployment is enabled.

- Add proposed service-authenticated checkpoint settlement and historical receipt routes behind independent default-off Worker/Board gates, using the real atomic completion transaction and tenant catalog mapping. Pilot integration remains pending.

- Align the disabled checkpoint settlement candidate with delegated reporter observation; freeze stored authority before policy hashing and retain atomic receipt/completion checks. Actual authenticated Hub report construction and pilot enablement remain pending.

- Add a disabled-by-default, service-only proposed checkpoint source admission/read boundary with tenant-bound routing and strict request-size limits. No policy, credential or pilot is enabled.

### Added

- The disabled checkpoint completion candidate writes tenant-mapped commit links atomically with its receipt and run transition, refusing invalid mappings and ignored reference writes.

- Dedicated checkpoint workers can explicitly request only checkpoint-policy stages, preserving ordinary work for clients with ordinary execution readiness.

- Checkpoint-required claims require explicit protocol support and return their actual captured pending policy. Legacy clients continue claiming ordinary work; checkpoint policy enablement remains disabled.

- A private, disabled checkpoint source-admission candidate binds a prepared source vector and worker-context digest to the actual pending claim. Settlement reads these stored facts and passes them to source verification; no public admission or settlement route is enabled.

### Fixed

- Test ordinary claim parity across legacy and negotiated protocol paths, including reservations, ownership, reporting and refusals.
- Browser logo checks assert the fixed brand colour for each theme, including Studio dark.
- Claims recheck their selected card, policy and eligibility after authorization waits and commit run/card ownership atomically. The disabled checkpoint candidate records an immutable pending policy with that transaction; source admission remains unwired.
- The disabled checkpoint settlement candidate reads back its durable receipt before advancing work and prevents stored receipt updates, deletion and replacement.

## v0.0.33 — 2026-11-16

### Fixed

- Stage completion no longer accepts an earlier run's artifact reference, and reference provenance
  is derived from the authenticated caller so an agent cannot claim a person attached its artifact.
- Approval gates and Operate now show the opening run's linked artifacts and pin known SuperLibrary
  versions, with an explicit message when the run linked none.

## v0.0.32 — 2026-11-15

### Added

- `supi create-card --project <prj_…> --milestone <mls_…>` files a new card under a project and a
  milestone, and `supi edit-card --project/--milestone` moves an existing one. `supi card-label add`
  and `supi card-label rm` add and remove a label on an existing card. The CLI reference documents
  every new flag, and milestone ids are named `mls_…` throughout.

### Changed

- Docs: the site wears the suite docs theme (five sidebar groups, a Bento home; no URL changed), and
  every page is in the suite's docs voice, with each fact checked against the code and a test that
  holds the bearer-header examples to it.
- CI: a pull request that changes only docs runs only the docs checks.
- Docs: the published site covers gates decided by checks, decision timeouts, variants, quorum,
  release time and pull-back, stage `placement`, service principals and their scopes, the service
  routes, and the push and relay events. `docs/05` no longer lists events nobody can subscribe to.
  The docs check also fails when a route, a Worker setting, an event or a service scope is named in
  no doc and is not in `docs/undocumented-baseline.json`, and a pull request that changes that
  surface without touching the docs needs the `no-docs-needed` label.
- The landing page is on frontdoor 0.0.13: nine products in the suite frame.
- Release: the shared release workflow maps the secrets it needs by name rather than serialising
  every secret into one variable.

## v0.0.31 — 2026-11-13

The first SuperDispatch steps: a claim says why it got nothing, a placement service can read who
could claim a card, hold it for the agent it chose and ask for a few seconds to choose, and a stage
can say what a station needs.

### Added

- A null claim says why: `POST /v1/boards/:id/claims` and `superpipeline_claim_card` answer
  `{claimed: false, reason}` with a stable `ClaimReason` code (`board_not_initialized`,
  `board_over_budget`, `concurrency_reached`, `capability_mismatch`, `no_matching_card`,
  `grant_denied`, then `card_reserved` and `placement_window`). Clients must tolerate codes they do
  not know.
- The eligibility read: `GET /v1/boards/:id/cards/:cardId/eligibility` lists every agent in the
  workspace, judged against the card's stage by the claim's own filter, with the reasons any of
  them cannot claim it. A person who can read the board may call it, or a service token with the
  new `dispatch:read` scope.
- A placement service can reserve a ready card for one agent for 10–300 seconds
  (`PUT /v1/boards/:id/cards/:cardId/reservation`, on a service token with `dispatch:reserve`).
  Until the reservation lapses, other agents' claims pass the card over (`card_reserved` when nothing
  else is claimable), and the agent it is held for gets it ahead of priority. The card shows it as
  `reservation`; it clears on claim, and a board admin may clear it (`DELETE …/reservation`). The
  board log records `card.reserved` and `card.unreserved`. With no reservation, claims behave
  exactly as before.
- A board can be opted into scheduling with a **placement window** (`PUT /v1/boards/:id/scheduling`
  `{placementWindowSeconds}`, 0–30, on a service token with `dispatch:reserve`; `GET` reads it). On
  such a board a card that just became ready is held back from pull for that long, so a placement
  service can reserve it first: a claim passes it over unless it is reserved for the claimant
  (`placement_window` when nothing else is claimable), the card and the eligibility read show
  `placementWindowUntil`, and the board relays `card.ready` at once. When no reservation comes the
  window ends on its own and pull proceeds. 0, the default, is today's board.
- A stage may state what a station needs to work it: `placement` `{isolation, models, tools,
  credentials}`, in AgentPod capability catalog ids, set with `PATCH /v1/boards/:id/stages/:key` or
  `PUT /stages` and returned on the board. Advice for a placement service only: a claim never checks it.
- Run reports to SuperWitness carry `stage_key` and `card_id` when `SUPERWITNESS_REPORT_STAGE` is
  `"true"`. Staging sets it; production stays unset until production SuperWitness accepts the fields.

### Fixed

- `work.available` follows a stage's `requires` and the workspace's implication edges, as a claim
  does. A `requires` stage used to push to nobody, or to the wrong configs.

### Changed

- Releases run on the suite's shared release workflow: a `v*` tag on a green main commit builds
  `supi` at the tag, drafts the notes from this file, deploys the app built by CI and smoke-tests
  production. Its hooks are scripts at fixed paths under `.github/release/`.

## v0.0.30 — 2026-11-12

### Added

- Every board-chat event goes through the suite's event relay, beside the direct push:
  `gate.pending`, `elicitation.pending`, `delivery.pending`, `attention.pending`,
  `decision.reminded`, `decision.escalated`, `gate.approval_recorded`, `decision.released`,
  `decision.pulled_back`, `check.failed` and `check.overridden`. Record events and
  `work.available` are not relayed.
- A service token with `gates:read` can also read `GET …/deliveries/pending`,
  `GET …/attention/pending` and `GET …/cards/:cardId/checks`, the chat carrier's other sweep reads.

## v0.0.29 — 2026-11-12

### Added

- A service token with the new `gates:read` scope can read a board's pending gates
  (`GET …/gates/pending`) and one gate (`GET …/gates/:gateId`), so a chat carrier can settle a gate
  decided on the web. Deciding, pulling back and delivery stay human-only.

### Changed

- Approval and question subjects take only an RFC 3339 expiry with seconds and a time zone. A
  looser one is refused `INVALID_APPROVAL_SUBJECT`.

## v0.0.28 — 2026-11-10

### Added

- With `RELAY_URL` and `RELAY_TOKEN` set, each `gate.pending` is also published to the suite's
  event relay as a CloudEvent (HTTP binary mode), queued in the same transaction as the push and
  retried like one. Without them nothing changes.

### Fixed

- An agent's move never gets a card past a gate: a move that would end a pending review or open
  checks, leave or skip a gated stage, or complete the card is refused `409 GATE_PENDING`.
- The week's spend is read once per board, so a live refresh no longer draws it as a dash.

### Changed

- The tests check every push body they read back against treaty's event schemas, and read the
  organization plane's claims from treaty's package.

## v0.0.27 — 2026-11-09

Gates and decisions: a decision says what each answer means, reminds and escalates when nobody
answers, and a gate may offer variants, need more than one approver, wait for its release time or
be decided by checks.

### Added

- Gate options say what they mean (`meaning`, `needsComment`, `delivery`), and a subject-bound
  gate carries its expiry and a bounded preview (`gate.v2`).
- Questions: every option carries a `meaning`; a question with no options takes free text up to
  2000 characters. A manual delivery still owed a live link is pushed as `delivery.pending`.
- Strict decisions and harness permissions travel with their subject; an approving answer must
  name it back.
- A card parked on a person (`repeated-failure`, `blocked`, `not-authorised`) is pushed as
  `attention.pending` and read at `GET …/attention/pending`. Broker approval requests reach chat on
  `elicitation.pending` for a service holding `approval-requests:relay`.
- Decision timeouts: a stage's `timeout` `{remindAfterMinutes?, escalateAfterMinutes?}` (or the
  board default, `PUT /v1/boards/:id/decision-timeout`) reminds the card owner, then escalates to
  the workspace's owners and admins (`decision.reminded`, `decision.escalated`). Nothing resolves on
  a timeout.
- A gate may offer up to three variants of what it approves; approving one chooses it.
- A gate may need more than one approver: a stage's `quorum` `{required: 2–5, from: deciders |
  admins}`. Each approval short of it is pushed as `gate.approval_recorded`.
- An approval may wait for its release time: a stage's `holdFor` (5 minutes to 7 days) or the
  subject's not-before time. Until then a decider or an admin can pull it back
  (`POST …/gates/:gateId/pull-back`); `decision.released` and `decision.pulled_back` are pushed.
- A gate may be decided by checks: a stage's `checks` (`ci` or a SuperWitness `verdict`, 1–5)
  run before people, and `gate: "checks"` passes the stage with nobody asked. A failing check
  returns the card to `returnStage` (`check.failed`); an owner or admin may override one
  (`POST …/cards/:cardId/checks/:name/override`, `check.overridden`). A card's checks are read at
  `GET …/cards/:cardId/checks`.

### Changed

- Decision policy is a workspace admin's to change: a stage's `gate`, approval subject, deciders,
  `timeout`, `quorum`, `holdFor` and `checks` need a workspace owner or admin
  (`403 WORKSPACE_ADMIN_REQUIRED` otherwise).
- An approval subject that expires closes its pending gate.

## v0.0.26 — 2026-11-07

### Added

- `supi create-card --stage <stageKey> --project <projectId>`: file a card that starts mid-board
  or belongs to a project.

## v0.0.25 — 2026-11-06

### Added

- A publisher service can confirm an automatic-delivery approval
  (`POST …/approval-subjects/:subjectId/verify`, `approvals:read`) and record the live URL after it
  posts (`POST …/approval-subjects/:subjectId/delivery`, `approvals:write`). The approved subject
  carries `outboundRequest`, a digest of the exact request, and a request that does not match it is
  refused.
- Manual delivery completion: a chosen-time reminder works through the REST route, the web app and
  `supi`; a manual post's live URL is read back and a mismatch with the approved copy is flagged.

### Changed

- A delivered post can no longer switch between manual and automatic delivery, and a bound gate
  accepts only its own options.
- Pull requests get an advisory Claude review against `REVIEW.md`, and `AGENTS.md` records what
  agents get wrong in this repo.

## v0.0.24 — 2026-11-02

The code is restructured for maintainability. Nothing a user, an agent or an operator sees changes:
the same HTTP routes and answers, the same Board Durable Object storage and SQL, the same `supi`
commands, help and output, the same requests from the web app, and the same deployed bundle
(`BoardDO` and the default export).

### Changed

- The Board Durable Object is a thin shell over one module per domain (`apps/api/src/board/`); the
  Worker entry is a router over one module per resource (`apps/api/src/routes/`); `supi` is one
  module per command group; the web app's API client is one module per resource behind
  `$lib/api`. No file is over 1,000 lines and no package has an import cycle.
- Each move was pinned first by a characterization test written against the old code (the board's
  statements and answers, every Worker route, every `supi` command, every web API call), which
  the restructured code passes unchanged.
- Lint: no `any`, no floating promises, no unexplained empty block and no stray `console` in
  shipped source; the Worker logs through one module, with the same lines and severities as
  before. See `docs/contributor/code-structure.md` and `docs/contributor/modularity-plan.md`.
- Docs: first-board sign-in states the organization product-access prerequisite.

### Fixed

- `packages/cli/README.md` held its "What it can do" section thousands of times over (186,784
  lines); it is back to one copy.

## v0.0.23 — 2026-10-30

Strict agent work: approvals a person can read and scope, and an agent that can read its own card.

### Added

- Strict decisions are readable: an approval says in plain words what it allows.
- A strict decision may offer "Approve for this run".
- "Always allow" on a strict approval, for workspace owners and admins only. It is the same
  per-agent rule as the console switch.
- An agent reads its own card's earlier runs through its run (board reads).
- The run holder links references from its own card.

### Fixed

- The run read names the answerer by principal id as well as by board user id, so the hub can
  record an "Always allow" rule.

## v0.0.19 — Unreleased

### Changed

- Superpipeline moves onto vibekit: pick Daylight, Paper, Studio or Quiet in Appearance; light, dark or follow the sun. The card opens with what its agent needs. Superlibrary previews hidden for want of a sign-in offer Reconnect.
- Navigation v2: Inbox (the home, `/`), Plan (Boards and Projects) and Crew, with Settings (Labels, Connections, Appearance, Account) under the account menu; the phone bar is Inbox, Plan, Crew, You; keys `G I`, `G P`, `G C`. Operate and Workspace are gone as tabs: Needs you, Running, Spend and Activity live in the Inbox across every board, with a Show row to narrow to one board (held in memory only). `/b/:id/operate` and `/workspace/*` still open the right place.
- Plan → Projects: workspace-wide projects with a page, New/Edit project (name, goal, target date, declared health, first milestone), declared beside computed health, and blockers. The board's own Projects view is removed (`?view=projects` redirects). `POST /v1/projects` accepts `health`; `PATCH /v1/milestones/:id` renames and re-dates.
- Crew tabs each have a create button: New agent, New person, New capability.
- Loading never looks empty: skeletons, "Checking your boards…", a Connecting…/Live/Reconnecting…/Offline pill, "Still loading — the server is slow." at 8 s, Failed with Try again at 20 s (reads time out at 20 s), an error page and a branded boot screen.
- Motion from vibekit 0.0.12 (none under reduced motion); a new logo, favicons and app icons.
- Superlibrary previews: `/auth/login` names the Superlibrary audience when `PLANE_LIBRARY_LINKED=true` (production), `/hub/token` calls are serialised across tabs, previews say the true reason, and Reconnect returns to the same page. Sessions from before the flag need one sign-in.
- Deploy: `main` deploys to staging (staging-app.superpipeline.dev); a `v*` tag on a main commit deploys production (app.superpipeline.dev) from `release.yml`, with remote D1 migrations and a production smoke. The CLI release and the app deploy are independent jobs.
- CI: the `visual` job (base vs head screenshots, `Visual-Change:` trailer) is the PR gate; the `pixel` conformance report runs nightly and on demand; longer timeouts under CI only.

### Fixed

- A dismissed menu no longer leaves the page unclickable (vibekit 0.0.11).
- The left rail fills the window height in Daylight and Studio.

## v0.0.1 — 2026-06-21

**"First Flight."** The first tagged milestone, spanning the work since the
project's first commit on 2026-06-20 — **P0 → P14, 21 merged PRs, 72 commits**.
Every phase was built docs-first and TDD-first (RED → GREEN) and code-reviewed
before merge.

superpipeline is a multi-tenant Kanban board that orchestrates **external** AI agents
through pipeline stages with human approval gates. It is the orchestration
**control plane**, not an agent runtime — agents run anywhere, under any harness,
and connect over one shared contract (MCP **and** REST/webhook) to pull work,
stream progress, and pass cards through stages.

### Platform foundation (P0–P1)
- Cloudflare-native architecture: edge Worker (API / auth / routing / UI host),
  **one Durable Object per board** as the live authority (atomic claims,
  append-only event log, WIP limits, hibernatable WebSocket hub), D1 tenant
  catalog, R2 artifacts, KV sessions.
- **Hard multi-tenant isolation** — no unscoped query path; users are global and
  scoped via memberships; boards routed by `idFromName(tenant:board)`.
- **Contract-first** `@kaambaan/contract`: Zod schemas, the A2A-aligned task
  **state machine**, and a normalized **activity envelope**, shared across API,
  web, and SDK.

### Agent orchestration (P2)
- Atomic, capability-routed **claim** with a lease + fencing epoch; the full run
  loop — `heartbeat` / `postActivity` / `complete` / `block` / `fail` / `release`.
- Reliability: heartbeat-timeout **reclaim** via a single DO alarm, **circuit
  breaker** on repeated failures, and an ack SLA.
- **Structured stage handoff** (summary + metadata JSON) carried between stages.
- `@kaambaan/agent-sdk` — a dependency-free client (injectable `fetch`) with a
  `runOnce` reference driver and a conformance kit that drives a card end-to-end
  over the public REST contract only.

### Approval gates (P3)
- Human-review stages open a pending **gate**; cards sit `input-required` and are
  not claimable until resolved.
- Resolve as **approve** (advance, carrying handoff), **request-changes** (return
  to the prior stage, merging prior handoff + feedback), or **reject** (terminal).
- **Separation-of-duties**, including across chained gates.

### Integrations & references (P4–P5, P7)
- **MCP server** over Streamable HTTP (OAuth 2.1 resource server) mirroring the
  REST verbs — self-describing, with work discovery.
  > *Correction (2026-08-14): "OAuth 2.1 resource server" overstated what shipped. `/mcp` is a
  > Resource Server **shell** — a `401` + RFC 9728 metadata over a bearer token. No authorization
  > server, PKCE, or audience validation was ever built. See
  > [docs/05 §2](./docs/05-integration-surfaces.md). Left as written above because a changelog is a
  > dated record; this note corrects it rather than rewriting it.*
- **REST + webhook API** over the one shared contract.
- **First-class external references** (GitHub issue / PR / repo / docs) —
  idempotent upsert keyed `(card, url)`, with GitHub **webhook sync** and a
  draft-PR sub-state machine (draft → ready → merged).
- Inbound **issue-trigger** funnel; **outbound push** notifications
  (`work.available`) with SSRF guards and retry.

### Cost, budgets & telemetry (P6)
- Per-activity **token/cost metering** rolled up to card and board.
- **Budget caps** enforced on in-flight runs; **pre-run cost estimates** from
  rolling historical windows.
- Attempts/runs history; AG-UI event adapter; in-app notifications.

### Web app — "the agent flight deck" (P8–P14)
- SvelteKit 2 / Svelte 5 (runes) SPA on Cloudflare; **live board** over WebSocket.
- **Board (Kanban)** + **List view** with Linear-style filters, grouping, and
  sorting.
- **Card drawer**: session replay of the typed activity stream; edit
  title/priority/description; add references; delete.
- **Approval-gate UI** (approve / request-changes / reject); **budget controls**
  and cost estimates.
- **Board switcher**, **agent management** (mint / revoke tokens with MCP connect
  snippet), **custom pipeline builder**, **7 domain templates**, and **board
  settings** (rename, GitHub webhook secret, agent profiles).
- Sign-in (GitHub OAuth), onboarding, connect-an-agent; notifications panel;
  responsive to mobile; the "flight deck" visual identity (indigo-ink +
  marigold/teal/coral, Space Grotesk + IBM Plex).

### Auth & deploy (P10, CI)
- **GitHub OAuth** sessions + per-agent **bearer tokens** with scopes; a dev-auth
  header path for local development.
- Live on Cloudflare (`kaambaan-api.mail-88a.workers.dev`), single-worker
  same-origin; CI with separate `test` and `e2e` jobs and auto-deploy.

### Quality
- 110+ unit/integration tests (contract + API running in real `workerd` via
  `@cloudflare/vitest-pool-workers`) plus Playwright E2E specs.

### Known gaps
Tracked toward Linear parity (see the Linear-parity program in `docs/`): no
full-text search or command palette, no saved views, no sub-cards / card
relations, no human↔human comments / @mentions, no labels-management UI, and no
due dates. These are the next milestones, not regressions.

[0.0.1]: https://github.com/SuperJackfruitLabs/superpipeline/releases/tag/v0.0.1
