// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reconnect, takeReturnTo, RETURN_KEY } from './reconnect';

describe('Reconnect', () => {
  beforeEach(() => sessionStorage.clear());

  it('remembers where you were and goes to sign in', () => {
    const go = vi.fn();
    reconnect(go, '/b/brd_1/c/crd_2?x=1');
    expect(sessionStorage.getItem(RETURN_KEY)).toBe('/b/brd_1/c/crd_2?x=1');
    expect(go).toHaveBeenCalledWith('/auth/login');
  });

  it('gives the place back once', () => {
    sessionStorage.setItem(RETURN_KEY, '/b/brd_1/c/crd_2');
    expect(takeReturnTo()).toBe('/b/brd_1/c/crd_2');
    expect(takeReturnTo()).toBeNull();
  });

  it.each(['https://evil.example/b/1', '//evil.example/b/1', '/auth/login', 'javascript:alert(1)', '/b/../auth', ''])('ignores %s', (bad) => {
    sessionStorage.setItem(RETURN_KEY, bad);
    expect(takeReturnTo()).toBeNull();
  });

  it('accepts a workspace path', () => {
    sessionStorage.setItem(RETURN_KEY, '/workspace/agents');
    expect(takeReturnTo()).toBe('/workspace/agents');
  });
});
