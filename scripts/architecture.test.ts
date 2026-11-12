import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

// The shape of the code, held by numbers that may only fall: the largest file-level import cycle
// in each package, the folder-level cycle in the Worker, and the files over the size limit. Each
// number fails when it is stale, so an improvement is locked in by the change that makes it.
// See docs/contributor/code-structure.md.

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIZE_LIMIT = 1000;

/** Source roots whose import graph is checked, with the largest cycle each may have (in files).
 * Lower these; never raise them. */
const LARGEST_CYCLE: Record<string, number> = {
  'apps/api/src': 0,
  'apps/web/src': 0,
  'packages/cli/src': 0,
  'packages/contract/src': 0,
  'packages/agent-sdk/src': 0,
};

/** Top-level folders of apps/api/src in the largest folder-level cycle. A file at the root
 * (index.ts, env.ts, ...) is a node of its own, so the entry point that imports every folder does
 * not join them into one cycle. Lower it; never raise it. */
const API_FOLDER_CYCLE = 0;

/** The layers of apps/api/src, lowest first: its top-level folders and root files. An import
 * points down, to a strictly lower layer; nodes in one layer do not import each other. A new
 * folder or root file must be placed here. */
const API_LAYERS: readonly (readonly string[])[] = [
  // The Worker's log sink: imports nothing.
  ['log.ts'],
  // Foundations: no imports of the Worker's own code, or only each other's.
  ['env.ts', 'ids.ts', 'json.ts', 'flat-error.ts', 'crypto', 'metering', 'telemetry'],
  // Pure helpers over the foundations: outbound delivery, reference parsing.
  ['push', 'references', 'approval-subject-kinds'],
  // The D1 catalog.
  ['db'],
  // Who is calling: sessions, tokens, the org plane.
  ['auth'],
  // The run-report client the board calls.
  ['superwitness'],
  // The Board Durable Object and its stub.
  ['board'],
  // Surfaces over the board: MCP, dev fixtures, cross-board links.
  ['mcp', 'dev', 'card-links.ts', 'card-eligibility.ts', 'card-reservation.ts', 'agent-load.ts'],
  ['service-routes.ts'],
  // The HTTP routes: the router, its tables and one module per resource.
  ['routes'],
  // The Worker entry: composes everything.
  ['index.ts'],
];

/** Imports that point up, as `from -> to`. May only shrink; keep it empty. */
const KNOWN_BACK_EDGES: readonly string[] = [];

/** Files over SIZE_LIMIT and the most lines each may have. Lower these; never raise them. */
const OVERSIZE: Record<string, number> = {
};

/** Where the size limit applies: shipped source and its tests. */
const SIZED = ['apps/api/src', 'apps/api/test', 'apps/web/src', 'apps/web/e2e', 'apps/web/scripts', 'packages', 'scripts'];
/** Not hand-written: vendored copies and the embedded skill text. */
const GENERATED = [/\/vendor\//, /\/node_modules\//, /^packages\/cli\/src\/skill-embedded\.ts$/];

const isCode = (name: string): boolean => /\.(ts|mts|mjs|svelte)$/.test(name) && !name.endsWith('.d.ts');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) return [];
    if (statSync(path).isDirectory()) return sources(path);
    return isCode(name) ? [path] : [];
  });
}

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)['"]([^'"]+)['"]/gm;

/** The file an import names, or null when it is outside the repo's own code. */
function resolveImport(from: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith('.')) base = resolve(dirname(from), specifier);
  else if (specifier.startsWith('$lib/') || specifier === '$lib') base = join(REPO, 'apps/web/src/lib', specifier.slice(4));
  else return null;
  const stem = base.replace(/\.js$/, '');
  for (const candidate of [base, stem + '.ts', base + '.ts', base + '/index.ts', base + '.svelte']) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** File-level import graph of one source root, keyed by path relative to the root. Tests are left
 * out: they import widely and are never imported back. */
export function importGraph(root: string): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const file of sources(root)) {
    if (file.endsWith('.test.ts')) continue;
    const targets = new Set<string>();
    for (const m of readFileSync(file, 'utf8').matchAll(SPECIFIER)) {
      const target = m[1] ? resolveImport(file, m[1]) : null;
      if (target) targets.add(relative(root, target));
    }
    graph.set(
      relative(root, file),
      [...targets].filter((t) => !t.startsWith('..')),
    );
  }
  return graph;
}

/** A file's top-level folder; a file at the root is a node of its own. */
const folder = (file: string): string => (file.includes('/') ? (file.split('/')[0] ?? file) : file);

/** Collapse a file graph onto its top-level folders. */
export function folderGraph(graph: Map<string, string[]>): Map<string, string[]> {
  const out = new Map<string, Set<string>>();
  for (const [file, targets] of graph) {
    const from = folder(file);
    const edges = out.get(from) ?? new Set<string>();
    for (const t of targets) if (folder(t) !== from) edges.add(folder(t));
    out.set(from, edges);
  }
  return new Map([...out].map(([k, v]) => [k, [...v]]));
}

/** Strongly connected components with more than one node (Tarjan). */
export function cycles(graph: Map<string, string[]>): string[][] {
  let next = 0;
  const index = new Map<string, number>(),
    low = new Map<string, number>(),
    stack: string[] = [],
    onStack = new Set<string>(),
    found: string[][] = [];
  const visit = (v: string): void => {
    index.set(v, next);
    low.set(v, next++);
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!graph.has(w)) continue;
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v) ?? 0, low.get(w) ?? 0));
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v) ?? 0, index.get(w) ?? 0));
    }
    if (low.get(v) !== index.get(v)) return;
    const component: string[] = [];
    let w: string | undefined;
    do {
      w = stack.pop();
      if (w === undefined) break;
      onStack.delete(w);
      component.push(w);
    } while (w !== v);
    if (component.length > 1) found.push(component.toSorted());
  };
  for (const v of graph.keys()) if (!index.has(v)) visit(v);
  return found;
}

