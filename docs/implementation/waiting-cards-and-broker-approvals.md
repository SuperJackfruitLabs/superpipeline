# Waiting cards and broker approvals reach chat

Charter decision `2026-11-08-waiting-cards-and-broker-approvals-reach-chat`, decisions 1–4 (the
board's half). Two decision points that had no chat presence now travel the same way gates and
questions do: a push, a sweep read that lists what is still open, and an answer through an
existing human route. Absence from the sweep read is the outcome: a reader closes what it posted.

## Waiting cards: `attention.pending`

A card parks on a person (`state: input-required` with a `needsHuman` reason) for one of five
reasons. Two already reach chat: `question` (as `elicitation.pending`) and `review` (as
`gate.pending`). The other three, `repeated-failure`, `blocked` and `not-authorised`, are pushed as
`attention.pending` when the card parks, to every push config subscribed to it. Nothing is frozen,
so there is no subject.

```json
{
  "event": "attention.pending",
  "boardId": "brd_…", "boardName": "…",
  "cardId": "card_…", "cardTitle": "…",
  "stageKey": "build", "stageName": "Build",
  "waitId": "wait_0123456789abcdef",
  "reason": "blocked",
  "detail": "the staging database is down",
  "summary": "Staging DB down",
  "failureCount": null,
  "earlierStages": [{ "key": "plan", "name": "Plan" }],
  "options": [
    { "id": "resume_here", "label": "Resume here", "meaning": "approve", "needsComment": false,
      "input": { "kind": "text", "label": "What should the next attempt do?", "required": true, "maxLength": 2730 } },
    { "id": "resume_at:plan", "label": "Resume at Plan", "meaning": "choose", "needsComment": false,
      "input": { "kind": "text", "label": "What should the next attempt do?", "required": true, "maxLength": 2730 } },
    { "id": "archive", "label": "Archive", "meaning": "reject", "needsComment": false }
  ],
  "ts": "…"
}
```

`detail`, `summary` and `failureCount` are `null` when the park gave none. `maxLength` is the
comment limit in characters (a comment is bounded at 8192 bytes; three bytes per character at most).
Forward moves are not offered: a move skips the stage's work and cancels its gates.

**The sweep.** `GET /v1/boards/:boardId/attention/pending` → `{ "attention": [<the same body>] }`,
oldest first, readable by an agent token or a person, like `gates/pending`. A card leaves the list
when its wait ends however it ends (resumed, archived, moved, answered on the board, deleted), and
a card that parks again is listed under a new `waitId`.

**The wait id.** Every wait gets its own `wait_…` id, set when the card's reason is set and cleared
when it is cleared (a trigger on `cards.needs_human_json`, so every writer is covered). A card
waits while it is `input-required` with a reason and not archived.

**Answering.** The hub calls these as the person who answered:

| Option | Call |
|---|---|
| `resume_here` | `POST …/cards/:cardId/resume` `{ "comment": <input>, "expectedWaitId": <waitId> }` |
| `resume_at:<key>` | `POST …/cards/:cardId/resume` `{ "comment": <input>, "toStageKey": <key>, "expectedWaitId": <waitId> }` |
| `archive` | `POST …/cards/:cardId/archive` `{ "expectedWaitId": <waitId>, "comment"?: <text> }` |

Both refuse **`WAIT_CHANGED` (409)** when the card is no longer in that wait (it stopped waiting,
was archived, or waits on something else now), and change nothing. Without `expectedWaitId` they
behave as before: resume's own refusals (`CARD_NOT_WAITING`, `QUESTION_PENDING`, `GATE_PENDING`,
`CARD_BLOCKED`, `INVALID_RESUME`) stand, and archiving an archived card returns it unchanged.
Archive is person-only (an agent token is refused on every scope, as for resume), needs the `work`
role, and archives exactly as the card PATCH's `archivedAt` does: a pending review or question is
cancelled and the card records that it is blocked. It answers `{ card, comment }` (`comment` is
`null` when none was given).

## Broker approval requests

When SuperToolkit's policy says a write needs approval and the host is connected to SuperPipeline,
the broker creates an approval request on the board its policy names and reads the decision back.

**Create.** `POST /v1/boards/:boardId/approval-requests`, with a service token holding
`approvals:write` for the board's workspace:

