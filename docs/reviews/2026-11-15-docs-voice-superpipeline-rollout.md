# Claims ledger — SuperPipeline docs voice rollout

Status: draft-stage evidence for the 35-page voice rollout.

## Immutable revisions and scope

- PR base: `970369fa537612c029701955b1be3ffb05ea87f1`.
- Voice guide: `SuperJackfruitLabs/sketchbook@29690e4397467bcf92ea7ef7e88b4e89cffba88f`, `ideas/2026-11-14-docs-voice-guide-v1/README.md`.
- Reference rollout: `SuperJackfruitLabs/superdispatch`, merged PR #32; its published narrator and ledger shape were the standard, not a source of wording.
- Scope: all 35 published pages under `docs-site/src/content/docs/`, the docs claims ratchet, and this ledger.
- The 11 generated CLI pages and generated MCP reference remain generated and unchanged; their source tables, generators, and equality tests were reviewed with the rendered pages.
- Product behavior, site setup, theme, components, styles, configuration, and home-page layout are unchanged. Product evidence below is pinned to the PR base.

## Page-by-page voice review

Every page passes narrator, candor, exactness, vocabulary/privacy, originality, and claims. “Payoff” and “gag” are page-kind rows from the guide; `n/a` is explained by the page kind.

| Page | Kind | Narrator and momentum | Step payoff | Running gag | Exact and safety material |
|---|---|---|---|---|---|
| `index.mdx` | home/concept | pass — shared `we`, direct `you`, and a clear route into the docs | n/a — no action-bearing steps | n/a — not a tutorial | pass — links, names, and card layout stay literal |
| `start/first-board.md` | tutorial | pass — one guide carries sign-in through the first run | pass — all five numbered actions end in an observable result or reason | pass — the board’s cast/plot premise is introduced, developed, and paid off once | pass — templates, states, errors, and recovery stay literal |
| `start/what-it-is.md` | concept | pass — direct reader framing around the two product differences | n/a — conceptual page | n/a — concept page | pass — product boundaries and links stay literal |
| `start/concepts.md` | reference | pass — the narrator names the vocabulary before using it | n/a — definitions, not actions | n/a — reference page | pass — tables, enums, defaults, and limits stay literal |
| `start/install-on-your-phone.md` | task | pass — direct platform-specific guidance | pass — each install sequence ends with what the icon opens; iOS sign-in explains the consequence | n/a — task page | pass — offline warning precedes the light “front door” aside |
| `use/boards.md` | concept/task | pass — shared design journey with candid destructive boundaries | pass — configuration actions state what the board gains or refuses | n/a — no running gag | pass — JSON, limits, routes, warnings, and deletion behavior stay literal |
| `use/cards.md` | concept/reference | pass — warm framing around the card and its receipts | n/a — primarily reference | n/a — reference page | pass — state/reason tables, limits, JSON, and concurrency recovery stay literal |
| `use/planning.md` | concept/task | pass — direct explanation of why each planning signal exists | pass — command groups end in their ordering or visibility consequence | n/a — no running gag | pass — dates, commands, enums, and link semantics stay literal |
| `use/recurring.md` | task/reference | pass — direct setup with one narrative aside | pass — schedule creation ends with ownership of the next creation time | n/a — task page | pass — grammar, defaults, timings, and failure behavior stay literal |
| `use/runbooks.md` | task/concept | pass — shared narrator separates guidance from enforcement | pass — each setting explains what the worker or board gains | n/a — no running gag | pass — commands, JSON, failure handling, and warning example stay literal |
| `use/agents.md` | concept | pass — diagnosis-first narrator guides the reader through exact routing | n/a — conceptual/reference sections | n/a — concept page | pass — equality, implications, and concurrency remain exact |
| `use/autonomy.md` | concept/reference | pass — grants are introduced one boundary at a time | n/a — not a procedural tutorial | n/a — concept page | pass — scope, refusal, and dispatch tables stay literal |
| `use/gates.md` | concept/task | pass — a real `we`/`you` narrator frames the decision boundary | pass — setting the gate ends with the enforced consequence | n/a — no running gag | pass — policy, timeout, quorum, check, and recovery material stay literal |
| `use/people.md` | concept/reference | pass — direct explanation of why roles matter | n/a — reference page | n/a — reference page | pass — role and membership rules stay literal |
| `use/comments.md` | concept/task | pass — direct guidance separates conversation from decisions | pass — posting/reading paths end in who receives the thread | n/a — no running gag | pass — role table, limits, routes, and timing stay literal |
| `use/cli.md` | task/tour | pass — one guide carries installation through refusals | pass — install, sign-in, and tour sections state the resulting identity or capability | n/a — task page | pass — every command, flag, value, identity rule, and recovery remains literal |
| `use/register-an-agent.md` | task | pass — shared five-step journey | pass — all five actions end in a visible routing/identity/credential/station/card result | n/a — task page | pass — commands, token handling, permissions, and recovery remain literal |
| `use/stuck-cards.md` | recovery task | pass — diagnosis begins with the two kinds of stop | pass — resume and inspection actions state the next card state | n/a — recovery page | pass — warnings and recovery instructions are complete and humor-free |
| `build/agent-contract.md` | task/concept | pass — shared loop from discovery to one explicit ending | pass — all five loop actions end in a result the harness can observe | n/a — task page | pass — schemas, codes, limits, and error handling stay literal |
| `build/auth.md` | concept/reference | pass — caller kind is named before authority | n/a — reference page | n/a — reference page | pass — header, scope tables, cookie attributes, and refusals stay literal |
| `build/events.md` | concept/reference | pass — reader chooses among three delivery boundaries | pass — subscription verification states what trust it buys | n/a — reference page | pass — routes, headers, retries, events, and payloads stay literal |
| `build/mcp.md` | task/reference | pass — shared narrator maps tools onto the run loop | pass — threading and wire choice state the safety/result they buy | n/a — reference page | pass — tool names, scopes, header, and exceptions stay literal |
| `build/services.md` | concept/reference | pass — services are framed as a narrow integration boundary | n/a — route reference | n/a — reference page | pass — scopes, routes, fields, limits, and statuses stay literal |
| `reference/mcp-tools.md` | generated reference | pass — warm generated intro points to the guided page | n/a — generated reference | n/a — generated reference | pass — generated tool names, arguments, scopes, and hints are untouched |
| `reference/cli/index.md` | generated reference | pass — warm intro distinguishes tour from reference | n/a — generated reference | n/a — generated reference | pass — generated commands, flags, defaults, and access rules are untouched |
| `reference/cli/session.md` | generated reference | pass — light direct intro | n/a — generated reference | n/a — generated reference | pass — exact generated material untouched |
| `reference/cli/boards.md` | generated reference | pass — light direct intro includes safe stage-edit guidance | n/a — generated reference | n/a — generated reference | pass — exact generated material untouched |
| `reference/cli/cards.md` | generated reference | pass — light direct intro names the task family | n/a — generated reference | n/a — generated reference | pass — exact generated material untouched |
| `reference/cli/comments.md` | generated reference | pass — direct explanation of the thread boundary | n/a — generated reference | n/a — generated reference | pass — exact generated material untouched |
| `reference/cli/gates.md` | generated reference | pass — direct control-pair framing | n/a — generated reference | n/a — generated reference | pass — exact generated material untouched |
| `reference/cli/links.md` | generated reference | pass — direct enforced/advisory distinction | n/a — generated reference | n/a — generated reference | pass — exact generated material untouched |
| `reference/cli/labels.md` | generated reference | pass — concise reader-oriented intro | n/a — generated reference | n/a — generated reference | pass — exact generated material untouched |
| `reference/cli/projects.md` | generated reference | pass — concise reader-oriented intro | n/a — generated reference | n/a — generated reference | pass — exact generated material untouched |
| `reference/cli/schedules.md` | generated reference | pass — concise timing boundary | n/a — generated reference | n/a — generated reference | pass — exact generated material untouched |
| `reference/cli/workspace.md` | generated reference | pass — direct routing diagnosis | n/a — generated reference | n/a — generated reference | pass — exact generated material untouched |

