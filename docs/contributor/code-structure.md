# Code structure guardrails

🔍 Description. How the code is laid out, the rules that keep it that way, and the checks that hold
them. Two checks hold the shape and quality of the code: numbers that may only fall. Neither asks
you to fix old code; both stop new code from making it worse, and both fail when an improvement
has not been locked in, so a stale number cannot hide a later regression. The layout below is the
outcome of the modularity work ([modularity-plan.md](modularity-plan.md)).

## Where things are

| Where | What |
|---|---|
| `apps/api/src` | the Worker, in layers (below): foundations, the D1 catalog, identity, the Board Durable Object (`board/`), its surfaces, the HTTP routes (`routes/`), the entry (`index.ts`) |
| `apps/web/src` | the SvelteKit app; `lib/api.ts` is the one door to the API, over one module per resource in `lib/api/` |
| `packages/cli/src` | `supi`: `index.ts` (the switch), `commands.ts` (the command table and help), `commands/<group>.ts` (one module per command group) |
| `packages/contract/src` | the wire types and vocabulary the Worker, the web app, the CLI and agents share |
| `packages/agent-sdk/src` | the agent client and the harness adapters |
| `scripts/` | the lint ratchet, the architecture test, CI helpers |

## Lint: `pnpm lint`

[oxlint](https://oxc.rs) with type-aware rules (`.oxlintrc.json`; oxlint and oxlint-tsgolint are
pinned exactly in the root `package.json`, and tsgolint carries its own TypeScript, independent of
the repo's). It covers `apps/api` (src and test), `apps/web` (src, e2e, scripts), `packages/*` and
`scripts/`. `.svelte` files get the syntax rules only: tsgolint cannot type-check them. Vendored
code, generated files, `docs-site` and `landing` are ignored.

Rules: the `correctness` and `suspicious` categories; floating and misused promises and awaiting a
non-promise; `switch` exhaustiveness (a `default` counts for unions); type-only imports; no `any`;
no `!` non-null assertions; no empty block, including an empty `catch`; no `console` outside the
CLIs, scripts and tests. The Worker logs through `apps/api/src/log.ts` (`logInfo`, `logWarn`,
`logError`), the one place in shipped source that calls `console`: Workers Logs read the console
and take each entry's severity from the method. No rule
is switched off; Salaam's two exceptions (`no-control-regex`, `no-unmodified-loop-condition`) are
on here, the second with one held finding (an e2e route handler that polls a flag a closure
clears).

Existing findings are counted per rule in `scripts/lint-baseline.json`:

- A count may fall but never rise. A rule missing from the baseline must be clean everywhere.
- After a cleanup, `pnpm lint --update` lowers the baseline; lint fails until you do. `--update`
  refuses to raise a count.
- Shipped source (`apps/*/src`, `packages/*/src`, without tests and test helpers) must stay clean
  of the rules in `SRC_CLEAN` in `scripts/lint.mjs`, whatever the baseline allows in tests and
  scripts. Among them: no `any` (name the wire or row type; `unknown` and a check where untrusted
  data is parsed), no empty block (handle it or say why in it), type-only imports, no unused
  code, no unnecessary assertion or conversion, no shadowing, no `console`, and no floating or
  misused promises: in the Worker and the Durable Object, a promise left running is either
  awaited, handed to `ctx.waitUntil`, or marked `void` with its rejection handled.
- `no-explicit-any`, `no-floating-promises` and `no-misused-promises` are clean everywhere, tests
  included. The one `any` a test may use is `AnyComponent`
  (`apps/web/src/lib/components/card/testing/any-component.ts`), for mounting components whose
  props differ from one fixture.
- A disable comment names its rule and says why on the same line
  (`// oxlint-disable-next-line no-new -- constructed only to throw on a zone…`). They are for a
  finding that is the point of the code, such as a conversion that parses a cast request body,
  never for one that is merely inconvenient.

The large counts (`!` assertions, unchecked `as` casts) are held, not cleared: rewriting them
wholesale risks changing behaviour. Lower them in code you touch. `toSorted`/`toReversed` are used
only in the Worker, and only on a fresh array; the web app and `packages/contract` keep `sort` and
`reverse`, because they ship to browsers older than ES2023.

CI runs it as the `lint` job, which the `test` gate requires whenever app code changed.

## Architecture: `pnpm test:architecture`

`scripts/architecture.test.ts` (part of `pnpm test`) builds the import graph from source and holds:

| Ratchet | Where | Now |
|---|---|---|
| `LARGEST_CYCLE` | largest file-level import cycle per package | api 0, web 0, cli 0, contract 0, agent-sdk 0 |
| `API_FOLDER_CYCLE` | largest cycle between `apps/api/src`'s top-level folders | 0 |
| `API_LAYERS` + `KNOWN_BACK_EDGES` | `apps/api/src`'s layer order; imports point down | no back-edges |
| `OVERSIZE` | files over 1,000 lines, each at its current size | none |

A new file over 1,000 lines, a larger cycle, or a listed file that grows fails the test. When a
number falls, the test fails too, naming the constant to lower: lower it in the same change.
Never raise one; split the file or break the cycle instead.

### Layers in the Worker

`apps/api/src`'s top-level folders and root files sit in layers, lowest first. An import points to
a strictly lower layer; nodes in one layer do not import each other.

| Layer | Nodes |
|---|---|
| 0 log | `log.ts` (the Worker's log sink; imports nothing) |
| 1 foundations | `env.ts`, `ids.ts`, `json.ts`, `flat-error.ts`, `crypto/`, `metering/`, `telemetry/` |
| 2 pure helpers | `push/`, `references/` |
| 3 catalog | `db/` |
| 4 identity | `auth/` |
| 5 run reports | `superwitness/` |
| 6 board | `board/` (the Durable Object, its modules and its stub) |
| 7 surfaces | `mcp/`, `dev/`, `card-links.ts` |
| 8 | `service-routes.ts` |
| 9 routes | `routes/` (the router, its tables and one module per resource) |
| 10 entry | `index.ts` |

A new folder or root file fails the test until it is placed in `API_LAYERS`. An import that points
up fails it too. `KNOWN_BACK_EDGES` exists to hold one while it is being removed; it may only
shrink, and it is empty.

When a lower layer needs something from a higher one:

- a type, constant or pure helper moves down to the layer that needs it, or to a foundation file
  (`JsonValue` is in `json.ts`, the principal types in `auth/principal.ts`, agent tokens in
  `crypto/agent-token.ts`), and the old home re-exports it if many files import it there;
- a call goes through a narrow type the lower layer declares and the caller supplies:
  `computeRollup` (`db/projects.ts`) takes a `ProjectSummaryReader`, and its callers pass
  `projectSummaries(env)` from `board/stub.ts`. No registry or service locator.

The web app has no import cycles either; its last four were broken the same two ways (a shared type
or helper moved to a leaf, and the card forms taking a narrow `CardFormHost` instead of the model).

### The Board Durable Object

`board/board-do.ts` is a shell: the `BoardDO` class with its RPC methods, `fetch`, the WebSocket
handlers and `alarm`, each handing its arguments to the module that owns the behaviour (`cards`,
`moves`, `claims`, `run-verbs`, `gates`, `elicitations`, `schedules`, …). It re-exports every type
and helper it used to define, so importers keep importing from it.

- A module's functions take `deps`, typed as that module's `Deps`: a `Pick` of `BoardContext`
  (`board/context.ts`) naming exactly the storage, environment, clock and other operations it
  uses. Modules never import each other; a call into another module goes through `deps`.
- The constructor builds the one context (`board/wiring.ts`). A call to one of the DO's public
  verbs, or to `notify`, `now`, `nowMs`, `reportRun` or `scheduleReclaim`, goes back through the
  instance, as `this.x()` did, so a test that replaces one on the instance still intercepts it.
- Shared shapes live in `model.ts`, `views.ts` and `rpc.ts`; limits more than one module shares in
  `rules.ts`. The SQLite schema runs in its original order in four groups: the work tables
  (`schema.ts`, which calls the rest), the columns, triggers and indexes added to cards and runs
  since (`schema-columns.ts`), notifications and what waits on a person (`schema-decisions.ts`),
  and what a card is related to (`schema-relations.ts`).
- A new verb: write it in its module, add it to the shell, and add it to `BoardContext` only if
  another module calls it. `test/board-characterization.test.ts` pins the statements each verb
  runs and its answers; it changes only when behaviour is meant to.

### The Worker entry and its routes

`index.ts` is the Worker's default export (`fetch`, wrapped for run telemetry and the board's
last-activity touch, and `scheduled`) and the `BoardDO` re-export; `fetch` dispatches through
`routes/table.ts`. A route is `route(method, pattern, handler)` (`routes/router.ts`): `*` is any
method, a pattern is matched against the path, and the first route whose handler answers wins; a
handler that declines returns `NEXT` and the routes after it try. Where two patterns overlap, the
earlier route is the one that answers, so order is behaviour.

- One module per resource: `system`, `auth`, `mcp`, `tenant`, `members`, `capabilities`,
  `labels`, `admin`, `projects`, `agents`. A handler takes the `WorkerRequest` (request, env, URL,
  path) and the pattern's match.
- `/v1/boards` is one top-level route, `routes/boards/entry.ts`: it answers a run's evidence and a
  service token's reads, resolves the caller (agent route, webhook, or person, with the role
  check), answers the collection, then tries `routes/boards/table.ts` against the rest of the path
  inside one `try`, so an unplanned error is the usual 500. A board handler takes a `BoardRequest`
  (`routes/boards/request.ts`): the resolved caller, the board id, the rest of the path and the
  board's stub.
