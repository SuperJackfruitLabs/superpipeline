# Proposed checkpoint settlement candidate

This is an isolated, disabled implementation candidate against published Treaty
proposal `4ba0c9f857f3b01e39c6332c8a005beff0733886` and Charter's proposed coordinator
grant decision. Publication is not acceptance. It provisions no reporter credential,
adds no settlement HTTP/RPC route, and enables no board or pilot.

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
executor/start-vector/bench/request bindings. The explicit source verifier must
inspect trusted service/worker evidence; supplied flags and hashes are not proof.
The private issuer adapter resolves the actual configured service-token path and
requires the exact server-owned policy reporter, mapped tenant, submit scope and
verified expiry. Body/header identity claims, agent/human credentials and another
audience do not satisfy it. No public route imports it. Source verification and
durable claim/source admission remain unfinished.

After asynchronous verification, the candidate rechecks service expiry/scope,
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
mocked source verification does not prove stopped writers, sealed captures, remote
pin/taskref publication, actual dirty-vector refusal, later SuperBench owner safety
or source-host timeout recovery. Parser/state tests exercise related refusals,
not the complete cross-product path. The expected end-to-end scenarios remain in
the pinned `producer-scenarios.json` without an acceptance/conformance claim.

Before enabling any route, owner review must settle and accept the service scope
and policy boundary. Required implementation includes issuer-derived expiry
plumbing, claim-time durable snapshots, service-only tenant routing, current-run
and reporter capability discovery, strict bounded request reading, authenticated
receipt reads, and real source verification. The generic completion mutation
is characterized and extracted into `completion-commit.ts`. The private
`checkpoint-completion.ts` bridge reuses that actual helper and BoardContext,
including real run/card/gate/outbox writes under the receipt transaction. Its
source verifier remains a stub in integration tests. Generated commit references
still need the authorized provider mapping and synchronous reference projection;
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
source-verification awaits. It queues immutable serialized websocket messages and
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
Future binding must add a separate bind-once coordinator-owned source record,
validate the pending policy against the current run and issuer, and retain exact
bench/request/start-vector provenance before launch. The settlement candidate's
current-run reader must join those stored facts rather than populate them from a
submitted checkpoint report. No source-binding operation is implemented here.

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
