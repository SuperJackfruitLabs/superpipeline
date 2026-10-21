import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const artifactDir = resolve(root, '.ci/app');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function filesUnder(directory) {
  const files = [];
  const visit = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name), stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error('Artifact symlinks are not supported');
      if (stat.isDirectory()) visit(path);
      else if (stat.isFile()) files.push(relative(directory, path).split('\\').join('/'));
      else throw new Error('Artifact contains an unsupported file');
    }
  };
  visit(directory);
  return files.sort();
}
export function sourceCommit() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
}
export function sealArtifact(directory, commit) {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('An exact source commit is required');
  const files = Object.fromEntries(filesUnder(directory).filter((name) => name !== 'manifest.json').map((name) => [name, hash(readFileSync(join(directory, name)))]));
  const manifest = { version: 1, source_commit: commit, files };
  writeFileSync(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
export function verifyArtifact(directory = artifactDir, commit = sourceCommit()) {
  const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
  if (manifest.version !== 1 || manifest.source_commit !== commit || !manifest.files || typeof manifest.files !== 'object') throw new Error('Artifact source revision does not match the checkout');
  const files = filesUnder(directory).filter((name) => name !== 'manifest.json');
  if (JSON.stringify(files) !== JSON.stringify(Object.keys(manifest.files).sort())) throw new Error('Artifact file inventory changed');
  for (const name of files) if (hash(readFileSync(join(directory, name))) !== manifest.files[name]) throw new Error('Artifact content changed: ' + name);
  const config = JSON.parse(readFileSync(join(directory, 'wrangler.json'), 'utf8'));
  if (config.main !== 'worker/index.js' || config.assets?.directory !== 'assets' || config.vars?.DEV_AUTH !== 'false' || config.vars?.FIXTURE_IMPORT !== 'false') throw new Error('Artifact production configuration changed');
  if (!manifest.files['worker/index.js'] || !manifest.files['assets/index.html']) throw new Error('Artifact lacks its Worker or web entrypoint');
  return manifest;
}
export function buildArtifact() {
  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const run = (args) => execFileSync(pnpm, args, { cwd: root, stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  rmSync(artifactDir, { recursive: true, force: true });
  mkdirSync(join(artifactDir, 'worker'), { recursive: true });
  run(['--filter', '@superpipeline/web', 'build']);
  run(['--filter', '@superpipeline/api', 'exec', 'wrangler', 'deploy', '--dry-run', '--outdir', join(artifactDir, 'worker'), '--var', 'DEV_AUTH:false', '--var', 'FIXTURE_IMPORT:false']);
  cpSync(join(root, 'apps/web/build'), join(artifactDir, 'assets'), { recursive: true });
  cpSync(join(root, 'apps/api/migrations'), join(artifactDir, 'migrations'), { recursive: true });
  const parsed = ts.parseConfigFileTextToJson('wrangler.jsonc', readFileSync(join(root, 'apps/api/wrangler.jsonc'), 'utf8'));
  if (parsed.error) throw new Error('Cannot parse the reviewed Worker configuration');
  const config = { ...parsed.config, main: 'worker/index.js', assets: { ...parsed.config.assets, directory: 'assets' }, vars: { ...parsed.config.vars, DEV_AUTH: 'false', FIXTURE_IMPORT: 'false' } };
  delete config.$schema;
  delete config.build;
  writeFileSync(join(artifactDir, 'wrangler.json'), JSON.stringify(config, null, 2) + '\n');
  sealArtifact(artifactDir, sourceCommit());
  verifyArtifact();
  console.log('Built and verified one immutable Worker/web artifact for ' + sourceCommit());
}
export function deployArtifact() {
  verifyArtifact();
  // The deploy job supplies its existing protected environment and Cloudflare credential.
  // No fixture variables, build step or untested source replacement occurs here.
  const args = ['--filter', '@superpipeline/api', 'exec', 'wrangler'];
  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  execFileSync(pnpm, [...args, 'd1', 'migrations', 'apply', 'DB', '--remote', '--config', join(artifactDir, 'wrangler.json')], { cwd: root, stdio: 'inherit' });
  execFileSync(pnpm, [...args, 'deploy', '--no-bundle', '--config', join(artifactDir, 'wrangler.json')], { cwd: root, stdio: 'inherit' });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const mode = process.argv[2];
  if (mode === 'build') buildArtifact();
  else if (mode === 'verify') { verifyArtifact(); console.log('Artifact source and all file digests verified'); }
  else if (mode === 'deploy') deployArtifact();
  else throw new Error('Usage: app-artifact.mjs build|verify|deploy');
}