Candor passes across the set: claim refusals, advisory placement, stale leases, completion refusal, retries, timeouts, offline limits, destructive writes, scope boundaries, and unbuilt live completion checks remain explicit. No real local host, person, agent, team, credential, customer, or private-message name was added. Public product/domain names, loopback examples, synthetic identifiers, and placeholder tokens are the only identifiers used.

## Claims checked at the PR base

Each row covers every material command, flag, route, setting, default, field, enum, limit, version, and behavioral statement on that page. The generated references are compared exactly with their source generators by the tests named below. Broad line ranges are deliberate: they identify the complete implementation modules reviewed rather than presenting one representative line as evidence for a page-wide check.

| Page | Material checked | Base evidence |
|---|---|---|
| `index.mdx` | capability ownership; claimability; gates; completion requirements; standalone/AgentPod boundary | `packages/contract/src/entities.ts:1-423`; `packages/contract/src/completion.ts:1-119`; `apps/api/src/board/claims.ts:1-621`; `apps/api/src/board/gates.ts:1-963` |
| `start/first-board.md` | product enablement and workspace bootstrap; all five templates/stages/capabilities; first-stage behavior; agent/token creation; card state and claim diagnostics | `packages/contract/src/templates.ts:1-143`; `apps/api/src/auth/org-tenancy.ts:1-92`; `apps/api/src/routes/agents.ts:1-492`; `apps/api/src/board/cards.ts:1-510`; `apps/api/src/board/claims.ts:1-621` |
| `start/what-it-is.md` | capability routing; approval separation; agent-framework boundary; run verbs and event/Treaty boundary | `apps/api/src/board/claims.ts:1-621`; `apps/api/src/board/gates.ts:1-963`; `packages/contract/src/verbs.ts:1-104`; `apps/api/src/push/relay.ts:1-95` |
| `start/concepts.md` | every entity; owner kinds; gates/checks/WIP/requires/instructions/completion; eight states; lease/circuit breaker; roles of capabilities, agents, labels, projects, links, schedules; complete flow | `packages/contract/src/entities.ts:1-423`; `packages/contract/src/state-machine.ts:1-101`; `packages/contract/src/completion.ts:1-119`; `apps/api/src/board/pipeline.ts:1-520`; `apps/api/src/board/run-verbs.ts:1-572` |
| `start/install-on-your-phone.md` | manifest, standalone display, iOS tags, icon serving, no service worker/offline cache | `apps/web/static/manifest.webmanifest:1-18`; `apps/web/src/app.html:1-41`; `apps/web/src/lib/installable.test.ts:1-103`; `apps/web/e2e/installable.spec.ts:1-47` |
| `use/boards.md` | stage owners/keys/removal/reorder; atomic validation; one-stage patch; placement shape/enums/20-item limits/advisory behavior; schedules; WebSocket/UI/budget/delete behavior | `packages/contract/src/entities.ts:1-423`; `apps/api/src/board/pipeline.ts:1-520`; `apps/api/src/board/placement.ts:1-54`; `apps/api/src/board/schedules.ts:1-383`; `apps/api/src/board/cards.ts:1-510` |
| `use/cards.md` | eight states and five parked reasons; moves/WIP/blockers/subtasks; runs/circuit breaker/cost/spec rendering contract; references/comments/history | `packages/contract/src/entities.ts:1-423`; `packages/contract/src/attention.ts:1-35`; `apps/api/src/board/moves.ts:1-654`; `apps/api/src/board/run-verbs.ts:1-572`; `apps/api/src/board/references.ts:1-148`; `apps/api/src/board/comments.ts:1-159` |
| `use/planning.md` | label identity/origin/removal; due-date ordering and notices; project/milestone rollups; link kinds/cycles/cross-board advisory behavior; split/deferred parent; archive | `apps/api/src/db/labels.ts:1-217`; `apps/api/src/db/projects.ts:1-444`; `apps/api/src/board/links.ts:1-66`; `apps/api/src/board/claims.ts:1-621`; `apps/api/src/board/cards.ts:1-510` |
| `use/recurring.md` | commands; four rule forms; day/interval limits; IANA timezone; five-minute sweep; overlap default; creator/grant and disable behavior | `apps/api/src/board/recurrence.ts:1-200`; `apps/api/src/board/schedules.ts:1-383`; `packages/cli/src/commands/schedules.ts:1-179` |
| `use/runbooks.md` | instruction and completion commands/schema; handoff/reference/live arms; one rework then park; judging outcomes/return stage; card override; human-stage and single-stage patch behavior | `packages/contract/src/completion.ts:1-119`; `packages/contract/src/outcome.ts:1-153`; `apps/api/src/board/run-verbs.ts:1-572`; `apps/api/src/board/pipeline.ts:1-520`; `packages/cli/src/commands/boards.ts:1-400` |
| `use/agents.md` | exact/effective capabilities; `all`/`any`; implications; registry origins/diagnostics; per-board concurrency; linked principal behavior | `packages/contract/src/claims.ts:1-79`; `apps/api/src/board/claims.ts:1-621`; `apps/api/src/routes/capabilities.ts:1-216`; `apps/api/src/routes/agents.ts:1-492` |
| `use/autonomy.md` | six agent scopes; queue allowlist/owner/grant/ceiling; forbidden gate/pipeline/delete operations; agent moves and gate crossing | `packages/contract/src/scopes.ts:1-63`; `apps/api/src/auth/scopes.ts:1-227`; `apps/api/src/auth/agent-queue.ts:1-123`; `apps/api/src/board/moves.ts:1-654` |
| `use/gates.md` | three gate kinds and decisions; admin policy edits; note limit; separation; timeout/quorum/variants/hold limits; checks; relay/chat path; Needs-you behavior | `apps/api/src/board/gates.ts:1-963`; `apps/api/src/board/gate-quorum.ts:1-198`; `apps/api/src/board/decision-timeouts.ts:1-293`; `apps/api/src/board/machine-checks.ts:1-557`; `apps/api/src/push/relay.ts:1-95` |
| `use/people.md` | four roles/inheritance; membership bootstrap/invite/removal/last-owner; non-member refusal; user-scoped notifications; CLI identity | `apps/api/src/db/members.ts:1-170`; `apps/api/src/auth/scopes.ts:1-227`; `apps/api/src/auth/org-tenancy.ts:1-92`; `packages/cli/src/commands/session.ts:1-238` |
| `use/comments.md` | read/post/delete matrix; append-only/deletion audit; 8 KB limit; routes; newest 20/16 KB run context; mid-run/next-stage delivery | `apps/api/src/board/comments.ts:1-159`; `apps/api/src/routes/boards/comments.ts:1-48`; `apps/api/src/board/run-history.ts:1-121`; `packages/cli/src/commands/comments.ts:1-83` |
| `use/cli.md` | install/update/checksum; login/credential precedence and environment; every shown command/flag; merge concurrency; identity/scope and status behavior | `packages/cli/src/commands.ts:1-359`; ten `packages/cli/src/commands/*.ts` modules; `packages/cli/src/reference.test.ts:1-194`; exact generated comparison in the docs-only CI command |
| `use/register-an-agent.md` | capability normalization; linked principal uniqueness; create flags/default concurrency; token kinds/one-time output/file mode/lifetime; AgentPod bridge command boundary; card claim/log; human-only refusal | `apps/api/src/routes/capabilities.ts:1-216`; `apps/api/src/routes/agents.ts:1-492`; `packages/cli/src/commands/workspace.ts:1-468`; `apps/api/src/board/claims.ts:1-621` |
| `use/stuck-cards.md` | reclaim/fail/release/rework/return/subtask healing; breaker limits; five needs-human reasons; resume effects/refusals; Inbox and stale threshold/digest rules | `apps/api/src/board/run-verbs.ts:1-572`; `apps/api/src/board/stale.ts:1-453`; `apps/api/src/board/attention.ts:1-148`; `apps/api/src/board/moves.ts:1-654`; `packages/contract/src/attention.ts:1-35` |
| `build/agent-contract.md` | full discover/claim/run/finish loop; claim results/reasons/order/reservation/window; lease 15 minutes; outcomes; completion; elicitations/comments/split; scopes; error codes | `apps/api/src/board/claims.ts:1-621`; `apps/api/src/board/run-verbs.ts:1-572`; `apps/api/src/board/reservations.ts:1-96`; `apps/api/src/board/placement-window.ts:1-117`; `packages/contract/src/outcome.ts:1-153`; `apps/api/src/mcp/tools.ts:1-442` |
| `build/auth.md` | four caller kinds; PKCE/device/offline verification; product enablement/bootstrap/session; agent token format/scopes/defaults/revocation; station/service tokens; cookie properties | `apps/api/src/auth/resolve.ts:1-373`; `apps/api/src/auth/org-tenancy.ts:1-92`; `apps/api/src/auth/scopes.ts:1-227`; `apps/api/src/auth/session.ts:1-97`; bearer parser `apps/api/src/auth/resolve.ts:29-31` |
| `build/events.md` | log limits; push config route/fields/default/refusals/callers; HMAC headers; retry/backoff/dead queue; every subscribable/log-only/relay event; relay URL/type/schema/id | `apps/api/src/board/push.ts:1-226`; `apps/api/src/push/events.ts:1-38`; `apps/api/src/push/deliver.ts:1-73`; `apps/api/src/push/relay.ts:1-95`; `apps/api/src/service-routes.ts:1-290` |
| `build/mcp.md` | endpoint/auth/stateless identity; all tools/scopes/hints; run threading; completion/elicitation/identity; REST exceptions; complete bearer grammar | `apps/api/src/mcp/server.ts:1-70`; `apps/api/src/mcp/tools.ts:1-442`; `apps/api/src/mcp/auth.ts:41-43,77-81`; generated equality test `packages/docs-check/src/reference.test.ts:1-115` |
| `build/services.md` | service identity and isolation statuses; all 11 scopes; every named route/body/response; placement limits/defaults; broker/publication/evidence behavior | `apps/api/src/service-routes.ts:1-290`; `apps/api/src/auth/scopes.ts:1-227`; `apps/api/src/routes/boards/eligibility.ts:1-8`; `apps/api/src/routes/boards/reservation.ts:1-9`; `apps/api/src/routes/boards/evidence.ts:1-31` |
| `reference/mcp-tools.md` | every registered tool, description, argument schema, scope, and hint | generator `packages/docs-check/src/mcp-reference.ts:1-126`; registrations `apps/api/src/mcp/tools.ts:1-442`; exact equality test `packages/docs-check/src/reference.test.ts:1-115` |
| `reference/cli/index.md` | command inventory; global flags; credential order; environment; access; statuses/errors | `packages/cli/src/commands.ts:1-359`; generator `packages/cli/src/reference.ts:1-227`; exact equality test `packages/cli/src/reference.test.ts:1-194` |
| `reference/cli/session.md` | `login`, `logout`, `whoami`, `help`, `version`, `skill`, `update` arguments/flags/behavior | `packages/cli/src/commands/session.ts:1-238`; `packages/cli/src/commands.ts:1-359`; `packages/cli/src/reference.test.ts:1-194` |
| `reference/cli/boards.md` | board/template/create/set-stage commands, arguments, flags, defaults, and access | `packages/cli/src/commands/boards.ts:1-400`; `packages/cli/src/commands.ts:1-359`; `packages/cli/src/reference.test.ts:1-194` |
| `reference/cli/cards.md` | card/create/labels/edit/move/resume/stale/archive/log commands, arguments, flags, defaults, and access | `packages/cli/src/commands/cards.ts:1-543`; `packages/cli/src/commands.ts:1-359`; `packages/cli/src/reference.test.ts:1-194` |
| `reference/cli/comments.md` | comment/list commands, arguments, limits, and access | `packages/cli/src/commands/comments.ts:1-83`; `packages/cli/src/commands.ts:1-359`; `packages/cli/src/reference.test.ts:1-194` |
| `reference/cli/gates.md` | gates/approve/delivery/reject/request-changes commands, arguments, flags, and access | `packages/cli/src/commands/gates.ts:1-181`; `packages/cli/src/commands.ts:1-359`; `packages/cli/src/reference.test.ts:1-194` |
| `reference/cli/links.md` | link add/remove/list commands, kinds, cross-board flag, and access | `packages/cli/src/commands/links.ts:1-124`; `packages/cli/src/commands.ts:1-359`; `packages/cli/src/reference.test.ts:1-194` |
| `reference/cli/labels.md` | label list/add/remove commands, arguments, and access | `packages/cli/src/commands/labels.ts:1-80`; `packages/cli/src/commands.ts:1-359`; `packages/cli/src/reference.test.ts:1-194` |
| `reference/cli/projects.md` | project/milestone commands, arguments, flags, and access | `packages/cli/src/commands/projects.ts:1-203`; `packages/cli/src/commands.ts:1-359`; `packages/cli/src/reference.test.ts:1-194` |
| `reference/cli/schedules.md` | schedule list/add/remove/pause/resume commands, rule/default flags, and access | `packages/cli/src/commands/schedules.ts:1-179`; `packages/cli/src/commands.ts:1-359`; `packages/cli/src/reference.test.ts:1-194` |
| `reference/cli/workspace.md` | forge/agents/token/queueing/capability/implication commands, arguments, flags, defaults, and access | `packages/cli/src/commands/workspace.ts:1-468`; `packages/cli/src/commands.ts:1-359`; `packages/cli/src/reference.test.ts:1-194` |

