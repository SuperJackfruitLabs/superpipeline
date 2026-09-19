# Suite Sign-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** superpipeline signs people in through the suite's issuer, and a linked hub principal reads its real role instead of falling back to `member`.

**Architecture:** superpipeline is already an OAuth client of the hub; `hub-oauth.ts` does PKCE, state and a server-to-server exchange. What is missing is that the callback never treats what it finds as a sign-in. This adds an external mapping to `users` (the one tenants and agents have had since migrations 0002 and 0003), teaches the callback to resolve or create a local user, and gives `resolve.ts` a real role to read. The hub gains the `email`/`email_verified` claims that makes any of it possible, and per-client audiences.

**Tech Stack:** Cloudflare Workers, D1/SQLite, `jose` for JWT. Hub side: Bun, Hono, Drizzle/Postgres.

**Spec:** `docs/superpowers/specs/2026-09-20-suite-sign-in-design.md`

## Global Constraints

- **Two repositories.** Tasks 1–2 and 7 are in `agentpod`; tasks 3–6 are in `superpipeline`. Each task says which. Never mix repos in one commit.
- **Task 5 must not merge before task 1 is deployed and confirmed live.** superpipeline cannot resolve or create a user until the hub issues `email`. The pipelines are independent; confirm by decoding a freshly minted token, not by reading the hub's source.
- **superpipeline deploys to production on merge to `main`.** There is no staging. Every task must be safe deployed alone.
- **GitHub login is the escape hatch. No task touches `auth/routes.ts` or `auth/github.ts`.** If sign-in through the issuer breaks, that path still works.
- Claim names are the OIDC standard spellings: `email`, `email_verified`. Not `emailVerified`.
- superpipeline commands run from the repo root; `pnpm --filter @superpipeline/api test`.
- Hub commands run from `apps/hub`; `bun test` needs a pgvector Postgres on `:5434` and an explicit `DATABASE_URL` — see `agentpod/TESTING.md`.

---

### Task 1 (agentpod): the hub mints `email` and `email_verified`

**Files:**
- Modify: `apps/hub/src/auth/jwt-claims.ts` — `buildTokenPayload`, around line 174
- Test: `apps/hub/src/auth/jwt-claims.test.ts` (create if absent)

**Interfaces:**
- Produces: two new claims on every human token. Task 5 consumes them.

- [ ] **Step 1: Write the failing test**

The claims must appear for a principal that has a user, and must be *absent* rather than null for one that does not — an absent claim and a claim asserting nothing are different things to a consumer.

```ts
import { describe, expect, it } from "bun:test";
import { buildTokenPayload } from "./jwt-claims";

describe("buildTokenPayload", () => {
  it("carries the principal's verified email", () => {
    const payload = buildTokenPayload({
      principal: { id: "prn_1", kind: "human" },
      user: { email: "someone@example.com", emailVerified: true },
      tenant: "fleet_0",
      grant: undefined,
    } as never);
    expect(payload.email).toBe("someone@example.com");
    expect(payload.email_verified).toBe(true);
  });

  it("marks an unverified address as unverified rather than omitting it", () => {
    const payload = buildTokenPayload({
      principal: { id: "prn_1", kind: "human" },
      user: { email: "someone@example.com", emailVerified: false },
      tenant: "fleet_0",
      grant: undefined,
    } as never);
    expect(payload.email_verified).toBe(false);
  });

  it("omits both claims when the principal has no user", () => {
    const payload = buildTokenPayload({
      principal: { id: "prn_agent", kind: "agent" },
      user: null,
      tenant: "fleet_0",
      grant: undefined,
    } as never);
    expect("email" in payload).toBe(false);
    expect("email_verified" in payload).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd apps/hub && DATABASE_URL="postgres://agentpod:agentpod-dev-password@localhost:5434/agentpod" bun test src/auth/jwt-claims.test.ts`
Expected: FAIL — `payload.email` is `undefined`.

- [ ] **Step 3: Read the call sites before changing the signature**

`buildTokenPayload` is called from at least the authorize route and the agent exchange path. Run `grep -rn "buildTokenPayload" apps/hub/src` and read each caller. The agent path has no user and must keep working — that is what the third test pins.

