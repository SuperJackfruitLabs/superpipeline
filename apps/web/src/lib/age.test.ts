import { describe, expect, it } from 'vitest';
import { ageLabel } from './age';
import { ageLong, ageShort, ageWords, agoWords } from './age';

describe('ageLabel', () => {
  it.each([[null, null], [0, 'just now'], [0.004, 'just now'], [0.25, '15m'], [5.9, '5h'], [47.9, '47h'], [72, '3d']] as const)('%s → %s', (h, want) => {
    expect(ageLabel(h)).toBe(want);
  });
});


const NOW = Date.parse('2026-10-11T08:21:00Z');
const h = (iso: string) => (NOW - Date.parse(iso)) / 3_600_000;

describe('ageShort / ageLong / agoWords at the fixture clock', () => {
  it('63ac, 70.5 hours in Reported', () => {
    const x = h('2026-10-08T09:51:01.514Z');
    expect([ageShort(x), ageLong(x), agoWords(x)]).toEqual(['2d', '2 days', '2 days ago']);
  });
  it('58f8, 33.9 hours: hours below two days', () => {
    const x = h('2026-10-09T22:24:49.862Z');
    expect([ageShort(x), ageLong(x), agoWords(x)]).toEqual(['33h', '33 hours', '33 hours ago']);
  });
  it('1dfc and 481f, 33 hours', () => {
    expect(ageShort(h('2026-10-09T22:45:45.522Z'))).toBe('33h');
    expect(ageLong(h('2026-10-09T23:04:43.288Z'))).toBe('33 hours');
  });
  it('f83f and 4605, two days', () => {
    expect([ageShort(h('2026-10-08T17:50:23.062Z')), ageLong(h('2026-10-08T17:50:23.062Z'))]).toEqual(['2d', '2 days']);
    expect([ageShort(h('2026-10-08T14:11:45.119Z')), ageLong(h('2026-10-08T14:11:45.119Z')), agoWords(h('2026-10-08T14:11:45.119Z'))]).toEqual(['2d', '2 days', '2 days ago']);
  });
  it('a done card counts whole days and says yesterday', () => {
    const x = h('2026-10-09T22:19:24.419Z'); // 9ed9, 34.0 hours
    expect(ageShort(x, true)).toBe('1d');
    expect(agoWords(x, true)).toBe('yesterday');
  });
  it('done Agent Onboarding cards: 20 hours, 66 hours, Lyra at nine days', () => {
    expect(agoWords(20.2, true)).toBe('20 hours ago');
    expect(agoWords(66.4, true)).toBe('2 days ago');
    expect(agoWords(h('2026-10-01T22:30:00Z'), true)).toBe('9 days ago');
  });
  it('unknown ages read as a dash', () => {
    expect([ageShort(null), ageLong(null), agoWords(null)]).toEqual(['—', '—', '—']);
  });
});

describe('ageWords', () => {
  it('floors to the largest unit, hours below two days', () => {
    expect(ageWords(66.15)).toBe('2 days');
    expect(ageWords(5.2)).toBe('5 hours');
    expect(ageWords(1.2)).toBe('1 hour');
    expect(ageWords(33.9)).toBe('33 hours');
    expect(ageWords(0.4)).toBe('under an hour');
  });
});

describe('ageStage (the peek) agrees with the drawer', () => {
  it('says under an hour, then short hours and days', async () => {
    const { ageStage, ageWords } = await import('./age');
    expect(ageStage(0.002)).toBe('under an hour');
    expect(ageStage(0.002)).toBe(ageWords(0.002));
    expect(ageStage(33)).toBe('33h');
    expect(ageStage(50)).toBe('2d');
    expect(ageStage(null)).toBe('—');
  });
});
