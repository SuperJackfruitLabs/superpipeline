import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { artifactDir, buildArtifact, root, verifyArtifact } from '../../../scripts/app-artifact.mjs';

if (process.env.SP_E2E_PREBUILT === '1') verifyArtifact();
else buildArtifact();
const temporary = mkdtempSync(join(tmpdir(), 'superpipeline-e2e-'));
const state = join(temporary, 'state');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const config = join(artifactDir, 'wrangler.json');
const run = (args) => execFileSync(pnpm, ['--filter', '@superpipeline/api', 'exec', 'wrangler', ...args], { cwd: root, stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
let child;
const clean = () => rmSync(temporary, { recursive: true, force: true });
try {
  run(['d1', 'migrations', 'apply', 'DB', '--local', '--persist-to', state, '--config', config]);
  run(['d1', 'execute', 'DB', '--local', '--persist-to', state, '--config', config, '--file', join(root, 'apps/api/scripts/seed-dev.sql')]);
  // Same immutable Worker and assets as promotion. Only the local harness overrides auth;
  // it never rewrites the packaged production configuration or uses remote bindings.
  child = spawn(pnpm, ['--filter', '@superpipeline/api', 'exec', 'wrangler', 'dev', '--local', '--no-bundle', '--config', config, '--persist-to', state,
    '--port', process.env.SP_API_PORT || '8787', '--var', 'DEV_AUTH:true', '--var', 'FIXTURE_IMPORT:true', '--var', 'ENFORCE_CONTROL_PAIR:false',
    '--var', 'ORG_PLANE_ISSUER:', '--var', 'ORG_PLANE_JWKS_URL:', '--var', 'ORG_PLANE_AUDIENCE:', '--var', 'ORG_PLANE_URL:',
    '--var', 'SUPERWITNESS_URL:'], { cwd: root, stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  child.on('error', (error) => { console.error(error.message); clean(); process.exitCode = 1; });
  child.on('exit', (code) => { clean(); process.exitCode = code ?? 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
} catch (error) { clean(); throw error; }
