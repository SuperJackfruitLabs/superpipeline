# Modularity and code-quality plan

Status: done, in one PR on `refactor/modularity`. Phases 0 and 1 are merged on `main` (the lint
ratchet, the architecture ratchets in `scripts/architecture.test.ts`, and the layered, acyclic
`apps/api/src`); this page covers Phases 2–7. [code-structure.md](code-structure.md) describes the
structure and the guardrails; this page keeps the plan, the starting measurements and the outcome.

| Phase | What | State |
|---|---|---|
| 2 | Split the Board Durable Object | done |
| 3 | Split the Worker entry (`apps/api/src/index.ts`) | done |
| 4 | CLI: one module per command group | done |
| 5 | Web: the API client by resource; the remaining web cycles | done |
| 6 | Lint to targets | done |
| 7 | Docs, CHANGELOG | done |

## Outcome

Measured at the end of Phase 7, against `main` at 6435bcb.

| Measure | Before | After |
|---|---|---|
| `apps/api/src/board/board-do.ts` | 8,697 lines | 528 (a shell over 20 modules in `board/`; the largest, `gates.ts`, 581) |
| `apps/api/src/index.ts` | 3,790 lines | 118 (a router over `routes/`; the largest route module, `agents.ts`, 492) |
| CLI largest file | `commands.ts` 1,679 (`index.ts` 1,229) | `credential.ts` 531 (`commands.ts` 359, `index.ts` 196) |
| Web largest file | `lib/api.ts` 1,645 | `lib/stores/app.svelte.ts` 807 (`api.ts` 25, over `lib/api/`; the largest, `cards.ts`, 355) |
| Files over 1,000 lines (`OVERSIZE`) | 6 | 0; the largest file in the repo is `apps/api/src/db/catalog.ts`, 932 |
| Largest import cycle | api 0, web 4, cli 0, contract 0, agent-sdk 0 | 0 everywhere |
| Lint findings held by the baseline | 5,988 across 48 rules | 5,474 across 42 rules |
| `any` | 48 (13 in shipped source) | 0 (one `AnyComponent` alias for tests, and one test fixture, each disabled with a reason) |
| Floating / misused promises | 14 / 0 (none in shipped source) | 0 / 0 |
| `console` in shipped source | 14 | 0 (the Worker logs through `log.ts`) |
| Unnecessary assertions | 1,147 (192 in source) | 955 (0 in source) |
| Unnecessary conversions | 61 (23 in source) | 38 (0 in source) |
| Unused code / `import()` types / shadowing in source | 14 / 3 / 9 | 0 / 0 / 0 |
| `!` assertions / unchecked `as` (held) | 1,637 / 1,658 (286 / 708 in source) | 1,503 / 1,616 (152 / 666 in source) |
| In-place `sort` / `reverse` | 140 / 16 | 132 / 14 |
| Rules shipped source must stay clean of (`SRC_CLEAN`) | 8 | 23 |
| Tests | api 1,709, web 2,725, cli 232, contract 138, docs-check 16, architecture 12 | api 1,714, web 2,820, cli 532, contract 138, docs-check 16, architecture 12 |

The tests added are the characterization records: the board's (2 entries), the Worker's HTTP
surface and route order (3), the CLI's (300 cases) and the web API client's (95 cases).

**How behaviour was held.** Each phase committed its characterization test against the old code
first and showed it could fail (an extra `SELECT` in `notify`; a swapped route match; an extra body
key on `move`; `credentials` on one DELETE). The restructuring commit then passed it unchanged; no
snapshot was regenerated. Code was moved by scripts over the AST or the source rather than
retyped, then reviewed. Every push ran typecheck, lint, the full suite with exact counts under
Node 22, the architecture test, the build and `wrangler deploy --dry-run` (the bundle exports only
`BoardDO` and `default`); the last push also ran the suite in a bare environment (`env -i`, with only Node 22, `bun` and
the system tools on `PATH`), at the same counts. Phase 6's lint
changes are type-only or identity: a fix that would change what runs was left, with its reason.

**Regressions found.** None reached a commit: no characterization snapshot failed after a move.
The near misses were caught before committing: in Phase 6 the linter called one assertion
unnecessary (`mode` on a delivered gate) that the compiler needs for the gate view's union, and
the type checker refused the removal; it is now written as `as const` literals.