```json
{
  "requestId": "<the caller's id, 1–128 characters; the idempotency key>",
  "question": "<1–1000 characters>",
  "subject": {
    "schema": "stk-capability/v1",
    "id": "<1–256>",
    "digest": "<1–256, compared byte for byte, never computed>",
    "revision": 1,
    "expires_at": "<ISO 8601 with offset, in the future>",
    "preview": [{ "type": "field", "label": "Service", "value": "…" }, { "type": "text", "label": "Arguments", "text": "…" }],
    "preview_complete": true
  }
}
```

`201 { "approvalRequestId": "apr_…", "state": "pending" }`. The same `requestId` from the same
principal again returns the same record with `200` (its current `state`); the same `requestId` for
a different question or subject is refused **`REQUEST_ID_CONFLICT` (409)**. A malformed body, an
unknown subject field, a revision other than 1 or a subject already expired is
**`INVALID_APPROVAL_REQUEST` (400)**. Preview blocks are the gate.v2 blocks (`text`, `field`,
`link`); they are bounded as every subject's preview is, and a cut preview is sent with
`previewComplete: false`.

**Read back.** `GET /v1/boards/:boardId/approval-requests/:approvalRequestId`, with a service token
holding `approvals:read` (or `approvals:write`):

```json
{
  "approvalRequestId": "apr_…", "requestId": "…",
  "state": "pending | approved | denied | expired",
  "option": "allow_once | deny | null",
  "decidedBy": { "principalId": "prn_…", "label": "…" },
  "decidedAt": "…",
  "subject": { "id": "…", "digest": "…" },
  "expiresAt": "…"
}
```

`decidedBy` and `decidedAt` are `null` until decided. `expired` is a pending request past its
subject's expiry. `decidedBy.principalId` is the decider's suite principal id as the board recorded
it (the local user id where no principal is mapped), never a name supplied by a caller. An unknown
id is `APPROVAL_REQUEST_NOT_FOUND` (404); a board outside the token's workspace is a 404.

**In chat.** The request is a subject-bound question on `elicitation.pending`, listed by
`GET …/elicitations/pending` until it is decided or expires, so the existing carrier posts and
answers it unchanged. It belongs to no card, run or stage:

```json
{
  "event": "elicitation.pending", "boardId": "brd_…", "boardName": "…",
  "cardId": "", "cardTitle": "Approval request", "elicitationId": "apr_…",
  "runId": "", "stageKey": "", "agentId": "<the requesting principal>",
  "question": "…",
  "options": [
    { "id": "allow_once", "label": "Allow once", "meaning": "approve", "needsComment": false, "scope": "once", "requires": "workspace-admin" },
    { "id": "deny", "label": "Deny", "meaning": "reject", "needsComment": false, "scope": "once" }
  ],
  "approvalSubject": { "id": "…", "digest": "…", "schema": "stk-capability/v1", "revision": 1, "expiresAt": "…", "preview": [], "previewComplete": true },
  "approvalRequestId": "apr_…",
  "ts": "…"
}
```

**Answering.** `POST /v1/boards/:boardId/elicitations/apr_…/answer` `{ "option": "allow_once" | "deny", "subject"?: { "id", "digest" } }`,
as a person with the `work` role (a viewer is refused). It is judged by the rules every
subject-bound question follows, plus one:

- `allow_once` only by a workspace **owner or admin**: anyone else is refused
  `WORKSPACE_ADMIN_REQUIRED` (403). `deny` may be chosen by any member who may work the board: a
  denial performs nothing and the broker fails closed on it.
- An approving answer must carry `subject: { id, digest }` matching the request, or it is refused
  `APPROVAL_SUBJECT_MISMATCH` (409); a denial may omit it, but a binding it sends must match.
- Nothing is taken once the subject has expired: `DECISION_EXPIRED` (409).
- A request is decided once: `ELICITATION_NOT_PENDING` (409). An option other than the two is
  `INVALID_ANSWER` (400). The requesting principal can never answer its own request
  (`SEPARATION_OF_DUTIES`).

The answer returns `{ "approvalRequest": <the read-back shape> }`. The board's web app does not list
approval requests yet; they are answered from chat or this route.
