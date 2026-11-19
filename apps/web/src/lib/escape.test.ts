// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { closeCardOnEscape, leaveOnEscape } from './escape';

describe('Escape closes the card, unless something inside already took it', () => {
  it('a plain Escape closes the card', () => {
    const close = vi.fn();
    closeCardOnEscape(new KeyboardEvent('keydown', { key: 'Escape' }), close);
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('an Escape whose default was prevented (the embed closing its own panel) leaves the card open', () => {
    const close = vi.fn();
    const e = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    e.preventDefault();
    closeCardOnEscape(e, close);
    expect(close).not.toHaveBeenCalled();
  });
  it('other keys do nothing', () => {
    const close = vi.fn();
    closeCardOnEscape(new KeyboardEvent('keydown', { key: 'a' }), close);
    expect(close).not.toHaveBeenCalled();
  });
});

/** An Escape (or another key) pressed with `target` focused. */
function press(target: EventTarget, init: KeyboardEventInit = {}): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true, ...init });
  Object.defineProperty(e, 'target', { value: target });
  return e;
}

describe('Escape leaves the card page from anywhere on it', () => {
  it('an Escape on the page itself leaves it, and says so', () => {
    const leave = vi.fn<() => void>();
    const e = press(document.body);
    leaveOnEscape(e, leave);
    expect(leave).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
  });
  it('not while typing, not once something took the key, not over an open dialog or menu, and not for other keys', () => {
    const leave = vi.fn<() => void>();
    const field = document.createElement('input');
    document.body.append(field);
    leaveOnEscape(press(field), leave);
    const taken = press(document.body);
    taken.preventDefault();
    leaveOnEscape(taken, leave);
    leaveOnEscape(press(document.body, { key: 'a' }), leave);
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.append(dialog);
    leaveOnEscape(press(document.body), leave);
    dialog.remove();
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    document.body.append(menu);
    leaveOnEscape(press(document.body), leave);
    expect(leave).not.toHaveBeenCalled();
    // A menu that is not drawn (hidden) does not hold the key.
    menu.hidden = true;
    leaveOnEscape(press(document.body), leave);
    expect(leave).toHaveBeenCalledTimes(1);
    menu.remove();
    field.remove();
  });
});
