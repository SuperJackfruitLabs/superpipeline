/**
 * SuperPipeline's public surface, listed from the code: what a stranger can call, configure,
 * subscribe to or be granted. `docs-claims.test.ts` holds every item to the docs, against the
 * committed baseline `docs/undocumented-baseline.json`.
 *
 * Read with the TypeScript compiler's parser, not by grepping, so a reformatted file still reads
 * the same. The route tables are the Worker's own registries (`ROUTES`, `BOARD_ROUTES`); their
 * patterns are expanded into paths by `expandPattern` below.
 *
 * - **routes**: `apps/api/src/routes/table.ts` and `routes/boards/table.ts` (the `route(...)`
 *   calls), the paths the prefix routes (`/auth/`, `/hub/`, `/v1/dev/`) take by comparing
 *   `path === '…'`, the service routes in `service-routes.ts` and the board entry's own match in
 *   `routes/boards/entry.ts` (each `X.exec(path)` or `rest.match(/…/)` guarded by
 *   `request.method === '…'`). Refusal handlers (`methodNotAllowed`, `commentNeverEdited`) are
 *   not surface.
 * - **settings**: every member of the Worker's `Env` (`apps/api/src/env.ts`), every `ENV_VARS`
 *   name of the CLI (`packages/cli/src/commands.ts`), and every `import.meta.env.PUBLIC_*` the web
 *   app reads (a regex: `.svelte` files have no TypeScript parser here).
 * - **events**: every event name passed to an `emit(…)` in `apps/api/src`, and the push and relay
 *   lists (`PUSHED_EVENTS`, `RECORD_EVENTS`, `RELAYED_EVENTS`).
 * - **scopes**: the service scopes, `export const X = 'noun:verb'` in `apps/api/src/auth/resolve.ts`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

export interface Surface {
  routes: string[];
  settings: string[];
  events: string[];
  scopes: string[];
}

export type SurfaceKind = keyof Surface;
export const SURFACE_KINDS: SurfaceKind[] = ['routes', 'settings', 'events', 'scopes'];

const parse = (file: string): ts.SourceFile =>
  ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);

function walk(node: ts.Node, visit: (n: ts.Node) => void): void {
  visit(node);
  node.forEachChild((c) => walk(c, visit));
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return e.name.endsWith('.ts') && !e.name.endsWith('.test.ts') && !e.name.endsWith('.d.ts') ? [p] : [];
  });
}

const stringOf = (n: ts.Node | undefined): string | undefined =>
  n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : undefined;

const regexOf = (n: ts.Node | undefined): string | undefined => {
  if (!n || !ts.isRegularExpressionLiteral(n)) return undefined;
  const t = n.text;
  return t.slice(1, t.lastIndexOf('/'));
};

// ---- patterns into paths ----------------------------------------------------------------------

type Piece = { lit: string } | { param: true } | { rest: true } | { alt: Piece[][]; optional: boolean };

/**
 * Parse the small regex dialect the route tables use: literals (with `\/` and `\.` escapes),
 * groups `( )` and `(?: )` with `|`, an optional `?` after a group, and a parameter: a character
 * class or `\d` with `+`, `*` or `{n}`. `.*` is the rest of a path.
 */
