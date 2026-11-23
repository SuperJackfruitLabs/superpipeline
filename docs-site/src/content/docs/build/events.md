---
title: Events
description: The events a push config can subscribe to, how they are delivered, and which ones go through the suite's event relay.
---

When another system needs to hear what changed, you have two board-owned paths and one optional
suite path:

- **Push**: a subscriber registers a push config on a board, and the board POSTs each event it
  subscribed to, signed.
- **The board log**: `GET /v1/boards/:id/events?limit=` (up to 500, default 100) returns the board's
  latest events, every type below included, for a person who may read the board.
- **The event relay** (optional): a deployment linked to the suite also publishes the board-chat,
  record and `work.available` events as CloudEvents, beside the push.

## Subscribing

`POST /v1/boards/:id/push-configs` `{url, token, events?, capabilities?}` registers a config, or
replaces the one with the same subscriber and URL.

- `url` must be a public `http(s)` endpoint. Loopback, private and link-local addresses are refused
  `INVALID_URL`.
- `token` is the config's signing secret. A body without a `url` or a `token`, or with either not
  a string, is refused `INVALID_BODY`.
- The route follows Treaty's push registration contract (`push.v1`). A board that is not set up
  yet is `NOT_INITIALIZED`: 404 for an agent or a person, 400 for a service.
- `events` defaults to `["work.available"]`. A name the board cannot send is refused
  `UNKNOWN_EVENT`.
- Who may register:
  - an **agent** registers its own, with its own token (scope `claim`);
  - a **person** may register one for a named agent;
  - a **service** may subscribe to the record events with `push:write`, and to the decision
    events with `approval-requests:relay` (see [Services](/build/services/)).

## Delivery