## Corrections and evidence-bound changes

No factual change was made silently.

| Old material | New material | Why and evidence |
|---|---|---|
| `build/mcp.md` showed the incomplete copyable header ``Authorization: Bearer`` with no token position. | The page now shows ``Authorization: Bearer <token>``. | MCP accepts a bearer scheme followed by a non-empty value: `apps/api/src/mcp/auth.ts:41-43,77-81`. The claims ratchet now holds the complete shape. |
| `build/auth.md` used the example-shaped ``Authorization: Bearer spa_…`` in general agent-auth prose. | The page now uses the exact neutral placeholder ``Authorization: Bearer <agent token>``; the preceding prose still names `spa_` tokens. | The parser requires `Bearer` plus a non-empty token and supports both local and sign-in-service agent tokens: `apps/api/src/auth/resolve.ts:29-31,189-261`. The neutral placeholder no longer implies that only one accepted token family fits the header. |

## Deployment claims that remain UNVERIFIED

The repository proves intended configuration and protocol behavior, but it cannot prove the current state of private infrastructure:

- **UNVERIFIED:** `app.superpipeline.dev` is the currently deployed web application. `apps/api/wrangler.jsonc:1-185` and the workflows define deployment intent, not live state.
- **UNVERIFIED:** accounts.superjackfruit.com currently has SuperPipeline product enablement and device/browser sign-in wired for the live deployment. The repository proves enforcement and flows, not the private issuer’s current configuration.
- **UNVERIFIED:** linked deployments currently project gates, questions, and attention through the private suite relay/chat infrastructure. The repository proves optional event emission when configured, not that the private deployment is configured now.

