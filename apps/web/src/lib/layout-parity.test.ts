import { describe, expect, it } from 'vitest';

/** Template comments, script comments: a word that only a comment mentions is not used. */
const stripComments = (src: string) => src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
/** `lead` handed on (`lead=`, `{lead`) or read (`lead.`, `lead)`): not just the word somewhere. */
export const LEAD_USED = /\blead=|\{lead\b|\blead\.|\bleadText\(\s*lead\b/;
/**
 * Section renders that sit inside an open {#if ...} block (an {:else} branch counts as inside).
 * The one allowed condition is `editing` (or `!editing`): the shell's edit-mode swap, whose other
 * branch is the edit form, and each section is still rendered once overall.
 */
/** Whether `needle` first appears inside an open {#if ...} block of any kind, the edit swap included. */
export function insideAnyIf(src: string, needle: string): boolean {
  const clean = stripComments(src);
  const at = clean.indexOf(needle);
  if (at < 0) return false;
  let depth = 0;
  for (const m of clean.slice(0, at).matchAll(/\{#if\s[^}]*\}|\{\/if\}/g)) depth += m[0] === '{/if}' ? -1 : 1;
  return depth > 0;
}

export function conditionalSections(src: string): string[] {
  const out: string[] = [];
  const stack: boolean[] = []; // true for each open {#if} that is not the edit-mode swap
  for (const m of stripComments(src).matchAll(/\{#if\s+([^}]*)\}|\{\/if\}|\{@render sections\.(\w+)\(\)\}/g)) {
    if (m[0].startsWith('{#if')) stack.push(!/^!?editing$/.test(m[1].trim()));
    else if (m[0] === '{/if}') stack.pop();
    else if (stack.some(Boolean)) out.push(m[2]);
  }
  return out;
}

// Every pre-sweep layout is gone: the board (one BoardView for every vibe) and the card (one CardView
// for every vibe and surface). What is left to guard is the registry itself, so no surface goes back
// to a layout per vibe.
/** Every per-vibe layout file left under a component folder (layouts/ or legacy/); the contract retired them all. */
const PER_VIBE_FILES = Object.keys(import.meta.glob(['./components/**/layouts/**/*.svelte', './components/**/legacy/**/*.svelte']));

describe('every page is one composition (composition contract §8)', () => {
  it('no per-vibe layout or legacy component is left, and layouts.ts is gone', () => {
    expect(PER_VIBE_FILES).toEqual([]);
    expect(Object.keys(import.meta.glob('./layouts.ts'))).toEqual([]);
  });
});

describe('the parity guards catch what they are for', () => {
  it('a comment that mentions lead does not count as using it', () => {
    expect(stripComments('<!-- lead --> /* lead */ // lead')).not.toMatch(LEAD_USED);
    expect(stripComments('<LeadBubble {lead} />')).toMatch(LEAD_USED);
    expect(stripComments('<G lead={lead} />')).toMatch(LEAD_USED);
  });
  it('a section inside an {#if} is flagged, one inside {#if editing} is not', () => {
    expect(conditionalSections('{#if x}{@render sections.plan()}{/if}')).toEqual(['plan']);
    expect(conditionalSections('{#if x}{:else}{@render sections.plan()}{/if}')).toEqual(['plan']);
    expect(conditionalSections('{#if a}{#if editing}{@render sections.plan()}{/if}{/if}{@render sections.cost()}')).toEqual(['plan']);
    expect(conditionalSections('{#if editing}{@render sections.plan()}{:else}{@render sections.cost()}{/if}')).toEqual([]);
    expect(conditionalSections('{#if !editing}{@render sections.plan()}{/if}')).toEqual([]);
    expect(conditionalSections('{#if !editingProject}{@render sections.plan()}{/if}')).toEqual(['plan']);
  });
  it('a title inside an {#if}, even the edit swap, is flagged', () => {
    expect(insideAnyIf('{#if editing}{:else}<h2 id="drawer-title">{/if}', 'id="drawer-title"')).toBe(true);
    expect(insideAnyIf('{#if editing}x{/if}<h2 id="drawer-title">', 'id="drawer-title"')).toBe(false);
  });
});
