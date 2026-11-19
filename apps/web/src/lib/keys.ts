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
 * The Inbox (InboxPage's footer): F opens its filter row (the page registers its opener with
 * `shellModel.registerFilter`, and the shell's F calls it), then the shell's keys. The one Inbox has
 * no row keys of its own: J / K, O, M and R went with OperateStudio's handler (29f20837).
 */
export const INBOX_KEYS: readonly KeyHint[] = [{ key: 'F', does: 'filter' }, ...GLOBAL_KEYS];

/** A card (CardPageStudio `onKey`, CardStudio `onKey`). Wired into the Card page once that page lands. */
export const CARD_KEYS: readonly KeyHint[] = [
  { key: 'E', does: 'edit' },
  { key: 'C', does: 'comment' },
  { key: '⇧C', does: 'copy link' },
  { key: 'G B', does: 'back to the board' },
];

/** Pages with no keys of their own: Crew, Settings, Spend, Board log, Projects. */
export const PAGE_KEYS: readonly KeyHint[] = GLOBAL_KEYS;

/** The line's text: "J / K rows · ↵ open". */
export const keysText = (keys: readonly KeyHint[]): string => keys.map((k) => `${k.key} ${k.does}`).join(' · ');
