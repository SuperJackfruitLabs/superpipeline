// apps/web/src/lib/components/shell/shortcuts.ts
/**
 * The shell's keys: G I / G P / G C go to Inbox, Plan and Crew (the old G O and G W still land on
 * Inbox and Crew); N composes; F filters.
 * ⌘K stays with the command palette, which already owns it. Never while a person is typing.
 */
export type ShellAction = 'inbox' | 'plan' | 'crew' | 'compose' | 'filter';
export const CHORD_MS = 1000;

export function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable || t.contentEditable === 'true') return true;
  if (t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return true;
  if (t instanceof HTMLInputElement) return !t.readOnly && !['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color', 'file'].includes(t.type);
  return false;
}

export interface KeyLike { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean }

export function createChordReader() {
  let gAt: number | null = null;
  return {
    read(e: KeyLike, now: number): ShellAction | null {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        gAt = null;
        return null;
      }
      const key = e.key.toLowerCase();
      if (gAt !== null && now - gAt <= CHORD_MS) {
        gAt = null;
        return key === 'p' ? 'plan' : key === 'i' || key === 'o' ? 'inbox' : key === 'c' || key === 'w' ? 'crew' : null;
      }
      gAt = null;
      if (key === 'g') {
        gAt = now;
        return null;
      }
      return key === 'n' ? 'compose' : key === 'f' ? 'filter' : null;
    },
  };
}