The same approach as Salaam's modularity work (its `docs/contributor/modularity-plan.md`):
characterization tests committed against the old code before each split, narrow dependency
interfaces passed in rather than modules reaching for each other, and ratchets that lock each
improvement in.

## Where the code is today

Measured on `main` at 6435bcb, before Phase 2.

| Measure | Today |
|---|---|
| `apps/api/src/board/board-do.ts` | 8,697 lines: one class of 200 methods (88 public), a 691-line constructor that is the whole SQLite schema, and 1,690 lines of types and helpers above it |
| `apps/api/src/index.ts` | 3,790 lines: the Worker's `fetch`, with about 117 `if` route matches in one function |
| `packages/cli/src/commands.ts` / `index.ts` | 1,679 / 1,229 lines |
| `apps/web/src/lib/api.ts` | 1,645 lines (its test 1,036) |
| Files over 1,000 lines | 6 (`OVERSIZE` in `scripts/architecture.test.ts`) |
| Largest import cycle | api 0, web 4 (in `operate/`), cli 0, contract 0, agent-sdk 0 |
| Lint findings held by the baseline | 48 `any`, 14 floating promises (outside shipped source), 1,637 `!`, 1,658 unchecked `as`, 1,147 unnecessary assertions (`scripts/lint-baseline.json`) |
| Tests | api 1,709, web 2,725, cli 232, contract 138, docs-check 16, plus the architecture test |

## Target structure

- **No file over 1,000 lines**; aim for 600. `OVERSIZE` empties as each phase lands.
- **The Board Durable Object is a shell.** `BoardDO` keeps its class name, its RPC methods, `fetch`,
  the WebSocket handlers and `alarm`, and hands each call to the module under `board/` that owns
  the behaviour. Storage, SQL statements and their order, alarms and broadcasts do not change.
- **Modules take narrow dependencies.** A module's functions take a `Deps` value: a `Pick` of the
  board context (`board/context.ts`) naming exactly the storage, environment, clock and other
  operations it uses. Modules do not import each other; the Durable Object builds the one context
  (`board/wiring.ts`). Shared types live in leaf files (`model.ts`, `views.ts`, `rpc.ts`) and shared
  limits in `rules.ts`.
- **The Worker entry is a router.** `index.ts` composes route modules, each owning one resource's
  routes; the router keeps the order routes are matched in.
- **Clients split by command group / resource**, with the help text beside each command.
- **Imports point down.** `API_LAYERS` holds for `apps/api/src`; the web app's cycles reach 0.

## Rules

1. **Behaviour does not change.** HTTP routes, RPC methods, the DO's storage and SQL, CLI output
   and the web client's requests stay exactly as they are.
2. **Characterization first.** Before a phase moves behaviour, it commits tests against the old
   code that pin what that code does (statements, responses, order). The restructuring commit then
   makes them pass unchanged. A snapshot written against the old code is never regenerated to
   make a restructuring pass.
3. **Tests change only import paths**, or how a dependency is injected. None is skipped.
4. **Ratchets only fall.** `pnpm lint` and `pnpm test:architecture` pass on every commit; when a
   number falls, the same commit lowers it (`pnpm lint --update`, `OVERSIZE`, `LARGEST_CYCLE`).
5. **No registries or service locators.** A dependency is a typed parameter.

## Phases

