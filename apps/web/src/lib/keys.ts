// apps/web/src/lib/keys.ts
/**
 * The keys each page answers, as words (composition contract, rule 13): the one source of the keys
 * line in a page's footer. A handler's doc comment points at its entry here; an entry names only a
 * key that page's handler (or the shell's, for the global ones) really handles.
 */
export interface KeyHint { key: string; does: string }

/** What the shell answers on every page: ⌘K (PaletteMount) and the G chords (shell/shortcuts.ts). */
export const GLOBAL_KEYS: readonly KeyHint[] = [
  { key: '⌘K', does: 'search' },
  { key: 'G I / P / C', does: 'go to Inbox, Plan, Crew' },
];

/** The board page: N and F are the shell's (shortcuts.ts); the top row registers the filter. */
export const BOARD_KEYS: readonly KeyHint[] = [{ key: 'N', does: 'new card' }, { key: 'F', does: 'filter' }, ...GLOBAL_KEYS];

/** The List's own keys (ListView `onkeydown`), then the shell's N and F. R regroups: G belongs to the G chords. */
export const LIST_KEYS: readonly KeyHint[] = [
  { key: 'J / K', does: 'rows' },
  { key: '↵', does: 'open' },
  { key: 'M', does: 'move' },
  { key: 'S', does: 'sort' },
  { key: 'R', does: 'regroup' },
  { key: 'F', does: 'filter' },
];

/**
 * The Inbox (InboxPage `onkeydown`): J / K pick a Needs you row, O opens its card, M opens the Move
 * menu on a row that offers Move, R opens Resume's form on a row that offers Resume; F opens the
 * filter row (the page registers its opener with `shellModel.registerFilter`, the shell's F calls it);
 * then the shell's keys.
 */
export const INBOX_KEYS: readonly KeyHint[] = [
  { key: 'J / K', does: 'rows' },
  { key: 'O', does: 'open' },
  { key: 'M', does: 'move' },
  { key: 'R', does: 'resume' },
  { key: 'F', does: 'filter' },
  ...GLOBAL_KEYS,
];

/**
 * The card, on the drawer, the phone sheet and the page alike (CardView's footer): Esc closes it
 * (CardView `escape`; the page closes back to its board), ⌘K searches (PaletteMount, mounted beside the
 * page's bare frame too). The shell's G chords, N and F are not here: the card page has no shell. The
 * retired Studio card's E, C, ⇧C and G B have no handler any more.
 */
export const CARD_KEYS: readonly KeyHint[] = [{ key: 'Esc', does: 'close' }, ...GLOBAL_KEYS.slice(0, 1)];

/** Pages with no keys of their own: Crew, Settings, Spend, Board log, Projects. */
export const PAGE_KEYS: readonly KeyHint[] = GLOBAL_KEYS;

/** The line's text: "J / K rows · ↵ open". */
export const keysText = (keys: readonly KeyHint[]): string => keys.map((k) => `${k.key} ${k.does}`).join(' · ');
