// apps/web/src/lib/view-param.test.ts
import { describe, expect, it } from 'vitest';
import { viewFromSearch } from './view-param';

describe('viewFromSearch', () => {
  it('reads the three views and ignores anything else', () => {
    expect(viewFromSearch(new URLSearchParams('view=list'))).toBe('list');
    expect(viewFromSearch(new URLSearchParams('view=projects'))).toBe('projects');
    expect(viewFromSearch(new URLSearchParams('view=board'))).toBe('board');
    expect(viewFromSearch(new URLSearchParams('view=kanban'))).toBeNull();
    expect(viewFromSearch(new URLSearchParams(''))).toBeNull();
  });
});