| Phase | What | Done when |
|---|---|---|
| 2 | **Board Durable Object.** Pin the DO's behaviour (below). Move the schema to `schema.ts`, the types to leaf files, and the methods into domain modules: the card store, cards, maintenance, moves, the pipeline, holds (links, blockers, children), claims, run verbs, gates, approval subjects, questions, comments, run history, references, triggers, metering, push, run reports, schedules and the sweep. `board-do.ts` keeps the class, its RPC methods and `fetch`/`alarm`/WebSocket handlers, and re-exports every name it exported. | No board file over 1,000 lines (aim 600); `board-do.ts` a thin shell; the bundle still exports only `BoardDO` and `default`; the characterization snapshot passes unchanged |
| 3 | **Worker entry.** Pin route matching (method, path, status and body for each route family, and the fallthrough) before the split. `index.ts` becomes a router over route modules (boards, cards, runs, gates, agents, tokens, projects, webhooks, auth, MCP, health), each with the dependencies it needs passed in. | `index.ts` under 600 lines; no route module over 600; route order and responses unchanged |
| 4 | **CLI.** Pin the help text and the requests each command makes. `commands.ts` and `index.ts` become one module per command group, each with its help beside it. | No CLI file over 600 lines; help and requests unchanged |
| 5 | **Web.** Pin the requests `lib/api.ts` makes. Split it by resource behind the same exports, and split `api.test.ts` with it. Break the remaining cycles: one of 4 files in `operate/`, three of 3. | `LARGEST_CYCLE` for `apps/web/src` is 0; no web file over 1,000 |
| 6 | **Lint to targets.** No `any` in shipped source; no `catch` without a reason; no floating promises anywhere; the clearly behaviour-preserving cleanups (type-only imports, unused code, unnecessary assertions) where the change is mechanical. | `no-explicit-any` and `no-floating-promises` leave the baseline; empty catches explained; baseline lowered |
| 7 | **Close.** Update `code-structure.md` with the module map and rules, the README's development section, and the CHANGELOG. | Docs match the code |

### Phase 2: result

`board-do.ts` went from 8,697 lines to a 528-line shell; `board/` has 36 files, none over 600
lines. The bundle still exports only `BoardDO` and `default`, and the class has the same 88 public
methods (compared by name before and after).

| File | Lines | What |
|---|---|---|
| `board-do.ts` | 528 | the class: RPC methods, `fetch`, WebSocket handlers, `alarm`; re-exports |
| `wiring.ts` / `context.ts` | 148 / 177 | the board context and how it is built |
| `model.ts` / `views.ts` / `rpc.ts` | 559 / 436 / 263 | shared types; `BoardStub` |
| `rules.ts` | 90 | shared limits and `handoffSummary` |
| `schema.ts` / `schema-part-2.ts` | 405 / 295 | the SQLite schema, in order (regrouped in Phase 3) |
| `card-store.ts` | 272 | meta, stages, card rows, the event log, notifications |
| `cards.ts` | 463 | create, edit, split, delete |
| `maintenance.ts` | 248 | fixture import, backfills, test-only setters |
| `moves.ts` | 571 | moving, advancing, resolving and parking cards |
| `pipeline.ts` | 422 | init, stages, name, profiles, events, snapshot |
| `holds.ts` | 317 | blockers, children, links |
| `claims.ts` | 448 | claim, lease, heartbeat, reclaim, run ownership |
| `run-verbs.ts` | 561 | activities, complete, submit, block, fail, release |
| `gates.ts` | 581 | approval gates and their push body |
| `approval-subjects.ts` | 331 | digest-bound approval subjects |
| `elicitations.ts` | 445 | questions and answers |
| `comments.ts` / `references.ts` | 159 / 148 | comment threads; external references |
| `run-history.ts` | 311 | run context, evidence, attempts, activities |
| `triggers.ts` | 314 | GitHub and Forgejo webhooks |
| `metering.ts` / `push.ts` | 225 / 161 | usage and budgets; notifications and push delivery |
| `run-reports.ts` | 352 | superwitness run reports |
| `schedules.ts` / `stale.ts` | 381 / 341 | recurring cards; the sweep |

The method bodies moved unchanged except `this.` becoming `deps.` (or a direct call within a
module); they were moved by a script over the TypeScript AST rather than by hand, then reviewed.

### Phase 2: how the Board Durable Object is pinned

`apps/api/test/board-characterization.test.ts` drives one board through every family of verbs:
cards, stages and moves, claims and runs, questions, gates (approve, request changes, reject),
comments, references and links, budgets and usage, schedules, the stale sweep, push delivery,
notifications, triggers, run reports, the alarm and the WebSocket hub. It records, per step, the
verb's answer and every SQL statement the object ran, in order, with its bindings, by patching
`SqlStorage.prototype.exec` in the test isolate; plus the schema the constructor builds and the
messages a connected socket received. The clock steps one millisecond per reading from a fixed
start in the future (so no timestamps tie, and no alarm comes due on its own), and generated ids
and timestamps become stable placeholders by order of first appearance. The record is a committed
snapshot (`test/__snapshots__/board-characterization.test.ts.snap`), written against the old code.