function parsePattern(src: string): { pieces: Piece[]; anchored: boolean } {
  let i = 0;
  const anchored = src.endsWith('$') && !src.endsWith('\\$');
  const body = src.replace(/^\^/, '').replace(/\$$/, '');
  function seq(): Piece[][] {
    const alts: Piece[][] = [[]];
    while (i < body.length) {
      const c = body[i];
      if (c === ')') break;
      if (c === '|') { alts.push([]); i++; continue; }
      const cur = alts[alts.length - 1];
      if (c === '(') {
        i++;
        if (body.startsWith('?:', i)) i += 2;
        const inner = seq();
        if (body[i] !== ')') throw new Error(`unclosed group in /${src}/`);
        i++;
        const optional = body[i] === '?';
        if (optional) i++;
        cur.push({ alt: inner, optional });
        continue;
      }
      if (c === '[' || (c === '\\' && body[i + 1] === 'd')) {
        if (c === '[') i = body.indexOf(']', i) + 1;
        else i += 2;
        const q = body.slice(i).match(/^(\+|\*|\{\d+(,\d*)?\})/);
        if (!q) throw new Error(`a character class with no quantifier in /${src}/`);
        i += q[0].length;
        cur.push({ param: true });
        continue;
      }
      if (c === '.' && body[i + 1] === '*') { i += 2; cur.push({ rest: true }); continue; }
      if (c === '\\') { cur.push({ lit: body[i + 1] }); i += 2; continue; }
      if ('.+*?{}[]^$'.includes(c)) throw new Error(`unsupported regex syntax '${c}' in /${src}/`);
      cur.push({ lit: c });
      i++;
    }
    return alts;
  }
  const alts = seq();
  if (i !== body.length || alts.length !== 1) throw new Error(`could not read /${src}/`);
  return { pieces: alts[0], anchored };
}

function expand(pieces: Piece[]): string[] {
  let out = [''];
  for (const p of pieces) {
    if ('lit' in p) out = out.map((s) => s + p.lit);
    else if ('param' in p) out = out.map((s) => s + '\u0000');
    else if ('rest' in p) out = out.map((s) => s + '\u0001');
    else {
      const options = p.alt.flatMap(expand);
      if (p.optional) options.push('');
      out = out.flatMap((s) => options.map((o) => s + o));
    }
  }
  return out;
}

/** Each path a route pattern matches, its parameters spelled `:id`; null when it is a prefix. */
export function expandPattern(src: string, base = ''): string[] | null {
  const { pieces, anchored } = parsePattern(src);
  if (!anchored) return null;
  return expand(pieces)
    .filter((p) => !p.includes('\u0001')) // `(.*)`: a dispatch into another table, not a route
    .map((p) => {
      const path = (base + (p && !p.startsWith('/') ? '/' + p : p)).replace(/\/+$/, '') || '/';
      return path
        .split('/')
        .map((seg) => (seg.includes('\u0000') ? ':id' : seg))
        .join('/');
    });
}

// ---- routes -----------------------------------------------------------------------------------

const REFUSALS = new Set(['methodNotAllowed', 'commentNeverEdited']);
const BOARD = '/v1/boards/:id';

/** `const NAME = <string or regex>` across the API, to resolve an identifier one or two hops. */
function constants(files: ts.SourceFile[]): Map<string, ts.Expression> {
  const out = new Map<string, ts.Expression>();
  for (const sf of files)
    walk(sf, (n) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) out.set(n.name.text, n.initializer);
    });
  return out;
}

function resolveString(n: ts.Expression, consts: Map<string, ts.Expression>, depth = 0): string | undefined {
  const s = stringOf(n);
  if (s !== undefined || depth > 3 || !ts.isIdentifier(n)) return s;
  const next = consts.get(n.text);
  return next ? resolveString(next, consts, depth + 1) : undefined;
}

/** The methods `request.method === 'M'` names in an expression. */
function methodsIn(n: ts.Node): string[] {
  const out: string[] = [];
  walk(n, (x) => {
    if (
      ts.isBinaryExpression(x) &&
      x.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
      ts.isPropertyAccessExpression(x.left) &&
      x.left.name.text === 'method'
    ) {
      const m = stringOf(x.right);
      if (m) out.push(m);
    }
  });
  return out;
}

