# Machine checks: a gate may be decided by checks

Charter: `decisions/2026-11-09-a-gate-may-be-decided-by-checks.md`. Operator ruling: the defaults
as proposed — `ci` and `verdict` providers; checks run before people; a failing check returns the
card; overdue checks escalate; owners and admins may override. SuperPipeline owns the checks, runs
them and decides; the forges send CI results; SuperWitness holds verdicts (unchanged); AgentPod
carries check status and overrides; supermessage renders and answers.

## The stage

```json
{
  "key": "review", "name": "Review", "ownerKind": "human", "gate": "approval", "returnStage": "build",
  "checks": [
    { "name": "build", "provider": "ci", "contexts": ["build", "lint"] },
    { "name": "quality", "provider": "verdict", "kind": "eval", "standard": "quality", "atLeast": 0.8, "judgeKinds": ["grader"] },
    { "name": "claims", "provider": "verdict", "kind": "claim-check", "pass": true }
  ]
}
```

- `checks`: 1 to 5, names unique, 1–40 characters without surrounding spaces or `/` (the name is a
  path segment of the override route).
- `ci`: `contexts` (1–20 names) are the required CI contexts. Absent: every context reported for
  the commit must succeed.
- `verdict`: `kind`, optional `standard`, and exactly one of `atLeast` (a number) or `pass: true`;
  optional `judgeKinds` from `grader`, `rule`, `agent`, `human`.
- A stage with checks must have a `returnStage` (an earlier stage) and a gate of `approval` or
  `checks`.
- `gate: "checks"`: nobody decides; the stage passes when every check passes. It must have checks
  and no agent may own it (`ownerKind` not `capability` or `agent`). On the last stage it is not
  "finished on arrival": the card completes once its checks pass.
- `checks` and `gate: "checks"` are decision policy (`decisionPolicyOf`): only a workspace owner or
  admin may set, change or remove them, on a live board or when creating one
  (`WORKSPACE_ADMIN_REQUIRED`). Malformed checks refuse the write `INVALID_STAGES` (400 at board
  create).
- Board templates never carry `gate: "checks"`.

## An arrival

When a card arrives where a gate would open — advancing onto a human approval stage, a submission
for review on an agent-worked approval stage, or advancing onto a `checks` stage — and that stage
has checks, the board records a **check set for that arrival** instead of opening a gate
(`card_check_arrivals`, `card_checks`). Each check's definition is snapshotted, so a later policy
edit never changes what an arrival is judged by.

- The card waits `input-required` on the stage with `needsHuman: { reason: 'review', detail:
  'waiting for checks' }`. That is not a wait chat carries: no `attention.pending`, no
  `gate.pending`, nothing in `gates/pending`. No agent can claim it.
- The decision wait `kind: 'checks'` starts (keyed by the arrival id), so the stage's `timeout`
  (or the board's) reminds and escalates while a check is pending, as for any decision.
  `decision.reminded` / `decision.escalated` carry `decisionKind: 'checks'`; the carrier escalates
  to the workspace's owners and admins as it does for a gate.
- `ci` checks are judged at once against CI results already heard for the pull request's head.
- Every check passed or overridden: on an approval stage the gate opens (`createGate`, exactly as
  without checks, with the prepared approval subject when the stage binds one) and carries the
  checks; on a `checks` stage the card advances, with the run and producer it arrived with.
- Any check failed: see "A failure" below.
- A card that leaves the stage otherwise (moved, resumed, archived) leaves its arrival behind; it is
  closed when next read. A new arrival closes any earlier open one.

An approval stage that is agent-worked and has a `returnStage` is a judging stage for `complete`
(`routeOutcome`), as before; its agents submit for review, which is where checks run.

## `ci`

The card's pull request is its most recently linked `card_references` row with
`source_type = 'pull_request'`, provider `github` or `forge`, and a known head commit.

- **Head commit.** `pull_request` events on both doors now record `headSha` (lowercased) in the
  reference's metadata. When it changes — a push (`synchronize` on GitHub, `synchronized` on
  Forgejo), or the first head heard — the card's open `ci` checks go back to `pending` (passed and
  failed ones too; an override stands), a failure that had parked the card is cleared, and they are
  judged against what is already known for the new commit.