Moving a statement, changing a binding, or changing an answer fails it; this was checked by adding
one extra `SELECT` to `notify` on the old code.

### Phase 3: result

`index.ts` went from 3,790 lines to 117: the Worker's default export (`fetch`, still wrapped for
run telemetry and the board's last-activity touch, and `scheduled`) and the `BoardDO` re-export.
`fetch` dispatches through an ordered route table; `wrangler deploy --dry-run` still shows only
`BoardDO` and `default`. No new file is over 500 lines.

| File (`apps/api/src/routes/`) | Lines | What |
|---|---|---|
| `router.ts` | 55 | `route`, `dispatch` (first route that answers wins; `NEXT` declines), `describeRoutes` |
| `table.ts` | 50 | the top-level table, in the old if-chain's order |
| `system.ts` / `auth.ts` / `mcp.ts` | 30 / 36 / 16 | health, the dev fixture, the plane entitlement check, the web app; sign-in; MCP |
| `tenant.ts` / `members.ts` | 141 / 88 | the workspace's forge host and fleet link; its members |
| `capabilities.ts` / `labels.ts` | 216 / 99 | the capability registry and implications; labels |
| `admin.ts` / `projects.ts` | 81 / 235 | the superwitness backfill and stale cards; projects and milestones |
| `agents.ts` | 492 | agents, their tokens and AgentCard |
| `errors.ts` / `callers.ts` / `fields.ts` / `activity.ts` | 158 / 89 / 14 / 5 | shared: code to status, role and caller checks, `due_at`, the activity touch |
| `boards/entry.ts` | 240 | `/v1/boards[/…]`: evidence and service reads, the caller, then the board table in one `try` |
| `boards/table.ts` / `request.ts` | 73 / 22 | the board routes in order; the `BoardRequest` they take |
| `boards/collection.ts` / `board.ts` | 136 / 218 | list and compose boards; one board's snapshot, stages, settings and reads |
| `boards/cards.ts` / `comments.ts` / `links.ts` | 437 / 48 / 151 | cards; comment threads; card links |
| `boards/schedules.ts` / `integrations.ts` | 227 / 147 | recurring cards; push, GitHub, Forgejo, triggers, webhooks |
| `boards/runs.ts` / `gates.ts` / `evidence.ts` | 246 / 116 / 62 | claims and run verbs; gates and questions; a run's evidence |
| `boards/stage-capabilities.ts` | 28 | a stage naming a capability registers it |

Each route block moved unchanged except for its indentation: the request fields it reads and its
pattern's match arrive as parameters, under the names the block already used. They were moved by
a script that cut the blocks out of the old file, then reviewed. Three handlers are named
`tenantSettings`, `memberRoster` and `agentRegistry`, so their bodies' locals (`tenant`, `members`,
`agents`) do not shadow them.

Two Phase 2 follow-ups landed with it. The board's schema, split in two only for size, is now four
groups run in the same order: the work tables (`schema.ts`), the columns, triggers and indexes added
to cards and runs since (`schema-columns.ts`), notifications and what waits on a person
(`schema-decisions.ts`), and what a card is related to (`schema-relations.ts`). And the board record
gained a second entry for the approval-subject publish path, strict decisions and the fixture import.

### Phase 3: how the Worker is pinned

`apps/api/test/worker-routes-characterization.test.ts` drives every route the Worker matches
through `SELF.fetch`, in one scripted session of some 330 requests: each family's happy path, its
wrong methods, its refusals (no credential, the wrong role, a dev header naming nobody, an agent
token on a person's route, a coordinator token's scopes), malformed bodies (the 500 a bad JSON body
has always produced), and the paths where patterns overlap. It records each response's status,
every header but `date`, and its body, with ids, times, tokens and digests made stable
placeholders. The static assets binding is replaced by a recorder, so a request that falls through
to the web app shows as such, and once removed, for the bare 404. The record is a committed
snapshot, written against the old `index.ts`.

The order the old code tried its routes is written down beside it (`test/helpers/worker-routes.ts`),
and `test/worker-route-order.test.ts` compares both route tables with it, as method, pattern and
handler.

