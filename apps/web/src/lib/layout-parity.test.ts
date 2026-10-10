import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARD_SECTION_KEYS } from '$lib/components/card/layouts/types';

const read = (dir: URL, f: string) => readFileSync(new URL(f, dir), 'utf8');
const count = (src: string, needle: string) => src.split(needle).length - 1;

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
    it(`${f} renders a gate panel and a question panel`, () => {
      expect(src).toMatch(/<Gate[A-Z]\w*\b/);
      expect(src).toMatch(/<Question[A-Z]\w*\b/);
    });
    it(`${f} leads with the agent`, () => expect(src).toMatch(/\blead\b/));
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
