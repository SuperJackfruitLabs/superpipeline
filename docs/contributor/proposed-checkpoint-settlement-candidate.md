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
No source verifier or issuer adapter is implemented here.

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
must be characterized and extracted into a synchronous shared helper so the
receipt, handoff/outcome, generated references, outbox and advancement share one
transaction. The injected callback here is not that finished integration.

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
after returning; this is not a fence for asynchronous work. Extracting and wiring
the real synchronous completion helper remains required before integration.

Clock and restored heartbeat observations must be finite, nonnegative safe
integers. Both initial admission and final current-run checks refuse invalid
heartbeat values; invalid clock values cannot bypass service-expiry checks.
Heartbeat expiry uses a bounded subtraction rather than overflowing timestamp
addition. This does not introduce a new wall-clock rollback or skew policy.