Both were checked able to fail: moving the `gates/pending` match after `gates/:id` in the old code
fails the snapshot, and the same swap in the new board table fails both tests.

### Phase 4: result

`packages/cli/src/index.ts` went from 1,229 lines to 196 and `commands.ts` from 1,679 to 359. The
switch stays in `index.ts`, with the same `case` labels in the same order; each arm hands its
command to a `run…` function in the group's module, which also holds that group's help entries.
The published bin (`src/index.ts`), the package's exports and the release build are unchanged.

| File (`packages/cli/src/`) | Lines | What |
|---|---|---|
| `index.ts` | 196 | `main`: `--help`, the switch, the usage; ends in `await main(...)` as before |
| `commands.ts` | 359 | the groups, `COMMANDS` assembled group by group in the old order, the global flags, the environment, and the help renderers |
| `spec.ts` | 125 | the table's types and the argument and flag entries several groups share |
| `runtime.ts` | 174 | what every command shares: `fail`, the credential, `api`, `out` (and `--json`), reading a file argument |
| `commands/session.ts` / `boards.ts` / `cards.ts` | 238 / 398 / 441 | sign-in, help, version, skill, update; boards and stages; cards |
| `commands/comments.ts` / `gates.ts` / `links.ts` / `labels.ts` | 83 / 102 / 124 / 80 | one group each |
| `commands/projects.ts` / `schedules.ts` / `workspace.ts` | 203 / 179 / 468 | projects and milestones; recurring cards; forge, agents, tokens, capabilities |

Each arm's body moved unchanged except its indentation, a final `return;` dropped, and `wantJson`
read as the `json` it always equalled; a script cut them out of the old switch, then they were
reviewed. `reference.test.ts`, which reads the flags and sub-verbs each arm reads from the source,
now follows each arm into the `run…` function it calls (checked able to fail: renaming one flag
a handler reads fails it).

### Phase 4: how the CLI is pinned

`packages/cli/src/cli-characterization.test.ts` runs `supi` in-process, as the other CLI tests do,
against a fake API: the help for every command (`supi help <words>` and `supi <words> --help`),
and 183 runs with representative arguments, each recording the requests sent (method, URL,
headers, body), stdout, stderr and the exit status. Refusals (401, 403 for a person and an agent,
409, 500, a non-JSON answer), expired and missing credentials, bad arguments and unknown commands
are runs like any other. HOME and the config directory point at a scratch directory and the clock
is fixed. The record is a committed snapshot, written against the old code; one extra body key on
`move` and one changed space in the usage failed 7 of its 300 cases.

### Phase 5: result

`apps/web/src/lib/api.ts` went from 1,645 lines to a 25-line door that re-exports exactly the names
it always exported (`$lib/api` is unchanged for every component). The client is one module per
resource under `lib/api/`, all through the one `fetch` in `api/client.ts`; the largest is
`cards.ts` at 355 lines. Its test (1,036 lines) is split the same way, one file per resource with
its `describe` blocks unchanged.

| File (`apps/web/src/lib/api/`) | Lines | What |
|---|---|---|
| `client.ts` | 60 | the dev workspace and person, the lost-session handler, the one `fetch` (with its read timeout), the headers |
| `boards.ts` / `cards.ts` | 243 / 355 | boards, stages, the snapshot, profiles, the live feed; cards and what ran on them |
| `gates.ts` / `links.ts` / `comments.ts` / `notifications.ts` | 145 / 87 / 35 / 23 | gates and questions; card links; comments; notifications |
| `agents.ts` / `capabilities.ts` / `members.ts` | 199 / 81 / 43 | agents and tokens; the capability registry; members |
| `projects.ts` / `schedules.ts` / `labels.ts` / `usage.ts` | 150 / 80 / 40 / 58 | projects and milestones; recurring cards; labels; usage and budgets |
| `session.ts` / `workspace.ts` | 43 / 52 | who is signed in; the workspace's forge and fleet link |

Types moved with the functions that answer them; a module imports another's types only downward
(`boards` reads `cards`, `gates` and `usage`; `cards` reads `gates`; `session` reads `members`).

