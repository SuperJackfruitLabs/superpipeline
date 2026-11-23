# Proposed checkpoint settlement candidate

The coordinator-grant design is accepted. This implementation remains disabled;
acceptance does not provision a reporter or authorize enablement. Issuer scopes,
a least-privilege service principal, producer and consumer conformance, and the
accepted decision's runtime proof gates must be verified before configuration.
Production's deployment configuration (`apps/api/wrangler.jsonc`) sets all three
independent switches to `true`, since the staging rehearsal proved the path; staging
sets them as Worker secrets. Unset, each stays off:

| Switch | Proposed behavior enabled by the literal value `true` |
| --- | --- |
| `PROPOSED_CHECKPOINT_POLICY` | Owner/admin stage policy administration |
| `PROPOSED_CHECKPOINT_SOURCE` | Service-only source admission and observation |
| `PROPOSED_CHECKPOINT_SETTLEMENT` | Service-only settlement and receipt reads |

Worker routing and Board methods enforce their own gates. None of these switches
provisions reporter credentials, advertises producer readiness or enables another
switch. Generic clients do not opt in. Existing scalar wire contracts, ordinary
ACP behavior and accepted event schemas remain unchanged.

## Policy administration and claim discovery

With private policy administration enabled, an issuer-authenticated workspace
owner or admin can create, add, replace or remove a stage checkpoint policy through
the ordinary board/stage APIs. Agents and services cannot choose their own
reporter. The Board independently checks its gate and trusted editor before
initialization or mutation. Any actual policy change is refused while the stage
has a working run or a working/input-required card. Adding a floor to existing
work and removing its floor are both changes. A failed request changes no policy,
claim or event.

Private stage writes use a stream-bounded 64 KiB lexical reader that rejects
duplicate keys, invalid UTF-8, invalid scalars and excess input without trusting
Content-Length. The ordinary stage envelope retains its nullable patch semantics
and general JSON numeric grammar. Field-specific validators constrain those
values. The embedded checkpoint protocol uses the stricter
schema described below. Without the switch, ordinary policy-less JSON retains
its existing behavior and policy-enabling writes are refused.

The additive REST/RPC `checkpointProtocol` negotiation accepts exactly
`superpipeline.checkpoint-claim.v1`. Missing negotiation skips policy stages,
including on mixed boards; malformed or unknown versions refuse before claim
effects. Optional `checkpointOnly: true` also requires that version and excludes
ordinary stages before priority ordering. Omitted/false preserves mixed selection.
This lets a dedicated consumer avoid claiming ordinary work whose ACP readiness
it has not established; it does not prove that consumer is ready.

The actual claim transaction saves `proposed_checkpoint_claims` alongside the run
and card ownership. The immutable pending row captures server tenant, board,
card, stage, executor, epoch, canonical policy and digest. Ordinary claims create
no row. The optional success `checkpointClaim` projects this pending identity;
it contains no guessed source, bench, station, attempt, start vector or execution
evidence. The generic TypeScript SDK refuses unsolicited checkpoint markers
rather than discarding them.

Claim freezes its selected card/policy before asynchronous grant and digest work.
The synchronous commit rechecks those inputs, current eligibility, budget and
concurrency. Failed commits retain neither partial ownership nor a pending claim.
SQL events/reports remain transactional and external effects wait for commit.

## Cards that choose their repositories

A stage's `cardCheckpointPolicy` (treaty `run-checkpoint-policy.v2`, charter
decision of 2026-11-15 as amended 2026-11-22) is written under the same gate as
`checkpointPolicy`: the switch, a workspace owner or admin, no active work. It is
validated with the relations treaty's selection vectors state (sorted unique
allowlist, start and default inside it, a default that resolves a start
repository), and refused beside `checkpointPolicy`.

