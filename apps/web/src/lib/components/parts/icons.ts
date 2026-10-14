// apps/web/src/lib/components/parts/icons.ts
/**
 * The product's icon names. Names vibekit draws render vibekit's `Icon` (directly or through
 * `VK_ALIASES`); `PRODUCT_ICONS` holds only the glyphs the references draw that vibekit 0.0.1 has
 * no icon for. Each is a CORRECTIONS.md deviation row; delete an entry when vibekit ships it.
 */
import { ICON_NAMES, type IconName as VkIconName } from '@superjackfruit/vibekit';

/** Reference names that are vibekit icons under another name. */
export const VK_ALIASES = { chev: 'chevron-down', 'search-phone': 'search', close: 'x', settings: 'gear' } as const satisfies Record<string, VkIconName>;

/** Glyphs the references draw that vibekit 0.0.1 has no icon for, verbatim from the mockups. */
export const PRODUCT_ICONS = {
  // The SP-Dlg references' own glyphs (dialogs: palette rows, Reconnect's return box, Appearance), verbatim.
  card: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 10h8M8 14h5"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.8 0-3 .9-3 2.1 0 2.9 6 1.4 6 4.3 0 1.2-1.2 2.1-3 2.1-1.4 0-2.6-.6-3-1.6M12 6v2M12 16v2"/>',
  swatch: '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.3"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="15.5" cy="10" r="1.3"/><path d="M12 21a3 3 0 010-6h2"/>',
  power: '<path d="M12 3v8M6.3 6.3a8 8 0 1011.4 0"/>',
  plan: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
  'plan-sq': '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/>',
  'plan-phone': '<rect x="4" y="4" width="4" height="15" rx="1"/><rect x="10" y="4" width="4" height="11" rx="1"/><rect x="16" y="4" width="4" height="7" rx="1"/>',
  operate: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  'operate-filled': '<rect x="2" y="3" width="20" height="18" rx="5" fill="currentColor" stroke="none"/><path d="M5 12h3l2-4 4 8 2-4h3" stroke="var(--vk-color-raised)" stroke-width="2"/>',
  workspace: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  signout: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>',
  'signout-studio': '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  filter: '<path d="M4 5h16M7 12h10M10 19h4"/>',
  'filter-paper': '<path d="M4 6h16M7 12h10M10 18h4"/>',
  funnel: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
  move: '<path d="M7 7l-4 4 4 4M17 9l4 4-4 4M3 11h12M9 13h12"/>',
  'move-phone': '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  warn: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
  'warn-phone': '<path d="M12 3l9 17H3z"/><path d="M12 10v4M12 17h.01"/>',
  blocked: '<circle cx="12" cy="12" r="8"/><path d="M8 12h8"/>',
  'blocked-phone': '<circle cx="12" cy="12" r="9"/><path d="M7.5 12h9"/>',
  lock: '<rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  // Task 20: the Daylight card drawer and card states (SP-Card-Daylight, SP-Card-States-Daylight).
  'open-window': '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/>',
  pushpin: '<path d="M9 4h6l-1 6 3 3H7l3-3-1-6z"/><path d="M12 13v7"/>',
  send: '<path d="M4 12l16-8-6 16-2-7z"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  seal: '<circle cx="12" cy="10" r="6"/><path d="M9 15l-2 6 5-2 5 2-2-6"/>',
  restore: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
  comment: '<path d="M4 5h16v11H9l-5 4z"/>',
} as const;

/**
 * The nav v2 glyphs (operator, 2026-10-13): Inbox is a tray, Crew two overlapping faces. Approved
 * after the references were frozen, so they are not mockup corrections. Never drawn filled.
 */
export const NAV_ICONS = {
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  crew: '<circle cx="15.5" cy="8.5" r="5"/><circle cx="9" cy="14.5" r="6"/><circle cx="7" cy="13.2" r=".7" fill="currentColor" stroke="none"/><circle cx="11" cy="13.2" r=".7" fill="currentColor" stroke="none"/><path d="M6.6 16.6q2.4 1.9 4.8 0"/>',
} as const;

export type IconName = VkIconName | keyof typeof VK_ALIASES | keyof typeof PRODUCT_ICONS | keyof typeof NAV_ICONS;
export const isVkIcon = (n: string): n is VkIconName => (ICON_NAMES as readonly string[]).includes(n);
