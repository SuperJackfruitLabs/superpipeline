#!/usr/bin/env node
// apps/web/scripts/pixel/resync-references.mjs — re-sync the references to canonical vibekit (Task 5b; 0.0.1, stylesheet refreshed to 0.0.10).
//
//   node scripts/pixel/resync-references.mjs            rewrite e2e/reference/mockups/*.html, print the touched files
//   node scripts/pixel/resync-references.mjs --check    report drift without writing; exit 1 on any difference
//   node scripts/pixel/resync-references.mjs --in <dir> --out <dir>   the same over another directory (the canvas)
//
// What changes in a reference: every component COMPONENT_MAP replaces is re-rendered by vibekit (SSR, the
// vibe and theme of the artboard it sits in); the page's own rules for vibekit's component classes go;
// the prototype token rules lose every token vibekit defines (vibekit.css supplies them, Gold included);
// vibekit.css is linked; <html> and every [data-vibe] root name the product. Every other byte stays.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VIBEKIT_VERSION = '0.0.10';
export const VK_DIR = `_vibekit-${VIBEKIT_VERSION}`;
const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = resolve(HERE, '../..');
export const REF_DIR = join(WEB, 'e2e/reference/mockups');
const VK_STYLES = join(WEB, 'node_modules/@superjackfruit/vibekit/dist/styles');

import { LAYOUT, scopedByPage, VK } from '../../e2e/pixel/vk-guard.mjs';
export { VK };

// ---------------------------------------------------------------------------------------------- loading
let modsP = null;
/** components.ts and render.ts are TypeScript (+ Svelte): vitest loads them itself; the CLI goes through Vite SSR. */
function mods() {
  modsP ??= (async () => {
    if (process.env.VITEST) {
      const [c, r] = await Promise.all([import('./resync/components.ts'), import('./resync/render.ts')]);
      return { ...c, ...r, close: async () => {} };
    }
    const { createServer } = await import('vite');
    const s = await createServer({ configFile: false, root: WEB, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] }, ssr: { optimizeDeps: { disabled: true } }, cacheDir: (await import('node:path')).join((await import('node:os')).tmpdir(), `sp-resync-vite-${process.pid}`) }); // own cache: see resync/render.ts
    const c = await s.ssrLoadModule(join(HERE, 'resync/components.ts'));
    const r = await s.ssrLoadModule(join(HERE, 'resync/render.ts'));
    return { ...c, ...r, close: async () => { await r.closeRenderer(); await s.close(); } };
  })();
  return modsP;
}

