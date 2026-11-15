# Proposed checkpoint settlement candidate

This is an isolated, disabled implementation candidate against published Treaty
proposal `4ba0c9f857f3b01e39c6332c8a005beff0733886` and Charter's proposed coordinator
grant decision. Publication is not acceptance. It provisions no reporter credential,
enables no board or pilot. Proposed source and settlement HTTP/RPC boundaries
are implemented with independent Worker and Board default-off gates; deployment
configuration sets neither switch.

## Implemented boundaries

The copied schemas and corpus are byte-pinned; the pin test runs in the existing
`ci:test` lane. The parser rejects duplicate keys (including escaped duplicates),
unknown fields, nulls, invalid UTF-8/surrogates, unsafe or noninteger numbers,
trailing JSON, excessive depth and inputs over 64 KiB. It validates exact member
coverage, order, object-format widths, derived card branches and disposition.
Independent canonical vectors cover policy, report, full submission and source
hashes. A submission digest includes handoff/outcome, unlike the report digest.

`settleCheckpointCandidate` refuses before reading state unless its private test
option is supplied. No production entry point imports it. It requires separate
server-verified service identity/expiry and authoritative claim-time policy,
executor/start-vector/bench/request bindings. The selected authenticated reporter
delegates operational observations under proposed Charter decision 5. AgentPod must
validate authenticated node Completion against its retained source and current
registry before constructing the entire report. SuperPipeline does not inspect a
producer host or treat supplied flags and hashes as independent proof.
The private issuer adapter resolves the actual configured service-token path and
requires the exact server-owned policy reporter, mapped tenant, submit scope and
verified expiry. Body/header identity claims, agent/human credentials and another
audience do not satisfy it. The gated settlement route uses the existing issuer resolver. Actual authenticated producer verification remains unfinished; durable claim/source
admission and the disabled-by-default source service boundary are implemented below.

After asynchronous policy hashing, the candidate rechecks service expiry/scope,
selected reporter, exact policy/claim binding, run status and heartbeat before
one synchronous SQLite transaction. Receipt insertion and the injected synchronous
run/card/reference commit occur in that same transaction. A source execution or
request cannot be relabeled as a fresh run. Historical exact replay requires
current service authorization and returns only the stored cap-free receipt; it
never repeats source execution. Changed submission bytes conflict.

The stage policy is included in the existing admin-only policy-change guard.
All policy-enabling stage writes are disabled. If policy exists in restored or
fixture state, ordinary completion refuses before ending the run, even when a
card has an empty completion override. Manual administrative work-plane moves
are not manufactured checkpoint evidence.

## Actual verification and remaining work

Focused Workers tests use real Durable Object SQLite for receipt/run rollback,
post-await changes and historical replay. They also characterize the existing
ordinary completion guard: owner/epoch authorization alone does not check heartbeat
expiry. The candidate independently checks the existing heartbeat timeout.

These tests do **not** execute all 23 Treaty producer-state scenarios. In particular,
a supplied delegated report does not prove stopped writers, sealed captures, remote
pin/taskref publication, actual dirty-vector refusal, later SuperBench owner safety
or source-host timeout recovery. Parser/state tests exercise related refusals,
not the complete cross-product path. The expected end-to-end scenarios remain in
the pinned `producer-scenarios.json` without an acceptance/conformance claim.

Before enabling any route, owner review must settle and accept the service scope
and policy boundary. Required implementation includes issuer-derived expiry
plumbing, claim-time durable snapshots, service-only tenant routing, current-run
and reporter capability discovery, strict bounded request reading, authenticated
receipt reads, and actual Hub validation of authenticated node Completion. The generic completion mutation
is characterized and extracted into `completion-commit.ts`. The private
`checkpoint-completion.ts` bridge reuses that actual helper and BoardContext,
including real run/card/gate/outbox writes under the receipt transaction. The
integration tests supply a delegated report; they do not execute Hub validation. Generated commit references now have a private synchronous projection; the actual
service route must still resolve and retain the authorized tenant provider mapping;
ordinary completion preserves existing references. This is not finished wiring.

