import { describe, expect, it } from 'vitest';
import { trailerReason } from './trailer.mjs';

const body = (...lines: string[]) => lines.join('\n');
describe('Visual-Change trailer', () => {
  it('finds the reason on any commit in the range', () => {
    const bodies = [body('fix: a', '', 'Co-Authored-By: x'), body('feat: b', '', 'Visual-Change: the board header is taller', 'Co-Authored-By: x')].join('\0');
    expect(trailerReason(bodies, 'Visual-Change')).toBe('the board header is taller');
  });
  it('is null without the trailer', () => expect(trailerReason(body('feat: b', '', 'Co-Authored-By: x'), 'Visual-Change')).toBeNull());
  it('needs a reason after the colon', () => expect(trailerReason(body('x', '', 'Visual-Change: '), 'Visual-Change')).toBeNull());
  it('must start a line (a quote in prose does not count)', () =>
    expect(trailerReason('mentions Visual-Change: in passing', 'Visual-Change')).toBeNull());
  it('does not take another trailer for it', () =>
    expect(trailerReason(body('x', '', 'Reference-Change: refs'), 'Visual-Change')).toBeNull());
  it('collects every reason', () =>
    expect(trailerReason(body('Visual-Change: one', '\0', 'Visual-Change: two'), 'Visual-Change')).toBe('one; two'));
});
