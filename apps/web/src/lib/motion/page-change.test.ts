import { describe, expect, it } from 'vitest';
import { isPageChange } from './page-change';

const at = (id: string | null) => ({ route: { id } });

describe('isPageChange: which navigations cross-fade the page', () => {
  it('a move to another screen does', () => {
    expect(isPageChange(at('/inbox'), at('/plan/projects'))).toBe(true);
    expect(isPageChange(at('/b/[boardId]'), at('/b/[boardId]/operate'))).toBe(true);
  });
  it('the first load, the same screen with new params, and an unknown route do not', () => {
    expect(isPageChange(null, at('/inbox'))).toBe(false);
    expect(isPageChange(at('/b/[boardId]'), at('/b/[boardId]'))).toBe(false);
    expect(isPageChange(at('/inbox'), at(null))).toBe(false);
  });
  it('opening or closing a card does not: the drawer has its own motion', () => {
    expect(isPageChange(at('/b/[boardId]'), at('/b/[boardId]/c/[cardId]'))).toBe(false);
    expect(isPageChange(at('/b/[boardId]/c/[cardId]'), at('/b/[boardId]'))).toBe(false);
  });
});
