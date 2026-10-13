#!/usr/bin/env node
// apps/web/scripts/pixel/extract-css.mjs — port a reference's CSS verbatim, by class prefix.
// Usage: node scripts/pixel/extract-css.mjs SP-Board-Daylight --prefix dy-,vk-sky [--exclude dy-rail,dy-top] [--out src/lib/styles/vibes/daylight/shell.css]
// --exclude drops every rule whose selector names one of those classes (whole class names): the parts vibekit draws.
// --scope '<selector>' puts the scope in front of every selector; a leading [data-theme|vibe|time|phase…] stays in front of it.
// <Artboard> may be a comma list: the rules of all of them, each distinct rule once, in first-seen order.
// --match <regex> keeps rules whose selector list matches (in addition to --prefix); --skip-vibekit ignores the reference's token + vibekit <style> block.
// --where .x scopes with zero added specificity: every selector that does not already name .x becomes `<outer> :where(.x) <rest>`, <outer> being a leading [data-vibe|theme] or .ar compound.
// --root '<text>' --as '<selector>' (dialogs): keep only rules whose selector starts with the root text (the reference's
//   `:where(.fg)` layer) and write it as <selector>. Attribute compounds right after the root ([data-vibe="paper"],
//   [data-theme="dark"]) move in front as an ancestor: the app carries them on <html>, the dialog is portalled to <body>.
//   A keyframes block comes along when a kept rule animates with it.
// REF_DIR overrides the reference folder.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [artboardArg, ...rest] = process.argv.slice(2);
const arg = (k) => { const i = rest.indexOf(k); return i > -1 ? rest[i + 1] : undefined; };
const prefixes = (arg('--prefix') ?? '').split(',').filter(Boolean);
const excludes = (arg('--exclude') ?? '').split(',').filter(Boolean);
const matchSrc = arg('--match');
const match = matchSrc ? new RegExp(matchSrc) : null;
const scope = arg('--scope');
const where = arg('--where');
/** Skip the reference's token + vibekit block (the app gets those rules from the package, per vibe). */
const skipVibekit = rest.includes('--skip-vibekit');
const root = arg('--root');
const as = arg('--as');
if ((root && !as) || (as && !root)) { console.error('--root and --as go together'); process.exit(2); }
if (!artboardArg || (prefixes.length === 0 && !match)) {
  console.error('usage: extract-css.mjs <Artboard[,Artboard…]> [--prefix a-,b-] [--exclude a,b] [--match <regex>] [--scope <sel> | --where .cls] [--skip-vibekit] [--out file]');
  process.exit(2);
}
const artboards = artboardArg.split(',').filter(Boolean);
const refDir = process.env.REF_DIR ?? join(here, '../../e2e/reference/mockups');
const css = artboards
  .map((a) => readFileSync(join(refDir, `${a}.html`), 'utf8'))
  .flatMap((html) => [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]))
  .filter((block) => !(skipVibekit && block.includes('--vk-color-bg:')))
  .join('\n');

