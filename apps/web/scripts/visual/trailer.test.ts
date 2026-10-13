import { describe, expect, it } from 'vitest';
import { touchesVisual, trailerReason } from './trailer.mjs';
import { chooseBase } from '../pixel/lock-base.mjs';

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

describe('the base', () => {
  const mb = () => 'merge-base-sha';
  it('takes the given sha', () => expect(chooseBase('abc123', mb)).toBe('abc123'));
  it('falls back to the merge base on a first push (all-zero before)', () => expect(chooseBase('0'.repeat(40), mb)).toBe('merge-base-sha'));
  it('falls back to the merge base when empty or missing', () => {
    expect(chooseBase('', mb)).toBe('merge-base-sha');
    expect(chooseBase('  ', mb)).toBe('merge-base-sha');
    expect(chooseBase(undefined, mb)).toBe('merge-base-sha');
  });
});

describe('what can move a pixel', () => {
  it('prose and unit tests cannot', () => expect(touchesVisual(['docs/09-testing-strategy.md', 'README.md', 'apps/api/src/x.test.ts', 'apps/web/src/lib/a.svelte.test.ts', ''])).toBe(false));
  it('source, styles, the API, dependencies and the workflow can', () => {
    for (const f of ['apps/web/src/lib/a.svelte', 'apps/web/src/app.css', 'apps/api/src/routes.ts', 'pnpm-lock.yaml', '.github/workflows/ci.yml'])
      expect(touchesVisual(['docs/a.md', f]), f).toBe(true);
  });
  it('the visual suite\'s own specs can', () => expect(touchesVisual(['apps/web/e2e/visual/capture.spec.ts'])).toBe(true));
  it('nothing changed captures nothing', () => expect(touchesVisual([])).toBe(false));
});
