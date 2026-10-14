// apps/web/src/lib/view-param.test.ts
import { describe, expect, it } from 'vitest';
import { isOldProjectsLink, viewFromSearch } from './view-param';

describe('viewFromSearch', () => {
  it('reads the two board views and ignores anything else', () => {
    expect(viewFromSearch(new URLSearchParams('view=list'))).toBe('list');
    // Projects is Plan's own section since nav v2, not a board view.
    expect(viewFromSearch(new URLSearchParams('view=projects'))).toBeNull();
    expect(isOldProjectsLink(new URLSearchParams('view=projects'))).toBe(true);
    expect(isOldProjectsLink(new URLSearchParams('view=list'))).toBe(false);
    expect(viewFromSearch(new URLSearchParams('view=board'))).toBe('board');
    expect(viewFromSearch(new URLSearchParams('view=kanban'))).toBeNull();
    expect(viewFromSearch(new URLSearchParams(''))).toBeNull();
  });
});
