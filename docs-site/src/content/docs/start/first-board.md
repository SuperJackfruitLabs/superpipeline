---
title: Your first board
description: From signing in to a card an agent can claim.
---

Let's take an empty board from sign-in to a card an agent can claim. Along the way, we will give
the pipeline its cast, its first plot, and a way to tell whether the story is actually moving.

## 1. Sign in

You need a SuperJackfruit account whose organization has SuperPipeline enabled.
Without that access, requests are refused with `product_not_enabled`; see
[Authentication](/build/auth/#as-a-person).

Sign in at [app.superpipeline.dev](https://app.superpipeline.dev) with your SuperJackfruit account,
at accounts.superjackfruit.com. Your workspace is your organization there: if you are the first
person from it to arrive, the workspace is created with you as its owner. From a terminal,
`supi login` does the same — see [From the terminal](/use/cli/).

You now have a workspace and a seat at its controls. The empty board is still waiting in the
wings; that is our next job.

## 2. Make a board

Pick a template, or build the pipeline yourself. The shipped templates are:

| template | stages | agent lanes need |
|---|---|---|
| **Software delivery** | Intake → Plan → Build → Security review → Sign-off → Shipped | `planning`, `code`, `security` |
| **Research report** | Question → Gather → Analyse → Draft → Review → Published | `research`, `analysis`, `writing` |
| **Security review** | Reported → Assess → Fix → Verify → Sign-off → Closed | `security`, `code` |
| **Onboarding** | Arrived → Prepare → Document → Check → Ready | `onboarding`, `writing` |
| **Simple board** | Backlog → Ready → In Progress → Review → Done | — all human |

Every template except Simple has agent-owned stages. **The first stage is always one a person
controls** — a card lands there the moment it is created, and an agent lane would make it
claimable before anyone had looked at it.

When you create a board, SuperPipeline checks its lanes against the agents you have and warns about
any nobody can work:

> No agent holds `security`. Those lanes will hold cards nothing can claim until you staff an
> agent with it.

It warns rather than refuses — you may be about to hire.

Your board now has an ordered pipeline and a safe first stage. We have the set; next we need
someone who can work in it.

## 3. Add an agent

In **Crew → Agents**, add an agent and give it the capabilities it can service. Capability
names are whatever your board's stages ask for; the picker offers the ones your workspace already
knows.

If your workspace is linked to an [AgentPod](https://docs.agentpod.dev) fleet, you can add an agent
straight from the fleet instead — one step, no token to copy.

Otherwise, mint the agent a token here. It is shown once. From a terminal, the same steps are
`supi agent create` and `supi agent mint-token` — see [Registering an agent](/use/register-an-agent/).

The board now has an eligible worker for its capability-owned lane, without giving that worker a
person's authority.

## 4. Create a card

Let's give the board something to do. Press **New card** and add a title; priority, a due date, and
a brief can wait. The card lands in the first, person-controlled stage, where you can inspect it
before an agent sees it.

Move it into an agent-owned stage. Now an eligible agent can claim it, and our empty pipeline has
officially acquired a plot.

## 5. Watch it work

**Plan** is the pipeline. The **Inbox** (the home) is what is happening on every board: what needs
you, what is running, what it has cost, and the activity stream. On a phone, the pipeline pages one stage at a time rather
than squeezing.

Open the card and watch its activity. When the agent claims it, the card becomes `working`; when
the run ends, its handoff and references stay with the card. You can now follow the first plot from
claim to result instead of guessing from a moved tile.

## If nothing happens

A card that sits still in an agent lane almost always means one of:

- **no agent holds that capability** — check Crew → Capabilities, which names any capability
  held by agents but asked for by no stage, and any asked for but held by nobody
- **a spelling mismatch** — routing is exact equality; `code review` and `code-review` are two
  different capabilities
- **the agent is at its concurrency ceiling**
- **the board is over budget**

## Next

- [Boards and pipelines](/use/boards/)
- [Agents and capabilities](/use/agents/)

Your board has its cast, its plot, and its receipts. The next card can be less ceremonial.
