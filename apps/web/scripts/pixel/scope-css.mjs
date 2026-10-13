#!/usr/bin/env node
// apps/web/scripts/pixel/scope-css.mjs <file> <scope-selector> — wrap a ported stylesheet in @scope.
import { readFileSync, writeFileSync } from 'node:fs';
const [file, scope] = process.argv.slice(2);
if (!file || !scope) { console.error('usage: scope-css.mjs <file> <scope-selector>'); process.exit(2); }
const css = readFileSync(file, 'utf8');
const [head, ...rest] = css.split('\n');
writeFileSync(file, `${head}\n@scope (${scope}) {\n${rest.join('\n')}\n}\n`);
