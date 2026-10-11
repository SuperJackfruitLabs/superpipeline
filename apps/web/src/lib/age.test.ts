import { describe, expect, it } from 'vitest';
import { ageLabel } from './age';

describe('ageLabel', () => {
  it.each([[null, null], [0, 'just now'], [0.004, 'just now'], [0.25, '15m'], [5.9, '5h'], [47.9, '47h'], [72, '3d']] as const)('%s → %s', (h, want) => {
    expect(ageLabel(h)).toBe(want);
  });
});
