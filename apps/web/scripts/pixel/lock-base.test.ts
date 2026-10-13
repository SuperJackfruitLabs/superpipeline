import { describe, expect, it } from 'vitest';
import { chooseBase } from './lock-base.mjs';

const mb = () => 'mergebase';
describe('check-lock-change base', () => {
  it('uses the given sha', () => expect(chooseBase('abc123', mb)).toBe('abc123'));
  it('falls back to the merge base when empty or missing', () => {
    expect(chooseBase('', mb)).toBe('mergebase');
    expect(chooseBase(undefined, mb)).toBe('mergebase');
    expect(chooseBase('  ', mb)).toBe('mergebase');
  });
  it('falls back when the push has no before (all zeros)', () => expect(chooseBase('0'.repeat(40), mb)).toBe('mergebase'));
});
