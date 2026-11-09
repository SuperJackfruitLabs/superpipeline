# Release time: an approval may wait before it acts

Charter: `decisions/2026-11-09-an-approval-may-wait-for-its-release-time.md`. Operator ruling: the
release time is the later of the subject's not-before time and the stage's `holdFor`; a held
approval may be pulled back as request changes; release runs in the five-minute sweep; choosing a
time when approving is a later step. SuperPipeline holds, releases and enforces; AgentPod carries
the release time and the receipts; supermessage renders the time and offers Pull back.

## The stage

```json
{ "key": "review", "name": "Review", "ownerKind": "human", "gate": "approval", "holdFor": 30 }
```

- `holdFor` is a whole number of minutes from 5 to 10080 (7 days). Malformed values refuse the
  write `INVALID_STAGES`.
- It is decision policy (`decisionPolicyOf`): only a workspace owner or admin may set, change or
  remove it, on a live board or when creating one (`WORKSPACE_ADMIN_REQUIRED`).
- Each gate snapshots it in `gates.hold_for_minutes` when it opens, so a later edit never changes
  what an open gate does.

## The release time

When an approving answer arrives (including the one that reaches a quorum; on a variant gate, by
the chosen variant's subject):

```
releaseAt = max(subject timing.notBefore  — when timing.mode is "scheduled" and it is a valid time,
                approval time + holdFor)
```

- Neither applies, or `releaseAt` is not after the approval: the approval acts at once, exactly as
  before. `release_at` stays NULL.
- `releaseAt` after the subject's `timing.expiresAt`: refused `APPROVAL_RELEASE_AFTER_EXPIRY`
  (409, with `detail: { releaseAt, expiresAt }`). Nothing is recorded: no decision, no quorum
  approval, no delivery event. On a quorum gate this is judged before each approval is recorded.
- Otherwise the approval is **held**. The gate resolves as today (decision, approvers, binding,
  variant choice, the `approved` delivery event), `gates.release_at` records the time, and the
  card stays `input-required` on the gate's human stage with `needsHuman: { reason: 'review',
  detail: 'approved; held until …' }`. Nothing advances, no manual follow-up is owed, and no
  agent can claim it. The time never moves.

While held:

- `verifyApprovalSubject` refuses `APPROVAL_HELD` (409, `detail: { releaseAt }`); so does an
  automatic delivery report.
- Changing the delivery (`POST …/delivery`) is refused `APPROVAL_HELD`: switching to automatic
  would advance the card early. The mode chosen at approval stands until release.
- The gate's own decision wait ended when it resolved. The hold is not a wait on a person, so it
  is never reminded about or escalated. A manual approval's delivery wait starts at release.

## Release

`releaseHeldApprovals` runs in the board sweep (every five minutes), before the expiry jobs. A
release time means "not before": an approval acts within five minutes after it, never before.
For each gate with `release_at <= now`, not released and not pulled back, it rechecks:

- the card is not archived, and is still `input-required` on the gate's stage;
- the subject is still the card's active subject, active, with the gate's digest;
- the subject has not expired.

All hold: the deferred action runs, the same function an unheld approval runs (`actOnApproval`):
manual delivery parks the card for the follow-up, starts its delivery wait and pushes
`delivery.pending`; anything else advances the card with the approver as producer, on the gate's
run. Any fails: the card is blocked with the reason (`needsHuman: { reason: 'blocked' }`), as an
expired manual delivery is. Either way `released_at` is set, so a gate is released once, and
`decision.released` is pushed:

```json
{ "event": "decision.released", "boardId": "brd_…", "cardId": "card_…", "gateId": "gate_…",
  "decision": "approve_automatic", "releaseAt": "…", "releasedAt": "…",
  "outcome": "released" }
```

A blocked release says `"outcome": "blocked", "reason": "the approved subject changed before the
release time"`. A failure on one gate is emitted (`decision.release_failed`) and costs no other.

## Pull back

`POST /v1/boards/:boardId/gates/:gateId/pull-back` with `{ "comment": "…" }`. The comment is
required, trimmed, non-empty and at most 8192 bytes (`INVALID_COMMENT`, 400).

| Gate | Result |
|---|---|
| held | the card returns to the gate's return stage with the comment as feedback, the subject is invalidated, `card.changes_requested` and `decision.pulled_back` are pushed; 200 `{ card }` |
| released | `APPROVAL_RELEASED` (409) |
| never held, or already pulled back | `GATE_NOT_HELD` (409) |

Who may: anyone who may decide the gate (the stage's named deciders, a quorum's named deciders,
anyone on a plain gate), or a workspace owner or admin by `workspaceRoleFor` at the time of the
request. Never an agent (`APPROVAL_DECIDER_NOT_ALLOWED`, 403), never the gate's producer
(`SEPARATION_OF_DUTIES`, 403); a quorum `from: admins` gate is pulled back by an owner or admin
only. The caller is mapped to a principal id the same way deciding maps it. The gate keeps its
recorded decision and gains `pulled_back_at`, `pulled_back_by` and `pulled_back_comment`; the next
submission opens a new gate.

```json
{ "event": "decision.pulled_back", "boardId": "brd_…", "cardId": "card_…", "gateId": "gate_…",
  "pulledBackBy": "prn_…", "at": "…", "comment": "wrong image" }
```

## On the wire

- `gate.pending` and `GateView` carry `release: { holdForMinutes?, notBefore? }` only when the
  gate's snapshot has `holdFor` or a subject it binds has a scheduled not-before (on a variant gate
  before the choice, the earliest of the variants'). A gate nothing holds is byte-identical to
  before.
- `GateView` after resolve adds `heldUntil` (while held), `releasedAt` and `pulledBack: { by, at,
  comment }`.
- `decision.released` and `decision.pulled_back` are pushed events and decision events: a carrier
  subscribes to them like `decision.reminded`.

## Not in this step

Choosing a time when approving, veto windows and per-second scheduling (the ruling's "does not
decide").
