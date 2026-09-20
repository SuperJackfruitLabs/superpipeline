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

`supi` authenticates with a **hub-issued token** — the same credential `fleet login`
produces. superpipeline verifies it offline against the hub's published keys, so one sign-in serves
both.

```sh
fleet login              # once, for both planes
supi whoami                  # who that token says you are
```

Install AgentPod's standalone `fleet` client for that login. After login, `supi`
renews an expired or missing cached token using fleet's device credential, without
opening a browser. A refused device exchange asks you to run `fleet login` again;
a network failure asks you to retry.

The shared `agentpod/token.json` and `agentpod/device.json` files live under
`$XDG_CONFIG_HOME` (or `~/.config`) on Linux, `~/Library/Application Support` on
macOS, and `%AppData%` on Windows. Device exchange uses the issuer saved by fleet,
not `SUPERPIPELINE_URL`, and does not follow redirects. The device file stays
unchanged; only the short-lived token cache is replaced.

Or supply a token directly:

```sh
SUPERPIPELINE_TOKEN=… supi boards
```

| variable | meaning |
|---|---|
| `SUPERPIPELINE_TOKEN` | a token, used before anything else |
| `AGENTPOD_TOKEN` | the fleet token — what superpipeline actually accepts |
| `SUPERPIPELINE_URL` | the deployment to talk to. Defaults to `https://app.superpipeline.dev`. |

Explicit environment tokens are not renewed or replaced with a disk identity. If
one expires, replace or unset that variable. Commands do not retry API writes.

## The verbs

```sh
supi templates                       # available starting pipelines
supi create-board "My board" --template simple
supi boards                          # the workspace's boards
supi board <boardId>                 # one board: its stages and cards
supi card <boardId> <cardId>         # one card in full
supi move <boardId> <cardId> <stage> # move a card
supi gates <boardId>                 # what is waiting on a human
```

`--json` on any command gives machine-stable output. Everything prints the board's own JSON rather
than a summary, so nothing you needed is dropped in the retelling.

## Workspace authority

A linked hub identity uses its Superpipeline account's actual workspace role.
Unmapped principals fall back to `member`; linked owners can create boards.
The API checks permissions. The CLI does not add authority or bypass a refusal.
Staffing agents, editing capabilities and changing the fleet link are not CLI verbs.

## What it will never read

`supi` does not discover credentials from agent-token variables or the node
agent’s enrollment config. A `spa_` **agent** token is not a human fleet credential. Those name an agent, and an agent
is not a person operating a board. A CLI that quietly acted as one would attribute your decisions
to it.

## Reading a refusal

**401** means sign in. **403** means your role does not permit this. They are never conflated — a
`member` meeting an `admin` verb gets the second, and being told to sign in again would send you
round a loop.
