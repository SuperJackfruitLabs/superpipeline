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