- What several families share: `errors.ts` (one code, one status), `callers.ts` (role and
  workspace-caller checks), `fields.ts`, `activity.ts`.
- A new route: add its handler to the module that owns the resource and its line to the table, at
  the place its pattern needs. `test/worker-route-order.test.ts` compares both tables with the
  list in `test/helpers/worker-routes.ts`; update that list with the table.
  `test/worker-routes-characterization.test.ts` pins every route's status, headers and body; it
  changes only when behaviour is meant to.

### The CLI

`packages/cli/src/index.ts` is `main`: `--help`, one `switch` over the command words, and the
usage. Each arm hands its command to a `run…` function in `commands/<group>.ts` (`session`,
`boards`, `cards`, `comments`, `gates`, `links`, `labels`, `projects`, `schedules`, `workspace`),
and that module also holds the group's help entries. `commands.ts` assembles `COMMANDS` group by
group, with the global flags, the environment and the help renderers; `spec.ts` has the table's
types and the entries several groups share; `runtime.ts` what every command shares (`fail`, the
credential, `api`, `out` and `--json`, reading a file argument).

- A new command: its `run…` function and help entries in its group's module, its `case` in
  `index.ts`. `src/reference.test.ts` follows each arm into its function and checks the flags it
  reads against the help; `src/cli-characterization.test.ts` pins every command's help, the
  requests it sends and what it prints.

