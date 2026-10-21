import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sealArtifact, verifyArtifact } from './app-artifact.mjs';
const sha = 'a'.repeat(40);
function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'sp-artifact-proof-'));
  try {
    mkdirSync(join(dir, 'worker')); mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'worker/index.js'), 'export default {}');
    writeFileSync(join(dir, 'assets/index.html'), '<html></html>');
    writeFileSync(join(dir, 'wrangler.json'), JSON.stringify({ main: 'worker/index.js', assets: { directory: 'assets' }, vars: { DEV_AUTH: 'false', FIXTURE_IMPORT: 'false' } }));
    sealArtifact(dir, sha); fn(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
test('artifact promotion binds source, Worker and assets and refuses modifications', () => fixture((dir) => {
  assert.equal(verifyArtifact(dir, sha).source_commit, sha);
  assert.throws(() => verifyArtifact(dir, 'b'.repeat(40)), /revision/);
  writeFileSync(join(dir, 'worker/index.js'), 'different source');
  assert.throws(() => verifyArtifact(dir, sha), /content changed/);
}));
test('artifact promotion refuses extra files, symlinks and development auth', () => fixture((dir) => {
  writeFileSync(join(dir, 'extra.txt'), 'unreviewed');
  assert.throws(() => verifyArtifact(dir, sha), /inventory/);
  rmSync(join(dir, 'extra.txt'));
  symlinkSync(join(dir, 'worker/index.js'), join(dir, 'link'));
  assert.throws(() => verifyArtifact(dir, sha), /symlink/);
  rmSync(join(dir, 'link'));
  writeFileSync(join(dir, 'wrangler.json'), JSON.stringify({ main: 'worker/index.js', assets: { directory: 'assets' }, vars: { DEV_AUTH: 'true', FIXTURE_IMPORT: 'false' } }));
  sealArtifact(dir, sha);
  assert.throws(() => verifyArtifact(dir, sha), /production configuration/);
}));
