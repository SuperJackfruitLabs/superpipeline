// "Docs touched?": a pull request that changes the public surface must change the docs too, or say
// why not with the `no-docs-needed` label. Run by .github/workflows/docs-touched.yml, which forge
// runs (this repo keeps its workflows in .github/workflows, and Forgejo reads that folder when there
// is no .forgejo/workflows); the labels come from the event payload, so no API call is made.
//
// The completeness ratchet in packages/docs-check checks that every route, setting, event and scope
// is named somewhere; this check is the earlier, coarser question a reviewer would ask.
//
// Dry run against any commit: DOCS_TOUCHED_HEAD=<sha> GITHUB_EVENT_PATH=<payload> node scripts/docs-touched.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const LABEL = 'no-docs-needed';

/** Files that define what a stranger can call, configure, subscribe to or be granted. */
export const SURFACE = [
  /^apps\/api\/src\/routes\//, // the Worker's route tables and handlers
  /^apps\/api\/src\/service-routes\.ts$/, // service routes and their scopes
  /^apps\/api\/src\/env\.ts$/, // Worker settings
  /^apps\/api\/wrangler\.jsonc$/, // their values, bindings and triggers
  /^apps\/api\/src\/auth\/(resolve|scopes)\.ts$/, // service and agent scopes
  /^apps\/api\/src\/push\/(events|relay)\.ts$/, // push and relay event types
  /^apps\/api\/src\/mcp\/tools\.ts$/, // MCP tools
  /^packages\/cli\/src\/(commands\.ts|commands\/)/, // the supi command table
  /^packages\/contract\/src\//, // the wire schemas
];

/** Where documentation lives. */
export const DOCS = [/^docs-site\//, /^docs\//, /(^|\/)README\.md$/];

/** null when the pull request passes, else why it does not. */
export function check(paths, labels) {
  const surface = paths.filter((p) => SURFACE.some((re) => re.test(p)));
  if (surface.length === 0) return null;
  if (paths.some((p) => DOCS.some((re) => re.test(p)))) return null;
  if (labels.includes(LABEL)) return null;
  return (
    `This pull request changes the public surface but no docs (docs-site/, docs/ or a README):\n` +
    surface.map((p) => `  ${p}`).join('\n') +
    `\nDocument the change, or add the \`${LABEL}\` label if nothing a reader sees changes.`
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH ?? '', 'utf8'));
  const pr = event.pull_request;
  if (!pr) {
    console.log('docs-touched: not a pull request; nothing to check');
    process.exit(0);
  }
  const labels = (pr.labels ?? []).map((l) => l.name);
  const base = pr.base?.sha;
  if (!/^[a-f0-9]{40}$/.test(base ?? '')) throw new Error('docs-touched: the event names no base commit');
  const paths = execFileSync('git', ['diff', '--name-only', '-z', '--no-renames', `${base}...${process.env.DOCS_TOUCHED_HEAD || 'HEAD'}`], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  const problem = check(paths, labels);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  console.log(`docs-touched: ok (${paths.length} files; labels: ${labels.join(', ') || 'none'})`);
}
