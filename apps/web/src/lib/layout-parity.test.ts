import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARD_SECTION_KEYS } from '$lib/components/card/layouts/types';

const read = (dir: URL, f: string) => readFileSync(new URL(f, dir), 'utf8');
const count = (src: string, needle: string) => src.split(needle).length - 1;

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

const CARD_DIR = new URL('./components/card/layouts/', import.meta.url);
const cardLayouts = readdirSync(CARD_DIR).filter((f) => /^Card[A-Z]\w*\.svelte$/.test(f));

describe('every card layout shows everything (spec §7.5)', () => {
  it('finds the layouts', () => expect(cardLayouts.length).toBeGreaterThanOrEqual(1));
  for (const f of cardLayouts) {
    const src = read(CARD_DIR, f);
    for (const k of CARD_SECTION_KEYS) {
      it(`${f} renders sections.${k} exactly once`, () => expect(count(src, `{@render sections.${k}()}`)).toBe(1));
    }
    it(`${f} labels the dialog with the title`, () => expect(count(src, 'id="drawer-title"')).toBe(1));
    it(`${f} keeps the title outside every {#if}, so the dialog keeps its name while editing`, () =>
      expect(insideAnyIf(src, 'id="drawer-title"')).toBe(false));
    it(`${f} renders a gate panel and a question panel`, () => {
      expect(src).toMatch(/<Gate[A-Z]\w*\b/);
      expect(src).toMatch(/<Question[A-Z]\w*\b/);
    });
    it(`${f} leads with the agent`, () => expect(stripComments(src)).toMatch(LEAD_USED));
    it(`${f} never renders a section inside an {#if}`, () => expect(conditionalSections(src)).toEqual([]));
  }
});

const BOARD_DIR = new URL('./components/board/layouts/', import.meta.url);
const boardLayouts = readdirSync(BOARD_DIR).filter((f) => /^Board(?!Daylight)[A-Z]\w*\.svelte$/.test(f));

describe('every non-Daylight board layout shows every card fact and every stage (spec §7.3–7.4)', () => {
  for (const f of boardLayouts) {
    const src = read(BOARD_DIR, f);
    it(`${f} renders CardFacts, CardMoveMenu and StageList`, () => {
      expect(src).toContain('<CardFacts');
      expect(src).toContain('<CardMoveMenu');
      expect(src).toContain('<StageList');
    });
    it(`${f} opens cards with the tile's accessible name`, () => expect(src).toContain('openLabel('));
  }
  it('Daylight keeps the kanban', () => expect(read(BOARD_DIR, 'BoardDaylight.svelte')).toContain('<BoardKanban'));
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
