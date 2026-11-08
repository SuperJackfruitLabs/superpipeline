# Decision timeouts: remind, then escalate

Charter: `decisions/2026-11-08-unanswered-decisions-remind-then-escalate.md`, decisions 1, 2, 4, 5
and 6. SuperPipeline owns the clock; AgentPod carries the notices and does the escalating.

## Setting a timeout

A stage may carry `timeout: { remindAfterMinutes?, escalateAfterMinutes? }`. Both are whole minutes
from 1 to 43200 (30 days), at least one is given, and escalation comes later than the reminder. Set it
with `PATCH /v1/boards/:id/stages/:key` (`null` removes it), `PUT …/stages`, or when the board is
created. A board may also set a default for stages without their own:
`PUT /v1/boards/:id/decision-timeout` with the same object, or `null` to clear it. The board
snapshot shows it as `decisionTimeout` while it is set. Without either, nothing changes.

A timeout is decision policy. Setting or changing one needs a workspace owner or admin (the
Accounts role on the Organization plane, the local membership without it), the same as a stage's
gate, approval subject and deciders. Anyone else gets `403 WORKSPACE_ADMIN_REQUIRED`.

## Deadlines

A decision records its deadlines when it starts waiting, from its stage's timeout or else the
board's default. The deadlines go in the Durable Object's `decision_waits` table, so they survive a
restart. There are four kinds of wait:

| kind | starts when | `decisionId` |
|------|-------------|--------------|
| `gate` | a review gate opens | the gate id |
| `question` | an agent asks a question on a card | the elicitation id |
| `delivery` | a gate is approved for manual delivery | the gate id |
| `attention` | a card parks as `blocked`, `repeated-failure` or `not-authorised` | the card's wait id |

A new gate, a new question or a new wait id is a new wait, and its clock starts again. Pushing the
same wait again keeps its first deadlines. Policy changes do not move a wait that has already
started. Waits that were already open before this shipped have no deadlines. A broker approval
request has no stage, so its subject's expiry bounds it instead.

`gate.pending`, `elicitation.pending`, `delivery.pending` and `attention.pending` include the
deadlines, in the push and in their sweep reads, whenever they are set:

```json
"deadline": { "remindAt": "2026-11-08T15:00:00.000Z", "escalateAt": "2026-11-08T18:00:00.000Z" }
```

Either half may be absent. The field is separate from `approvalSubject.expiresAt`, which says how
long a binding stays valid, not how long anyone waits.

## The sweep

The five-minute board sweep (`sweepBoard`) runs this as its own isolated job, after the expiry
jobs. For every open wait whose deadline has passed:

- If the decision is no longer waiting (decided, cancelled, superseded, archived, expired, or a
  different wait id), the row is closed and nothing is sent.
- **Remind** (once): the card's owner gets an in-app `decision-reminder` notice, and
  `decision.reminded` goes to every push config subscribed to it.
- **Escalate** (once): `decision.escalated` goes out, and the owner gets a `decision-escalated`
  notice.

```json
{
  "event": "decision.escalated",
  "boardId": "brd_…", "boardName": "Press",
  "cardId": "card_…", "cardTitle": "Launch post",
  "stageKey": "review", "stageName": "Review",
  "decisionKind": "gate", "decisionId": "gate_…",
  "waitingSince": "2026-11-08T14:00:00.000Z",
  "escalatedAt": "2026-11-08T18:02:11.000Z",
  "ts": "2026-11-08T18:02:11.000Z"
}
```

`decision.reminded` has the same shape, with `remindedAt` in place of `escalatedAt`. Each deadline
is claimed (`reminded_at`, `escalated_at`) in the same write that queues its push, so it acts at
most once. The pushes go out with the next drain, which happens on the next DO alarm or cron tick.

**Why a new event for the reminder.** The hub posts each pending decision once, keyed on its id, so
pushing `gate.pending` again would do nothing. `decision.reminded` names the decision the hub has
already posted, and the hub replies to that post. Both events belong to the decision events a
carrier subscribes to with `approval-requests:relay`.

**Nothing resolves on a timeout** (decision 4). A passed deadline never approves, rejects, resumes
or archives anything: the gate stays pending, the question unanswered, the delivery owed and the
card waiting. `test/decision-timeouts.test.ts` asserts this.

## What AgentPod does with it

When `decision.escalated` arrives, AgentPod resolves the workspace's owners and admins, invites the
ones with a linked Matrix identity into the board room, and posts the notice as a reply to the
waiting card. `deadline` is passed through to the envelope as `deadline { remind_at?, escalate_at? }`.
These belong to AgentPod and supermessage; this repository only produces the events.
