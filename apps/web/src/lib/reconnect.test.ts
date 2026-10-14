// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { placeOf, reconnect, registerOpenCard, takeReturnTo, RETURN_KEY } from './reconnect';

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

  it.each(['/inbox', '/plan', '/plan/projects', '/plan/projects/prj_12ab', '/crew', '/crew/agents', '/crew/people', '/crew/capabilities', '/settings', '/settings?tab=labels', '/b/brd_1/operate/log', '/b/brd_134a/c/card_ace2/page', '/'])('gives back the nav v2 place %s', (place) => {
    sessionStorage.setItem(RETURN_KEY, place);
    expect(takeReturnTo()).toBe(place);
  });

  it.each(['/plan/projects/../x', '/crew/agents/extra/deep', '/inbox//evil.example', '//', '//?x'])('still ignores %s', (bad) => {
    sessionStorage.setItem(RETURN_KEY, bad);
    expect(takeReturnTo()).toBeNull();
  });

  it('saves a card open in the board drawer as the card address, so it reopens', () => {
    expect(placeOf('/b/brd_1', 'crd_9')).toBe('/b/brd_1/c/crd_9');
    expect(placeOf('/b/brd_1?view=list', 'crd_9')).toBe('/b/brd_1/c/crd_9?view=list');
    expect(placeOf('/b/brd_1', null)).toBe('/b/brd_1');
    expect(placeOf('/b/brd_1/c/crd_2', 'crd_9')).toBe('/b/brd_1/c/crd_2');
    expect(placeOf('/inbox', 'crd_9')).toBe('/inbox');
    expect(placeOf('/b/brd_1', '../x')).toBe('/b/brd_1');
    registerOpenCard(() => 'crd_7');
    const go = vi.fn();
    reconnect(go, placeOf('/b/brd_1', 'crd_7'));
    expect(sessionStorage.getItem(RETURN_KEY)).toBe('/b/brd_1/c/crd_7');
    registerOpenCard(() => null);
  });
});