The web app's import cycles went from four (4, 3, 3 and 3 files) to none, by moving shared types
and one helper down: `personInitials` to `$lib/names` (re-exported from `board-words`); the List's
grouping, sort and quick-filter keys to a leaf `plan/list/list-keys.ts` (re-exported by the store
and the List's types); the card forms take a narrow `CardFormHost` instead of importing
`CardModel`, and the model's bindings moved to a leaf `card/bindings.ts` (re-exported by the
layout types); and `OperateLayoutProps` moved to `operate/layouts/props.ts`, its importers updated.
`LARGEST_CYCLE` for `apps/web/src` is 0 and `OVERSIZE` is empty.

### Phase 5: how the API client is pinned

`apps/web/src/lib/api-characterization.test.ts` calls every exported function that makes a
request (92 calls with representative arguments) against a fake `fetch` answering 200, 401, 404,
500 and offline, recording every request (URL, method, headers, body, credentials mode, whether it
can be aborted), including the hub-token exchange a write makes first, what each call returned or
threw, and whether the lost-session handler fired. It also pins the module's export surface by name
and kind, `noteAuth`, `parseGateConflict` and `openBoardSocket`. The record is a committed
snapshot written against the old file; adding `credentials` to one DELETE failed that case.

### Phase 6: result

Shipped source is clean of every mechanical rule, and `no-explicit-any`, `no-floating-promises`
and `no-misused-promises` are clean everywhere, so they left the baseline.

- **`any`.** The webhook mappers (GitHub and forge), the issue trigger and the Claude Code
  stream-json adapter read named wire types; each is the same cast of parsed JSON it was, and the
  fields they branch on are still tested where they are used. The API tests read answers as the
  board's view types or a small named answer type; the web tests mount components of differing
  props through one `AnyComponent` alias.
- **`console`.** `apps/api/src/log.ts` is the Worker's one console use, its own bottom layer; every
  other call site goes through it with the same arguments.
- **Assertions and conversions.** Unnecessary `as` and `!` were removed by oxlint's own fix (type
  only). The D1 columns the code converts are typed as what D1 returns (`unknown`), so `Number()`
  reads as the parse it is. The conversions that parse a cast request body or a bound input stay,
  each with a disable comment saying why.
- **Promises.** The `node:test` registrations in `scripts/` and two un-awaited calls in tests are
  marked `void`; they were not awaited before.
- **Also.** Unused imports and variables, `import()` type annotations, shadowed names, useless
  spread fallbacks and an escape; `Intl.DateTimeFormat` built only to validate a zone says so.
  `toSorted`/`toReversed` replace in-place sorts only in the Worker and only on fresh arrays.
- **Left, deliberately.** The held `!` and unchecked `as` counts (each would need a check that
  changes what runs on bad data); `navigator.onLine !== false` (an absent value must read as
  online); `no-base-to-string` and `restrict-template-expressions` at parse boundaries; sorts in the
  web app and `packages/contract`, which ship to browsers older than ES2023; findings in tests
  beyond types.

`SRC_CLEAN` went from 8 rules to 23.

### How each phase is checked

Before pushing, with Node 22: `pnpm typecheck`, `pnpm lint`, `pnpm test` (each package's count
unchanged, plus that phase's new characterization tests), `pnpm test:architecture`, `pnpm build`,
and for the Worker `wrangler deploy --dry-run --outdir`, confirming the bundle exports only
`BoardDO` and `default`. CI runs the same on the PR.

### Risks

- **Tests reach into the instance.** Some tests call, spy on or replace private methods on the
  Board DO (`notify`, `nowMs`, `reportRun`, `scheduleReclaim`, `updateCard`). Calls inside the
  board to those, and to every public verb, still go through the instance, so a replaced method is
  still the one called.
- **RPC surface.** Only prototype methods are reachable over RPC. The shell keeps exactly the
  public methods the class had; the board context is a private field, so no internal operation
  becomes callable from outside.
- **Snapshot drift.** The characterization snapshot is large (about 550 KB). It changes only when
  behaviour is meant to change, in its own commit, never alongside a restructuring.
- **Conflicts.** The Worker's board and index files are where most feature work lands. Land each
  phase quickly; rebase other work after it.
- **A missed dependency route.** A module that calls another through the context rather than
  directly is checked by the type checker (`Deps` names it) and by the snapshot (order unchanged).
