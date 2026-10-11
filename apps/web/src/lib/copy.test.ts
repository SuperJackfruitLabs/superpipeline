import { VIBES } from '@superjackfruit/vibekit';
import { describe, expect, it } from 'vitest';
import { COPY, LEAD_FALLBACK, leadText, splitEmoji, wantYou, words } from './copy';

const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('four-way words', () => {
  it('every string is written for all four vibes with the same placeholders', () => {
    for (const [id, four] of Object.entries({ ...COPY, ...Object.fromEntries(Object.entries(LEAD_FALLBACK).map(([k, v]) => [`lead.${k}`, v])) })) {
      const base = holes(four.daylight);
      for (const v of VIBES) {
        expect(four[v].trim().length, `${id} ${v}`).toBeGreaterThan(0);
        expect(holes(four[v]), `${id} ${v}`).toEqual(base);
      }
    }
  });
  it('covers every lead kind', () => {
    expect(Object.keys(LEAD_FALLBACK).sort()).toEqual(['budget', 'done', 'failed', 'idle', 'question', 'review', 'stopped', 'working']);
  });
  it('names no real agent or host', () => {
    const all = JSON.stringify({ COPY, LEAD_FALLBACK }).toLowerCase();
    for (const n of ['guild', 'ashram', 'foundry', 'chotu', 'buddhimaan']) expect(all).not.toContain(n);
  });
  it('counts read naturally', () => {
    expect(wantYou(0, 'daylight')).toBe('Nothing needs you.');
    expect(wantYou(1, 'daylight')).toBe('1 card wants you.');
    expect(wantYou(3, 'quiet')).toBe('3 cards need your decision.');
  });
  it('refuses a missing variable', () => {
    expect(() => words('board.wantYou', 'paper')).toThrow(/n/);
  });
  it('the lead says the agent’s words, or the kind’s fallback', () => {
    expect(leadText({ kind: 'review', sentence: 'Ready.' } as never, 'studio')).toBe('Ready.');
    expect(leadText({ kind: 'review', sentence: null } as never, 'studio')).toBe('AWAITING REVIEW.');
  });
  it('splits emoji out so screen readers skip them', () => {
    expect(splitEmoji("I'm stuck 😕 ok")).toEqual([
      { text: "I'm stuck ", emoji: false },
      { text: '😕', emoji: true },
      { text: ' ok', emoji: false },
    ]);
  });
});
