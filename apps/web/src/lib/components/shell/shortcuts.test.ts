// apps/web/src/lib/components/shell/shortcuts.test.ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { CHORD_MS, createChordReader, isTypingTarget } from './shortcuts';

const k = (key: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean }> = {}) => ({ key, metaKey: false, ctrlKey: false, altKey: false, ...mods });

describe('shell shortcuts', () => {
  it('G then I, P or C within a second goes to Inbox, Plan or Crew', () => {
    const r = createChordReader();
    expect(r.read(k('g'), 0)).toBeNull();
    expect(r.read(k('i'), 400)).toBe('inbox');
    expect(r.read(k('g'), 1000)).toBeNull();
    expect(r.read(k('P'), 1000 + CHORD_MS)).toBe('plan');
    expect(r.read(k('g'), 5000)).toBeNull();
    expect(r.read(k('c'), 5100)).toBe('crew');
  });
  it('the old G O and G W still land on Inbox and Crew', () => {
    const r = createChordReader();
    r.read(k('g'), 0);
    expect(r.read(k('o'), 10)).toBe('inbox');
    r.read(k('g'), 100);
    expect(r.read(k('w'), 110)).toBe('crew');
  });
  it('a late second key is a key of its own', () => {
    const r = createChordReader();
    r.read(k('g'), 0);
    expect(r.read(k('p'), CHORD_MS + 1)).toBeNull();
    r.read(k('g'), 10_000);
    expect(r.read(k('n'), 10_000 + CHORD_MS + 1)).toBe('compose');
  });
  it('N composes and F filters; modifiers never fire anything', () => {
    const r = createChordReader();
    expect(r.read(k('n'), 0)).toBe('compose');
    expect(r.read(k('f'), 0)).toBe('filter');
    expect(r.read(k('n', { metaKey: true }), 0)).toBeNull();
    expect(r.read(k('f', { ctrlKey: true }), 0)).toBeNull();
    expect(r.read(k('n', { altKey: true }), 0)).toBeNull();
  });
  it('typing in a field is never a shortcut; a read-only field or a checkbox is not typing', () => {
    const input = document.createElement('input');
    const ro = Object.assign(document.createElement('input'), { readOnly: true });
    const box = Object.assign(document.createElement('input'), { type: 'checkbox' });
    const area = document.createElement('textarea');
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    document.body.append(editable);
    expect([isTypingTarget(input), isTypingTarget(area), isTypingTarget(editable)]).toEqual([true, true, true]);
    expect([isTypingTarget(ro), isTypingTarget(box), isTypingTarget(document.body), isTypingTarget(null)]).toEqual([false, false, false, false]);
  });
});