### The web API client

`apps/web/src/lib/api.ts` re-exports one module per resource under `lib/api/` (`boards`, `cards`,
`gates`, `links`, `comments`, `notifications`, `agents`, `capabilities`, `members`, `projects`,
`schedules`, `labels`, `usage`, `session`, `workspace`); components import `$lib/api`, never a
module under it. Every request goes through the one `fetch` in `api/client.ts` (the dev headers,
the lost-session handler, the read timeout). Types live with the functions that answer them, and a
module imports another's types only downward.

- A new call: add it to its resource's module and the name to `api.ts`'s re-exports.
  `lib/api-characterization.test.ts` pins every call's request and answer and the export surface.

## Practices

- **Characterize before restructuring.** Before moving behaviour, commit a test against the old
  code that records what it does (statements, requests, responses, output), and show it can fail
  by breaking the old code on purpose. The move then passes it unchanged. A snapshot is never
  regenerated to make a restructuring pass; when behaviour is meant to change, the snapshot changes
  in that commit, and says why.
- **Snapshots are environment-proof.** A recorded snapshot must pass under Node 22, the version CI
  uses, and in a bare environment (`env -i PATH=… HOME=… CI=true pnpm test`, with Node 22 and `bun`
  on that `PATH`; the CLI's install tests need bun): ids, clocks, home
  and config directories and anything read from the environment are fixed or replaced with
  placeholders.
- **Narrow dependencies.** A module takes a typed `Deps` (or a narrow host interface) naming what
  it uses; there is no registry or service locator. Shared types and helpers move down to a leaf
  rather than an import pointing up or sideways.
- **Tests move with their code.** When a module splits, its test splits the same way, changing
  only imports and types.

## Adding things

| To add | Do | Checked by |
|---|---|---|
| a board verb | write it in its `board/` module, add it to the shell, to `BoardContext` only if another module calls it | `board-characterization.test.ts`, the type checker (`Deps`) |
| a route | its handler in the resource's `routes/` module, its line in the table where its pattern needs | `worker-route-order.test.ts`, `worker-routes-characterization.test.ts` |
| a folder or root file in `apps/api/src` | place it in `API_LAYERS` | `architecture.test.ts` |
| a CLI command | its group's module and a `case` in `index.ts` | `reference.test.ts`, `cli-characterization.test.ts` |
| a web API call | its resource's module and `api.ts` | `api-characterization.test.ts` |
| a file nearing 600 lines | split it by what its parts do | `OVERSIZE` fails at 1,000 |
