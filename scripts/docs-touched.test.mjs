import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, LABEL } from './docs-touched.mjs';

void test('a surface change with no docs fails', () => {
  for (const path of ['apps/api/src/env.ts', 'apps/api/src/routes/boards/table.ts', 'apps/api/src/push/relay.ts', 'apps/api/src/service-routes.ts', 'packages/cli/src/commands/boards.ts', 'packages/contract/src/entities.ts', 'apps/api/wrangler.jsonc']) {
    assert.match(check([path, 'apps/api/test/x.test.ts'], []) ?? '', new RegExp(path.replace(/[.]/g, '\\.')));
  }
});
void test('the docs, a README or the label lets it pass', () => {
  for (const docs of ['docs/05-integration-surfaces.md', 'docs-site/src/content/docs/build/events.md', 'README.md', 'packages/cli/README.md']) {
    assert.equal(check(['apps/api/src/env.ts', docs], []), null);
  }
  assert.equal(check(['apps/api/src/env.ts'], [LABEL]), null);
  assert.notEqual(check(['apps/api/src/env.ts'], ['docs']), null);
});
void test('a change off the surface needs nothing', () => {
  for (const path of ['apps/api/src/board/moves.ts', 'apps/web/src/lib/x.svelte', 'CHANGELOG.md', 'scripts/lint.mjs']) {
    assert.equal(check([path], []), null);
  }
});