- [ ] **Step 4: Add the claims**

At `jwt-claims.ts:174`, extend the returned object. Spread conditionally so the claims are absent, not `undefined`, for a principal with no user:

```ts
return {
  sub: principal.id,
  principalKind: principal.kind,
  tenant,
  mayDispatch: grant?.mayDispatch ?? [],
  mayGrantReach: grant?.mayGrantReach ?? false,
  ...(user ? { email: user.email, email_verified: user.emailVerified === true } : {}),
};
```

Thread the user through from the caller. `principals.ts:143` notes a principal's `userId` "travels with the row so the console can put a name and an email" — follow that join rather than adding a new query if one is already to hand.

- [ ] **Step 5: Run the tests**

Run: `cd apps/hub && DATABASE_URL="…" bun test src/auth/`
Expected: PASS, and no existing auth test regresses.

- [ ] **Step 6: Commit**

```bash
git add apps/hub/src/auth/jwt-claims.ts apps/hub/src/auth/jwt-claims.test.ts
git commit -m "feat(auth): tokens carry email and email_verified

superpipeline cannot resolve or create a local user from a token that says
only that someone is someone. The claim names are the OIDC standard spellings,
so the token moves towards a conforming ID token rather than a bespoke shape.

Absent, not null, when the principal has no user — an agent token asserts
nothing about an address it does not have."
```

- [ ] **Step 7: Deploy and confirm live**

This is the cross-repo dependency. After merge, decode a freshly minted token and confirm the claims are present:

```bash
fleet login
python3 -c "
import json,base64,pathlib
tok=json.loads((pathlib.Path.home()/'.config/agentpod/token.json').read_text())['token']
c=tok.split('.')[1]; c+='='*(-len(c)%4)
print(sorted(json.loads(base64.urlsafe_b64decode(c))))
"
```
Expected: the list includes `email` and `email_verified`. **Task 5 may not merge until this passes.**

---

### Task 2 (agentpod): per-client audiences

**Files:**
- Modify: `apps/hub/src/config.ts` — the `HUB_OAUTH_CLIENTS` parser
- Modify: `apps/hub/src/auth/jwt-claims.ts` — set `aud` from the client's list
- Test: `apps/hub/src/config.test.ts`, `apps/hub/src/auth/jwt-claims.test.ts`

**Interfaces:**
- Consumes: the client registry from task 1's file.
- Produces: `aud` as a JSON array. Task 6 consumes it.

- [ ] **Step 1: Write the failing tests**

```ts
it("parses a client's audiences", () => {
  const clients = parseOAuthClients(
    "apn|https://127.0.0.1/callback|https://hub.agentpod.dev,https://app.superpipeline.dev"
  );
  expect(clients[0].audiences).toEqual([
    "https://hub.agentpod.dev",
    "https://app.superpipeline.dev",
  ]);
});

it("defaults a client with no audiences to the hub alone", () => {
  const clients = parseOAuthClients("apn|https://127.0.0.1/callback");
  expect(clients[0].audiences).toEqual(["https://hub.agentpod.dev"]);
});
```

- [ ] **Step 2: Run and watch them fail**

Run: `cd apps/hub && DATABASE_URL="…" bun test src/config.test.ts`
Expected: FAIL — `audiences` is `undefined`.

- [ ] **Step 3: Extend the registry format, preserving the old one**

The existing format is `client|uri` with the client key repeated for several URIs. Extend it so a third `|`-separated field is an audience list. **A registry entry with no audience field must keep working and default to the hub**, because the deployed `HUB_OAUTH_CLIENTS` has no audiences in it and this task must be safe deployed alone.

The parser already skips malformed entries rather than throwing (it runs at module scope). Keep that.

- [ ] **Step 4: Mint `aud` from the list**

Where the token is signed, set `aud` to the client's `audiences` array rather than to the issuer. A token minted outside a client context — the agent exchange — keeps `aud` as the issuer.

- [ ] **Step 5: Verify against the existing consumer**