Hub-only reporter credentials must never reach nodes or workers. A reclaimed run
cannot adopt an old proposal. Unknown or pending source effects remain parked;
source cancellation, supervised repair/adoption and the real multi-repository
pilot require their own reviewed integration. Existing scalar wire contracts,
ordinary ACP behavior and accepted event schemas are unchanged.

## Synchronous commit and clock assumptions

The commit dependency explicitly returns `undefined`, so TypeScript rejects async
functions rather than applying its permissive void-callback assignment rule. A
compile-time regression holds that boundary. The runtime guard also rejects any
non-undefined return and rolls back the receipt and synchronous SQL prefix. It
cannot cancel arbitrary effects an incorrectly supplied async callback schedules
after returning; this is not a fence for asynchronous work. The private bridge now calls the extracted synchronous completion helper;
public route integration remains disabled.

Clock and restored heartbeat observations must be finite, nonnegative safe
integers. Both initial admission and final current-run checks refuse invalid
heartbeat values; invalid clock values cannot bypass service-expiry checks.
Heartbeat expiry uses a bounded subtraction rather than overflowing timestamp
addition. A heartbeat later than the current observation is refused; neither clock
rollback nor an apparent future heartbeat earns a grace period.

Both service-token resolvers retain a safely representable issuer expiry in their
private service context. NumericDate seconds become absolute milliseconds, with
fractional milliseconds rounded down. Missing or unrepresentable metadata cannot
satisfy settlement's required expiry check. Existing service routes retain their
scope and tenant checks; this does not add a reporter route or enable settlement.

## Owned transaction and post-commit delivery

The real async settlement entry must own the effect scope after its hashing and
policy-digest awaits. It queues immutable serialized websocket messages and
alarm arming until its successful outer SQL commit. Event, notification, push and
run-report outboxes stay inside SQL. Rollback discards effects; ordinary completion
outside this scope preserves its characterized immediate delivery behavior.
Nested effect scopes and async commit callbacks are rejected. Existing internal
SQL savepoints, such as gate creation, remain inside the owned outer transaction.
There is no claim to detect a caller's unrelated raw enclosing storage transaction:
Durable Object storage supplies no depth query. Do not expose the raw scope as a
generic transaction API or invoke it inside such a transaction.

Delivery failure after commit does not roll back the historical receipt. Remaining
effects are attempted; the caller can reconcile by exact receipt replay without
source dispatch or repeating completion. Durable push/event/outbox evidence remains
available for retry or resynchronization. Alarm errors are logged generically.
This does not make arbitrary async callback continuations safe.

The current proposal's handoff values are strings, while bound approval subjects
consume structured payload/variants. The private settlement bridge therefore
refuses those transitions rather than fabricating a subject or guessing a new
wire shape. Ordinary bound-approval completion is preserved. Extending settlement
to those workflows needs owner-reviewed contract/policy binding first.

## Atomic claim and pending source admission

The actual claim path now records a private `proposed_checkpoint_claims` identity
in the same synchronous transaction as the run insertion and card ownership.
It captures the server tenant, board, card, stage, executor, lease epoch, canonical
stage policy and policy digest. Ordinary claims create no such record. A captured
policy is immutable and explicitly pending: it contains no guessed bench, start
vector, station, attempt, request or execution evidence. An absent row never means
source admission succeeded. Enabling policy writes remains refused.

Claim authorization freezes the selected card and server policy inputs before
awaiting the control grant and policy digest. The synchronous transaction refuses
changed inputs and rechecks budget, concurrency and current SQL eligibility before
writing. It does not guess whether a changed grant would authorize the claimant.
Run reports and durable events remain in SQL; their external notifications are
deferred until commit. A failed claim transaction leaves neither a partial run
nor a pending policy record or delivered claimed event.

The exported storage reader validates the stored row's shape and canonical policy;
it does not independently verify a source or turn a policy digest into authority.
The separate private source-admission candidate now binds the prepared start
vector, bench identity, planned request digest and worker context digest once.
It validates the pending policy against current Board ownership and the verified
reporter before hashing, then rechecks policy, ownership, heartbeat and reporter
expiry/scope in the insertion transaction. Ignored inserts cannot acknowledge
admission. Exact admission replay still requires active ownership; SQL guards
prevent updates, deletion and replacement.

