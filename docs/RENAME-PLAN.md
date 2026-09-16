# Renaming kaambaan → superpipeline

**Status:** proposed, not started.
**Decided:** 2026-09-16. See "Why" below; the research is in the session that produced this.

## Why

Three reasons, in descending order of how much they cost:

1. **The name already means something else.** काम is two words — *kām* (work) and
   *kāma* (desire) — and "kaam baan" is an established phrase for the arrow of
   Kamadeva. The bare-word search returns `kaambaan.wordpress.com`, *"Kaam Baan
   Arrow of Sex काम बाण मंत्र"*. The etymology footnote in our own README is the
   tell: a product whose name needs a gloss has a naming problem.
2. **The pun is taken.** [KaibanJS](https://www.kaibanjs.com/) shipped the
   Kanban+AI wordplay with a framework, a board and a domain. Vibe Kanban,
   Agent Kanban and kandev are in the same field. A fifth entrant competes on a
   crowded term and inherits the explaining tax.
3. **It breaks the house pattern.** Products here are descriptive English
   compounds — **AgentPod** (Runtime plane), **supermessage** (Communication),
   **supermd**. kaambaan is the only coined non-English product name, and the
   only one a reader cannot parse on sight.

**Why `superpipeline`:** of every candidate checked, it was the only one clean on
all four registries simultaneously — `superpipeline.dev`, `superpipeline.io`,
npm `superpipeline`, and the GitHub org. It matches `super` + plain noun, and
"pipeline stages" is already our own vocabulary in `docs/00`.

Known collisions, judged acceptable: *superpipelining* is a 1990s CPU
architecture term, and [arXiv 2410.08791](https://arxiv.org/abs/2410.08791) uses
"Superpipeline" for a GPU-memory method. Both are academic references, not
products competing for our users, and neither is defended as a brand.

## Why now

**Nothing is published.** `@kaambaan/*` is a 404 on npm, every package is
`private: true`, the site is not indexed (searches return the GitHub repo, never
`kaambaan.dev`), and there are no users. This is a find-and-replace today. The
first `npm publish` or the first indexed page turns it into a migration.

## What this is not

Not a migration. There are no users, no published packages, no inbound links and
no search ranking to preserve, so **no redirects, no aliases, no compatibility
shims, and no dual-name period.** Anything that reads "support both names for a
while" is wrong for this repo's situation and should be cut from the plan.

---

## The one hard decision: history is not renamed

`charter`'s own rule is that dated decisions "do not pretend to be current. A
later decision supersedes an earlier one; neither is edited to agree with the
other." The same logic governs this rename.

So there are two classes of occurrence and they get opposite treatment:

| Class | Treatment | Examples |
|---|---|---|
| **Live** — anything that runs, is read as current, or is linked | rename | source, config, wrangler, README, landing copy, current docs |
| **Historical** — dated records of what was decided or shipped | **leave** | `charter/decisions/*`, `CHANGELOG.md` entries, superseded specs, `docs/superpowers/plans/*` |

A decision record from 2026-08-30 that says `KAAMBAAN_PUSH_SECRET` is telling the
truth about what was decided that day. Rewriting it makes the record a lie and
destroys the only reason to keep dated records at all.

**Instead:** add one dated decision to `charter/decisions/` recording the rename,
so a reader of an old record can find out what the name became. That is the
supersession mechanism the charter already uses.

---

## Surface

Measured, not estimated.

### kaambaan repo — 146 files

- 540 `kaambaan`, 143 `Kaambaan`, 10 `KAAMBAAN`
- 9 package names: root `kaambaan`, and `@kaambaan/{web,api,agent-sdk,landing,cli,docs-check,contract,docs}`
- Domains in code: `kaambaan.dev` (24), `app.kaambaan.dev` (18), `docs.kaambaan.dev` (12)
- Cloudflare: worker `kaambaan-api`, D1 `kaambaan-catalog` (id `62bba503-…`)
- Deploy targets: `apps/api` (wrangler), `landing` and `docs-site` (Astro)

### agentpod — a live integration, not just mentions

This is the part that makes the rename cross-repo rather than local.

- **Env vars:** `ENABLE_KAAMBAAN_BRIDGE`, `KAAMBAAN_BASE_URL`, `KAAMBAAN_BOARD_URL`,
  `KAAMBAAN_BRIDGE_AGENTS`, `KAAMBAAN_PUSH_SECRET`, `KAAMBAAN_REQUEST_TIMEOUT_MS`,
  `KAAMBAAN_RUN_ID`, `KAAMBAAN_URL`
- **Code identifiers:** `KaambaanClient`, `KaambaanApiError`, `createKaambaanPushRoutes`,
  `startKaambaanBridge`, `KaambaanRunId`, `KaambaanAgentId`, `KaambaanMembershipId`, …
- **Files:** `routes/kaambaan-push.ts`, `services/bridge/*`
- **OAuth:** a registered client `kaambaan|https://kaambaan.dev/hub/callback`

`KAAMBAAN_PUSH_SECRET` is a **deployed secret** (estate `BACKLOG.md`, 2026-08-30).
Renaming the variable means setting the new name wherever the hub runs before the
new code ships, or the bridge silently stops claiming work.

### Others

- **charter** — 39 files. Product table and current agreements rename; `decisions/` does not.
- **supermessage** — 44 files. Mostly docs; check for live references.
- **estate** — 14 files. Runbooks and `BACKLOG.md`; dated entries stay.

### The token prefix — decide explicitly

Agent bearer tokens are `kbn_…` (`packages/agent-sdk/src/index.ts:188` validates the
prefix). It is derived from the old name.

**Recommendation: leave `kbn_` alone.** It is an opaque credential prefix, not a
brand surface; users never read it as a word; and changing it invalidates every
minted token and the validation of stored ones. If it is changed, it must be a
separate, deliberate task with a token re-mint — not swept up in a find-and-replace.

---

## Tasks

Ordered so the repo is never half-renamed in a way that ships.

### 1. Claim the names first

Before touching code, so the rename cannot strand on an unavailable name:

- register `superpipeline.dev` (and `.io` if wanted)
- create the GitHub org/repo name `superpipeline`
- reserve the npm scope `@superpipeline` even though nothing publishes yet

**Verify:** all three resolve to us. Stop here if any fails — the whole plan
assumes this name is obtainable.

### 2. kaambaan repo: mechanical rename

- `kaambaan` → `superpipeline`, `Kaambaan` → `Superpipeline`, `KAAMBAAN` → `SUPERPIPELINE`
- exclude `CHANGELOG.md` and anything under `docs/superpowers/plans/`
- package names → `@superpipeline/*`, root → `superpipeline`
- delete the etymology line in `README.md`; the new name needs no gloss

**Verify:** `pnpm install && pnpm typecheck && pnpm test`, then
`grep -ri kaambaan` returns only the deliberate historical exclusions.

### 3. Cloudflare resources

- worker `kaambaan-api` → `superpipeline-api`
- D1 `kaambaan-catalog` → `superpipeline-catalog` (**keep `database_id`** — the id is
  the real identity; the name is a label)
- routes/custom domains → `superpipeline.dev`, `app.`, `docs.`

**Verify:** `wrangler deploy --dry-run`, then a real deploy, then the board loads
and a card can be created.

### 4. Landing and docs-site

- copy, `<title>`, brand spans (12 user-visible occurrences in `landing/src`)
- rebuild and redeploy both

**Verify:** no "Kaambaan" in built `dist/`.

### 5. agentpod: the bridge

The only step with a live-service risk.

- rename env vars, identifiers, `routes/kaambaan-push.ts`, `services/bridge/*`
- **set the new env vars wherever the hub runs, before shipping the new code**
- re-register the OAuth client with the new id and callback

**Verify:** hub tests pass (Postgres required — start Docker, do not skip), the
bridge claims a card end to end, and the push endpoint authenticates.

### 6. charter, supermessage, estate

- charter: product table and current agreements only; **`decisions/` untouched**
- one new dated decision recording the rename and superseding the old name
- supermessage and estate: live references only; dated entries stay

**Verify:** each repo's own checks pass.

### 7. Repo rename, last

`kaambaan` → `superpipeline` on GitHub. GitHub redirects the old URL
automatically, so this is safe to do after the content is consistent. Update
remotes locally.

---

## Order and risk

Steps 1–4 are reversible and self-contained. Step 5 is the one that can break a
running system, and its failure mode is quiet — the bridge stops claiming work
rather than erroring loudly — so it gets its own verification pass rather than
being folded into a bulk commit.

Do not start step 5 until steps 2–4 are deployed and the board is confirmed
working under the new name.
