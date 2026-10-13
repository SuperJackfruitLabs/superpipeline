import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPeek } from './peek-controller';

let seen: (string | null)[];
let wide = true;
let focusMoves: string[];
const make = () => createPeek({ wide: () => wide, onChange: (id) => seen.push(id), focusTitle: (id) => { focusMoves.push(id); return true; } });

beforeEach(() => { vi.useFakeTimers(); seen = []; focusMoves = []; wide = true; });
afterEach(() => vi.useRealTimers());

describe('when the peek is open', () => {
  it('opens after a beat on pointer or focus, and only from 1440px', () => {
    const p = make();
    p.pointerEnter('a');
    expect(p.id).toBeNull();
    vi.advanceTimersByTime(300);
    expect(p.id).toBe('a');
    wide = false;
    p.pointerEnter('b');
    vi.advanceTimersByTime(500);
    expect(p.id).toBe('a');
  });
  it('hides when the pointer leaves and focus is elsewhere', () => {
    const p = make();
    p.pointerEnter('a'); vi.advanceTimersByTime(300);
    p.pointerLeave('a');
    expect(p.id).toBeNull();
  });
  it('hides when focus leaves and the pointer is elsewhere, and stays while either is still in the card', () => {
    const p = make();
    p.focusIn('a'); p.pointerEnter('a'); vi.advanceTimersByTime(300);
    p.pointerLeave('a');
    expect(p.id).toBe('a');
    p.focusOut('a');
    expect(p.id).toBeNull();
  });
  it('a pointer that leaves before the beat is up never opens it', () => {
    const p = make();
    p.pointerEnter('a'); vi.advanceTimersByTime(100);
    p.pointerLeave('a'); vi.advanceTimersByTime(500);
    expect(seen).toEqual([]);
  });
  it('closes when the drawer opens, and a focus return after it closes does not reopen it', () => {
    const p = make();
    p.focusIn('a'); vi.advanceTimersByTime(300);
    expect(p.id).toBe('a');
    p.drawerOpened();
    expect(p.id).toBeNull();
    p.drawerClosed('a');
    p.focusIn('a'); vi.advanceTimersByTime(500);
    expect(p.id).toBeNull();
    // a deliberate focus later does
    p.focusOut('a'); p.focusIn('a'); vi.advanceTimersByTime(300);
    expect(p.id).toBe('a');
  });
  it('a pointer arriving after the drawer closed opens it; a stale return window does not block a later focus', () => {
    const p = make();
    p.drawerClosed('a');
    vi.advanceTimersByTime(500);
    p.focusIn('a'); vi.advanceTimersByTime(300);
    expect(p.id).toBe('a');
  });
  it('Esc closes it, puts focus on the title and the focus does not reopen it', () => {
    const p = make();
    p.pointerEnter('a'); vi.advanceTimersByTime(300);
    p.close();
    expect(focusMoves).toEqual(['a']);
    p.focusIn('a'); vi.advanceTimersByTime(500);
    expect(p.id).toBeNull();
  });
});