superpipeline checks `audience: opts.issuer` (`hub-jwt.ts:260`). `jose` matches when the checked value appears *in* an array audience, so a token with `aud: ["https://hub.agentpod.dev", …]` still passes. Add a test asserting the array contains the hub's URL, so the safety of deploying this alone is pinned by a test rather than by this paragraph.

- [ ] **Step 6: Run and commit**

Run: `cd apps/hub && DATABASE_URL="…" bun test src/`

```bash
git add apps/hub/src/config.ts apps/hub/src/auth/jwt-claims.ts apps/hub/src/config.test.ts apps/hub/src/auth/jwt-claims.test.ts
git commit -m "feat(auth): tokens name the planes they may be spent at

aud equalled iss, so superpipeline's audience check passed for every token ever
minted — including one the apn CLI obtained for something else. Registering any
new client silently handed it superpipeline too.

The registry now declares audiences per client and aud carries them. A client
cannot gain reach into a plane it was not granted. Entries without an audience
field default to the hub, so the deployed registry keeps working unchanged."
```

---

### Task 3 (superpipeline): migration `0008` and the mapping helpers

**Files:**
- Create: `apps/api/migrations/0008_user_external_mapping.sql`
- Modify: `apps/api/src/db/catalog.ts`
- Test: `apps/api/test/user-external-mapping.test.ts`

**Interfaces:**
- Produces: `findUserByExternal(db, source, externalId)` → `UserRecord | null`; `setUserExternalMapping(db, userId, mapping)` → `void`; `findUserByEmail(db, email)` → `(UserRecord & { externalId: string | null }) | null`. Tasks 4 and 5 consume them.

- [ ] **Step 1: Write the failing test**

Model it on `apps/api/test/tenant-external-mapping.test.ts`, which runs the real migration — read that file first and follow its harness exactly.

```ts
it('is both-or-neither', async () => {
  const user = await upsertUserByEmail(db, { email: 'a@example.com', name: 'A' });
  await expect(
    db.prepare(`UPDATE users SET external_id = 'prn_1' WHERE id = ?`).bind(user.id).run(),
  ).rejects.toThrow();
});

it('finds a user by their principal', async () => {
  const user = await upsertUserByEmail(db, { email: 'a@example.com', name: 'A' });
  await setUserExternalMapping(db, user.id, { externalId: 'prn_1', externalSource: 'agentpod' });
  const found = await findUserByExternal(db, 'agentpod', 'prn_1');
  expect(found?.id).toBe(user.id);
});

it('refuses to give one principal two users', async () => {
  const a = await upsertUserByEmail(db, { email: 'a@example.com', name: 'A' });
  const b = await upsertUserByEmail(db, { email: 'b@example.com', name: 'B' });
  await setUserExternalMapping(db, a.id, { externalId: 'prn_1', externalSource: 'agentpod' });
  await expect(
    setUserExternalMapping(db, b.id, { externalId: 'prn_1', externalSource: 'agentpod' }),
  ).rejects.toThrow();
});
```

- [ ] **Step 2: Run and watch them fail**

Run: `pnpm --filter @superpipeline/api test user-external-mapping`
Expected: FAIL — `setUserExternalMapping` is not exported.

- [ ] **Step 3: Write the migration**

Create `apps/api/migrations/0008_user_external_mapping.sql`:

```sql
-- A user learns which principal they are in the suite's issuer.
--
-- Same shape as tenants (0002) and agents (0003): two nullable columns and a
-- both-or-neither CHECK riding in on the second ADD COLUMN, because SQLite has
-- no ALTER TABLE ... ADD CONSTRAINT.
--
-- UNLIKE tenants, this mapping is UNIQUE. A tenant mapping is deliberately not:
-- two colleagues in one organisation legitimately map two workspaces onto one
-- fleet. A user mapping has no such reading — one principal is one person here.
-- Without the index the lookup returns an arbitrary row, which is the same
-- undefined-order hazard findTenantByExternal already carries and which should
-- not be reproduced on people.
--
-- SQLite treats NULLs as distinct in a unique index, so every unmapped user
-- coexists happily.
ALTER TABLE users ADD COLUMN external_id TEXT;

ALTER TABLE users ADD COLUMN external_source TEXT
  CONSTRAINT users_external_pair CHECK ((external_id IS NULL) = (external_source IS NULL));

CREATE UNIQUE INDEX users_external_identity ON users (external_source, external_id);
```

