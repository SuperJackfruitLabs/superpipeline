-- A user learns which subject they are in the suite's issuer.
--
-- `external_id` holds the issuer's SUBJECT id — the `sub` claim of a hub token
-- — which today is a Better Auth user id, NOT a `prn_…` principal id. The hub's
-- jwt plugin overwrites `sub` with `session.user.id` after building the payload
-- (agentpod apps/hub/src/routes/auth-authorize.ts), so session and exchange
-- tokens carry that id while station-minted and bridge-asserted tokens carry
-- `prn_…`. Naming it "the principal" would be wrong in a way that matters: see
-- the open question in docs/superpowers/specs/2026-09-20-suite-sign-in-design.md.
--
-- Same shape as tenants (0002) and agents (0003): two nullable columns and a
-- both-or-neither CHECK riding in on the second ADD COLUMN, because SQLite has
-- no ALTER TABLE ... ADD CONSTRAINT.
--
-- UNLIKE tenants, this mapping is UNIQUE. A tenant mapping is deliberately not:
-- two colleagues in one organisation legitimately map two workspaces onto one
-- fleet. A user mapping has no such reading — one issuer subject is one person
-- here.
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
