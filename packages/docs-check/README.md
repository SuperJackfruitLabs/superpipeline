# `docs-check`

The claims SuperPipeline's documentation makes, held against the code.

It lives in its own package because `apps/api`'s tests run in the Cloudflare Workers pool, which
has no `node:fs` — a docs test cannot read the docs there.

## Why it exists

On 2026-09-03, `docs/01-domain-model-and-glossary.md` was found making **five claims that were
false**: two columns dropped in migration 0005, a role model described as unenforced after it had
been enforced, and an endpoint described as absent the day after it shipped. Every one had been
written by somebody reading the code at the time, and not re-read since.

agentpod has had a test of this kind for months, and its drift is smaller for it.

## What it can and cannot check

Only **names**: tool names, file paths, anchors. Those are claims a test can hold to the code,
and they are the ones that go stale silently because nothing renders them wrong.

Prose is not checkable, and pretending otherwise would produce a test whose failures are fixed by
writing something vague. The five false claims above were prose, and this test would have caught
**none** of them. It catches the next class down, and that is worth having rather than nothing.

## The completeness ratchet

The other direction: every route, Worker or CLI setting, event and service scope the code has
must be named in a doc. `src/surface.ts` lists them with the TypeScript parser, from the Worker's
own route tables (`ROUTES`, `BOARD_ROUTES`), the service routes, `Env`, the CLI's `ENV_VARS`, every
`emit(…)` and the push and relay lists, and the scope constants. `docs-claims.test.ts` fails when
an item is named nowhere and is not in `docs/undocumented-baseline.json`, and when the baseline
still lists an item that a doc now names or the code no longer has. So the baseline only shrinks.

After documenting something, regenerate the baseline:

```
pnpm -F @superpipeline/docs-check baseline
```

The docs it reads are the published site, the top-level `docs/*.md`, `docs/contributor/` and the
READMEs. Plans and specs do not count. Like the rest of this package it checks names only: that a
route or an event is mentioned, not that what the docs say about it is right.