- [ ] **Step 4: Write the helpers**

In `catalog.ts`, beside the tenant equivalents, mirroring their validation and their `ExternalMappingError`:

```ts
/** The user a principal is, in this workspace. Null when nobody has linked that principal. */
export async function findUserByExternal(
  db: D1Database,
  source: string,
  externalId: string,
): Promise<UserRecord | null> {
  if (!source || !externalId) return null;
  return db
    .prepare(`SELECT id, email, name FROM users WHERE external_source = ? AND external_id = ?`)
    .bind(source, externalId)
    .first<UserRecord>();
}

/** Record that this user is also known to `externalSource` as `externalId`. */
export async function setUserExternalMapping(
  db: D1Database,
  userId: string,
  mapping: { externalId: string; externalSource: string } | null,
): Promise<void> {
  if (mapping) {
    const { externalId, externalSource } = mapping;
    if (typeof externalId !== 'string' || externalId.trim() === '') {
      throw new ExternalMappingError('an external mapping needs an externalId');
    }
    if (typeof externalSource !== 'string' || externalSource.trim() === '') {
      throw new ExternalMappingError('an external mapping needs an externalSource naming whose id it is');
    }
  }
  await db
    .prepare(`UPDATE users SET external_id = ?, external_source = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(mapping?.externalId ?? null, mapping?.externalSource ?? null, userId)
    .run();
}

/**
 * A user by email, for the one-time adoption in the hub callback.
 *
 * Deliberately NOT `upsertUserByEmail`, which CREATES when it does not find —
 * using it as a lookup would conjure a user as a side effect of asking whether
 * one exists. And it selects `external_id`, because the caller's guard is
 * "adopt only a user who has no mapping", and a guard reading an undefined
 * column silently adopts everybody.
 */
export async function findUserByEmail(
  db: D1Database,
  email: string,
): Promise<(UserRecord & { externalId: string | null }) | null> {
  if (!email) return null;
  return db
    .prepare(`SELECT id, email, name, external_id AS externalId FROM users WHERE email = ?`)
    .bind(email)
    .first<UserRecord & { externalId: string | null }>();
}
```

- [ ] **Step 5: Run the tests, then the suite**

Run: `pnpm --filter @superpipeline/api test`
Expected: PASS, nothing else regresses.

- [ ] **Step 6: Commit**

```bash
git add apps/api/migrations/0008_user_external_mapping.sql apps/api/src/db/catalog.ts apps/api/test/user-external-mapping.test.ts
git commit -m "feat(db): users get the external mapping tenants and agents have

Migrations 0002 and 0003 gave tenants and agents an optional mapping to the
same thing elsewhere. People were the omission, which is why a hub token
resolves to a stranger.

Unique, unlike the tenant mapping: two workspaces may legitimately name one
fleet, but one principal is one person here, and a duplicate would make the
lookup return an arbitrary row."
```

---

### Task 4 (superpipeline): `resolve.ts` reads the mapping

**Files:**
- Modify: `apps/api/src/auth/resolve.ts` — around lines 213–217
- Test: `apps/api/test/hub-principal-role.test.ts`

**Interfaces:**
- Consumes: `findUserByExternal` from task 3.
- Produces: a `UserPrincipal` whose `userId` is a local `usr_` id and whose `role` is the mapped user's real role.

- [ ] **Step 1: Write the failing tests**

```ts
it('a linked principal reads its real role', async () => {
  // user is owner of the tenant; principal prn_1 is mapped to them
  const p = await resolveHubUser(env, claimsFor('prn_1'));
  expect(p?.role).toBe('owner');
  expect(p?.userId).toBe(user.id);        // local usr_, not the principal id
});

