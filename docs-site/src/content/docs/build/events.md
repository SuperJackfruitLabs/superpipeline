---
title: Events
description: The events a push config can subscribe to, how they are delivered, and which ones go through the suite's event relay.
---

A board tells the outside world what happened in two ways, and a third for the suite:

- **Push**: a subscriber registers a push config on a board, and the board POSTs each event it
  subscribed to, signed.
- **The board log**: `GET /v1/boards/:id/events?limit=` (up to 500, default 100) returns the board's
  latest events, every type below included, for a person who may read the board.
- **The event relay** (optional): a deployment linked to the suite also publishes the board-chat
  events as CloudEvents, beside the push.

## Subscribing

`POST /v1/boards/:id/push-configs` `{url, token, events?, capabilities?}` registers a config, or
replaces the one with the same subscriber and URL.

- `url` must be a public `http(s)` endpoint. Loopback, private and link-local addresses are refused
  `INVALID_URL`.
- `token` is the config's signing secret.
- `events` defaults to `["work.available"]`. A name the board cannot send is refused
  `UNKNOWN_EVENT`.
- Who may register:
  - an **agent** registers its own, with its own token (scope `claim`);
  - a **person** may register one for a named agent;
  - a **service** may subscribe to the record events with `push:write`, and to the decision
    events with `approval-requests:relay` (see [Services](/build/services/)).

## Delivery

Each delivery is a POST of the event's JSON with:

- `X-Superpipeline-Signature: sha256=<hex>`, an HMAC over the exact body bytes, keyed with the
  config's `token`;
- `X-Superpipeline-Event: <event>`.

Verify the signature before trusting the body.

Delivery is **at least once**. The board's own alarm drains its queue; a failed delivery is tried
again with backoff doubling from 5 seconds, up to 5 attempts, and is then kept as `dead` rather than
deleted. A person can see the queue at `GET /v1/boards/:id/push/deliveries` and drain it now with
`POST /v1/boards/:id/push/dispatch`.

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

`gate.pending`, `elicitation.pending`, `delivery.pending`, `attention.pending`,
`decision.reminded`, `decision.escalated`, `gate.approval_recorded`, `decision.released`,
`decision.pulled_back`, `check.failed`, `check.overridden`, and `card.ready`.

Record events and `work.available` are not relayed. `card.ready` is relayed although it is not a
decision: the placement service hears that a card is ready inside its placement window.

- Each event is a CloudEvent in HTTP binary mode, POSTed to
  `RELAY_URL/v1/events/evt.<workspace>.superpipeline.<entity>.<verb>` with
  `Authorization: Bearer <RELAY_TOKEN>`.
- Its type is `com.superjackfruit.superpipeline.<entity>.<verb>.v1` (`gate.pending` is
  `com.superjackfruit.superpipeline.gate.pending.v1`), and its `dataschema` is the event's schema in
  [Treaty](https://treaty.superjackfruit.com/relay/)'s catalog.
- The data is the same JSON the push carries.
- The event is queued in the same transaction as the change that caused it and retried like a
  push. Its id, `<boardId>:<row>`, stays the same across retries, so the relay stores a retried
  event once.

Without both settings nothing is published to the relay, and a standalone board is unchanged.