const largest = (found: string[][]): string[] => found.reduce<string[]>((a, c) => (c.length > a.length ? c : a), []);

describe('no import cycle grows past the recorded size', () => {
  test.each(Object.entries(LARGEST_CYCLE))('%s', (root, limit) => {
    const cycle = largest(cycles(importGraph(join(REPO, root))));
    expect(cycle.length, `the largest import cycle in ${root} grew: ${cycle.join(', ')}`).toBeLessThanOrEqual(limit);
    expect(cycle.length, `the cycle in ${root} shrank; lower LARGEST_CYCLE to lock it in`).toBe(limit);
  });
});

test('the folder-level cycle in apps/api/src does not grow', () => {
  const cycle = largest(cycles(folderGraph(importGraph(join(REPO, 'apps/api/src')))));
  expect(cycle.length, `the folder cycle grew: ${cycle.join(', ')}`).toBeLessThanOrEqual(API_FOLDER_CYCLE);
  expect(cycle.length, 'the folder cycle shrank; lower API_FOLDER_CYCLE to lock it in').toBe(API_FOLDER_CYCLE);
});

describe('apps/api/src is layered', () => {
  const graph = folderGraph(importGraph(join(REPO, 'apps/api/src')));
  const layer = new Map(API_LAYERS.flatMap((nodes, i) => nodes.map((n) => [n, i] as const)));

  test('every folder and root file has a layer, and every layer names one that exists', () => {
    expect([...graph.keys()].filter((n) => !layer.has(n)), 'place these in API_LAYERS').toEqual([]);
    expect([...layer.keys()].filter((n) => !graph.has(n)), 'these are gone; remove them from API_LAYERS').toEqual([]);
  });

  test('imports point down', () => {
    const up = [...graph].flatMap(([from, targets]) =>
      targets.filter((to) => (layer.get(to) ?? 0) >= (layer.get(from) ?? 0)).map((to) => `${from} -> ${to}`),
    );
    expect(up.filter((e) => !KNOWN_BACK_EDGES.includes(e)), 'these imports point up or sideways').toEqual([]);
    expect(
      KNOWN_BACK_EDGES.filter((e) => !up.includes(e)),
      'these back-edges are gone; remove them from KNOWN_BACK_EDGES',
    ).toEqual([]);
  });
});

test('the board engine contains no platform-specific approval-subject names', () => {
  const forbidden = /social-publish\/v1|x-publish|channel\s*!==\s*['"]x['"]|platform\s*!==\s*['"]x['"]/;
  const hits = sources(join(REPO, 'apps/api/src/board')).flatMap((file) => {
    const match = readFileSync(file, 'utf8').match(forbidden);
    return match ? [`${relative(REPO, file)}: ${match[0]}`] : [];
  });
  expect(hits, 'move platform-specific validation and executor rules into the subject-kind registry').toEqual([]);
});

test('no file grows past the size limit', () => {
  const sizes = new Map(
    SIZED.flatMap((dir) => sources(join(REPO, dir)))
      .map((f) => relative(REPO, f))
      .filter((f) => !GENERATED.some((g) => g.test(f)))
      .map((f) => [f, readFileSync(join(REPO, f), 'utf8').split('\n').length - 1] as const),
  );
  const over = [...sizes].filter(([, n]) => n > SIZE_LIMIT);
  for (const [file, n] of over)
    expect(n, `${file} has ${n} lines; the limit is ${OVERSIZE[file] ?? SIZE_LIMIT}`).toBeLessThanOrEqual(
      OVERSIZE[file] ?? SIZE_LIMIT,
    );
  const stale = Object.keys(OVERSIZE).filter((f) => (sizes.get(f) ?? 0) < (OVERSIZE[f] ?? 0));
  expect(stale, 'these files shrank; lower or remove their OVERSIZE entry').toEqual([]);
});

test('the cycle finder sees a cycle and nothing else', () => {
  const graph = new Map([
    ['a.ts', ['b.ts']],
    ['b.ts', ['c.ts']],
    ['c.ts', ['a.ts']],
    ['d.ts', ['a.ts']],
  ]);
  expect(cycles(graph)).toEqual([['a.ts', 'b.ts', 'c.ts']]);
});

test('the folder graph keeps only edges between folders', () => {
  const graph = new Map([
    ['db/a.ts', ['board/b.ts', 'db/c.ts']],
    ['board/b.ts', ['db/a.ts', 'env.ts']],
    ['db/c.ts', []],
    ['env.ts', []],
  ]);
  expect(folderGraph(graph)).toEqual(
    new Map([
      ['db', ['board']],
      ['board', ['db', 'env.ts']],
      ['env.ts', []],
    ]),
  );
  expect(cycles(folderGraph(graph))).toEqual([['board', 'db']]);
});

test('the import resolver finds what the repo actually imports', () => {
  const api = importGraph(join(REPO, 'apps/api/src'));
  // Extensionless relative imports, as the Worker writes them.
  expect(api.get('index.ts')).toContain('env.ts');
  expect(api.get('db/catalog.ts') ?? []).toContain('db/tenant-scope.ts');
  // `.ts` specifiers, as the CLI writes them.
  expect(importGraph(join(REPO, 'packages/cli/src')).get('index.ts')).toContain('args.ts');
});
