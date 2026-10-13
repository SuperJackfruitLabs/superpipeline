// apps/web/src/lib/components/board/daylight/daylight-scope.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The board's `.dl-*` rules must never reach portaled UI: every one sits inside `@scope (.dl-scope)`.
const css = readFileSync(join(__dirname, 'daylight.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The CSS outside every `@scope (.dl-scope) { … }` block. */
function outsideScope(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const at = src.indexOf('@scope (.dl-scope)', i);
    if (at === -1) { out += src.slice(i); break; }
    out += src.slice(i, at);
    let j = src.indexOf('{', at) + 1;
    for (let depth = 1; depth > 0 && j < src.length; j++) depth += src[j] === '{' ? 1 : src[j] === '}' ? -1 : 0;
    i = j;
  }
  return out;
}

describe('board/daylight/daylight.css', () => {
  it('has no unscoped .dl- selector', () => expect(outsideScope(css).match(/\.dl-[\w-]+/g) ?? []).toEqual([]));
  it('is scoped to roots the board draws', () => expect(css).toContain('@scope (.dl-scope)'));
  it('the guard catches an unscoped rule', () => expect(outsideScope(css + '\n.dl-tile { color: red; }')).toContain('.dl-tile'));
});
