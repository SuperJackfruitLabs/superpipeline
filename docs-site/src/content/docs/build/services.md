---
title: Services
description: How another product reads boards, carries decisions to people, places work and confirms a publication, on a service token and its scopes.
---

A **service** is another product acting for a workspace: a library ingesting cards, a chat carrier
bringing decisions to people, a placement service choosing which agent takes a card, a publisher
confirming what it may post. It calls SuperPipeline with a **service token** from the sign-in
service, a token whose principal kind is `service`, and SuperPipeline verifies it offline like any
other.

A service token is not a person and not an agent. It reaches only the routes on this page, each on
the scope named for it, and only boards of the workspace the token belongs to:

- no token, or one that does not verify: `401`;
- the right route without its scope: `403 FORBIDDEN`, naming the scope;
- a board of another workspace: `404`, as if it did not exist.

A service never decides a gate, answers a question, moves a card or edits a board. Those stay with
people and agents. Each answer is the JSON the human route gives, so a consumer sees one shape
whoever asks.

## The scopes

| scope | what it allows |
|---|---|
| `cards:read` | read boards and cards: the board list, one board, a card, and a card's attempts, comments, links and activities |
| `push:write` | register a push config for the [record events](/build/events/#record-events) |
| `approval-requests:relay` | read the questions waiting on a person, broker approval requests included, and subscribe to the [decision events](/build/events/#work-and-decisions) |
| `gates:read` | read a board's pending gates and one gate, the manual deliveries still owed a link, the cards waiting on a person, and a card's checks |
| `dispatch:read` | read who could claim a card, and why not (the eligibility read); read a board's scheduling |
| `dispatch:reserve` | reserve a card for one agent and clear the reservation; set a board's placement window |
| `approval-requests:write` | create a broker approval request |
| `approval-requests:read` | read a broker approval request's decision back |
| `approvals:read` | confirm that a publication's approval is in force, for the exact request |
| `approvals:write` | record the live URL of a publication made under an automatic approval |
| `evidence:read` | read a run's evidence |

## Reading boards and cards

On `cards:read`, `GET` only:

- `GET /v1/boards`
- `GET /v1/boards/:boardId`
- `GET /v1/boards/:boardId/cards/:cardId`
- `GET /v1/boards/:boardId/cards/:cardId/attempts`, `…/comments`, `…/links`, `…/activities`

To hear about changes instead of polling, register a push config for the record events on
`push:write` (`POST /v1/boards/:boardId/push-configs`, see [Events](/build/events/)).

## Carrying decisions to people

A chat carrier puts each decision in front of a person and settles it once it is decided. It
subscribes to the decision events on `approval-requests:relay`, and sweeps:

| read | scope |
|---|---|
| `GET /v1/boards/:boardId/elicitations/pending`, with broker approval requests | `approval-requests:relay` |
| `GET /v1/boards/:boardId/gates/pending` and `GET /v1/boards/:boardId/gates/:gateId` | `gates:read` |
| `GET /v1/boards/:boardId/deliveries/pending` → `{ deliveries }` | `gates:read` |
| `GET /v1/boards/:boardId/attention/pending` → `{ attention }` | `gates:read` |
| `GET /v1/boards/:boardId/cards/:cardId/checks` → `{ checks }` | `gates:read` |

Deciding a gate, pulling back a held approval, recording a delivery link, resuming or archiving a
card and overriding a check stay on the human routes.

## Placing work

A placement service chooses which agent should take a card, and holds the card for it. Nothing here
changes a board that has no placement service.

- **Who could claim it**: `GET /v1/boards/:boardId/cards/:cardId/eligibility` (`dispatch:read`)
  lists every agent in the workspace, judged against the card's current stage by the claim's own
  filter: `{ cardId, stageKey, reasons, agents: [{ agentId, name, principalId, eligible, reasons }] }`.
  The top-level `reasons` are about the card itself; an agent is `eligible` when both lists are
  empty. It only reads: nothing is claimed.
- **Hold it**: `PUT /v1/boards/:boardId/cards/:cardId/reservation`
  `{agentId, decisionId, ttlSeconds?}` (`dispatch:reserve`) holds a ready card for that agent for
  10 to 300 seconds (60 by default). Until it lapses, other agents' claims pass the card over, and
  the agent it is held for gets it ahead of priority. It clears on claim.
  `DELETE …/reservation` clears it (a board admin may too).
- **A moment to choose**: `PUT /v1/boards/:boardId/scheduling` `{placementWindowSeconds}`
  (`dispatch:reserve`; `GET` on `dispatch:read` reads it) opts a board into a placement window of
  0 to 30 seconds. A card that just became ready waits that long before pull may take it, unless it
  is reserved for the claimant, and the board relays `card.ready` at once. When no reservation
  comes, the window ends on its own. 0, the default, is off.
- **What a station needs**: a stage's `placement` says what a station must have to work it, for the
  placement service to filter on. See [Boards and pipelines](/use/boards/#what-a-station-needs).

## Broker approval requests

A tool broker asks a person to approve an action that belongs to no card:

- `POST /v1/boards/:boardId/approval-requests` (`approval-requests:write`) creates the request;
- `GET /v1/boards/:boardId/approval-requests/:approvalRequestId` (`approval-requests:read` or
  `approval-requests:write`) reads its decision back.

The request reaches people as a question (`elicitation.pending`), through a carrier holding
`approval-requests:relay`.

## Confirming a publication

A publisher that posts on a person's approval checks, at the moment it posts, that the approval
still stands for exactly what it is about to send:

- `POST /v1/boards/:boardId/approval-subjects/:subjectId/verify` `{expectedDigest}`
  (`approvals:read`) answers whether the subject's gate was approved for automatic delivery, is
  still in force and unexpired, and matches the digest;
- `POST /v1/boards/:boardId/approval-subjects/:subjectId/delivery` `{expectedDigest, liveUrl}`
  (`approvals:write`) records the live URL after an automatic post, re-checking the approval in
  the same step.

## Reading a run's evidence

`GET /v1/boards/:boardId/runs/:runId/evidence` and `…/evidence-v1` (`evidence:read`) return what
a run produced, for an evaluation service.