export function listRoutes(repo: string): string[] {
  const apiDir = join(repo, 'apps/api/src');
  const files = sourceFiles(apiDir).map(parse);
  const byName = new Map(files.map((sf) => [relative(apiDir, sf.fileName), sf]));
  const consts = constants(files);
  const routes = new Set<string>();
  const add = (method: string, path: string) => routes.add(`${method} ${path}`);
  const prefixes: Array<{ method: string; prefix: string }> = [];

  // The two route tables.
  for (const [file, base] of [['routes/table.ts', ''], ['routes/boards/table.ts', BOARD]] as const) {
    const sf = byName.get(file);
    if (!sf) throw new Error(`surface: no ${file}`);
    walk(sf, (n) => {
      if (!ts.isCallExpression(n) || !ts.isIdentifier(n.expression) || n.expression.text !== 'route') return;
      const [m, pattern, handler] = n.arguments;
      const methods = stringOf(m);
      if (!methods || !pattern || !handler) return;
      if (ts.isIdentifier(handler) && REFUSALS.has(handler.text)) return;
      let paths: string[] | null;
      let prefixPieces: Piece[] = [];
      const src = regexOf(pattern);
      if (src !== undefined) {
        paths = expandPattern(src, base);
        prefixPieces = parsePattern(src).pieces;
      } else if (ts.isCallExpression(pattern) && pattern.arguments[0]) {
        // `startsWith(CONSTANT)`: a prefix spelled as a string.
        const literal = resolveString(pattern.arguments[0], consts);
        if (!literal) throw new Error(`surface: cannot resolve the pattern of a route in ${file}`);
        for (const method of methods.split(',')) add(method, literal);
        return;
      } else throw new Error(`surface: a route in ${file} has a pattern this reader does not know`);
      if (paths === null) {
        // A prefix route: its paths are the ones its handlers compare `path` against.
        for (const prefix of expand(prefixPieces)) if (prefix !== '') prefixes.push({ method: methods, prefix });
        return;
      }
      for (const method of methods.split(',')) for (const path of paths) add(method, path);
    });
  }

  // Paths the prefix routes take: `path === '/auth/me'`, `const X_PATH = '/auth/callback'`, …
  for (const sf of files)
    walk(sf, (n) => {
      let literal: string | undefined;
      if (
        ts.isBinaryExpression(n) &&
        [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(n.operatorToken.kind) &&
        ts.isIdentifier(n.left) &&
        n.left.text === 'path'
      )
        literal = resolveString(n.right, consts);
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text.endsWith('_PATH') && n.initializer)
        literal = stringOf(n.initializer);
      if (!literal) return;
      for (const { method, prefix } of prefixes) if (literal.startsWith(prefix)) add(method, literal);
    });

  // The service routes and the board entry's own matches: `cond ? X.exec(path) : null`.
  for (const file of ['service-routes.ts', 'routes/boards/entry.ts']) {
    const sf = byName.get(file);
    if (!sf) throw new Error(`surface: no ${file}`);
    walk(sf, (n) => {
      if (!ts.isConditionalExpression(n) || !ts.isCallExpression(n.whenTrue)) return;
      const call = n.whenTrue;
      if (!ts.isPropertyAccessExpression(call.expression)) return;
      const verb = call.expression.name.text;
      let src: string | undefined;
      if (verb === 'exec' && ts.isIdentifier(call.expression.expression)) {
        const init = consts.get(call.expression.expression.text);
        src = regexOf(init);
      } else if (verb === 'match') src = regexOf(call.arguments[0]);
      if (src === undefined) return;
      const methods = methodsIn(n.condition);
      if (methods.length === 0) throw new Error(`surface: a match in ${file} names no method`);
      const paths = expandPattern(src, src.startsWith('^\\/') ? '' : BOARD);
      if (!paths) return;
      for (const method of methods) for (const path of paths) add(method, path);
    });
  }

  return [...routes].toSorted();
}

// ---- settings, events, scopes -----------------------------------------------------------------

/** The web app's source files, `.svelte` included. */
function webFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? webFiles(join(dir, e.name)) : /\.(ts|svelte|js)$/.test(e.name) && !/\.test\./.test(e.name) ? [join(dir, e.name)] : [],
  );
}

export function listSettings(repo: string): string[] {
  const out = new Set<string>();
  walk(parse(join(repo, 'apps/api/src/env.ts')), (n) => {
    if (ts.isInterfaceDeclaration(n) && n.name.text === 'Env')
      for (const m of n.members) if (ts.isPropertySignature(m) && ts.isIdentifier(m.name)) out.add(m.name.text);
  });
  walk(parse(join(repo, 'packages/cli/src/commands.ts')), (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'ENV_VARS' && n.initializer)
      walk(n.initializer, (x) => {
        if (ts.isPropertyAssignment(x) && ts.isIdentifier(x.name) && x.name.text === 'name') {
          const v = stringOf(x.initializer);
          if (v) out.add(v);
        }
      });
  });
  for (const f of webFiles(join(repo, 'apps/web/src')))
    for (const m of readFileSync(f, 'utf8').matchAll(/import\.meta\.env\.(PUBLIC_[A-Z0-9_]+)/g)) out.add(m[1]);
  return [...out].toSorted();
}

