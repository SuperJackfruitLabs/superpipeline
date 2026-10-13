// apps/web/src/lib/components/parts/line-icons.ts
/** The stroked 24×24 icons the Operate, List and page references draw, by name. */
export type LineIconName =
  | 'arrow' | 'arrow-ar' | 'play' | 'move' | 'clock' | 'dollar' | 'tick' | 'tick-ar'
  | 'sort-asc' | 'sort-desc' | 'sort-off' | 'sort-studio' | 'overdue' | 'blocked' | 'calendar' | 'lock'
  // The page glyphs (Projects, Workspace…). `date` is the pages' calendar (rounded; `square` for Studio).
  | 'plus' | 'chev-down' | 'chev-left' | 'chev-right' | 'trash' | 'check' | 'date' | 'person' | 'agent'
  | 'arrow-up' | 'arrow-down' | 'arrow-right' | 'home' | 'info' | 'github' | 'copy' | 'key' | 'dots'
  | 'pencil' | 'link' | 'refresh' | 'close';

/** Each icon as SVG children (paths, circles, rects). Trusted constants, never user text. */
export const LINE_ICONS: Record<LineIconName, string> = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  'arrow-ar': '<path d="M5 12h14M14 7l5 5-5 5"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  move: '<path d="M7 7h12M15 3l4 4-4 4M17 17H5M9 13l-4 4 4 4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  dollar: '<path d="M12 3v18M16 7.5c-.8-1.2-2.2-2-4-2-2.2 0-4 1.2-4 3s1.6 2.6 4 3 4 1.4 4 3.2-1.8 3-4 3c-1.9 0-3.4-.8-4.2-2.2"/>',
  tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  'tick-ar': '<path d="M5 12l5 5 9-10"/>',
  'sort-asc': '<path d="M12 19V5M6 11l6-6 6 6"/>',
  'sort-desc': '<path d="M12 5v14M6 13l6 6 6-6"/>',
  'sort-off': '<path d="M8 9l4-4 4 4M8 15l4 4 4-4"/>',
  'sort-studio': '<path d="M8 4v16M4 16l4 4 4-4M16 20V4M12 8l4-4 4 4"/>',
  overdue: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
  blocked: '<circle cx="12" cy="12" r="8.5"/><path d="M6 18L18 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  lock: '<rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  'chev-down': '<path d="M6 9l6 6 6-6"/>',
  'chev-left': '<path d="M15 6l-6 6 6 6"/>',
  'chev-right': '<path d="M9 6l6 6-6 6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  date: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5"/>',
  agent: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4"/><circle cx="9.5" cy="13.5" r="1"/><circle cx="14.5" cy="13.5" r="1"/>',
  'arrow-up': '<path d="M12 19V5M6 11l6-6 6 6"/>',
  'arrow-down': '<path d="M12 5v14M6 13l6 6 6-6"/>',
  'arrow-right': '<path d="M5 12h14M14 7l5 5-5 5"/>',
  home: '<path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.5"/>',
  github: '<path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6.2 0C6.6 2.8 5.6 3.1 5.6 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.2 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
  dots: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16"/><path d="M20 20v-4h-4"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
};