Pinned private-estate evidence was requested on card `card_8eddc6e16f58417c`. These statements remain marked unverified; absence from this public repository is not evidence that they are false.

## Mechanical claims ratchet

The existing checks already:

- derive every route, Worker/CLI setting, event, and service scope from source and require each to be documented or held in the shrinking baseline (`packages/docs-check/src/docs-claims.test.ts`, `surface.ts`);
- compare the generated MCP reference exactly with live registrations;
- compare all 11 generated CLI pages exactly with the CLI command table and the flags the implementation reads;
- resolve internal links and require every published page to declare a title and description.

This rollout adds a bearer-header ratchet for the three integration pages. It requires the complete literal shapes in `build/auth.md`, `build/mcp.md`, and `build/events.md`, so a missing scheme or missing placeholder fails CI rather than shipping as copyable-but-refused authentication advice.

## Exact-material inventory

- `index.mdx`: frontmatter, action links, component layout, and product identifiers.
- `start/`: template table, states, errors, commands, domains, platform steps, warnings, and definitions.
- `use/`: every command, JSON body, route, setting, flag, field, enum, default, limit, role table, warning, and recovery sequence.
- `build/`: every route, header, payload, tool, scope, event, retry rule, error code, setting, default, limit, and schema fragment.
- `reference/cli/` and `reference/mcp-tools.md`: all generated material, unchanged and held byte-for-byte to source generators.