it('an unlinked principal still falls back to member', async () => {
  const p = await resolveHubUser(env, claimsFor('prn_unknown'));
  expect(p?.role).toBe('member');
});
```

- [ ] **Step 2: Run and watch them fail**

Run: `pnpm --filter @superpipeline/api test hub-principal-role`
Expected: FAIL — the first test gets `member` and the principal id.

- [ ] **Step 3: Make the change**

Replace lines 215–216. The comment above them describes the old behaviour and must change with it:

```ts
  // A hub token names a principal in the fleet. If someone has linked that principal to a user
  // here, they ARE that user: their real role, and their local id on anything they write. If
  // nobody has, they are a stranger holding a valid credential, and `member` is what a stranger
  // gets — the same rule as before, now reached only when the mapping says nothing.
  const linked = await findUserByExternal(env.DB, 'agentpod', claims.sub);
  if (linked) {
    const role = await roleFor(env.DB, tenantId, linked.id);
    return { userId: linked.id, tenantId, role: role ?? 'member', mayDispatch: claims.mayDispatch ?? [] };
  }
  return { userId: claims.sub, tenantId, role: 'member', mayDispatch: claims.mayDispatch ?? [] };
```

Note the linked branch still tolerates `role === null` — a linked user who is not a member of *this* tenant is a member, not an owner.

- [ ] **Step 4: Run the tests and the suite**

Run: `pnpm --filter @superpipeline/api test`
Expected: PASS. Existing `agent-run-identity` and `tenant-external-mapping` suites unaffected.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/resolve.ts apps/api/test/hub-principal-role.test.ts
git commit -m "feat(auth): a linked principal is the person, not a stranger

roleFor looked up memberships by claims.sub — a hub principal id — and
memberships are only ever written with usr_ ids, so the lookup could never hit
and the member fallback was always taken. The cap was an id-space mismatch
rather than a policy.

Deployed before anything writes a mapping, so behaviour is unchanged until
task 5 lands."
```

---

### Task 5 (superpipeline): the hub callback signs you in

**Do not merge this before task 1 is live and confirmed by Step 7 of that task.**

**Files:**
- Modify: `apps/api/src/auth/hub-oauth.ts` — the `HUB_CALLBACK_PATH` branch at line 237
- Modify: `apps/api/src/auth/hub-jwt.ts` — surface `email` and `email_verified` on the verified claims type
- Test: `apps/api/test/hub-signin.test.ts`

**Interfaces:**
- Consumes: `findUserByExternal`, `setUserExternalMapping` (task 3); `upsertUserByEmail`, `ensurePersonalWorkspace` (existing, used by the GitHub path at `routes.ts:59-60`); the session cookie helper in `session.ts`.

- [ ] **Step 1: Write the failing tests — the adoption guards first**

These are the riskiest behaviour in the change: the one place a wrong decision attaches one person's account to another's identity.

```ts
it('adopts an existing user on a verified email, once', async () => {
  const existing = await upsertUserByEmail(db, { email: 'a@example.com', name: 'A' });
  await signInViaHub(claims({ sub: 'prn_1', email: 'a@example.com', email_verified: true }));
  const mapped = await findUserByExternal(db, 'agentpod', 'prn_1');
  expect(mapped?.id).toBe(existing.id);
});

it('refuses to adopt on an unverified email', async () => {
  await upsertUserByEmail(db, { email: 'a@example.com', name: 'A' });
  await signInViaHub(claims({ sub: 'prn_1', email: 'a@example.com', email_verified: false }));
  expect(await findUserByExternal(db, 'agentpod', 'prn_1')).toBeNull();
});

it('refuses to adopt a user who already has a mapping', async () => {
  const existing = await upsertUserByEmail(db, { email: 'a@example.com', name: 'A' });
  await setUserExternalMapping(db, existing.id, { externalId: 'prn_first', externalSource: 'agentpod' });
  await signInViaHub(claims({ sub: 'prn_second', email: 'a@example.com', email_verified: true }));
  const first = await findUserByExternal(db, 'agentpod', 'prn_first');
  expect(first?.id).toBe(existing.id);                       // unchanged
  expect(await findUserByExternal(db, 'agentpod', 'prn_second')).toBeNull();
});

it('resolves an already-mapped user from a token with no email at all', async () => {
  const existing = await upsertUserByEmail(db, { email: 'a@example.com', name: 'A' });
  await setUserExternalMapping(db, existing.id, { externalId: 'prn_1', externalSource: 'agentpod' });
  const res = await signInViaHub(claims({ sub: 'prn_1' }));   // no email claim
  expect(res.userId).toBe(existing.id);
});

it('creates a user and a workspace when nothing matches', async () => {
  await signInViaHub(claims({ sub: 'prn_new', email: 'new@example.com', email_verified: true }));
  const created = await findUserByExternal(db, 'agentpod', 'prn_new');
  expect(created).not.toBeNull();
  expect(await primaryTenant(db, created!.id)).not.toBeNull();
});
```

