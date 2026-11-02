# Code structure guardrails

🔍 Description. Two checks hold the shape and quality of the code: numbers that may only fall.
Neither asks you to fix old code; both stop new code from making it worse, and both fail when an
improvement has not been locked in, so a stale number cannot hide a later regression.

## Lint: `pnpm lint`

[oxlint](https://oxc.rs) with type-aware rules (`.oxlintrc.json`; oxlint and oxlint-tsgolint are
pinned exactly in the root `package.json`, and tsgolint carries its own TypeScript, independent of
the repo's). It covers `apps/api` (src and test), `apps/web` (src, e2e, scripts), `packages/*` and
`scripts/`. `.svelte` files get the syntax rules only: tsgolint cannot type-check them. Vendored
code, generated files, `docs-site` and `landing` are ignored.

Rules: the `correctness` and `suspicious` categories; floating and misused promises and awaiting a
non-promise; `switch` exhaustiveness (a `default` counts for unions); type-only imports; no `any`;
no `!` non-null assertions; no empty block, including an empty `catch`; no `console` outside the
CLIs, scripts and tests (the Worker's existing log lines are counted in the baseline). No rule
is switched off; Salaam's two exceptions (`no-control-regex`, `no-unmodified-loop-condition`) are
on here, the second with one held finding (an e2e route handler that polls a flag a closure
clears).

Existing findings are counted per rule in `scripts/lint-baseline.json`:

- A count may fall but never rise. A rule missing from the baseline must be clean everywhere.
- After a cleanup, `pnpm lint --update` lowers the baseline; lint fails until you do. `--update`
  refuses to raise a count.
- Shipped source (`apps/*/src`, `packages/*/src`, without tests and test helpers) must stay clean
  of the rules in `SRC_CLEAN` in `scripts/lint.mjs`, whatever the baseline allows in tests and
  scripts. That includes `no-floating-promises`: in the Worker and the Durable Object, a promise
  left running is either awaited, handed to `ctx.waitUntil`, or marked `void` with its rejection
  handled.

The large counts (`!` assertions, unchecked `as` casts, unnecessary assertions) are held, not
cleared: rewriting them wholesale risks changing behaviour. Lower them in code you touch.

CI runs it as the `lint` job, which the `test` gate requires whenever app code changed.

## Architecture: `pnpm test:architecture`

`scripts/architecture.test.ts` (part of `pnpm test`) builds the import graph from source and holds:

| Ratchet | Where | Now |
|---|---|---|
| `LARGEST_CYCLE` | largest file-level import cycle per package | api 0, web 4, cli 0, contract 0, agent-sdk 0 |
| `API_FOLDER_CYCLE` | largest cycle between `apps/api/src`'s top-level folders | 0 |
| `API_LAYERS` + `KNOWN_BACK_EDGES` | `apps/api/src`'s layer order; imports point down | no back-edges |
| `OVERSIZE` | files over 1,000 lines, each at its current size | web `lib/api.ts` 1,645, web `lib/api.test.ts` 1,036 |

A new file over 1,000 lines, a larger cycle, or a listed file that grows fails the test. When a
number falls, the test fails too, naming the constant to lower: lower it in the same change.
Never raise one; split the file or break the cycle instead.

### Layers in the Worker

`apps/api/src`'s top-level folders and root files sit in layers, lowest first. An import points to
a strictly lower layer; nodes in one layer do not import each other.

| Layer | Nodes |
|---|---|
| 0 foundations | `env.ts`, `ids.ts`, `json.ts`, `flat-error.ts`, `crypto/`, `metering/`, `telemetry/` |
| 1 pure helpers | `push/`, `references/` |
| 2 catalog | `db/` |
| 3 identity | `auth/` |
| 4 run reports | `superwitness/` |
| 5 board | `board/` (the Durable Object, its modules and its stub) |
| 6 surfaces | `mcp/`, `dev/`, `card-links.ts` |
| 7 | `service-routes.ts` |
| 8 routes | `routes/` (the router, its tables and one module per resource) |
| 9 entry | `index.ts` |

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

The web app's largest cycle (4) is `operate/`'s UI, data, words and layout types.

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
