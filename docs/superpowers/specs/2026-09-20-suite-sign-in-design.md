# Signing in through the suite's issuer, and knowing that the person is the same person

**Date:** 2026-09-20
**Status:** proposed
**Repos:** `superpipeline` (most of it), `agentpod` (the hub's client registry and
token audience)
**Charter:** `decisions/2026-09-18-signing-in-is-not-a-products-verb.md`,
`decisions/2026-08-15-one-issuer-and-offline-verification.md`,
`decisions/2026-08-15-tenancy-is-local-and-mapped.md`

---

## The problem, measured

On 2026-09-20, signed in to `app.superpipeline.dev` in a browser and holding a
valid hub token at a terminal, the same human is two different people:

```
console  → usr_b19776fac3c94df4   owner   of tnt_e080b7a2cc39469e
supi     → 68jYD9VOCmXlPhIY…      member  of the same tenant
POST /v1/boards → 403 {"error":"a member may not do that in this workspace"}
```

Both credentials are genuine and both name Rakesh. superpipeline can verify the
hub token is authentic without being able to tell it is *him*, so it applies the
lowest safe role to a stranger.

`resolve.ts:215-216` is where that happens:

```ts
const local = await roleFor(env.DB, tenantId, claims.sub);
return { userId: claims.sub, tenantId, role: local ?? 'member', … };
```

`roleFor` looks up `memberships.user_id` by `claims.sub` — a hub principal id.
Memberships are only ever written with `usr_`-prefixed ids, by
`ensurePersonalWorkspace` (`catalog.ts:111`) and `addMember` (`members.ts:118`,
keyed on email). **No code path can produce a membership row whose `user_id` is a
hub principal**, so `local` is always `null` and the fallback is always taken.
The cap is real, but it is enforced by an id-space mismatch rather than by any
check that says so.

A second consequence, easy to miss: a hub caller's `userId` is set to
`claims.sub`. Anything superpipeline records on their behalf stores a foreign id
in a field that otherwise holds `usr_`.

## What already exists, which is most of it

**superpipeline is already an OAuth client of the hub.** `auth/hub-oauth.ts`
implements `POST /hub/connect` (mint a PKCE verifier and state, HttpOnly),
`GET /hub/callback` (check state, exchange the code server-to-server) and
`GET /hub/token`. It was built to solve a cross-domain cookie problem — the
hub's cookie is `Domain=.agentpod.dev` and never reaches `superpipeline.dev` —
and it works.

**The hub's authorize endpoint is already multi-client and hand-rolled**, not
Better Auth's `oidc-provider`. `HUB_OAUTH_CLIENTS` is a registry of client ids
and exactly-matched redirect URIs whose own docstring gives the example
`superpipeline|https://superpipeline.dev/hub/callback,supermessage|https://…`.
Its refusal text says a plane is added "at deployment time, deliberately".

This retires a charter caveat.
`charter → decisions/2026-08-15-one-issuer-and-offline-verification.md` said *"the `oidc-provider`
plugin's maturity is unverified […] a spike — issue a token, verify it from a
Worker, rotate a signing key — gates the first migration."* The plugin was never
used. The flow was written by hand and has been exercised in production
repeatedly. The spike that gated this has, in effect, already run.

**What is missing is one thing.** Compare the two callbacks:

| | creates a user | mints a session |
|---|---|---|
| `auth/routes.ts` — GitHub | ✅ `upsertUserByEmail` → `ensurePersonalWorkspace` | ✅ |
| `auth/hub-oauth.ts` — hub | ❌ | ❌ hands the token to the SPA |

superpipeline already walks through the hub's front door. It does not treat what
it finds there as a sign-in: the token is a bearer credential to pass along, not
proof of who someone is.

## The decision

**superpipeline signs people in through the suite's issuer, and records the
mapping between a hub principal and its own user.** Identity comes from one
place; superpipeline keeps its own session, its own ids, and its own idea of
what a role permits.

Three properties are deliberate:

**The mapping lives in superpipeline.** `charter → decisions/2026-08-15-tenancy-is-local-and-mapped.md`
says *"Neither product mints the other's ids."* The hub must not carry a `usr_`
claim. It asserts its own principal id, which it owns, and superpipeline resolves
that to a local user through a table it owns — exactly as `findTenantByExternal`
already does for tenants.

**A mapping is a record of sameness, never a grant.** The hub's own
`principal-identities.ts` states the rule this follows: *"Nothing here answers
'may they', only 'are they the same'."* The mapping decides *who*; the membership
decides *what they may do*. Nothing reads authority out of the mapping.

**Verification stays offline.** No call to the issuer on the request path. The
JWKS check in `hub-jwt.ts` is unchanged.

## Users get the mapping tenants and agents already have

| table | external mapping | added by |
|---|---|---|
| `tenants` | ✅ | migration `0002` |
| `agents` | ✅ | migration `0003` |
| `users` | ❌ | **migration `0008`, this change** |

Two nullable columns, `external_id` and `external_source`, with the same
both-or-neither CHECK the other two carry. The pattern is charter-blessed and
twice-applied; people were the omission.

## The flow

No new routes. `GET /hub/callback` gains an identity step before it hands the
token on:

1. Verify the token offline against JWKS — `hub-jwt.ts`, unchanged.
2. Resolve `sub` to a local user (below).
3. `ensurePersonalWorkspace` for that user, as the GitHub path does.
4. Mint superpipeline's own session cookie — `session.ts`, unchanged.
5. Hand the token to the SPA as it does today, so nothing that works now breaks.

superpipeline does **not** adopt the hub's cookie. It cannot see it across
registrable domains, and its own session policy stays its own. The issuer's
five-minute token governs the token, not the browser session.

## Resolution order

1. **By principal.** `WHERE external_source='agentpod' AND external_id=<sub>`.
   Once a user is mapped, this is the only path that runs.
2. **By verified email, once.** Only when step 1 found nothing **and** the token
   asserts a *verified* email **and** the matched user has no mapping. Adopt that
   row by writing the mapping onto it.
3. **Create.** A new user, then `ensurePersonalWorkspace`.

Step 2 is the only place email is ever a join key across planes, and it can fire
at most once per user because it writes the mapping that makes step 1 hit
forever after. Both conditions are load-bearing: without *verified*, anyone who
can make the issuer assert an address can take an account; without *has no
mapping*, a second principal can capture an account that already belongs to
someone.

`resolve.ts` then reads the mapped user's real role, and sets `userId` to the
local `usr_` id rather than to `claims.sub`.

## Audiences

`hub-jwt.ts:260` checks `audience: opts.issuer`, and every token carries
`aud === iss === https://hub.agentpod.dev`. The check passes for every token ever
minted, including one the `apn` CLI obtained for something else. **That is why a
token minted for client `apn` is accepted by superpipeline today** — nothing binds
a token to the client that asked for it, so registering any new client silently
hands it superpipeline too.

Audience cannot mean "spendable in exactly one place": the CLI's single stored
token legitimately reaches the hub (`apn fleet nodes`) and superpipeline
(`supi boards`). It can mean **the issuer declares where a token may be spent and
each plane refuses one that does not name it.**

- The client registry gains an `audiences` list beside its redirect URIs.
- `aud` becomes that list — a JSON array, which JWT permits.
- Each resource server requires its own URL to be present.

So `apn` is registered for `["https://hub.agentpod.dev",
"https://app.superpipeline.dev"]`; superpipeline's browser client for
`["https://app.superpipeline.dev"]`, because it presents its token to
superpipeline's own API and never to the hub.

## GitHub login stays, unchanged

Not because it is "local auth" — it is delegated auth to a third party, the same
class of thing as the issuer. The reason is narrower and harder: **remove it and
a standalone superpipeline has no way to sign anyone in**, which breaks this
suite's rule that each product stands alone. It stays until superpipeline has
accounts it owns itself, and whether it should ever have those is not decided
here.

A user who arrives by GitHub simply has no mapping, and the email-match-once rule
adopts them the first time they come through the issuer.

## Migration order