const EVENT = /^[a-z_]+(\.[a-z_]+)+$/;
const EVENT_LISTS = new Set(['PUSHED_EVENTS', 'RECORD_EVENTS', 'RELAYED_EVENTS']);

/** Every event-shaped string literal under `n`. */
function eventLiterals(n: ts.Node): string[] {
  const found: string[] = [];
  walk(n, (x) => {
    const v = stringOf(x);
    if (v !== undefined && EVENT.test(v)) found.push(v);
  });
  return found;
}

export function listEvents(repo: string): string[] {
  const out = new Set<string>();
  for (const sf of sourceFiles(join(repo, 'apps/api/src')).map(parse))
    walk(sf, (n) => {
      if (ts.isCallExpression(n)) {
        const callee = n.expression;
        const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : '';
        if (name !== 'emit') return;
        // `deps.emit('x.y', …)` or `emit(deps, 'x.y', …)`; a ternary of two names counts both.
        for (const arg of n.arguments.slice(0, 2)) {
          if (ts.isObjectLiteralExpression(arg)) continue;
          for (const v of eventLiterals(arg)) out.add(v);
        }
      }
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && EVENT_LISTS.has(n.name.text) && n.initializer)
        for (const v of eventLiterals(n.initializer)) out.add(v);
    });
  return [...out].toSorted();
}

export function listScopes(repo: string): string[] {
  const out = new Set<string>();
  walk(parse(join(repo, 'apps/api/src/auth/resolve.ts')), (n) => {
    if (ts.isVariableStatement(n) && n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
      for (const d of n.declarationList.declarations) {
        const v = stringOf(d.initializer);
        if (v && /^[a-z-]+:[a-z]+$/.test(v)) out.add(v);
      }
  });
  return [...out].toSorted();
}

export function listSurface(repo: string): Surface {
  return { routes: listRoutes(repo), settings: listSettings(repo), events: listEvents(repo), scopes: listScopes(repo) };
}

// ---- named in the docs ------------------------------------------------------------------------

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A path parameter as the docs spell it: `:cardId`, `{id}`, `<id>`, a real id. */
const PARAM = '[^/\\s`|)\\]]+';

/** Whether `text` names the item: a route by method and path, anything else by its exact name. */
export function namedBy(kind: SurfaceKind, item: string): (text: string) => boolean {
  if (kind === 'routes') {
    const space = item.indexOf(' ');
    const method = item.slice(0, space);
    const path = item.slice(space + 1);
    const toRe = (p: string) => p.split('/').map((seg) => (seg === ':id' ? PARAM : esc(seg))).join('/');
    // A board route is often written from its tail: `…/cards/:cardId/move`.
    const tail = path.startsWith(BOARD + '/') ? path.slice(BOARD.length) : null;
    const where = tail
      ? `(?:/v1/boards/${PARAM}|…|\\.\\.\\.)${toRe(tail)}`
      : `(?<![\\w/.-])${toRe(path)}`;
    const re = new RegExp(`${where}(?![\\w/-])`);
    const verb = method === '*' ? null : new RegExp(`\\b${method}\\b`);
    return (text) => {
      const lines = text.split('\n');
      return lines.some((line, i) => re.test(line) && (!verb || verb.test(line) || verb.test(lines[i - 1] ?? '')));
    };
  }
  const re =
    kind === 'settings'
      ? new RegExp(`(?<![A-Za-z0-9_])${esc(item)}(?![A-Za-z0-9_])`)
      : new RegExp(`(?<![\\w.:-])${esc(item)}(?![\\w:-]|\\.\\w)`);
  return (text) => re.test(text);
}
