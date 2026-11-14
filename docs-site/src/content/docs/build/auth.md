---
title: Authentication
description: How people and agents identify themselves to SuperPipeline, and what each credential grants.
---

Start by naming who is calling. SuperPipeline accepts four kinds: a person, an agent with a
SuperPipeline token, an agent with a token from the sign-in service, and a service acting for a
workspace with a service token from that sign-in service. Your caller kind decides which authority
the request can carry.

## As a person

**With your account at accounts.superjackfruit.com**, the SuperJackfruit sign-in service. The web
app sends you there and back (authorization code with PKCE); the terminal uses its device flow,
`supi login`. Either way SuperPipeline verifies the token itself, against the service's published
keys, rather than asking the service about each request — so a slow sign-in service does not slow
a board.

Your organization must have SuperPipeline enabled on the accounts service. If it does not, every
request is refused with `product_not_enabled` and the organization named.

Your workspace is your organization on the accounts service. The first person from an organization
to arrive becomes its owner; everyone after joins as a `member` until an owner changes their role.
An existing SuperPipeline account with the same verified address is adopted rather than duplicated.

In the web app, signing in creates a signed session cookie; there is no session store behind it, so
signing in on a second device does not disturb the first.

## As an agent, with a SuperPipeline token

Mint an `spa_` token for an agent in Crew → Agents, or from a terminal with
`supi agent mint-token <agentId> --kind claim-run|run-only` (see
[Registering an agent](/use/register-an-agent/)). It is shown **once** — only its hash is stored, so
a database read never yields a usable credential. Minting is a person's act, admin or above: an
agent credential is refused, whatever it holds.

Send it as `Authorization: Bearer <agent token>`.

### Scopes

A token carries **scopes**, and they are enforced — on REST routes and at MCP tool registration,
so a tool your scopes do not permit is never offered to you.

What a **worker** does to the card it holds:

| scope | permits |
|---|---|
| `claim` | take a card off the board |
| `run` | drive a card you claimed, and the MCP tools that wrap those verbs |

What a **coordinator** does to the board itself:

| scope | permits |
|---|---|
| `read` | boards, cards, projects, milestones, labels, capabilities, agents |
| `queue` | create a card |
| `plan` | rearrange existing work: a card's fields, its stage, links, projects, milestones |
| `compose` | create a board, and write a stage's `instructions` |

**A new token carries `claim` and `run`.** The coordinator scopes were deliberately not added to
the default, so a fleet of worker agents gains nothing from their existence — a coordinator's
credential has to be asked for by name. You can mint a **narrower** one: the console (or `supi agent mint-token --kind run-only`) will issue a
`run`-only token for an agent that drives its own card and should not be able to take another.

One deliberate looseness: a `claim`-scoped token may also run, because a claim an agent cannot
finish is worse than no check at all — the card would be taken and abandoned mid-flight. It does
**not** extend to verbs that create work, so a `claim`-only token is refused `split_card`.

**No scope decides a gate.** That refusal is a product boundary, not a scoping choice: an agent
holding both halves of the control pair makes every "a human decided this" record unverifiable.

Revoking a token is per **credential**, not per agent: an agent with two tokens keeps working on
the one you did not revoke. Revocation takes effect on the next request.

## As an agent, with a token from the sign-in service

The same offline verification, for a token naming an agent — the short-lived **station** token an
AgentPod node keeps fresh for its agents. SuperPipeline looks up **its own** agent record for that
principal and takes the capabilities from there; the token contributes its scopes and, where the
operator granted one, the dispatch grant that lets an agent queue work.

**Capabilities are never carried in the token.** They are SuperPipeline's vocabulary; a fleet's
"capabilities" are a different sense of the word — protocol affordances rather than work skills —
and matching on either would be the same word meaning two things.

## As a service, with a service token

Another product acting for a workspace (a library ingesting cards, a chat carrier, a placement
service, a publisher) sends a token from the sign-in service whose principal kind is `service`.
SuperPipeline verifies it offline, maps its organization to a workspace, and reads its **scopes**:
`cards:read`, `push:write`, `approval-requests:relay`, `gates:read`, `dispatch:read`,
`dispatch:reserve`, `approval-requests:write`, `approval-requests:read`, `approvals:read`,
`approvals:write` and `evidence:read`. Each opens a few named routes on that workspace's boards and
nothing else; a service never decides a gate or changes a board. See [Services](/build/services/)
for what each scope reaches.

## What a token cannot do

- **Reach another workspace.** Every query is scoped to one tenant.
- **Make you somebody else.** Identity comes from the credential, never from a parameter.
- **Let an agent act as a person.** An agent-kind token is refused on the human routes outright,
  rather than being admitted with fewer rights.

## Where tokens live in the browser

The web app's tokens are kept in `HttpOnly`, `Secure` cookies scoped to the paths that use them, and
the sign-in round trip exchanges a one-time code from SuperPipeline's own server. A token never
enters a URL, your history, or a `Referer`.

That leaves each credential in one lane: people keep human authority, agents keep agent authority,
and services reach only the named integration routes their scopes open.
