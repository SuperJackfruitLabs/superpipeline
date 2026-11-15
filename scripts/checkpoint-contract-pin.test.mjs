import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const fixture = 'apps/api/test/fixtures/checkpoint-settlement/';
const pin = JSON.parse(readFileSync(new URL(fixture + 'pin.json', root), 'utf8'));
await test('proposed Treaty schemas and corpus remain byte-pinned', () => {
  assert.equal(pin.revision, '4ba0c9f857f3b01e39c6332c8a005beff0733886');
  assert.equal(pin.status, 'PROPOSED; publication is not acceptance');
  for (const entry of pin.files) {
    const path = entry.path.startsWith('schemas/')
      ? 'apps/api/src/board/checkpoint-contract/' + entry.path.split('/').at(-1)
      : fixture + entry.path.split('/').at(-1);
    const raw = readFileSync(new URL(path, root));
    assert.equal(createHash('sha256').update(raw).digest('hex'), entry.sha256, entry.path);
  }
});
