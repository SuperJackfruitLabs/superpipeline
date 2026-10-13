// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

const logout = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('$lib/api', () => ({ logout }));
import { signOut } from './account';

describe('signOut', () => {
  it('forgets every draft and open-section key in this tab, and keeps the rest', async () => {
    sessionStorage.clear();
    sessionStorage.setItem('sp:draft:resume:card_1', 'Half a thought');
    sessionStorage.setItem('sp:draft:resume:card_2', 'Another');
    sessionStorage.setItem('sp:card-open:card_1', '{"history":true}');
    sessionStorage.setItem('superpipeline.returnTo', '/b/x');
    Object.defineProperty(window, 'location', { value: { ...window.location, reload: vi.fn() }, writable: true });
    await signOut();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(Object.keys(sessionStorage)).toEqual(['superpipeline.returnTo']);
  });
});