superpipeline **continuously deploys to production on merge to `main`**
(`ci.yml`'s `deploy` job). There is no staging: merge and live are one event, so
every step must be safe deployed alone, in whatever order deploys land.

| # | where | change | safe alone because |
|---|---|---|---|
| 0 | hub | mint `aud` as an array | additive — `jose` matches when the checked value is *in* the array |
| 1 | superpipeline | migration `0008` | schema only |
| 2 | superpipeline | `resolve.ts` reads a mapping when present | no mappings exist yet; behaviour identical |
| 3 | superpipeline | `/hub/callback` signs in | the behaviour change |
| 4 | — | verify against the live deployment | below |
| 5 | superpipeline | require superpipeline's own URL in `aud` | only after 0 is proven |
| 6 | hub | drop the hub's URL from clients that do not need it | only after 5 |

**GitHub login is the escape hatch and it never closes.** No step touches it. If
step 3 is broken, sign in the way you do today; nothing is lost but time. With no
staging, that property is the whole safety argument.

**Steps 5 and 6 are where the audience property actually lands, and they are the
ones that get forgotten.** They carry their own verification tasks in the plan.
Stopping at step 4 means doing the work and keeping none of the benefit.

## Verification at step 4

Sign in through the issuer. Confirm you land as `usr_b19776fac3c94df4` and not a
new row; confirm the mapping was written; confirm the CLI token now carries
`owner`. The concrete proof is the request that failed on the day this was
written: `POST /v1/boards` with a hub token returning **201 instead of 403**.

**Rollback**, for the only risky step: clear the two mapping columns on that one
row. Behaviour returns to today's, with the GitHub path untouched.

## Testing

Following `tenant-external-mapping.test.ts`, which runs the real migration.

The email adoption is the riskiest line in the design — the one place a wrong
decision silently attaches one person's account to another's identity — and gets
disproportionate coverage:

- adopts when the email is **verified** and the user has **no** mapping
- **refuses** when the email is present but not verified
- **refuses** when the user already has a mapping — a second principal can never
  capture an adopted account
- adopts at most once: the mapping it writes makes step 1 hit thereafter

Then:

- resolution order: principal → verified email → create
- a linked principal reads its real role; an unlinked one still falls back to
  `member`
- `userId` is the local `usr_` id for a mapped caller
- the both-or-neither CHECK on `users`, running the real migration
- the callback mints a session and creates the workspace
- after step 5: a token whose `aud` omits superpipeline's URL is refused
- an e2e sign-in through the issuer, since Playwright already covers the SPA

New guarantees get rows in `docs/README.md`'s *"What is checked, not just
written"* table, or they are prose again.

## What this does not do

- **No `auth.agentpod.dev`.** Moving the issuer's hostname is a DNS record and an
  `iss` value touching every verifier. Bundling it means a failure there looks
  like a failure in the sign-in work. It is its own small change, immediately
  after; the issuer URL stays configuration so that it can be.
- **No forge integration.** GitHub, Forgejo and Gitea connections are the next
  subsystem. This one separates identity from them; it does not build them.
- **No change to `users.email`'s constraints.** Relaxing `NOT NULL UNIQUE` on the
  identity column is a migration with real risk and nothing here needs it.
- **No change to agent (`spa_`) token resolution**, and no local accounts owned by
  superpipeline.
- **Nothing in supermessage.** How a Matrix login relates to the issuer is an open
  question its own docs record, with `m.login.token` as an unverified candidate.

## Open, and deliberately

**Whether the issuer should ever mint a token whose role is deliberately lower
than the person's.** This design gives a linked principal their real role, on the
reasoning that the README's caution turned on the principal being *unknown* to
the workspace, and linking is what makes that false. A terminal credential is
more exposed than a browser session, and a future decision may want a scoped
session that can read a board but not manage people. Nothing here forecloses it.

**Whether superpipeline becomes a full OIDC relying party.** Approach 2 —
discovery documents and off-the-shelf client libraries — was considered and
deferred, because it swaps a proven hand-rolled flow for the plugin the charter
flagged as unverified and buys nothing needed today. Standard parameter and claim
names are used throughout so that path stays open.
