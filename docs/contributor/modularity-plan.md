# Modularity and code-quality plan

Status: in progress, in one PR on `refactor/modularity`. Phases 0 and 1 are merged on `main`
(the lint ratchet, the architecture ratchets in `scripts/architecture.test.ts`, and the layered,
acyclic `apps/api/src`); this page covers Phases 2–7. [code-structure.md](code-structure.md)
describes the guardrails; this page keeps the plan, the starting measurements and the progress.

| Phase | What | State |
|---|---|---|
| 2 | Split the Board Durable Object | done |
| 3 | Split the Worker entry (`apps/api/src/index.ts`) | done |
| 4 | CLI: one module per command group | done |
| 5 | Web: the API client by resource; the remaining web cycles | to do |
| 6 | Lint to targets | to do |
| 7 | Docs, CHANGELOG | to do |

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