- **Results** are stored per provider, repository, commit and context in `ci_results` (pruned after
  30 days), so a check recorded after CI finished is settled at once. Only results for the card's
  current head, on the same provider as its pull request, count: a result for another commit, or one
  arriving by the GitHub door for a forge pull request (a mirror's), changes nothing.
- **Judging**: a failing required context fails the check (detail names it, url is its link);
  every required context succeeded passes it; otherwise it is pending. With no `contexts`, any
  reported failure fails it, any reported pending keeps it pending, and it passes when at least one
  context was reported and all succeeded. ("All reported" can pass before a slow context first
  reports; name `contexts` to require them.)
- The webhooks keep their HMAC verification and delivery-id dedupe; a CI event answers `{ modeled:
  true, matched: <arrivals changed> }`.

Events read:

| Door | Event | Context | Commit | State |
| --- | --- | --- | --- | --- |
| GitHub | `status` | `context` | `sha` | `pending`; `success`; `failure`/`error` fail |
| GitHub | `check_run` | `check_run.name` | `check_run.head_sha` | not `completed` is pending; `success`, `neutral`, `skipped` pass; other conclusions fail |
| GitHub | `check_suite` | `check_suite.app.name` | `check_suite.head_sha` | as `check_run` |
| GitHub | `workflow_run` | `workflow_run.name` | `workflow_run.head_sha` | as `check_run` |
| Forgejo/Gitea | `status` (Gitea's commit status event) | `context` | `sha` | as GitHub's, `warning` fails |
| Forgejo | `action_run_success`, `action_run_recover` / `action_run_failure` | `run.workflow_id` (e.g. `ci.yml`) | `run.commit_sha` | success / failure |
| Forgejo | `workflow_run_success`, `_skipped` / `_failure`, `_cancelled` / `_running`, `_waiting`, `_blocked` | `run.workflow_id` | `run.commit_sha` | success / failure / pending |

Forgejo's own webhook types have no commit-status event; its Actions runs arrive as the
`action_run_*` (and, on newer releases, `workflow_run_*`) events, whose context is the workflow
file. `workflow_job_*` is not read: a job is part of a run, and reading both would report one
workflow twice. A board on a forge names its `contexts` as workflow files when results come by
Actions events, or as status contexts when a Gitea instance sends `status`.

## `verdict`

SuperWitness sends no events, so the five-minute sweep (`sweepBoard`, before the decision
timeouts) reads verdicts for **pending verdict checks only**, one read per run.

- **Which run**: the run recorded with the arrival — the run whose completion moved the card onto
  the stage, or whose submission put it up for review there; the same run a gate opened at that
  moment would judge. Its subject is `subject_kind=run&subject_ref=superpipeline:<boardId>/<runId>`,
  the reference the run report gave it. An arrival with no run (none produced the work) waits.
- **Judging**: verdicts of the check's `kind` (and `standard`, and `judgeKinds`, when given); a
  verdict another supersedes (`supersedes`, or the read's `superseded_by`) is ignored; the latest
  of the rest by `created_at` wins. `atLeast`: a numeric `value` at or over the bar passes, under
  it (or not a number) fails. `pass`: `value` `true` or `"pass"` passes, anything else fails. None
  yet: pending.
- SuperWitness off (`SUPERWITNESS_URL` unset), misconfigured or unreachable: every check stays
  pending, the sweep emits `checks.verdicts_unavailable` with the reason, and the stage's timeout
  does the rest.

### Credential

The read uses the board's one SuperWitness credential: the run reporter's service credential
(`SUPERWITNESS_REPORTER_CREDENTIAL`), exchanged for a token for SuperWitness's audience exactly as
the run reports do (`ServiceTokenCache`). No new secret. SuperWitness's `GET /v1/verdicts`
requires an authenticated principal and no scope today. If it comes to require one, the operator
grants **`verdicts:read`** to the reporter's service principal; until then a refusal leaves the
checks pending and is visible as `checks.verdicts_unavailable` with code `http_403`.

## A failure

Any failed check sends the card back through the path an agent's `changes-needed` takes
(`routeOutcome`, `returnCard`): to the stage's `returnStage`, `submitted`, with the findings
(`Check "<name>" (<provider>) failed: <detail> — <url>`, one line per failed check) as
`handoff.feedback` and `handoff.findings`, `returnedFrom`, and `auto_returns` counted. The arrival
is `returned`; the next submission runs the checks again on a new arrival. Each failed check pushes
`check.failed` with `returnedTo`.

When it cannot go back — the automatic returns are spent (`repeated-failure`) or the return stage
no longer resolves (`blocked`) — the card parks on the stage for a person (`attention.pending`, as
an agent's park), `check.failed` says `returnedTo: null`, and the arrival stays open: its failed
check may be overridden, and a new head commit judges `ci` checks again.

## Override

`POST /v1/boards/:boardId/cards/:cardId/checks/:name/override` `{ "comment": "…" }`

- **Who**: a workspace owner or admin by the Accounts role in the verified token at the time
  (`workspaceRoleFor`). Anyone else, and every agent: `CHECK_OVERRIDE_NOT_ALLOWED` (403). An agent's
  bearer reaches the route and is refused by name. The producer of the work (the arrival's
  producer, by local id or principal): `SEPARATION_OF_DUTIES` (403).
- **What**: a check of the card's **current** (latest) arrival that is `pending`, or `failed` while
  the card still waits there (a failure that could not return it). A check already `passed` or
  `overridden`, or one whose arrival is over — the card was returned, moved or let through —
  `CHECK_NOT_OPEN` (409): an override of a failed check after the card went back is refused, since
  the next submission is a new arrival with its own checks. No check of that name on the current
  arrival, or no arrival at all: `CHECK_NOT_FOUND` (404). Unknown card: `CARD_NOT_FOUND` (404).
- **Comment**: required, at most the board's comment limit (`COMMENT_MAX_BYTES`); else
  `INVALID_COMMENT` (400).
- **Effect**: the check is `overridden` with who, when and why (shown on the check, and as
  `overridden` in the read); `check.overridden` is pushed; if every check is now passed or
  overridden the gate opens (carrying `status: 'overridden'`) or the card advances.
- Answer: `{ card, checks }`, `checks` as the read below.

## Reads

`GET /v1/boards/:boardId/cards/:cardId/checks` → `{ "checks": CardChecksView | null }`, the card's
latest arrival at a stage with checks: `{ cardId, stageKey, status: open|passed|returned|closed,
checks: [{ name, provider, status, url?, detail?, headSha?, updatedAt, overridden?: { by, at,
comment } }] }`. Open to an agent or a person, like `gates/:gateId`: everyone who can see the card
sees its checks, a read carries no authority, and the agent whose work came back needs it.

## Wire

- `gate.pending` and `GET …/gates/:gateId` gain `checks: [{ name, provider, status, url? }]`,
  present only when the gate's stage had checks (the arrival that opened it, `gates.check_arrival_id`).
  A gate on a stage without checks is unchanged, field for field.
- `check.failed`: `{ event, boardId, cardId, cardTitle, stageKey, arrivalId, check: { name,
  provider, status: 'failed', detail?, url? }, returnedTo }`.
- `check.overridden`: `{ event, boardId, cardId, cardTitle, stageKey, arrivalId, check: { name,
  provider, status: 'overridden' }, by, comment, at }`.
- `arrivalId` names the card's arrival at the stage: the same failure worded the same way on the
  next arrival carries a different one, so a carrier keyed on it says each once and none twice.
- Both are pushed events and decision events (a chat bridge subscribes to them).
- `decision_waits.kind` gains `checks` (the table is rebuilt once, rows kept, on a board made
  before it).

## Not here

Checks that start work (a CI job, an eval), risk-based auto-pass, and other providers (each a
plug-in when asked for). SuperWitness outbound events would replace the polling.