/** Split top-level CSS into [prelude, body] blocks, keeping @media/@supports/@container groups. */
function blocks(src) {
  const out = []; let depth = 0, start = 0, open = -1;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    // A top-level comment ends before the next selector starts, so it is not glued onto it.
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 1; if (depth === 0) start = i + 1; continue; }
    if (c === '{') { if (depth === 0) open = i; depth++; }
    else if (c === '}') { depth--; if (depth === 0) { out.push([src.slice(start, open).trim(), src.slice(open + 1, i)]); start = i + 1; } }
  }
  return out;
}
const esc = (p) => p.replace(/[-]/g, '\\-');
const excluded = (sel) => excludes.some((x) => new RegExp(`\\.${esc(x)}(?![\\w-])`).test(sel));
const rooted = (sel) => !root || splitList(sel.replace(/\/\*[\s\S]*?\*\//g, '').trim()).every((s) => s.startsWith(root));
const wanted = (sel) => !/\.sc-/.test(sel) && !excluded(sel) && rooted(sel)
  && (prefixes.some((p) => new RegExp(`\\.${esc(p)}`).test(sel)) || (match !== null && match.test(sel)));

/** Comma-split a selector list, ignoring commas inside :is()/:where() and attribute brackets. */
function splitList(sel) {
  const parts = []; let depth = 0, last = 0;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { parts.push(sel.slice(last, i).trim()); last = i + 1; }
  }
  parts.push(sel.slice(last).trim());
  return parts;
}
const OUTER = /^(?:\[data-(?:vibe|theme)(?:="[^"]*")?\]|\.ar(?![\w-]))\s+/;
const hasWhere = where ? new RegExp(`${where.replace(/[.-]/g, (c) => `\\${c}`)}(?![\\w-])`) : null;
function scoped(prelude) {
  const sel = prelude.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (root) {
    return [...new Set(splitList(sel).map((s) => {
      const m = /^((?:\s*\[[^\]]+\])*)(.*)$/s.exec(s.slice(root.length));
      const attrs = m[1].replace(/\s+/g, '');
      return `${attrs ? `${attrs} ` : ''}${as}${m[2]}`;
    }))].join(', ');
  }
  if (where) {
    // Zero added specificity: `<outer> :where(.x) <rest>`, <outer> being any leading vibe/theme/.ar compound.
    return splitList(sel).map((s) => {
      if (hasWhere.test(s)) return s;
      let outer = '', restSel = s;
      for (let m = OUTER.exec(restSel); m; m = OUTER.exec(restSel)) { outer += `${m[0].trim()} `; restSel = restSel.slice(m[0].length); }
      return `${outer}:where(${where}) ${restSel}`;
    }).join(', ');
  }
  if (!scope) return prelude;
  return splitList(sel).map((s) => {
    const m = s.match(/^((?:\[data-(?:theme|vibe|time|phase)[^\]]*\])+)\s+(.+)$/);
    return m ? `${m[1]} ${scope} ${m[2]}` : `${scope} ${s}`;
  }).join(', ');
}

const seen = new Set();
const once = (rule) => { const k = rule.replace(/\s+/g, ' '); if (seen.has(k)) return false; seen.add(k); return true; };
const kept = [];
const frames = [];
for (const [prelude, body] of blocks(css)) {
  if (/^@(media|supports|container)/.test(prelude)) {
    const inner = blocks(body).filter(([s]) => wanted(s)).map(([s, b]) => `  ${scoped(s)} {${b}}`).filter(once);
    if (inner.length) kept.push(`${prelude} {\n${inner.join('\n')}\n}`);
  } else if (/^@keyframes/.test(prelude)) {
    if (root) frames.push([prelude, body]);
    else if (prefixes.some((p) => prelude.includes(p))) { const r = `${prelude} {${body}}`; if (once(r)) kept.push(r); }
  } else if (wanted(prelude)) { const r = `${scoped(prelude)} {${body}}`; if (once(r)) kept.push(r); }
}
if (root) {
  const animated = new Set([...kept.join('\n').matchAll(/animation(?:-name)?\s*:\s*([^;}]+)/g)].flatMap((m) => m[1].split(/[\s,]+/)));
  for (const [prelude, body] of frames) if (animated.has(prelude.replace(/^@keyframes\s+/, '').trim())) { const r = `${prelude} {${body}}`; if (once(r)) kept.push(r); }
}
const artboard = artboards.join(', ');
const text = `/* Ported verbatim from e2e/reference/mockups/${artboard} (prefixes ${prefixes.join(', ') || '—'}${excludes.length ? `; excluding ${excludes.join(', ')}` : ''}${matchSrc ? `, match ${matchSrc}` : ''}${scope ? `; scoped to ${scope}` : ''}${where ? `, where ${where}` : ''}${root ? `; root ${root} as ${as}` : ''}) by scripts/pixel/extract-css.mjs. */\n${kept.join('\n')}\n`;
const out = arg('--out');
if (out) writeFileSync(out, text); else process.stdout.write(text);
