// apps/web/src/lib/words.ts
/**
 * Words for numbers and lists, shared by every screen. Pure, so each sentence a screen builds
 * from them is unit-tested with the fixture's values.
 */
export const NUM_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'] as const;

/** 'no', 'one' … 'ten'; digits past ten. `cap` upper-cases the first letter. */
export function numWord(n: number, cap = false): string {
  const w = Number.isInteger(n) && n >= 0 && n <= 10 ? NUM_WORDS[n]! : String(n);
  return cap ? w.charAt(0).toUpperCase() + w.slice(1) : w;
}

/** `1 card`, `7 cards`. */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Phones show an agent's words as a sentence: first letter up, an end mark added when missing. */
export function sentenceCase(s: string): string {
  const t = s.trim();
  if (t === '') return t;
  const up = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(up) ? up : `${up}.`;
}

const MIN_FIRST = 40;
/** Index of the first ". " at or past character 40, or -1. */
function firstBoundary(s: string): number {
  let i = s.indexOf('. ');
  while (i !== -1 && i < MIN_FIRST) i = s.indexOf('. ', i + 1);
  return i;
}

/** The text up to and including its first full stop past forty characters; all of it when there is none. */
export function firstSentence(s: string): string {
  const i = firstBoundary(s);
  return i === -1 ? s : s.slice(0, i + 1);
}

/** What `firstSentence` left out, or null. */
export function remainder(s: string): string | null {
  const i = firstBoundary(s);
  if (i === -1) return null;
  const rest = s.slice(i + 2).trim();
  return rest === '' ? null : rest;
}

export function lcFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** "a", "a and b", "a, b and c". */
export function joinAnd(names: readonly string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
