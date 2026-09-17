# `supi` — superpipeline from a terminal

Installed as both `superpipeline` and `supi`; they are the same program. Examples use the short name.

## Installing

```sh
packages/cli/install.sh          # both names into ~/.local/bin
BIN_DIR=~/bin packages/cli/install.sh
packages/cli/install.sh --uninstall
```

It links rather than copies, so `supi` is always the `src/index.ts` in your checkout — edit the
CLI and the next invocation is the edited one, with nothing to rebuild. The cost of that choice is
that moving or deleting the repository breaks the command, which is the right trade for a CLI you
are working on and the wrong one for shipping to a stranger. There is no published artifact yet.

It requires [bun](https://bun.sh) — `src/index.ts` runs directly under its own shebang. The
installer checks for it up front rather than letting the first invocation fail as
`bad interpreter`, which names the wrong problem. Uninstalling needs no runtime.

Nothing in `$BIN_DIR` is overwritten unless this installer put it there: both names are checked
before either is written, so a refusal leaves no half-install behind, and `--uninstall` removes
only its own links.

The third consumer of `@superpipeline/contract`, after the Worker's REST routes and its MCP server.
The contract's own comment states the rule this follows:

> Surface-neutral verb input/output schemas. The same schema validates a call whether it arrives
> over MCP or REST — there is exactly one contract.

`supi` is a client. It adds no authority, validates no permissions locally, and renders the
board's own refusals.

## What it can do, and what it deliberately cannot

`supi` authenticates with a **hub-issued token** — the same credential `apn fleet login` produces.
superpipeline verifies it offline against the hub's JWKS (`charter →
decisions/2026-08-15-one-issuer-and-offline-verification.md`), so one sign-in serves both planes.

That credential resolves as a **`member`**, and that is a decision rather than an oversight.
`auth/resolve.ts` says why:

> `member` rather than `owner`: the handoff exists so cards can be queued with authority, which
> is work. Managing this workspace's agents, its people and its fleet link are decisions for
> someone who is actually in it.

So `supi` carries the **work** verbs — the board, its cards, its gates — and **not** the
management ones. Creating boards, staffing agents, editing the capability registry and changing
the fleet link all require a seat in the workspace, which a hub token does not grant.

That is the seat/post distinction in `charter → decisions/2026-09-03-role-is-a-seat-and-a-post.md`
arriving exactly where it was predicted to: a token that names a principal is not an account in
this workspace, and one is never inferred from the other.

**If management from a terminal is wanted**, the honest route is superpipeline issuing its own
credential to a CLI — its own authorization-code flow, the way the hub gained one — not widening
what a hub token means. That is a decision, not a feature.