- [ ] **Step 2: Run and watch them fail**

Run: `pnpm --filter @superpipeline/api test hub-signin`
Expected: FAIL — no sign-in happens at the callback.

- [ ] **Step 3: Surface the new claims**

In `hub-jwt.ts`, add `email?: string` and `email_verified?: boolean` to the verified-claims type. Do not make either required: a token minted before task 1 carries neither, and step 1's fourth test pins that such a token still resolves a mapped user.

- [ ] **Step 4: Add the identity step to the callback**

In the `HUB_CALLBACK_PATH` branch of `handleHubRoute`, after the token is obtained and verified and **before** it is handed to the SPA, resolve a local user in this order:

```ts
// 1. By principal. Once linked, the only path that runs.
let user = await findUserByExternal(env.DB, 'agentpod', claims.sub);

// 2. By verified email, once. Both conditions are load-bearing: without
//    email_verified, anyone who can make the issuer assert an address takes an
//    account; without the has-no-mapping check, a second principal captures one
//    that already belongs to somebody.
if (!user && claims.email && claims.email_verified === true) {
  const candidate = await findUserByEmail(env.DB, claims.email);
  if (candidate && !candidate.externalId) {
    await setUserExternalMapping(env.DB, candidate.id, {
      externalId: claims.sub,
      externalSource: 'agentpod',
    });
    user = candidate;
  }
}

// 3. Create. Needs an email: users.email is NOT NULL UNIQUE.
if (!user && claims.email && claims.email_verified === true) {
  const created = await upsertUserByEmail(env.DB, { email: claims.email, name: null });
  await setUserExternalMapping(env.DB, created.id, {
    externalId: claims.sub,
    externalSource: 'agentpod',
  });
  user = created;
}
```

Then, when `user` is set: `ensurePersonalWorkspace`, and mint the session cookie exactly as `routes.ts` does. When it is not — a token with no email and no mapping — **do not fail the callback**: hand the token to the SPA as today. That caller is no worse off than before this change, which is the property that makes this safe to deploy.

**Use task 3's `findUserByEmail`, never `upsertUserByEmail`, for step 2's lookup.** `upsertUserByEmail` (`catalog.ts:83`) creates the user when it finds none — calling it to ask whether someone exists would conjure one, and the adoption guard would then be examining a row it had just made. It also selects only `id, email, name`, so `candidate.externalId` would read `undefined` and the has-no-mapping guard would pass for everybody.

- [ ] **Step 5: Run the tests and the full suite**

Run: `pnpm --filter @superpipeline/api test && pnpm --filter @superpipeline/api typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/hub-oauth.ts apps/api/src/auth/hub-jwt.ts apps/api/src/db/catalog.ts apps/api/test/hub-signin.test.ts
git commit -m "feat(auth): the hub callback signs you in

superpipeline already walked through the hub's front door — PKCE, state, a
server-to-server exchange — and then treated what it found as a bearer token to
pass along rather than as proof of who someone is. It created no user and minted
no session, where the GitHub callback does both.

Resolution is by principal, then by verified email exactly once, then create.
A token with neither a mapping nor a verified email is handed on as before, so
nobody is worse off than they were."
```

- [ ] **Step 7: Verify against the live deployment**

