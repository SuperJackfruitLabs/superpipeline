#!/usr/bin/env node
// apps/web/scripts/visual/trailer.mjs — the base the visual job compares against, and whether the range
// says why the screens change. Same base resolution as check-lock-change.mjs (lock-base.mjs chooseBase).
//   node trailer.mjs base   <arg>   prints the base sha
//   node trailer.mjs reason <base>  prints the Visual-Change reason(s), or nothing
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chooseBase } from '../pixel/lock-base.mjs';

/** Every `<key>: <why>` trailer line in the commit bodies, joined; null when there is none. */
export function trailerReason(bodies, key) {
  const re = new RegExp(`^${key}:[ \\t]*(\\S.*)$`, 'gm');
  const found = [...bodies.matchAll(re)].map((m) => m[1].trim());
  return found.length ? found.join('; ') : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'base') console.log(git('rev-parse', chooseBase(arg, () => git('merge-base', 'origin/main', 'HEAD'))));
  else if (cmd === 'reason') console.log(trailerReason(git('log', '--format=%B%x00', `${arg}..HEAD`), 'Visual-Change') ?? '');
  else { console.error('usage: trailer.mjs base <arg> | reason <base>'); process.exit(2); }
}
