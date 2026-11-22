import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

// One error body for the API: `apps/api/src/api-errors.ts` builds every `{ error: ... }` the
// Worker answers (treaty `schemas/common/error.v1.json`). A file that writes an `error` key into a
// body of its own is either listed below, with why, or a regression.

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(REPO, 'apps/api/src');

/**
 * Files that still write an `error` key of their own. May only shrink: a file that stops is
 * removed from this list by the change that moves it.
 */
const OWN_SHAPE: Record<string, string> = {
  // The one helper.
  'api-errors.ts': 'builds the error.v1 body',
  // Standards and other planes' contracts, not this API's envelope.
  'auth/hub-oauth.ts': 'the hub sign-in round trip (browser redirects and OAuth replies)',
  'auth/plane-signin.ts': 'the organization-plane sign-in round trip',
  'auth/org-plane-resolve.ts': "the organization plane's own refusal, `product_not_enabled` (Accounts' flat envelope)",
  'mcp/auth.ts': 'an OAuth 2.0 bearer challenge (RFC 6750)',
  'mcp/tools.ts': 'an MCP tool result, not an HTTP body',
  'superwitness/config.ts': 'a configuration result, never sent',
  'dev/fixture.ts': 'the local fixture import, never deployed',
  // Workspace routes whose own refusals have no code in treaty's registry yet. Their sign-in and
  // role refusals already come from the helper (`routes/callers.ts`).
  'routes/admin.ts': 'workspace route, not yet in treaty',
  'routes/agents.ts': 'workspace route, not yet in treaty',
  'routes/capabilities.ts': 'workspace route, not yet in treaty',
  'routes/labels.ts': 'workspace route, not yet in treaty',
  'routes/members.ts': 'workspace route, not yet in treaty',
  'routes/projects.ts': 'workspace route, not yet in treaty',
  'routes/tenant.ts': 'workspace route, not yet in treaty',
};

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return name.endsWith('.ts') ? [path] : [];
  });
}

/** An `error` key in an object literal: `{ error: ...` (also across a line break). */
const ERROR_KEY = /\{\s*error\s*:/;

const writers = sources(SRC)
  .filter((file) => ERROR_KEY.test(readFileSync(file, 'utf8')))
  .map((file) => relative(SRC, file))
  .toSorted();

describe('every API error is built by api-errors.ts', () => {
  test('no file outside the list writes an error body of its own', () => {
    expect(writers.filter((f) => !(f in OWN_SHAPE))).toEqual([]);
  });
  test('the list is not stale: each file on it still writes one', () => {
    expect(Object.keys(OWN_SHAPE).filter((f) => !writers.includes(f))).toEqual([]);
  });
});