// ------------------------------------------------------------------------------------------------- CSS
let vkTokensCache = null;
/** Every custom property vibekit's token layers define. */
export function vibekitTokens() {
  if (vkTokensCache) return vkTokensCache;
  const css = ['tokens.css', 'accents.css', 'derived.css', 'type.css'].map((f) => readFileSync(join(VK_STYLES, f), 'utf8')).join('\n');
  vkTokensCache = new Set([...css.matchAll(/(--vk-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  return vkTokensCache;
}

/** Split CSS into top-level pieces: comments, at-rule statements (`@import …;`), and `prelude{body}` blocks. */
function pieces(css) {
  const out = [];
  let i = 0;
  while (i < css.length) {
    const ws = /^\s+/.exec(css.slice(i));
    if (ws) { out.push({ kind: 'ws', text: ws[0] }); i += ws[0].length; continue; }
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i + 2);
      const j = end < 0 ? css.length : end + 2;
      out.push({ kind: 'comment', text: css.slice(i, j) }); i = j; continue;
    }
    // Read a prelude up to `{` or `;` (strings, parens and comments respected).
    let j = i, paren = 0;
    while (j < css.length) {
      const ch = css[j];
      if (ch === '"' || ch === "'") { const k = css.indexOf(ch, j + 1); j = k < 0 ? css.length : k + 1; continue; }
      if (css.startsWith('/*', j)) { const k = css.indexOf('*/', j + 2); j = k < 0 ? css.length : k + 2; continue; }
      if (ch === '(') paren++;
      else if (ch === ')') paren--;
      else if (paren === 0 && (ch === '{' || ch === ';')) break;
      j++;
    }
    if (j >= css.length || css[j] === ';') { out.push({ kind: 'stmt', text: css.slice(i, Math.min(j + 1, css.length)) }); i = j + 1; continue; }
    // Matching brace.
    let k = j + 1, depth = 1;
    while (k < css.length && depth) {
      const ch = css[k];
      if (ch === '"' || ch === "'") { const e = css.indexOf(ch, k + 1); k = e < 0 ? css.length : e + 1; continue; }
      if (css.startsWith('/*', k)) { const e = css.indexOf('*/', k + 2); k = e < 0 ? css.length : e + 2; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      k++;
    }
    out.push({ kind: 'block', prelude: css.slice(i, j), body: css.slice(j + 1, k - 1) });
    i = k;
  }
  return out;
}

/** Top-level commas of a selector list. */
function splitList(sel) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < sel.length; i++) {
    const ch = sel[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) { parts.push(sel.slice(start, i)); start = i + 1; }
  }
  parts.push(sel.slice(start));
  return parts;
}

const TOKEN_SEL = /^\s*(:root|html|(\[data-(vibe|theme|accent|product)(="[^"]*")?\])+)\s*$/;
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Remove declarations of vibekit-owned tokens from a token rule body. The font families stay: vibekit
 * names its @fontsource faces ("Figtree Variable"), the pixel harness routes the same files under the
 * mockups' family names, and a reference must load only routed fonts.
 */
function dropTokens(body, owned) {
  const drop = (name) => owned.has(name) && !name.startsWith('--vk-font-');
  return body.replace(/(^|;|\{|\s)\s*(--vk-[a-z0-9-]+)\s*:[^;{}]*(;|$)/g, (m, lead, name) => (drop(name) ? (lead === ';' ? ';' : lead) : m));
}

/**
 * Rewrite one stylesheet. A rule naming a vibekit component class survives only as the guard allows
 * (e2e/pixel/vk-guard.mjs): behind a page class, layout declarations only. A bare component selector in
 * a list with page selectors (the mockups' "buttons never wrap" fix-ups) is scoped to `opts.root`, the
 * page's own root class; with no root (the canvas's shared vk.css) it goes to `opts.collect` instead,
 * for the page to carry under its own root.
 */
export function resyncCss(css, opts = {}) {
  const owned = vibekitTokens();
  let out = '';
  for (const p of pieces(css)) {
    if (p.kind === 'ws' || p.kind === 'stmt') { out += p.text; continue; }
    if (p.kind === 'comment') { if (!VK.test(p.text)) out += p.text; continue; }
    const prelude = p.prelude;
    const lead = /^\s*/.exec(prelude)[0];
    const bare = stripComments(prelude).trim();
    // A comment glued to the prelude counts as part of it for the guard; keep it only if it is harmless.
    const comments = (prelude.match(/\/\*[\s\S]*?\*\//g) ?? []).filter((c) => !VK.test(c)).join('');
    if (bare.startsWith('@')) {
      if (/^@(media|supports|layer|container|document)\b/.test(bare)) {
        const inner = resyncCss(p.body, opts);
        if (inner.trim() === '' && p.body.trim() !== '') continue;
        out += `${prelude}{${inner}}`;
      } else out += `${prelude}{${p.body}}`; // @keyframes, @font-face, @property: no selectors
      continue;
    }
    const list = splitList(bare);
    const kept = list.filter((s) => !VK.test(s));
    const vkItems = list.filter((s) => VK.test(s)).map((s) => s.trim());
    const layoutBody = layoutOnly(p.body);
    // Component selectors that may stay: scoped by the page already, or bare ones in a mixed list.
    const placed = [];
    if (layoutBody) {
      for (const it of vkItems) {
        if (scopedByPage(it)) placed.push(it);
        else if (kept.length && opts.root) placed.push(`.${opts.root} ${it}`);
        else if (kept.length && opts.collect) opts.collect.push({ item: it, body: layoutBody });
      }
    }
    const allPlacedAsIs = vkItems.length > 0 && placed.length === vkItems.length && placed.every((x, i) => x === vkItems[i]) && layoutBody === p.body;
    if (!kept.length && allPlacedAsIs) { out += `${prelude}{${p.body}}`; continue; }
    if (kept.length) {
      const whole = kept.length === list.length && comments.length === (prelude.match(/\/\*[\s\S]*?\*\//g) ?? []).join('').length;
      let body = p.body;
      let drop = false;
      if (kept.every((s) => TOKEN_SEL.test(s))) {
        body = dropTokens(body, owned);
        if (body.replace(/[\s;]/g, '') === '') drop = true;
      }
      if (!drop) out += whole ? `${prelude}{${body}}` : `${lead}${comments}${kept.map((s) => s.trim()).join(', ')}{${body}}`;
    }
    if (placed.length) out += `${kept.length ? ' ' : lead}${placed.join(', ')}{${layoutBody}}`;
  }
  return out;
}

/** The layout declarations of a rule body, or '' when it has none. */
function layoutOnly(body) {
  const decls = body.split(';').map((d) => d.trim()).filter(Boolean);
  const keep = decls.filter((d) => LAYOUT.test(d.split(':')[0].trim().toLowerCase()));
  if (!keep.length) return '';
  return keep.length === decls.length ? body : ` ${keep.join('; ')}; `;
}

// ------------------------------------------------------------------------------------------------ HTML
/** The canvas's prototype stylesheet with vibekit's component rules and tokens removed. */
export const CANVAS_CSS = 'vk.sp-canonical.css';
const VK_LINK = `<link rel="stylesheet" href="${VK_DIR}/vibekit.css" data-vibekit="${VIBEKIT_VERSION}">`;

function setAttrs(tag) {
  let t = tag;
  for (const [k, v] of [['data-accent', 'product'], ['data-product', 'superpipeline']]) {
    if (new RegExp(`\\s${k}="`).test(t)) t = t.replace(new RegExp(`(\\s${k}=")[^"]*"`), `$1${v}"`);
    else t = t.replace(/^<([a-zA-Z0-9-]+)/, `<$1 ${k}="${v}"`);
  }
  return t;
}

/** jsdom with node locations: element offsets into the original string, so splices leave every other byte. */
async function parse(src) {
  const { JSDOM } = await import('jsdom');
  return new JSDOM(src, { includeNodeLocations: true });
}

/** Two drawings are the same face when their parsed child markup matches (self-closing vs explicit tags aside). */
async function sameDrawing(a, b) {
  const { JSDOM } = await import('jsdom');
  const norm = (h) => { const d = JSDOM.fragment(`<div>${h}</div>`).firstChild; return d.querySelector('svg')?.innerHTML ?? d.innerHTML; };
  return norm(a) === norm(b);
}

function lookOf(el) {
  const root = el.closest('[data-vibe]');
  const vibe = root?.getAttribute('data-vibe');
  const theme = el.closest('[data-theme]')?.getAttribute('data-theme') ?? 'light';
  if (!vibe || !['daylight', 'paper', 'studio', 'quiet'].includes(vibe)) return null;
  return { vibe, theme: theme === 'dark' ? 'dark' : 'light' };
}

/** The class of the outermost vibe root: the page's own root container, the scope for its placement rules. */
function rootClass(doc) {
  const r = doc.querySelector('[data-vibe]');
  return r ? ([...r.classList].find((c) => !c.startsWith('vk-')) ?? null) : null;
}

/**
 * A component's SSR ids restart per render (bits-s1, …); a page holds many renders, so each id gets the
 * page's own sequence, and every reference to it inside that render (for, aria-controls, …) follows.
 */
function renumber(html, next) {
  const map = new Map();
  return html.replace(/\bbits-s\d+\b/g, (id) => { if (!map.has(id)) map.set(id, `vk-r${next()}`); return map.get(id); });
}

export async function resyncHtml(src, opts = {}) {
  const { COMPONENT_MAP, renderComponent } = await mods();
  const dom = await parse(src);
  const doc = dom.window.document;
  /** @type {{start:number,end:number,text:string}[]} */
  const edits = [];
  const taken = [];
  const inside = (s, e) => taken.some(([a, b]) => s >= a && e <= b);
  const root = rootClass(doc);
  let seq = 0;
  const next = () => ++seq;

  for (const entry of Object.values(COMPONENT_MAP)) {
    if (!entry.replace) continue;
    for (const el of doc.querySelectorAll(entry.select)) {
      const loc = dom.nodeLocation(el);
      if (!loc || inside(loc.startOffset, loc.endOffset)) continue;
      const look = lookOf(el);
      if (!look) continue;
      const props = entry.props(el);
      if (!props) continue;
      const out = renumber(await renderComponent(entry.component, props, look), next);
      const before = src.slice(loc.startOffset, loc.endOffset);
      if (entry.component === 'Face' && !(await sameDrawing(out, el.innerHTML))) continue;
      taken.push([loc.startOffset, loc.endOffset]);
      if (out !== before) edits.push({ start: loc.startOffset, end: loc.endOffset, text: out });
    }
  }
  // Styles: every <style> body is rewritten in place.
  for (const st of doc.querySelectorAll('style')) {
    const loc = dom.nodeLocation(st);
    if (!loc?.startTag || !loc.endTag) continue;
    const s = loc.startTag.endOffset, e = loc.endTag.startOffset;
    const css = src.slice(s, e);
    const out = resyncCss(css, { root });
    if (out !== css) edits.push({ start: s, end: e, text: out });
  }
  // Product on <html> and on every element that sets a vibe (accents.css matches all four attributes together).
  const roots = [doc.documentElement, ...doc.querySelectorAll('[data-vibe]')];
  for (const el of new Set(roots)) {
    const loc = dom.nodeLocation(el);
    if (!loc?.startTag) continue;
    const tag = src.slice(loc.startTag.startOffset, loc.startTag.endOffset);
    const next = setAttrs(tag);
    if (next !== tag) edits.push({ start: loc.startTag.startOffset, end: loc.startTag.endOffset, text: next });
  }
  // The canvas sources link the prototype stylesheet (vk.css, shared with other products' mockups);
  // they get a copy with the same rules removed (written by the CLI beside them).
  // Its placement fix-ups for vibekit components are carried by the page, under its own root.
  if (opts.prototypeCss && root && doc.querySelector('link[rel="stylesheet"][href="vk.css"]') && doc.head) {
    const collect = [];
    resyncCss(opts.prototypeCss, { collect });
    if (collect.length) {
      const css = collect.map(({ item, body }) => `.${root} ${item}{${body}}`).join('\n');
      const head = dom.nodeLocation(doc.head);
      edits.push({ start: head.endTag.startOffset, end: head.endTag.startOffset, text: `<style data-sp-layout="vk.css">\n${css}\n</style>\n` });
    }
  }
  for (const l of doc.querySelectorAll('link[rel="stylesheet"][href="vk.css"]')) {
    const loc = dom.nodeLocation(l);
    const tag = src.slice(loc.startOffset, loc.endOffset);
    edits.push({ start: loc.startOffset, end: loc.endOffset, text: tag.replace('href="vk.css"', `href="${CANVAS_CSS}"`) });
  }
  // vibekit.css, once, right after <head>.
  if (!src.includes(`data-vibekit="${VIBEKIT_VERSION}"`)) {
    const head = doc.head && dom.nodeLocation(doc.head);
    if (head?.startTag) edits.push({ start: head.startTag.endOffset, end: head.startTag.endOffset, text: VK_LINK });
  }
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let out = src;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

// ------------------------------------------------------------------------------------- vibekit.css copy
/** vibekit.css with its relative @imports inlined (layers kept), so a static page can link one file. */
export function flattenVibekitCss(file = join(VK_STYLES, 'vibekit.css')) {
  const css = readFileSync(file, 'utf8');
  return css.replace(/@import\s+"(\.[^"]+)"(\s+layer\(([^)]+)\))?\s*;/g, (_m, rel, _l, layer) => {
    const inner = flattenVibekitCss(join(dirname(file), rel));
    return layer ? `@layer ${layer} {\n${inner}\n}` : inner;
  });
}

export function writeVibekitCopy(dir) {
  mkdirSync(join(dir, VK_DIR), { recursive: true });
  const css = `/* vibekit ${VIBEKIT_VERSION} vibekit.css, imports inlined by scripts/pixel/resync-references.mjs. Do not edit. */\n${flattenVibekitCss()}`;
  const target = join(dir, VK_DIR, 'vibekit.css');
  const changed = !existsSync(target) || readFileSync(target, 'utf8') !== css;
  return { target, css, changed };
}

// ------------------------------------------------------------------------------------------------- CLI
async function main(argv) {
  const check = argv.includes('--check');
  const at = (f) => (argv.includes(f) ? resolve(argv[argv.indexOf(f) + 1]) : null);
  const inDir = at('--in') ?? REF_DIR;
  const outDir = at('--out') ?? inDir;
  const ext = at('--in') ? /\.html$/ : /^SP-.*\.html$/;
  const files = readdirSync(inDir).filter((f) => ext.test(f)).sort();
  let drift = 0;
  const vk = writeVibekitCopy(outDir);
  if (vk.changed) { drift++; if (!check) writeFileSync(vk.target, vk.css); }
  if (existsSync(join(inDir, 'vk.css'))) {
    const css = resyncCss(readFileSync(join(inDir, 'vk.css'), 'utf8'));
    const t = join(outDir, CANVAS_CSS);
    if (!existsSync(t) || readFileSync(t, 'utf8') !== css) { drift++; if (!check) writeFileSync(t, css); }
  }
  for (const f of files) {
    const src = readFileSync(join(inDir, f), 'utf8');
    const prototypeCss = existsSync(join(inDir, 'vk.css')) ? readFileSync(join(inDir, 'vk.css'), 'utf8') : undefined;
    const out = await resyncHtml(src, { prototypeCss });
    const prev = existsSync(join(outDir, f)) ? readFileSync(join(outDir, f), 'utf8') : null;
    if (out === prev) continue;
    drift++;
    if (check) console.error(`drift: ${f}`);
    else { writeFileSync(join(outDir, f), out); console.log(f); }
  }
  const m = await mods();
  await m.close();
  if (check && drift) { console.error(`${drift} file(s) not re-synced`); process.exit(1); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => { console.error(e); process.exit(1); });
}
