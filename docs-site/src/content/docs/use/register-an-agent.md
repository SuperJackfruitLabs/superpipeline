---
title: Registering an agent
description: From a terminal, end to end — define its capability, create its record linked to its principal, mint its tokens, put it on an AgentPod station, and queue it a first card.
---

Let's take a new agent from nothing to working a card in five terminal steps. They are the same
acts the web app offers under **Crew**, and once you have run `supi login`, we will not need a
browser.

You need the **admin** or **owner** role in the workspace. Each step is a person's act: an agent
credential is refused on all of them — see [why](#why-an-agent-cannot-do-this).

## 1. Define the capability

Routing is exact string equality between what a stage asks for and what an agent holds (see
[Agents and capabilities](/use/agents/)), so start with the word both sides will use, and say what
it means:

```sh
supi capability define coordination --definition "Plans work, splits it into cards, and queues them onto boards."
```

The key is normalised the way a stage's owner is — `Code Review` becomes `code-review`. A key the
workspace has not seen yet is **declared** with that definition; an existing one has its definition
replaced. You can name it by its `cap_…` id instead (`supi capabilities` lists both). A key is
never renamed: stages and agents refer to it.

The workspace now has one canonical `coordination` key that both a stage and an agent can use, so
routing has an exact word to compare.

## 2. Create the agent, linked to its principal

An agent that runs on an AgentPod station has a **principal** on the organization plane — a
`prn_…` id, issued when the agent was registered there. Create SuperPipeline's record of it and
link it in the same request:

```sh
supi agent create --name Coordinator --capability coordination \
  --external-id prn_0123456789abcdef0123 --concurrency 2
```

- `--capability` repeats, or takes a comma-separated list. An agent's capabilities are chosen
  **here** and never carried in a token.
- `--external-id` is what lets the agent's own short-lived station token resolve as this agent. A
  principal is one agent: one already linked elsewhere is refused (409).
- `--concurrency` is the most cards it may hold at once (default 1).

The output carries the agent's `agt_…` id — the next step needs it, or find it later with
`supi agents`. A linked agent is created **without** a token of its own; you mint the ones it needs
next.

You now have a SuperPipeline agent record linked to one principal, with its capabilities and
concurrency fixed on the board side.

## 3. Mint its tokens

There are two kinds, for two holders:

| kind | scopes | who holds it |
|---|---|---|
| `claim-run` | `claim`, `run` | whatever takes cards off the board on the agent's behalf — the AgentPod bridge |
| `run-only` | `run` | the agent's harness, which drives the card it already holds over MCP and **cannot claim another** |

```sh
supi agent mint-token agt_c4d2… --kind claim-run --out ./claim-run.token
supi agent mint-token agt_c4d2… --kind run-only  --out ./run-only.token
```

Each secret is shown **once** — SuperPipeline keeps only its hash, so a lost token is replaced, never
recovered. With `--out` it is written to the file with mode `0600` (an existing file is replaced
and tightened to `0600`) and printed nowhere. Without `--out` the token alone goes to stdout and
everything else to stderr, so `> file` captures exactly the secret. Never paste one into a chat, a
ticket or a commit.

An `spa_` token does not expire. It lasts until you revoke it in **Crew → Agents**, and revoking
is per token: an agent with two keeps working on the other.

You now have separate credentials for claiming and for driving the claimed run, without handing
the harness authority to take another card.

## 4. Put it on a station

On the AgentPod side, add a bridge roster entry that claims from your board onto the agent's
station, carrying the two tokens — `--token` for the claim-run token, `--mcp-token` for the
run-only one:

```sh
fleet bridge add --key coordinator --board brd_8f2c… --station <station> \
  --token "$(cat ./claim-run.token)" --mcp-token "$(cat ./run-only.token)"
```

The bridge picks up a new roster entry within about ten seconds, with no restart. A credential
cannot be read back from the roster; rotating one is a replace. The flags are documented in the
[`fleet` reference](https://docs.agentpod.dev/reference/fleet/). Once the tokens are in the roster,
delete the local files.

The station can now claim for this agent and hand the live run to its harness; the one-time token
files no longer need to sit on your machine.

## 5. Queue a first card

Make sure a stage on the board is owned by the capability from step 1 (`supi set-stage` with
`--owner coordination`), then queue a card:

```sh
supi create-card brd_8f2c… "Plan the release checklist" --spec ./spec.json
```

A card in a stage the agent's capabilities match is claimable; within a poll or two the bridge
claims it, and `supi log brd_8f2c… <cardId>` shows what the agent did. If it does not move,
`supi capabilities` says whether the lane is held by anyone.

When the log shows the claim and activity, the whole path is live: capability, identity,
credentials, station, and card all agree.

## Why an agent cannot do this

Every command on this page refuses an agent credential with a 403 — an `spa_` token, a station
token, any principal that is not a person — whatever scopes it carries.

That is the human half of the control pair. An agent that could **mint credentials** could issue
itself, or a peer, a token that outlives the one a person revoked. An agent that could **link an
agent to a principal** could point an agent record at any principal and grant itself an identity,
because that link is exactly what makes an agent token resolve. So both stay with a person, and the
board refuses them by name rather than telling an agent to sign in.
