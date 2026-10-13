// apps/web/src/lib/components/board/daylight/peek-controller.ts
/**
 * When Daylight's peek is open. Pointing at a card or focusing it opens the peek after a beat;
 * it goes when the pointer has left AND focus is not in the card; it closes when the card drawer
 * opens and does not come back by itself when the drawer closes and focus returns to the card.
 * Only a pointer arriving, or a focus the person moves there, opens it again.
 */
export interface PeekOptions {
  /** The peek is only drawn from 1440px. */
  wide: () => boolean;
  /** The id open now (or null), pushed to the view. */
  onChange: (id: string | null) => void;
  /** Put focus on the card's title; true when focus moved (that focus must not reopen the peek). */
  focusTitle: (id: string) => boolean;
  /** A card drawer is open: nothing peeks over it. */
  drawerOpen?: () => boolean;
  delay?: number;
}

/** What a tile and a lane need of the peek: where the eye is, and a way to close it. */
export type PeekController = Pick<ReturnType<typeof createPeek>, 'pointerEnter' | 'pointerLeave' | 'focusIn' | 'focusOut' | 'close'>;

export function createPeek(o: PeekOptions) {
  const delay = o.delay ?? 300;
  let open: string | null = null;
  let hover: string | null = null;
  let focus: string | null = null;
  let quiet: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const set = (id: string | null): void => { if (open !== id) { open = id; o.onChange(id); } };
  const dismiss = (id: string): void => { clearTimeout(timer); if (open === id) set(null); };
  /** `fromFocus`: the one focus event a drawer or Esc causes on its way out is not a person's choice. */
  const schedule = (id: string, fromFocus: boolean): void => {
    clearTimeout(timer);
    if (fromFocus && id === quiet) { quiet = null; return; }
    if (!o.wide() || o.drawerOpen?.()) return;
    timer = setTimeout(() => set(id), delay);
  };

  return {
    get id(): string | null { return open; },
    pointerEnter(id: string): void { hover = id; quiet = null; schedule(id, false); },
    pointerLeave(id: string): void { if (hover === id) hover = null; if (focus !== id) dismiss(id); },
    focusIn(id: string): void { focus = id; schedule(id, true); },
    /** A real key press: whatever focus move follows is the person's. */
    keyPressed(): void { quiet = null; },
    focusOut(id: string): void { if (focus === id) focus = null; if (hover !== id) dismiss(id); },
    /** Esc or Close peek: shut it and put focus back on the title without reopening it. */
    close(): void {
      clearTimeout(timer);
      const id = open;
      set(null);
      if (!id) return;
      quiet = id;
      if (!o.focusTitle(id)) quiet = null;
    },
    /** The card drawer opened: nothing should peek over it. */
    drawerOpened(): void { clearTimeout(timer); set(null); },
    /** The card drawer closed and focus is about to return to `id`'s title. */
    drawerClosed(id: string | null): void {
      clearTimeout(timer);
      if (id) quiet = id;
    },
    destroy(): void { clearTimeout(timer); },
  };
}