Each delivery is a POST of the event's JSON as a
[CloudEvent](https://treaty.superjackfruit.com/relay/) in HTTP binary mode, the same envelope the
event relay uses:

- `ce-id: <boardId>:<seq>`, the event's id. `seq` is the board's own event sequence, so every
  delivery of one event carries the same id, on the push and on the relay alike. Handle each id
  once.
- `ce-type: com.superjackfruit.superpipeline.<entity>.<verb>.v1`, `ce-source:
  /superpipeline/boards/<boardId>`, `ce-dataschema` (the event's schema in Treaty's catalog),
  `ce-time` (the body's `ts`), `ce-specversion: 1.0` and `content-type: application/json`.
- `x-treaty-signature: t=<unix seconds>,v1=<hex>`, an HMAC-SHA256 keyed with the config's `token`
  over `<t>.<ce-id>.<body>`. Verify it with `verifyDelivery` from
  `@superjackfruitlabs/treaty-cloudevents`, which also refuses a delivery signed more than 300
  seconds away from your clock. Binding the id and the time stops a captured delivery being
  replayed. It is the only signature a delivery carries: the older `X-Superpipeline-Signature`
  and `X-Superpipeline-Event` headers are no longer sent. Read the event's name from `ce-type`
  or from the body's `event`.

Verify the signature over the exact bytes you received, before parsing the body.

Once it verifies, you know the payload came from the board that owns the subscription and can
process it as an at-least-once delivery.

Delivery is **at least once**. The board's own alarm drains its queue. What your answer means:

- **2xx**: handled, or ignored for good (an event you do not take).
- **408, 429 or 5xx, or no answer within 10 seconds**: try again. Answer **503** for something you
  expect to know soon, such as a board you have not mapped yet. The board tries again with backoff
  doubling from 5 seconds, up to 5 attempts, and then keeps the delivery as `dead`.
- **Any other 4xx**: refused for good. The delivery is kept as `dead` at once and not sent again.

A person can see the queue at `GET /v1/boards/:id/push/deliveries` (each delivery with its
`eventId`) and drain it now with `POST /v1/boards/:id/push/dispatch`.

Push is an accelerator, not the source of truth. `work.available` says "claim now", and the claim
decides; a record event names cards, and the subscriber reads them back with its own credential.

## The events you can subscribe to

### Work and decisions

| event | when |
|---|---|
| `work.available` | a card became claimable by agents this config could claim for |
| `cards.stale` | the daily digest of cards nobody has touched (see [When a card gets stuck](/use/stuck-cards/)) |
| `gate.pending` | a gate opened and waits for a person |
| `elicitation.pending` | an agent asked a question, or a broker approval request waits |
| `delivery.pending` | an approved post is waiting for a person to publish it by hand |
| `attention.pending` | a card parked on a person (`repeated-failure`, `blocked`, `not-authorised`) |
| `decision.reminded` | a waiting decision passed its stage's reminder time |
| `decision.escalated` | a waiting decision passed its stage's escalation time |
| `gate.approval_recorded` | an approval on a gate that needs a quorum, short of it |
| `decision.released` | a held approval reached its release time |
| `decision.pulled_back` | a held approval was pulled back |
| `check.failed` | a machine check failed and the card went back |
| `check.overridden` | an owner or admin passed a check by hand |

Every event here except `work.available` and `cards.stale` is a **decision event**: addressed to a
person, and what a chat carrier subscribes to. See [Approval gates](/use/gates/) for what each
decision is.

### Record events

The record events say that a card changed. The body names the cards and nothing else:
`{event, boardId, seq, ts, cardIds}`.

| event | when |
|---|---|
| `card.created` | a card was created |
| `card.updated` | a card's fields were edited |
| `card.moved` | a person (or a planning agent) moved a card between stages |
| `card.advanced` | a card moved on to its next stage after a run or a decision |
| `card.completed` | a card finished |
| `card.rejected` | a gate rejected a card |
| `card.failed` | kept for subscribers; the board does not send it today |
| `card.blocked` | a card was parked, the circuit breaker included |
| `card.deleted` | a card was deleted |
| `card.resumed` | a waiting card was resumed |
| `card.comment.added` | a comment was posted on a card |
| `card.comment.deleted` | a comment was deleted |
| `gate.resolved` | a gate was decided |
| `link.added` | two cards were linked |
| `link.removed` | a link between two cards was removed |

## In the board log only

These are recorded in the board log but cannot be subscribed to:

| event | when |
|---|---|
| `card.reserved` | a placement service reserved a card for one agent |
| `card.unreserved` | a reservation was cleared |
| `card.ready` | on a board with a placement window, a card became ready to claim (also relayed, below) |

## The event relay

A deployment with both `RELAY_URL` and `RELAY_TOKEN` set publishes these events to the suite's event
relay too, beside the direct push, which keeps running:

- the decision events: `gate.pending`, `elicitation.pending`, `delivery.pending`,
  `attention.pending`, `decision.reminded`, `decision.escalated`, `gate.approval_recorded`,
  `decision.released`, `decision.pulled_back`, `check.failed`, `check.overridden`;
- every record event, above;
- `work.available`, once per event;
- `card.ready`.

`cards.stale` is not relayed: it is a digest for the push configs that asked for it.
`work.available` is relayed once, while its direct push still goes only to the agents that could
claim the card. `card.ready` is relayed although no push config can subscribe to it: the placement
service hears that a card is ready inside its placement window.

An event that reaches you by both the relay and the push carries the same id on each, so handle
each id once.

- Each event is a CloudEvent in HTTP binary mode, POSTed to
  `RELAY_URL/v1/events/evt.<workspace>.superpipeline.<entity>.<verb>` with
  `Authorization: Bearer <RELAY_TOKEN>`.
- Its type is `com.superjackfruit.superpipeline.<entity>.<verb>.v1` (`gate.pending` is
  `com.superjackfruit.superpipeline.gate.pending.v1`), and its `dataschema` is the event's schema in
  [Treaty](https://treaty.superjackfruit.com/relay/)'s catalog.
- The data is the same JSON the push carries.
- The event is queued in the same transaction as the change that caused it and retried like a
  push. Its id is the event's, `<boardId>:<seq>`, the same as on the direct push and across
  retries, so the relay stores a retried event once and a subscriber on both paths handles it once.

Without both settings nothing is published to the relay, and a standalone board still pushes every
event to the push configs subscribed to it.

So you can choose the smallest boundary that fits: poll the log, subscribe directly, or add the
relay without making it a condition for the board to work.