Sign in through the issuer. Confirm you land as `usr_b19776fac3c94df4` and not a new row, that the mapping was written, and that the CLI token now carries `owner`. The proof is the request that failed on the day the spec was written:

```bash
fleet login
TOKEN=$(python3 -c "import json,pathlib;print(json.loads((pathlib.Path.home()/'.config/agentpod/token.json').read_text())['token'])")
curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://app.superpipeline.dev/v1/boards \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"probe","stages":[{"key":"a","name":"A","order":0,"ownerKind":"human"}]}'
```
Expected: **201**, where it was 403. Delete the probe board afterwards.

**Rollback**, if anything is wrong: clear the two mapping columns on that one row. Behaviour returns to today's, with GitHub login untouched.

---

### Task 6 (superpipeline): require superpipeline's own audience

**Only after task 2 is deployed and a live token is confirmed to carry the array.**

**Files:**
- Modify: `apps/api/src/auth/hub-jwt.ts` — line 260
- Test: `apps/api/test/hub-jwt-audience.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('refuses a token that does not name this plane', async () => {
  const token = await signWith({ aud: ['https://hub.agentpod.dev'] });
  await expect(verifyHubToken(token, opts)).rejects.toThrow();
});

it('accepts a token that names it', async () => {
  const token = await signWith({ aud: ['https://hub.agentpod.dev', 'https://app.superpipeline.dev'] });
  await expect(verifyHubToken(token, opts)).resolves.toBeTruthy();
});
```

- [ ] **Step 2: Run and watch the first fail**

Run: `pnpm --filter @superpipeline/api test hub-jwt-audience`
Expected: FAIL — the first test resolves, because the check still asks for the issuer.

- [ ] **Step 3: Change the checked value**

`audience: opts.issuer` becomes this deployment's own public origin, from config rather than a constant. Leave a comment saying why the check moved, so the next reader does not "fix" it back.

- [ ] **Step 4: Run, commit**

```bash
git add apps/api/src/auth/hub-jwt.ts apps/api/test/hub-jwt-audience.test.ts
git commit -m "feat(auth): require this plane to be named in the audience

The check asked for the issuer, which every token carried, so it passed for
every token ever minted — including one obtained by another client for another
purpose. It now asks for this deployment's own origin."
```

---

### Task 7 (agentpod): narrow the registry

**Only after task 6 is live.**

- [ ] **Step 1** — In the deployed `HUB_OAUTH_CLIENTS`, give each client only the audiences it needs. superpipeline's browser client presents its token to superpipeline's own API and never to the hub, so it gets `https://app.superpipeline.dev` alone. `apn` keeps both.

- [ ] **Step 2** — Confirm by decoding a token from each client that the arrays are what the registry says.

- [ ] **Step 3** — Commit the registry change and note in the commit which client lost which audience, so a later reach question has an answer in the history.

---

## Self-Review

**Spec coverage.** Every section maps to a task: the hub's email claims → 1; audiences → 2 and 6 and 7; the users mapping → 3; `resolve.ts` → 4; the flow → 5; migration order → the task order and the two "do not merge before" gates. GitHub login is covered by a global constraint forbidding any task from touching it.

**Placeholders.** None. `findUserByEmail` is flagged as possibly-absent with instructions rather than assumed.

**Type consistency.** `findUserByExternal` returns `UserRecord | null` in task 3 and is consumed that way in 4 and 5. `setUserExternalMapping(db, userId, mapping | null)` matches the tenant setter's shape. Claim names are `email` and `email_verified` in every task.

**The trap this plan exists to steer around**, checked rather than assumed: `findUserByEmail` does not exist, and the nearest function, `upsertUserByEmail` (`catalog.ts:83`), **creates a user when it finds none** and selects only `id, email, name`. Reaching for it in task 5's step 2 would do two silent wrongs at once — conjure the very row the guard is about to inspect, and leave `candidate.externalId` undefined so the has-no-mapping guard passes for everybody. Task 3 therefore defines a distinct read-only `findUserByEmail` that selects `external_id`, task 5 says explicitly not to substitute the other, and the third test in task 5 step 1 fails loudly if anyone does.