No humor was added to any exact region.

## Real checks

- Root `pnpm install --frozen-lockfile`: pass — the lockfile passed supply-chain policy verification; 356 packages were added; pnpm 11.5.2 completed in 8.4 seconds.
- Docs-only CI command from `.github/workflows/ci.yml:78-98`, run exactly as `npm ci && npm run build` in `docs-site`: pass. `npm ci` added 308 packages and audited 309; npm reported 9 dependency vulnerabilities (3 moderate, 6 high) without failing the install. Astro built **36 pages**; Pagefind indexed 36 HTML files; the sitemap was generated.
- The successful build emitted the existing Starlight content warnings that the optional `i18n` collection is empty and the `docs → 404` entry is absent. Neither warning failed the build or points at a page changed by this rollout.
- Docs claims/reference CI command, `pnpm --filter @superpipeline/docs-check test`: pass — **2 files and 21 tests passed**, including the new bearer-header ratchet and exact MCP reference generation.
- Generated CLI CI command, `pnpm --filter @superpipeline/cli exec vitest run src/reference.test.ts`: pass — **1 file and 10 tests passed**.
- Additional `pnpm --filter @superpipeline/docs-check typecheck`: pass — `tsc --noEmit` exited 0.
- CI-path selection against the recorded base reports `docs=true`. Because this rollout extends `packages/docs-check/src/docs-claims.test.ts`, the selector conservatively also reports `app=true`, `landing=true`, `extended=true`, and `full=true`; forge CI therefore runs the broader suite even though product behavior and site setup are unchanged.
