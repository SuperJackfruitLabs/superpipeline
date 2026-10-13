import { readFileSync } from 'node:fs';
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

// Every pre-sweep layout is gone: the board (Task 28) and the card (Tasks 22-27). What is left to
// guard is the registry itself, so a vibe can never fall back to a missing or legacy layout.
const LAYOUTS_SRC = readFileSync(new URL('./layouts.ts', import.meta.url), 'utf8');
const VIBE_NAMES = ['Daylight', 'Paper', 'Studio', 'Quiet'];

describe('every vibe has its swept board and card layouts (spec §7.3–7.5)', () => {
  it('layouts.ts imports nothing from a legacy folder', () => expect(LAYOUTS_SRC).not.toMatch(/\/legacy\//));
  for (const v of VIBE_NAMES) {
    const k = v.toLowerCase();
    it(`${v} board: desktop Board${v} and phone Board${v}Phone`, () =>
      expect(LAYOUTS_SRC).toContain(`${k}: { desktop: Board${v}, phone: Board${v}Phone }`));
    it(`${v} card: drawer Card${v} and phone CardPhone${v}`, () =>
      expect(LAYOUTS_SRC).toMatch(new RegExp(`${k}: \\{ drawer: Card${v}, phone: CardPhone${v},`)));
    it(`${v} card page and states`, () => {
      expect(LAYOUTS_SRC).toMatch(new RegExp(`\\b${k}: CardPage${v}\\b`));
      expect(LAYOUTS_SRC).toMatch(new RegExp(`\\b${k}: CardStates${v}\\b`));
    });
  }
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
