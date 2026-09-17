---
title: From the terminal
description: supi — the board, its cards and its gates, without a browser.
---

`supi` is superpipeline from a terminal. It is also installed as `superpipeline` — the same
program under its full name, for scripts that should read plainly. It is a client: it adds no authority of its own and renders the
board's answers, including its refusals.

## Installing

`supi` is not published anywhere yet. It installs from a checkout of the repository:

```sh
packages/cli/install.sh          # both names into ~/.local/bin
BIN_DIR=~/bin packages/cli/install.sh
packages/cli/install.sh --uninstall
```

The installer links rather than copies, so the command always runs the source in that checkout —
right for working on the CLI, and the reason there is nothing here to hand to someone who has no
copy of the repository. It requires [bun](https://bun.sh), and says so before installing rather
than after. It never replaces a file it did not put there.

## Signing in

`supi` authenticates with a **fleet-issued token** — the same credential `apn fleet login`
produces. superpipeline verifies it offline against the fleet's published keys, so one sign-in serves
both.

```sh
apn fleet login              # once, for both planes
supi whoami                  # who that token says you are
```

Or supply one directly:

```sh
SUPERPIPELINE_TOKEN=… supi boards
```

| variable | meaning |
|---|---|
| `SUPERPIPELINE_TOKEN` | a token, used before anything else |
| `AGENTPOD_TOKEN` | the fleet token — what superpipeline actually accepts |
| `SUPERPIPELINE_URL` | the deployment to talk to. Defaults to `https://app.superpipeline.dev`. |

## The verbs

```sh
supi boards                          # the workspace's boards
supi board <boardId>                 # one board: its stages and cards
supi card <boardId> <cardId>         # one card in full
supi move <boardId> <cardId> <stage> # move a card
supi gates <boardId>                 # what is waiting on a human
```

`--json` on any command gives machine-stable output. Everything prints the board's own JSON rather
than a summary, so nothing you needed is dropped in the retelling.

## What it deliberately cannot do

**Creating boards, staffing agents, editing capabilities and changing the fleet link are not
here.** A fleet token acts as a `member`, and those are `admin` and `owner` acts.

That is a decision, not a gap waiting to be filled. A token naming a principal in a fleet is not
an account in this workspace, and one is never inferred from the other — managing a workspace is a
decision for somebody actually in it. Use the board for those.

## What it will never read

`supi` does not read a `kbn_` **agent** token, from any variable. Those name an agent, and an agent
is not a person operating a board. A CLI that quietly acted as one would attribute your decisions
to it.

## Reading a refusal

**401** means sign in. **403** means your role does not permit this. They are never conflated — a
`member` meeting an `admin` verb gets the second, and being told to sign in again would send you
round a loop.
