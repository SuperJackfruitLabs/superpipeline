# Modularity and code-quality plan

Status: in progress, in one PR on `refactor/modularity`. Phases 0 and 1 are merged on `main`
(the lint ratchet, the architecture ratchets in `scripts/architecture.test.ts`, and the layered,
acyclic `apps/api/src`); this page covers Phases 2–7. [code-structure.md](code-structure.md)
describes the guardrails; this page keeps the plan, the starting measurements and the progress.

| Phase | What | State |
|---|---|---|
| 2 | Split the Board Durable Object | done |
| 3 | Split the Worker entry (`apps/api/src/index.ts`) | to do |
| 4 | CLI: one module per command group | to do |
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
| `schema.ts` / `schema-part-2.ts` | 405 / 295 | the SQLite schema, in order |
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
