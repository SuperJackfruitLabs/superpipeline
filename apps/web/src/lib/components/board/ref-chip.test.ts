import { describe, expect, it } from 'vitest';
import { refLabel, safeHref, subStateLabel } from './ref-chip';
const ref = (o: Record<string, unknown>) => ({ id: 'r', cardId: 'c', url: 'https://x', provider: 'github', sourceType: 'link', addedBy: 'agent', ...o }) as never;
describe('ref chip', () => {
  it('labels PRs, issues and repos', () => {
    expect(refLabel(ref({ sourceType: 'pull_request', externalId: 'o/r#12' }))).toBe('PR #12');
    expect(refLabel(ref({ sourceType: 'issue', externalId: 'o/r#3' }))).toBe('Issue #3');
    expect(refLabel(ref({ sourceType: 'repo', externalId: 'o/r' }))).toBe('o/r');
    expect(refLabel(ref({ title: 'Doc' }))).toBe('Doc');
  });
  it('sub-states read as words', () => expect(subStateLabel(ref({ metadata: { subState: 'pr_open' } }))).toBe('open'));
  it('only http(s) is a link', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('https://example.com')).toBe('https://example.com');
  });
});
