#!/usr/bin/env node
// apps/web/scripts/pixel/lock-references.mjs — rewrite references.lock from the working tree.
// Run ONLY in a task whose stated purpose is to change a reference, the manifest, CORRECTIONS.md, a
// threshold, a mask id or to grow the allow-list; that commit carries a `Reference-Change: <why>` trailer.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const here = new URL('../../e2e/pixel/', import.meta.url).pathname;
const refDir = join(here, '../reference/mockups');
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
// The references, plus the vibekit stylesheet copy they link (Task 5b), are all locked.
const vkDirs = readdirSync(refDir).filter((d) => /^_vibekit-/.test(d)).flatMap((d) => readdirSync(join(refDir, d)).map((f) => `${d}/${f}`));
const files = Object.fromEntries([...readdirSync(refDir).filter((f) => /\.(html|json|md)$/.test(f)), ...vkDirs].sort().map((f) => [f, sha(join(refDir, f))]));
const num = (name) => Number(new RegExp(`export const ${name} = ([0-9.]+)`).exec(readFileSync(join(here, 'compare.ts'), 'utf8'))[1]);
const thresholds = Object.fromEntries(['PIXEL_THRESHOLD', 'MAX_RATIO', 'WARN_RATIO', 'BLOCK', 'BLOCK_BREAK'].map((n) => [n, num(n)]));
const maskIds = [...readFileSync(join(here, 'masks.ts'), 'utf8').matchAll(/^  '([^']+)':/gm)].map((m) => m[1]).sort();
const ef = join(here, 'expected-failures.ts');
const allowList = existsSync(ef) ? [...readFileSync(ef, 'utf8').matchAll(/^  '([^']+)',/gm)].map((m) => m[1]).sort() : [];
writeFileSync(join(here, 'references.lock'), JSON.stringify({ files, thresholds, maskIds, allowList }, null, 2) + '\n');
console.log(`locked ${Object.keys(files).length} files, ${maskIds.length} mask ids, ${allowList.length} allow-listed`);
