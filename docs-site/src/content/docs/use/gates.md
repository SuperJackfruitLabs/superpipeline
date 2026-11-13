---
title: Approval gates
description: Where a person decides, how a decision reminds and escalates, and gates decided by checks.
---

A stage can carry a gate. A card arriving there stops, and waits for a decision.

## Setting one

A gate is a property of a stage, its `gate` field:

| `gate` | what happens when a card arrives |
|---|---|
| `none` | nothing: the card moves on as usual (the default) |
| `approval` | a gate opens and waits for a person; no card leaves the stage without a decision |
| `checks` | no person is asked: the stage passes once every one of its [checks](#gates-decided-by-checks) passes |

Board settings turn an approval gate on or off. Everything else on this page is set on the stage
itself, in the JSON `supi set-stages` and `PATCH /v1/boards/:id/stages/:key` take (see
[`supi set-stages`](/reference/cli/boards/#supi-set-stages)).

**Decision policy belongs to a workspace's owners and admins.** A stage's `gate`, its approval
subject and named deciders, `timeout`, `quorum`, `holdFor` and `checks` decide who must say yes and
when, so only a workspace owner or admin may set, change or remove them, on a live board or when
creating one. Anyone else is refused `403 WORKSPACE_ADMIN_REQUIRED`; every other stage edit stays
open to members.

## The three answers

| decision | what happens |
|---|---|
| **approve** | the card advances to the next stage |
| **request changes** | the card goes back for more work |
| **reject** | the card is finished, unapproved |

Each is recorded with **who decided, when, and any comment they left**. That record is part of
the card's history, not a transient notification.

### Adding a note

In the board, a pending gate shows **Add a note (optional)** above the buttons. Whatever you write
is recorded with the decision, whichever you take: approve, reject or request changes. Leaving it
empty records no comment. **Request changes needs a note**, because it becomes the instruction the
next run reads. The note is plain text, up to 8192 characters. A card's tile carries a **Review**
button that opens the card, where the note and the decision are.

The CLI does the same with `--comment` (see [`supi approve`](/reference/cli/gates/#supi-approve)).

## The rule that makes a gate mean something

**Whoever produced the work cannot resolve its gate.** SuperPipeline refuses it:

> the producer cannot resolve their own gate

The same rule applies to questions: **the agent that asked cannot answer its own question.**

Without this a gate is decoration — an agent could submit for review and immediately approve
itself. With it, a gate is a genuine second party, which is the only reason to have one.

## When nobody answers

A stage's `timeout` says how long a decision may wait before someone is told:

```json
{ "timeout": { "remindAfterMinutes": 240, "escalateAfterMinutes": 1440 } }
```

- Whole minutes, 1 to 43,200 (30 days). Name either or both; escalation must come after the
  reminder. `null` on a stage edit removes it.
- A board can set a default for every stage that names none: `PUT /v1/boards/:id/decision-timeout`
  with the same object, or `null` to clear it.
- It covers every decision waiting on that stage: its gate, an agent's question, a manual delivery
  still owed a link, a card waiting on a person, and checks still pending.
- **Remind** (once): the card's owner gets a reminder notice.
- **Escalate** (once): the owner gets a second notice, and the escalation is pushed for the
  workspace's owners and admins, whom a chat carrier brings in.
- **Nothing ever resolves on a timeout.** The gate is still pending, the card is where it was, and a
  person still has to decide.

A chat carrier hears both as `decision.reminded` and `decision.escalated` (see
[Events](/build/events/)).

## More than one approver

A stage's `quorum` makes its gate wait for several approvals:

```json
{ "quorum": { "required": 2, "from": "deciders" } }
```

- `required` is 2 to 5. `from` is `deciders` (the default: the stage's named deciders, or anyone
  who may decide when it names none) or `admins` (only the workspace's owners and admins count).
- Each person counts once. Approving twice is refused `QUORUM_ALREADY_APPROVED`.
- Short of the quorum the gate stays pending, and each approval is recorded.
- **One reject or one request for changes closes the gate.**

Without a `quorum`, one approval passes the gate.

## A choice of variants

An agent may hand a gate up to three variants of what it wants approved (two drafts of a post, say)
instead of one. The person approving picks one, and approving it is the choice: the others are
withdrawn. Request changes or reject sets every variant aside. See
[Writing an agent](/build/agent-contract/) for the handoff.

## Waiting for the release time

A stage's `holdFor` (whole minutes, 5 to 10,080, which is 7 days) makes an approval wait before it
acts. An approval subject with a scheduled not-before time waits for it too; the later of the two
wins.

- While it is held the gate is decided and recorded, and the card waits on the stage, showing when
  it will be released.
- **A held approval can be pulled back** until it is released:
  `POST /v1/boards/:id/gates/:gateId/pull-back` `{comment}`. A decider of the gate, or a workspace
  owner or admin, may do it; it acts as request changes. The producer may not
  (`SEPARATION_OF_DUTIES`), nor may any agent.
- At its release time the approval acts exactly as an immediate one would. If the card or its
  subject changed in the meantime, the card is blocked with the reason instead.

Without a `holdFor` or a not-before time, an approval acts at once.

## Gates decided by checks

A stage's `checks` are deciders that are not people. Each is one of:

| provider | passes when |
|---|---|
| `ci` | every required CI context (`contexts`, or every reported one) is green on the head commit of the card's linked pull request |
| `verdict` | SuperWitness's latest verdict of `kind` (and `standard`) on the run that produced the work reaches `atLeast`, or says `pass` |

```json
{
  "key": "review", "name": "Review", "ownerKind": "human", "gate": "approval", "returnStage": "build",
  "checks": [
    { "name": "build", "provider": "ci", "contexts": ["build", "lint"] },
    { "name": "quality", "provider": "verdict", "kind": "eval", "atLeast": 0.8 }
  ]
}
```

- 1 to 5 checks with unique names. A stage with checks must name an earlier `returnStage`.
- On an `approval` stage, the gate opens for people only once every check has passed.
- On a `gate: "checks"` stage nobody is asked: the stage passes when the checks do. No agent may own
  such a stage.
- **A failing check sends the card back** to `returnStage` with the findings, the way an agent's
  "changes needed" does.
- A workspace owner or admin may pass a pending check by hand, with a comment:
  `POST /v1/boards/:id/cards/:cardId/checks/:name/override`. The producer and agents may not.
- `GET /v1/boards/:id/cards/:cardId/checks` shows where each check stands.
- Pending checks remind and escalate under the stage's `timeout`, like any decision.

## Answering from somewhere else

A gate does not have to be answered in the board. If SuperPipeline is linked to an
[AgentPod](https://docs.agentpod.dev) fleet, a pending gate can be projected into a Matrix room and
answered there — from a phone, in a conversation, as an ordinary reply. The decision arrives back
as the same answers, and the card moves.

What crosses between them is [Treaty](https://treaty.superjackfruit.com)'s: the board publishes the gate as a
[`gate.pending`](https://treaty.superjackfruit.com/events/gate-pending-v1/) event through the suite's
[event relay](https://treaty.superjackfruit.com/relay/), the room shows it as the [gate card](https://treaty.superjackfruit.com/matrix/cards/superpipeline-gate-v2/),
and a reply is a [gate decision](https://treaty.superjackfruit.com/matrix/answers/superpipeline-gate-decision-v2/). The settled
gate is closed in the room by the [gate outcome](https://treaty.superjackfruit.com/matrix/receipts/superpipeline-gate-outcome-v1/).

That path is optional and adds nothing you must run: a standalone SuperPipeline gates entirely in its
own interface.

## Finding what is waiting

Everything waiting on a human is gathered in the **Inbox** (its Needs you section), which is the point of that
screen. It holds a card when any of four things is true:

- a gate on it is pending
- an agent asked a question and is waiting
- it is over its budget
- its last run failed

Each appears with its action on the row, so answering does not mean hunting for the card first.

## For agents

An agent at a gated stage finishes with **submit for review** rather than complete. See
[Writing an agent](/build/agent-contract/).