Its current-run reader joins immutable stored source with actual Board SQL,
instead of deriving source facts from a submitted checkpoint. Settlement binds
the report's source request digest to that stored plan. The full stored plan,
including the admitted worker-context digest, remains part of the post-hashing
authority check. It is frozen before the policy digest await so a change during
hashing cannot redefine the authority being checked. A real Board integration
test checks completion and historical receipt replay, using a supplied delegated
observation. Actual authenticated Hub report construction remains unfinished. A stored plan and its digest are not proof of launch, stopped
writers, sealing or release. Settlement remains disabled. The source-only service boundary below is also
disabled by default; it initializes source storage only during authorized admission. The
actual coordinator, control-pair checks, node observations and producer evidence
must be wired and verified before enablement; no live grant or pilot is claimed.

The Board trace correction is limited to its two existing characterization
records: three schema statements and their schema entries, post-await metadata,
card and eligibility reads, run/card write readbacks, and alarm reads after the
owned commit. Report, claimed event and alarm retain their observable order.
The fresh eligibility clock introduces a new `t#` observation per admitted
candidate, renumbering later normalized timestamps; the first trace's rolling
usage cutoff moves forward nine fixture milliseconds. Returned values and step
order remain identical after timestamp normalization. The independent Worker
HTTP characterization remains unchanged. The prior completion-await policy read
is retained once in the publish trace.

## Claim discovery contract impact

The additive REST request `checkpointProtocol` and optional success
`checkpointClaim` are owned by the actual Board model, RPC input, claim matcher,
and REST handler. Version `superpipeline.checkpoint-claim.v1` projects the
immutable pending policy row; it is not a new source-verification assertion.
Missing protocol skips policy stages, including on mixed boards. Malformed or
unsupported REST versions fail before claim effects. Internal RPC matching also
requires the exact version. Ordinary responses retain their existing shape.

This follows Charter’s proposed coordinator-grant decisions 3, 6, and 7; those
remain **proposed, not accepted**. Producer base is source-admission candidate
`e111bc240f71a5d4f66aa5233d38ed6eb18442e3`. AgentPod’s bridge currently projects
only ordinary claim context and needs a dedicated readiness-gated consumer before
advertising support. That consumer must validate tenant, board, card, stage,
agent, run, epoch, policy and digest, preserve the pending/admitted distinction,
and reject required or unknown claims before ordinary ACP/Salaam dispatch.
Generic SDK/MCP clients keep omitting opt-in. The generic TypeScript SDK also
refuses unsolicited checkpoint claim/policy fields before calling its handler,
including null or unknown markers, instead of projecting them away. Existing work discovery and
eligibility calls without an explicit protocol cannot advertise policy stages as
claimable by those clients.

Tests exercise real Board SQL for legacy refusal, mixed ordinary work, captured
policy projection, rollback and ignored writes. REST validation tests exercise
unknown and malformed versions before any run is created. This does not prove
cross-product dispatch, live source admission, grants, settlement or pilot
acceptance. Those require the actual authenticated consumer and runtime flow.

## Atomic commit reference projection

The private completion bridge requires a tenant reference mapping, joins its tenant
and reporter to current Board policy, and generates one commit locator per policy
member. GitHub uses its canonical origin; Forge requires the server-configured
bare tenant host. Report JSON cannot select the host. Invalid or foreign mappings
refuse settlement. Paths encode owner/repository segments; object format controls
commit width. References carry separate reporter and executing-agent metadata.
These links are locators, not independent evidence of fencing or release.

The existing ordinary reference writer retains its promise interface and its
characterized immediate SQL/event prefix. Its extracted synchronous span is used
inside the owned checkpoint transaction, before completion requirements are
checked. Read-back refuses ignored inserts or stale ignored updates. Any later
failure rolls back references together with receipt, run, card, outbox and events;
exact receipt replay does not rewrite reference history. Generic upsert identity
and original added-by/run provenance remain unchanged.