A card's `repositories_json` column holds its canonical card-repositories.v1
choice. Create, move, resume and edit refuse a choice the destination stage
cannot narrow to (`REPOSITORY_CHOICE_REFUSED`, `detail.reason` in the vectors'
words). The claim narrows the current allowlist by the current choice
(`checkpoint-selection.ts`), parks a card it cannot narrow, and otherwise writes
the claim row as for v1 (with the narrowed policy and its digest) plus an
immutable `proposed_checkpoint_selections` row: the selection, with the stage
policy's digest, and that stage policy's canonical bytes. A v1 claim writes no
selection row. Once a card has a selection row its choice cannot change; to change a claimed card's
repositories, make a new card. A card that named none has its resolved choice (the default, or the
only repository, with its start) written onto it in the same claim transaction, so a later claim
reuses it even after the stage default changes, and its bench keeps the same repositories. Source
admission therefore compares the narrowed repositories and start, not the selection's `source`.

Every later check compares with the frozen narrowed policy: the claim insert
recomputes the narrowing, source admission requires the stage to hold the same
v2 policy and the narrowing to reproduce the frozen one (and the selection's
digest to match the stored stage policy), settlement checks members against the
snapshot's narrowed policy, commit references use it, and the receipt read
requires its reporter to be the stage's current one. A stage policy change before
settlement makes the claim stale.

## Authentication and source admission

The service boundaries resolve the actual issuer, audience, organization mapping,
principal, scopes and expiry through the existing service-token resolver. Body or
header assertions, agent/human tokens, generic run scopes and wildcard-looking
scope strings cannot substitute. Board methods recheck the exact policy-selected
reporter, tenant, expiry and required scope. Issuer NumericDate expiry must have a
safely representable absolute millisecond value; fractional milliseconds round
down. Missing or invalid expiry cannot authorize these operations.

The proposed source endpoints are:

- `POST /v1/boards/:boardId/runs/:runId/checkpoint-source`, requiring `checkpoints:submit`.
- `GET /v1/boards/:boardId/runs/:runId/checkpoint-source`, requiring `checkpoints:read`.

Routing owns these paths before agent/human dispatch and refuses other methods.
The mapped token tenant and URL board identify the Durable Object. POST reads at
most 64 KiB and matches body run to URL. It binds the retained prepared start
vector, bench identity, planned request digest and worker-context digest once to
the pending claim. Reporter, policy, exact run ownership and heartbeat are checked
before hashing and again in the insertion transaction. Ignored inserts refuse;
SQL guards forbid update, deletion and replacement. Exact admission replay still
requires active ownership. Missing GETs create no schema or source facts.

The stored-source reader joins the immutable plan with current Board SQL. The
complete plan, including worker-context digest, is frozen before awaits and
rechecked afterward. Pending claim, admitted source and verified source execution
are distinct states. A saved plan or digest is not proof of launch, stopped
writers, sealing, publication or release.

## Strict checkpoint protocol

Copied schemas and the producer corpus are byte-pinned; `ci:test` checks the pin.
Protocol parsing rejects duplicate keys including escaped duplicates, unknown
fields, nulls, invalid UTF-8/surrogates, unsafe or noninteger numbers, trailing
JSON, excessive depth and inputs over 64 KiB. Validation covers exact ordered
member coverage, object-format widths, derived card branches and disposition.
Independent canonical vectors cover policy, report, full submission and source
hashes. The submission digest includes handoff/outcome, unlike the report digest.

The selected reporter delegates operational observations under the accepted
coordinator design. SuperPipeline checks their binding to its authoritative
claim and admitted source; it does not inspect a producer host or reinterpret
supplied flags/hashes as independent writer-fencing proof. AgentPod’s guarded
consumer must validate authenticated node Completion against its retained source,
current registry, packaged worker and control pair before constructing the report.
Its service credentials must remain in the Hub and never reach nodes or workers.
The consumer implementation exists in AgentPod; this document does not claim that
the complete cross-product runtime or pilot has passed.

## Atomic settlement and references

The proposed settlement endpoints are:

- `POST /v1/boards/:boardId/runs/:runId/checkpoint-settlements`, requiring `checkpoints:submit`.
- `GET /v1/boards/:boardId/runs/:runId/checkpoint`, requiring `checkpoints:read`.

POST bounds input, matches URL run, reads admitted source and resolves reference
mapping from the authenticated tenant’s catalog row. Report JSON cannot select a
Forge host. After asynchronous work it rechecks reporter authorization, expiry,
policy, source binding, run ownership and heartbeat. Invalid, future or expired
heartbeat observations refuse; clock rollback earns no grace period.

One owned synchronous SQLite transaction inserts the receipt, projects commit
references and calls the real completion helper for run, card, gates and outboxes.
Reference completion requirements count only the current run’s references or
user-added references, matching ordinary completion. An inner completion refusal
throws so no receipt can acknowledge a refused handoff. Ignored reference writes,
receipt writes and later failures roll back the entire transaction.

Reference projection generates one commit locator per policy member. GitHub uses
its canonical origin; Forge uses the server-owned bare tenant host. Repository
segments are encoded and object format controls commit width. Reporter and
executing-agent metadata remain distinct. These links locate commits; they do not
prove fencing or release. Existing upsert identity and original added-by/run
provenance are retained. Exact receipt replay does not rewrite reference history.

The commit callback explicitly returns `undefined`; TypeScript rejects async
callbacks and the runtime rejects non-undefined returns. It cannot cancel effects
an incorrectly supplied async continuation schedules later. The effect scope
queues serialized websocket delivery and alarm arming until successful commit;
event, notification, push and run-report outboxes stay inside SQL. Rollback
discards queued effects. Nested scopes refuse; the private scope must not be
invoked within an unrelated enclosing raw storage transaction whose depth cannot
be inspected. Ordinary completion retains its characterized delivery behavior.

Delivery failure after commit does not undo the receipt. Remaining effects are
attempted and durable outboxes support retry/resynchronization. Exact historical
replay requires current reporter authorization, returns only the stored cap-free
receipt and never repeats source execution or completion. Changed canonical
submission content conflicts. Receipt GET validates stored identity, epoch, member order,
branches and object widths; missing reads create no schema. Neither replay nor
GET grants execution or lease authority.

Bound approval subjects require structured variants, while this proposal’s
handoff values are strings. Settlement refuses those transitions instead of
fabricating a subject. Extending them requires owner-reviewed contract binding.
A policy-required run also cannot bypass settlement through ordinary completion,
even when its card has an empty completion override.

## Verification and acceptance limits

Workers tests exercise actual Board SQLite, issuer-authenticated routing, bounded
request parsing, claim/source immutability, post-await authorization changes,
ignored-write refusal, reference provenance, transactional rollback and receipt
replay. They use supplied delegated observations and do not independently prove
producer-host behavior. With all switches unset, the original board characterization snapshot is unchanged.
Ordinary boards create no checkpoint tables or triggers and allocate no commit-effect
scope. Generic claims without checkpoint negotiation and ordinary completion retain their
statement and delivery order. Explicit checkpoint negotiation retains its guarded
transaction, even when the selected work has no policy.
Policy tables are created only when an authorized policy is first installed.
Absent policies are omitted from claim and run-context JSON, including legacy nulls.

The pinned `producer-scenarios.json` describes 23 producer-state scenarios.
Related parser/state refusals do not prove all 23 end to end. Actual stopped
writers, sealed captures, remote pin/taskref publication, dirty-vector refusal,
later-owner safety, source-host timeout recovery and lost-reply reconciliation
need the authenticated cross-product path and retained runtime evidence.

Issuer acceptance of the scope and policy contracts, least-privilege provisioning,
an explicitly opted-in pilot, real multi-repository execution and failure drills
remain enablement gates. Unknown or
pending source effects stay parked; no timer takeover, alternate issuer or
manufactured Current observation substitutes for proof. A reclaimed run cannot
adopt an old proposal. No live grant, production enablement or pilot acceptance is
claimed here.