This helper receives server configuration, not authentication. The eventual
service-only adapter must resolve the mapping from the authenticated tenant's
catalog row and bind it through final verification; no request-provided mapping is
acceptable. No HTTP/RPC route imports this private projection, and it enables no
reporter, policy, source admission or pilot.

## Dedicated-only claim selection

Optional boolean `checkpointOnly` is owned by the same REST/RPC claim matcher.
`true` requires the exact negotiated checkpoint protocol and excludes ordinary
stages before priority ordering. Malformed REST values or a missing protocol are
400; internal matching also refuses malformed values. Omitted/false retains the
prior mixed selection. This avoids handing ordinary work to a dedicated worker
whose ACP readiness was never established. It does not advertise readiness or
grant execution: the Hub must verify its actual packaged worker, registry and
current control pair before requesting dedicated-only work.


## Proposed source service boundary (disabled by default)

`PROPOSED_CHECKPOINT_SOURCE` must equal the literal string `true` at both the
Worker and Board RPC shell. It is absent from deployment configuration and is
exercised only by tests here. Do not configure it until the coordinator authority,
scopes and protocol are accepted. Policy-enabling stage writes remain refused.
This switch enables no settlement, node dispatch, reporter credential or pilot.

The proposed `/v1/boards/:boardId/runs/:runId/checkpoint-source` boundary owns all
methods before agent/human routing. POST requires an issuer-verified service with
`checkpoints:submit`; GET requires `checkpoints:read`. Human/agent tokens, generic
run scopes, body/header principal assertions and wildcard-looking scope strings
cannot substitute. The actual issuer/audience/organization mapping and verified
expiry are resolved through the existing service-token resolver. The Board checks
the current exact policy reporter, tenant and expiry again. The durable-object
name is derived only from the mapped token tenant and URL board ID.

The proposed methods are `POST /v1/boards/:boardId/runs/:runId/checkpoint-source`
for admission and `GET /v1/boards/:boardId/runs/:runId/checkpoint-source` for the
current stored-source observation. Other methods are refused.

POST retains at most 64 KiB while reading the stream, independently of supplied
Content-Length, and refuses excess before an admission RPC. The body run must
match the URL. The existing strict source schema rejects capabilities, tenant
claims and unknown fields. The Board copies verified actor metadata and bytes
before hashing, rechecks live ownership/policy/heartbeat/expiry after awaits, and
creates immutable source storage inside the successful admission transaction.
Exact replay returns the saved receipt; changed bindings conflict. Missing source
reads do not create schema or manufacture admission. GET returns the saved source
joined with current Board run/policy state under current read authorization; it
is an observation, not an execution grant or stopped-writer proof.

The route is a proposed work-owner API, not a trusted producer verifier. The real
Hub adapter still needs to admit only its retained authenticated preparation
response and keep service credentials away from nodes/workers. Final settlement,
operation-bound cancellation/reconciliation, heartbeat integration and the real
Developer Experience pilot remain required.

## Proposed settlement service boundary

`PROPOSED_CHECKPOINT_SETTLEMENT=true` is independently required at the Worker and
Board. Repository deployment configuration leaves it unset. The owned endpoints
are `POST /v1/boards/:boardId/runs/:runId/checkpoint-settlements` and
`GET /v1/boards/:boardId/runs/:runId/checkpoint`; other methods are refused before
agent/human dispatch. POST requires exact `checkpoints:submit`, GET exact
`checkpoints:read`, from an issuer-verified service in the mapped organization.
The Board rechecks expiry, tenant and current selected policy reporter.

POST reads at most 64 KiB, matches the body run to the URL, reads the immutable
admitted source and derives forge mapping from the actual tenant catalog. It
then uses the real Board completion/effect transaction to insert the receipt,
commit references, complete the run/card and update the reporting outbox.
Failure to retain the receipt rolls the complete transaction back. Exact replay
returns the historical receipt without another completion.

GET requires current read authorization and validates stored receipt shape,
identity, epoch, member order, branches and object widths. Missing reads create
no schema. Historical reads confer no execution or lease authority. Neither
endpoint enables a policy, provisions a reporter, authenticates a producer host
or establishes the unfinished Hub/Node pilot.
