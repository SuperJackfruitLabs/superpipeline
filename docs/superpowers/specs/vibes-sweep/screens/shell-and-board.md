# Screen spec — `shell-and-board`

Artboards: **SP-Board-Daylight, SP-Board-Paper, SP-Board-Studio, SP-Board-Quiet, SP-Board-Empty, SP-Phone-Board-Daylight, SP-Phone-Board-Paper, SP-Phone-Board-Studio, SP-Phone-Board-Quiet**, plus the **app shell per vibe** (section 1), which every other screen spec reuses.

Binding inputs: `screen-spec-brief.md` (architecture decisions 1–5), mockup sources `vibes-mockups/project/<Artboard>.dc.html` (abbreviated below as `dc:<Artboard>:<lines>`), rendered references `apps/web/e2e/reference/mockups/<Artboard>.html`, tokens `vibes-mockups/project/vk.css`. Code references are `origin/main` (1a4dc22) of `superpipeline`.

Every CSS block in this document is copied **verbatim** from the named `.dc.html` lines by script (nothing retyped). Renames are listed under each block; where none are listed, port the selectors unchanged.

## 0. Conventions that apply to the whole document

### 0.1 vibekit components
Per the coordinator's update, every reusable pattern is marked `vibekit:<Name>` with the props it needs. The app composes them; the vibekit component owns the markup and the per-vibe CSS quoted here (the quoted CSS is the reference those components must reproduce; until a component lands, port the quoted CSS into the app component and swap later — the DOM and class names below are the contract either way). Names are descriptive and will be reconciled with the vibekit inventory. Used in this spec:

| vibekit component | Props (TypeScript) | Used for |
|---|---|---|
| `vibekit:Icon` | `{ name: IconName; size: number; strokeWidth?: 1.75 \| 1.8 \| 2 \| 2.2; filled?: boolean }` | every stroke icon (registry in §0.4) |
| `vibekit:Face` | `{ name: string; mood: Mood; size: number; label?: string; tone?: 'full' \| 'muted' \| 'grey' }` | agent faces (`tone` = Quiet desktop greyscale / Quiet phone saturate .4) |
| `vibekit:Initials` | `{ text: string; size: number; shape: 'circle' \| 'square'; tone: 'raised-line' \| 'resting' \| 'ink' \| 'outline-inverse'; label?: string }` | RG / P person marks |
| `vibekit:NavItem` | `{ href: string; label: string; icon?: IconName; current: boolean; count?: number; countLabel?: string; shortcut?: string; variant: 'pill' \| 'section' \| 'rail-icon' \| 'text' \| 'phone-pill' \| 'phone-ruled' \| 'phone-ink' \| 'phone-text' }` | Plan / Operate / Workspace / You |
| `vibekit:CountBadge` | `{ count: number; variant: 'bubble' \| 'square' \| 'paren' \| 'text' }` | the "3 need you" count (renders nothing when `count === 0`) |
| `vibekit:LiveStatus` | `{ connected: boolean; variant: 'pill' \| 'rule' \| 'ink' \| 'sentence' \| 'phone-pill' \| 'phone-caps' \| 'sr-only' }` | Live |
| `vibekit:SearchTrigger` | `{ variant: 'pill' \| 'frame' \| 'command' \| 'plain' \| 'icon'; onOpen: () => void }` | Search ⌘K |
| `vibekit:Button` | `{ variant: 'primary' \| 'secondary' \| 'signal' \| 'quiet'; size?: 'md' \| 'lg' }` (= `.vk-button`) | buttons drawn with `vk-button` classes |
| `vibekit:ViewSwitch` | `{ value: 'board' \| 'list' \| 'projects'; counts?: { list?: number; projects?: number }; variant: 'segmented' \| 'smallcaps' \| 'tabs' \| 'links'; onChange(v) }` | Board / List / Projects |
| `vibekit:Menu` | `{ triggerLabel: string; items: MenuItem[]; placement: 'right-end' \| 'bottom-end' \| 'top' }` | account menu, You menu |
| `vibekit:Sky` | `{ phase: Phase; theme: Theme; sun?: { size: number; top: number; right: number } }` (= `.vk-sky`) | Daylight sky |
| `vibekit:SkipLink` | `{ href: string }` | Quiet "Skip to content" |
| `vibekit:StatusLine` | `{ items: Array<{ text: string; signal?: boolean }>; right?: string[] }` | Studio status bar |
| `vibekit:StageRamp` | `{ count: number; current: number; label: string }` | Studio 7-segment ramp |
| `vibekit:StageMultiples` | `{ stages: StageMultiple[]; size: 'desktop' \| 'phone' }` | Studio small multiples |
| `vibekit:FigureRow` | `{ figures: Array<{ value: string; label: string; zero: boolean; signal: boolean; unit?: string; fn?: number }>; columns?: number }` | Studio figures |
| `vibekit:ShareBar` | `{ segments: Array<{ kind: 'needs' \| 'blocked' \| 'queued' \| 'working' \| 'done'; count: number; label: string }> }` | Studio "What state they are in" |
| `vibekit:StateMarker` | `{ state: 'needs' \| 'blocked' \| 'queued' \| 'working' \| 'done' \| 'off'; size: 18 \| 12 \| 11 }` | `.u` squares |
| `vibekit:StageChip` | `{ index: 1..7 }` | `.chip c{n}` swatch |
| `vibekit:Footnote` / `vibekit:FootnoteList` | `{ n: number }` / `{ notes: Array<{ n: number; html: string }> }` | Studio superscripts + notes |
| `vibekit:DataTable` | `{ caption: string; columns: Column[]; rows: Row[]; selectedIndex?: number }` | Studio "Every card" table, Quiet stages tables |
| `vibekit:QuickFilter` | `{ items: Array<{ key; label; count; signal? }>; value; onChange; leadLabel?: string }` | Studio Show All/Need you/… |
| `vibekit:Disclosure` | `{ summary: string; open?: boolean }` | Quiet "Show the full reason", Studio phone stages |
| `vibekit:Popover` | `{ anchor: HTMLElement; side: 'right'; onClose }` | Daylight peek |
| `vibekit:Chip` | `{ variant: 'label' \| 'blocked' \| 'ref' \| 'asked' \| 'done' \| 'more' }` | Daylight chips |
| `vibekit:EmptyState` | — (SP-Board-Empty composes it, see §6) | empty board |

### 0.2 Test clock, zone and fixture identity (every artboard)
- Freeze the clock at **2026-10-11T08:21:00Z** (`page.clock.setFixedTime`) and run with `timezoneId: 'Asia/Kolkata'` → the app reads **Sunday 11 October, 13:51**, phase `noon` (vibekit `phaseAt`, no place: 831 min, `noon`). All ages below are computed from this instant with the real `stateSince` values (§7).
- Locale `en-GB`. Signed-in user `usr_b19776fac3c94df4`, name "Rakesh Gangwar", tenant `tnt_e080b7a2cc39469e`.
- Board ids: Developer Experience `brd_134a0ddb6d434478`; Agent Onboarding `brd_f47143722126442c`; Production Releases `brd_2441b5578f704b93`.
- Pixel test: viewport 1440 × artboard h for desktop, 390 × h for phone; `setAppearance(vibe, theme)`; reduced motion; fonts awaited (`document.fonts.ready`). SP-Board-Daylight additionally focuses the title button of card `card_9ac2116a050840df` and waits 400 ms (peek debounce) before the shot, so the peek is open as drawn.

### 0.3 Derivation helpers (new file `apps/web/src/lib/components/board/board-words.ts`)
All human strings below are produced by these pure functions (unit-tested with the fixture values shown):

```ts
export const NUM_WORDS = ['no','one','two','three','four','five','six','seven','eight','nine','ten'];
/** 'one'..'ten', else digits. cap=true capitalises the first letter. */
export function numWord(n: number, cap = false): string;
/** Short age: open cards → h<48 ? `${floor(h)}h` : `${floor(h/24)}d`; done/closed cards → `${max(1,floor(h/24))}d`. null → '—'. */
export function ageShort(hours: number | null, done: boolean): string;
/** Long age: h<48 → `${floor(h)} hours`, else `${floor(h/24)} days` (1 → '1 hour'/'1 day'). */
export function ageLong(hours: number | null): string;
/** Past: h<24 → `${floor(h)} hours ago`; floor(h/24)===1 → 'yesterday'; else `${d} days ago`. */
export function agoWords(hours: number | null): string;
/** '2026-10-06' → '6 Oct' (short) | '6 October' (long). */
export function dueShort(d: string): string; export function dueLong(d: string): string;
/** n===1 ? `${n} ${one}` : `${n} ${many}` */
export function plural(n: number, one: string, many: string): string;
/** The Paper dateline: `${weekday} ${d} ${Month} · ${PAPER_PHASE[phase]}` */
export const PAPER_PHASE: Record<Phase, string> = { dawn: 'at first light', morning: 'in the morning light', noon: 'in full daylight', golden: 'in the golden hour', dusk: 'at dusk', night: 'after dark' };
export function dateline(now: Date, phase: Phase): string; // → 'Sunday 11 October · in full daylight'
```

Fixture outputs at the frozen clock: card_ace250c9 age 70.5h → `2d` / `2 days` ; card_9ac2116a 33.9h → `33h` / `33 hours` ; card_e10fb4fe 33.6h → `33h` ; card_691a65ff 62.5h → `2d` ; card_482b4aa0 33.3h → `33h` ; card_8f2c1a5e (done) 34.0h → `1d` / `yesterday`.

### 0.4 Icon registry (`vibekit:Icon` names → path data, viewBox `0 0 24 24`, `fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"`, `aria-hidden="true" focusable="false"`)

| name | inner SVG (verbatim from mockups) |
|---|---|
| `mark` | `<path d="M6 6h9a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h9"/><circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/>` |
| `plan` (Daylight, Studio-phone-off) | `<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>` (filled variant: each rect gets `fill="currentColor"`) |
| `plan-sq` (Studio) | same with `rx="1"` |
| `plan-phone` (Daylight phone) | `<rect x="4" y="4" width="4" height="15" rx="1"/><rect x="10" y="4" width="4" height="11" rx="1"/><rect x="16" y="4" width="4" height="7" rx="1"/>` |
| `operate` | `<path d="M3 12h4l3-7 4 14 3-7h4"/>` |
| `operate-filled` (Daylight active) | `<rect x="2" y="3" width="20" height="18" rx="5" fill="currentColor" stroke="none"/><path d="M5 12h3l2-4 4 8 2-4h3" stroke="var(--vk-color-raised)" stroke-width="2"/>` |
| `workspace` | `<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>` |
| `people` (Studio workspace) | `<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.6 3.5 5.2"/>` |
| `moon` | `<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>` |
| `sun` | `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>` |
| `signout` (Daylight) | `<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>` |
| `signout-studio` | `<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>` |
| `chev` | `<path d="M6 9l6 6 6-6"/>` |
| `search` | `<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>` |
| `search-phone` | `<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>` |
| `plus` | `<path d="M12 5v14M5 12h14"/>` |
| `filter` (Daylight) | `<path d="M4 5h16M7 12h10M10 19h4"/>` |
| `filter-paper` | `<path d="M4 6h16M7 12h10M10 18h4"/>` |
| `funnel` (Studio) | `<path d="M4 5h16l-6 8v6l-4-2v-4z"/>` |
| `move` | `<path d="M7 7l-4 4 4 4M17 9l4 4-4 4M3 11h12M9 13h12"/>` |
| `move-phone` | `<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>` |
| `warn` | `<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>` |
| `warn-phone` | `<path d="M12 3l9 17H3z"/><path d="M12 10v4M12 17h.01"/>` |
| `blocked` | `<circle cx="12" cy="12" r="8"/><path d="M8 12h8"/>` |
| `blocked-phone` | `<circle cx="12" cy="12" r="9"/><path d="M7.5 12h9"/>` |
| `lock` | `<rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>` |
| `link` | `<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>` |
| `doc` | `<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>` |
| `close` | `<path d="M6 6l12 12M18 6L6 18"/>` |
| `check` | `<path d="M5 12l5 5 9-10"/>` |
| `arrow` | `<path d="M5 12h14M13 6l6 6-6 6"/>` |
| `pen` | `<path d="M4 20h4L19 9l-4-4L4 16v4z"/>` |

Stroke widths: Daylight / Paper desktop 1.8; Studio 1.75 (Studio `mark` 2); phone Daylight/Paper/Quiet 2 (`.ico`). Each usage below names `name size`.

---

## 1. The app shell, per vibe (standalone; reused by every screen)

### 1.1 Architecture
Files (all new unless marked):

| Path (under `apps/web/src`) | Role |
|---|---|
| `lib/layouts.ts` (modify) | add `SHELL_LAYOUTS: Readonly<Record<Vibe, { desktop: Component<ShellProps>; phone: Component<ShellProps> }>>` = `{ daylight: {ShellDaylight, PhoneShellDaylight}, paper: {ShellPaper, PhoneShellPaper}, studio: {ShellStudio, PhoneShellStudio}, quiet: {ShellQuiet, PhoneShellQuiet} }`. Change `BOARD_LAYOUTS` to `Record<Vibe, { desktop: Component<BoardLayoutProps>; phone: Component<BoardLayoutProps> }>`. |
| `lib/components/shell/types.ts` | `ShellProps`, `ShellSection`, `MenuItem` (below) |
| `lib/components/shell/AppShell.svelte` | picks `SHELL_LAYOUTS[appearance.value.vibe][viewport.phone ? 'phone' : 'desktop']`, passes props through; mounts `ComposeSheet` (moved from BoardHeader), `BoardSwitcher` dialog, `FilterDialog` |
| `lib/components/shell/shell-model.svelte.ts` | `shellModel` — every global value a shell shows (below) |
| `lib/viewport.svelte.ts` | `viewport.phone: boolean` from `matchMedia('(max-width: 899.98px)')` (one breakpoint, as today) |
| `lib/components/shell/ShellDaylight.svelte`, `ShellPaper.svelte`, `ShellStudio.svelte`, `ShellQuiet.svelte` | desktop shells ≥900px |
| `lib/components/shell/phone/PhoneShellDaylight.svelte`, `PhoneShellPaper.svelte`, `PhoneShellStudio.svelte`, `PhoneShellQuiet.svelte` | phone shells <900px (top + bottom bar) |
| `lib/components/shell/YouMenu.svelte` | the phone "You" menu (account, appearance, theme, sign out) |
| `lib/styles/annual.css` (imported from `app.css`) | the Studio/Annual-report base layer shared by every Studio screen (§1.5.1); every selector is under `.ar` |
| **delete** | `shell/Rail.svelte`, `shell/BottomNav.svelte` (+ `BottomNav.svelte.test.ts`, move its assertions to the four phone shells), `shell/BoardHeader.svelte`; the view toggle + `FilterBar` row in `plan/PlanView.svelte` |
| `routes/+layout.svelte` (modify) | drop `Rail`/`BottomNav`; the `.app-shell` div becomes `<div class="app-root">{@render children()}</div>` (no flex frame); `CommandPalette`, `AppearanceDialog` stay |
| `routes/b/[boardId]/+layout.svelte` (modify) | drop `BoardHeader` and the `<main class="min-h-0 flex-1 overflow-auto">` wrapper; keep board opening, URL sync and `CardDrawer` |
| every page (`b/[boardId]/+page`, `operate/+page`, `operate/telemetry`, `settings`, `workspace/[tab]`, card page) | wraps its content in `<AppShell …props>` |

```ts
// lib/components/shell/types.ts
import type { Snippet } from 'svelte';
export type ShellHere = 'plan' | 'operate' | 'workspace';
/** The Studio eyebrow word: "Superpipeline · board" */
export type ShellSection = 'board' | 'list' | 'projects' | 'operate' | 'card' | 'workspace' | 'settings' | 'spend';
export interface ShellProps {
  here: ShellHere;
  section: ShellSection;
  /** Board-scoped pages pass the board name; workspace pages pass null (no switcher). */
  boardName: string | null;
  /** Plan pages pass the active view; every other page passes null → no view switch, no filter button. */
  view: 'board' | 'list' | 'projects' | null;
  /** Sub-bar note, verbatim: board → "Showing all 6 cards" (§1.2). null hides it. */
  showing: string | null;
  /** Paper desktop masthead tab-row note (it differs from `showing`): "Showing all 6 cards · 3 wait on you · 1 shipped". */
  paperShowing?: string | null;
  /** Paper phone dateline suffix: "6 cards" → "Sunday 11 October · in full daylight · 6 cards". */
  editionCount?: string | null;
  /** Studio sub-bar right text: "The board at 13:51 · midday · Sunday 11 October". */
  studioSubRight?: string | null;
  /** Studio status line; null hides the footer. */
  status?: { items: Array<{ text: string; signal?: boolean }>; right: string[] } | null;
  /** Daylight only: content drawn inside the sky under the sub-bar (the board's greeting band). */
  sky?: Snippet;
  children: Snippet;
}
export interface MenuItem { kind: 'heading' | 'item' | 'checkbox'; label: string; sub?: string; icon?: IconName; checked?: boolean; onSelect?: () => void }
```

`shellModel` (reactive getters over `app`, `appearance`, `page`):

```ts
export const shellModel = {
  get attentionCount(): number,        // NEW app.attention.length — workspace-wide needs-you (GET /v1/stale?attention=1 → listAttention().cards.length); fixture: 3
  get connected(): boolean,            // app.connected
  get userName(): string,              // app.user.name ?? app.user.login → "Rakesh Gangwar"
  get initials(): string,              // first letter of first two words, uppercased → "RG"
  get firstName(): string,             // "Rakesh"
  get crew(): CrewMember[],            // Daylight rail, §1.3.3
  get dateline(): string,              // board-words dateline(now, appearance.phase) → "Sunday 11 October · in full daylight"
  get listCount(): number,             // non-archived filtered cards on the board → 6 (Studio "List 6")
  get projectCount(): number,          // distinct non-null projectId among the board's non-archived cards → 3 (Studio "Projects 3")
  get filterSummary(): string,         // 'none on' when no filter set, else `${n} on` (n = number of non-default filter fields)
  get theme(): 'light' | 'dark',       // appearance.theme
  get themeToggleLabel(): string,      // otherThemeLabel(theme) → "Dark theme" in light
  boardHref(boardId) / operateHref / workspaceHref: '/b/{id}', '/b/{id}/operate', '/workspace/agents',
  // actions
  openSearch: () => app.toggleCmdk(),
  compose: () => app.requestCompose(),
  setView: (v) => app.setView(v),
  openFilter: () => (app.filterOpen = true),           // NEW state, FilterDialog
  openBoardSwitcher: () => (app.boardSwitcherOpen = true), // NEW state, BoardSwitcher becomes a controlled dialog
  openAppearance: () => (appearance.pickerOpen = true),
  toggleTheme: () => appearance.toggleTheme(),
  signOut,                              // shell/account.ts
};
```

New store members in `stores/app.svelte.ts`: `attention = $state<StaleCard[]>([])`, `async loadAttention()` (calls `listAttention()`, sets `attention`), called in `init()` after boards load, after every `refresh()`, and on every board feed event (coalesce 1 s); `filterOpen = $state(false)`; `boardSwitcherOpen = $state(false)`.

Count rule (all vibes, all screens): the Operate count is `shellModel.attentionCount`; it renders only when > 0, in the signal colour. Fixture: 3 (two stopped cards and the unowned card on Developer Experience).

**Ruling on the two shell families in the mockups** (see Gaps G1): the per-vibe screen mockups (Board/List/Operate/Card) draw the shell with `dy-*` / `mh-*` / `ar-*` / `qn-*`; the shared-screen mockups (SP-Board-Empty, Projects, Workspace, Settings, Spend, dialogs) draw a second, slightly different shell (`vs-*`). One product cannot change its frame between pages, so **the `dy/mh/ar/qn` shell below is the only shell**. SP-Board-Empty's shell region is therefore expected to differ from its reference; regenerate the shared-screen references with this shell before baselining, or mask the shell region in their pixel diff (G1 lists every delta).

### 1.2 What each shell shows (parity table, same in every vibe)

| Item | Daylight | Paper | Studio | Quiet | Source |
|---|---|---|---|---|---|
| Home mark | `.dy-logo` mark icon on product bg | nameplate "Superpipeline" | `.ar-mark` | "Superpipeline" bold link | fixed; href `/b/{boardId}` or `/` |
| Plan / Operate / Workspace | `.dy-dest` pills | `.mh-sec` section links | `.ar-nav` icon buttons + tip | underlined links | `here` |
| Operate count | `.dy-count` bubble "3" + sr ", 3 need you" | `(3)` signal-text + sr " need you" | `.ct` square "3", aria-label "Operate, 3 need you", tip "Operate · 3 need you" | "Operate (3 need you)" | `attentionCount` |
| Agents at work | `.dy-crew` faces + "3 agents / 2 wait on you" | — | — | — | `crew` |
| Appearance | `.dy-round` sun/moon | text "Appearance" | icon `sun` 20 + tip | link "Appearance" | `openAppearance` |
| Theme toggle | account menu checkbox "Dark theme" | text button "Dark theme" | icon `moon` 18 + tip "Dark theme" | link "Dark theme" | `toggleTheme`, label `themeToggleLabel` |
| Account | 40px RG circle → menu (name, "Signed in", Dark theme, Sign out) | "Rakesh Gangwar ⌄" → menu ("Signed in as Rakesh Gangwar", Sign out) | square "RG" button (menu: name + Sign out) | link "Rakesh Gangwar" | `userName`, `initials` |
| Sign out | in account menu | in account menu | separate `signout-studio` icon button | "— Sign out" link | `signOut` |
| Board switcher | `.dy-switch` 28px display title + chev | `.mh-title` h1 + "Change board" link | `.ar-sw` 28px Archivo 80% + chev | "Board: **X** — Change board" | `boardName`, `openBoardSwitcher` |
| Live | `.dy-live` green pill "Live" | `.mh-live` "**Live** · changes appear as they happen" | `.ar-live` square + "LIVE" | "**Live.** Changes appear as they happen." | `connected`; when false the text becomes "Reconnecting…" in the same element and the dot/square uses `--vk-color-faint` (state not drawn; G13) |
| Search ⌘K | `.dy-search` pill "Search ⌘K" | `.mh-btn` "Search ⌘K" | `.ar-cmd` command field | `.qn-btn` "Search ⌘K" | `openSearch` |
| New card | `vk-button--primary .dy-new` "New card" | `.mh-btn--write` "Write a new card" | `.ar-btn` "New card N" | `.qn-btn` "New card" | `compose` |
| View switch | `vk-segmented` | `.mh-tab` small caps | `.ar-tab` "Board · List 6 · Projects 3" | "View: Board · List · Projects" | `view`, `setView` |
| Filter | `.dy-filter` "Filter cards" + "none on" | `.mh-btn` "Filter cards · none on" | `.ar-fl` "Filter cards none on" | "Filter cards (none on)" | `openFilter`, `filterSummary` |
| Showing note | `.dy-note` | `.mh-showing` (`paperShowing`) | `.ar-hint` | `.qn-note` | `showing` |
| Status line | — | — | `.ar-status` | — | `status` |

`showing` derivation (board page): `filters default ? \`Showing all ${n} cards\` : \`Showing ${n} of ${total} cards\`` with n = filtered non-archived cards (fixture "Showing all 6 cards"; Agent Onboarding "Showing all 20 cards"; empty board → "No cards on this board"). `paperShowing` = `${showing} · ${needs} wait on you · ${done} shipped` where `done` counts completed cards in the last stage ("Showing all 6 cards · 3 wait on you · 1 shipped"); parts with 0 are dropped.

### 1.3 Daylight — `ShellDaylight.svelte` (desktop ≥900px)

#### 1.3.1 Markup (Svelte; class names are the contract)
```svelte
<div class="dy-app" style="min-height: 100vh">
  <nav class="dy-rail" aria-label="Superpipeline">
    <a class="dy-logo" href={homeHref} aria-label="Superpipeline home"><Icon name="mark" size={26} /></a>   <!-- vibekit:Icon -->
    <ul class="dy-dests">
      <li><NavItem variant="pill" href={planHref} label="Plan" icon={here==='plan' ? 'plan' (filled) : 'plan'} current={here==='plan'} /></li>
      <li><NavItem variant="pill" href={operateHref} label="Operate" icon={here==='operate' ? 'operate-filled' : 'operate'} current={here==='operate'} count={attentionCount} countLabel=", {n} need you" /></li>
      <li><NavItem variant="pill" href="/workspace/agents" label="Workspace" icon="workspace" filled={here==='workspace'} current={here==='workspace'} /></li>
    </ul>
    {#if crew.length}<div class="dy-crew" title={crewTitle}><span class="dy-faces" aria-hidden="true">{#each crew.slice(0,3) as c}<Face name={c.name} mood={c.mood} size={20} />{/each}</span><span><b>{plural(crew.length,'agent','agents')}</b>{crewLine}</span></div>{/if}
    <div class="dy-foot">
      <button class="dy-round" type="button" aria-label="Appearance" aria-haspopup="dialog" title="Appearance · the sky follows the time of day" onclick={openAppearance}><Icon name={theme==='dark' ? 'moon' : 'sun'} size={20} /></button>
      <details class="dy-acct"><summary aria-label="{userName}, account menu" title={userName}><span class="dy-ini" aria-hidden="true">{initials}</span></summary>
        <div class="dy-menu" role="menu" aria-label="Account"><p><b>{userName}</b>Signed in</p>
          <button type="button" role="menuitemcheckbox" aria-checked={theme==='dark'} onclick={toggleTheme}><Icon name="moon" size={18}/>Dark theme</button>
          <button type="button" role="menuitem" onclick={signOut}><Icon name="signout" size={18}/>Sign out</button></div></details>
    </div>
  </nav>
  <div class="dy-main">
    <div class="vk-sky dy-sky" data-phase={phase}>            <!-- vibekit:Sky -->
      <span class="vk-sky__sun dy-sun" aria-hidden="true"></span>
      <header class="dy-top">
        {#if boardName}<button class="dy-switch" type="button" aria-haspopup="menu" onclick={openBoardSwitcher}>{boardName}<Icon name="chev" size={22}/></button>{/if}
        <span class="dy-live" role="status" title="Live: changes arrive as they happen"><span class="dy-livedot" aria-hidden="true"></span>Live<span class="vk-visually-hidden"> · changes appear as they happen</span></span>   <!-- vibekit:LiveStatus variant=pill -->
        <span class="dy-grow"></span>
        <button class="dy-search" type="button" aria-label="Search cards, agents and actions" onclick={openSearch}><Icon name="search" size={18}/><span>Search</span><span class="dy-kbd">⌘K</span></button>
        <button class="vk-button vk-button--primary dy-new" type="button" onclick={compose}><Icon name="plus" size={18}/>New card</button>
      </header>
      {#if view}<div class="dy-sub">
        <div class="vk-segmented" role="group" aria-label="View">{#each ['board','list','projects'] as v}<button class="vk-segmented__item" type="button" aria-pressed={view===v} data-state={view===v ? 'checked' : undefined} onclick={() => setView(v)}>{Label}</button>{/each}</div>   <!-- vibekit:ViewSwitch variant=segmented -->
        {#if view !== 'projects'}<button class="dy-filter" type="button" aria-haspopup="dialog" onclick={openFilter}><Icon name="filter" size={18}/>Filter cards <span class="cnt">{filterSummary}</span></button>{/if}
        {#if showing}<span class="dy-note">{showing}</span>{/if}
      </div>{/if}
      {@render sky?.()}
    </div>
    {@render children()}
  </div>
</div>
```
Plan's filled icon = the `plan` rects with `fill="currentColor"` (dc:SP-Board-Daylight:133). Workspace "filled" (no mockup) = `filled` sets `fill="currentColor"` on the svg (as the phone rule `.nav a[aria-current="page"] .ico{fill:currentColor}`), G14.

#### 1.3.2 CSS (verbatim, `dc:SP-Board-Daylight:19-20, 80-126`)
Port into `ShellDaylight.svelte` `<style>`. Because page content is rendered by child components, the box-sizing rule `.dy-app *` is written `.dy-app :global(*), .dy-app :global(*::before), .dy-app :global(*::after)`; `.dy-sky > .vk-sky__sun.dy-sun` and `.dy-sub .vk-segmented…` target vibekit classes → wrap the vibekit class part in `:global(...)`. The `[data-theme="dark"] .dy-sky` rule becomes `:global([data-theme="dark"]) .dy-sky`. `.sh-iconbtn` is shared by board content (peek close) → put it in `app.css` under `[data-vibe="daylight"]`.

`dc:SP-Board-Daylight:19-20`
```css
.sh-iconbtn { display: inline-grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: var(--vk-radius-sm); background: transparent; color: var(--vk-color-muted); cursor: pointer; }
.sh-iconbtn:hover { background: var(--vk-color-raised); color: var(--vk-color-text); }
```
`dc:SP-Board-Daylight:80-126`
```css
/* Daylight shell: a warm room. Floating rail, top bar on the sky. */
.dy-app { display: flex; flex-wrap: wrap; align-items: stretch; gap: 12px; padding: 12px; background: var(--vk-color-bg); color: var(--vk-color-text); font-family: var(--vk-font-body); font-size: 16px; line-height: 1.45; }
.dy-app *, .dy-app *::before, .dy-app *::after { box-sizing: border-box; }
.dy-rail { flex: 0 0 88px; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 0 14px; border-radius: var(--vk-radius-lg); background: var(--vk-color-surface); box-shadow: 0 12px 32px -12px var(--vk-color-ground), 0 var(--vk-lift) 0 var(--vk-color-ground); }
.dy-logo { display: grid; place-items: center; width: 48px; height: 48px; margin-bottom: 8px; border-radius: var(--vk-radius-md); background: var(--vk-product-superpipeline-bg); color: var(--vk-product-superpipeline-fg); }
.dy-dests { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.dy-dest { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; width: 64px; height: 64px; border-radius: var(--vk-radius-md); text-decoration: none; color: var(--vk-color-muted); font: 600 13px/1 var(--vk-font-body); letter-spacing: -0.01em; white-space: nowrap; }
.dy-dest:hover { background: var(--vk-color-raised); color: var(--vk-color-text); }
.dy-dest[aria-current="page"] { background: var(--vk-color-raised); color: var(--vk-color-text); font-weight: 700; box-shadow: inset 0 0 0 2px var(--vk-color-primary); }
.dy-count { position: absolute; top: 3px; right: 3px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: var(--vk-radius-pill); background: var(--vk-color-signal); color: var(--vk-color-primary-fg); font: 800 12px/20px var(--vk-font-body); text-align: center; box-shadow: 0 0 0 2px var(--vk-color-surface); }
.dy-crew { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 64px; margin-top: 10px; padding-top: 14px; border-top: 1px dashed var(--vk-color-line); text-align: center; font-size: 12px; line-height: 1.25; color: var(--vk-color-muted); }
.dy-crew b { display: block; color: var(--vk-color-text); font-weight: 700; }
.dy-faces { display: flex; }
.dy-faces .vk-face + .vk-face { margin-left: -6px; }
.dy-faces .vk-face svg { box-shadow: 0 0 0 2px var(--vk-color-surface); }
.dy-foot { margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 10px; padding-top: 12px; }
.dy-round { display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 50%; background: var(--vk-color-raised); color: var(--vk-color-text); cursor: pointer; }
.dy-round:hover { box-shadow: inset 0 0 0 2px var(--vk-color-line); }
.dy-acct { position: relative; }
.dy-acct > summary { list-style: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; }
.dy-acct > summary::-webkit-details-marker { display: none; }
.dy-ini { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: var(--vk-mood-resting); color: var(--vk-face-ink); font: 800 14px/1 var(--vk-font-body); }
.dy-menu { position: absolute; left: calc(100% + 14px); bottom: 0; z-index: 30; width: 240px; display: flex; flex-direction: column; gap: 2px; padding: 8px; border-radius: var(--vk-radius-md); background: var(--vk-color-surface); box-shadow: 0 0 0 1px var(--vk-color-line), 0 18px 40px -12px var(--vk-color-ground); }
.dy-menu p { margin: 0; padding: 8px 12px; font-size: 13px; color: var(--vk-color-muted); }
.dy-menu p b { display: block; font-size: 15px; color: var(--vk-color-text); }
.dy-menu button { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 44px; padding: 0 12px; border: 0; border-radius: var(--vk-radius-sm); background: transparent; color: var(--vk-color-text); font: 600 15px/1 var(--vk-font-body); text-align: left; cursor: pointer; }
.dy-menu button:hover { background: var(--vk-color-raised); }
.dy-main { flex: 999 1 560px; min-width: 0; display: flex; flex-direction: column; }
.dy-sky { border-radius: var(--vk-radius-lg); }
[data-theme="dark"] .dy-sky { --vk-sky-top: var(--vk-sky-night-top); --vk-sky-bottom: var(--vk-sky-night-bottom); --vk-sky-text: var(--vk-sky-night-text); --vk-sky-sun: var(--vk-sky-night-sun); }
.dy-sky > .vk-sky__sun.dy-sun { width: 36px; height: 36px; top: 18px; right: 540px; box-shadow: 0 0 30px 8px color-mix(in oklch, var(--vk-sky-sun) 45%, transparent); }
.dy-top { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 14px; min-height: 72px; padding: 12px 16px 6px 16px; }
.dy-switch { display: inline-flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 12px 0 6px; border: 0; border-radius: var(--vk-radius-md); background: transparent; color: var(--vk-sky-text); font: 700 28px/1.1 var(--vk-font-display); letter-spacing: -0.015em; text-align: left; cursor: pointer; }
.dy-switch:hover { background: color-mix(in oklch, var(--vk-color-surface) 45%, transparent); }
.dy-live { display: inline-flex; align-items: center; gap: 7px; min-height: 30px; padding: 0 12px 0 10px; border-radius: var(--vk-radius-pill); background: var(--vk-color-success-wash); color: var(--vk-color-success-text); font: 700 14px/1 var(--vk-font-body); }
.dy-livedot { width: 8px; height: 8px; border-radius: 50%; background: var(--vk-color-success); box-shadow: 0 0 0 3px color-mix(in oklch, var(--vk-color-success) 35%, transparent); }
.dy-grow { flex: 1 1 0; }
.dy-search { display: inline-flex; align-items: center; gap: 10px; min-height: 48px; min-width: 280px; padding: 0 8px 0 16px; border: 0; border-radius: var(--vk-radius-pill); background: var(--vk-color-surface); color: var(--vk-color-muted); font: 500 15px/1 var(--vk-font-body); cursor: pointer; box-shadow: 0 var(--vk-lift) 0 var(--vk-color-ground); }
.dy-kbd { margin-left: auto; padding: 4px 9px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); color: var(--vk-color-muted); font: 500 12px/1.2 var(--vk-font-mono); }
.dy-new { min-height: 48px; padding: 0 22px; border-radius: var(--vk-radius-pill); font-size: 15px; }
.dy-sub { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; padding: 6px 16px 14px; }
.dy-sub .vk-segmented { background: color-mix(in oklch, var(--vk-color-surface) 55%, transparent); }
.dy-sub .vk-segmented__item[aria-pressed="true"] { background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: 0 var(--vk-lift) 0 var(--vk-color-ground); }
.dy-sub .vk-segmented__item[aria-pressed="false"] { color: var(--vk-sky-text); }
.dy-filter { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px; border: 0; border-radius: var(--vk-radius-pill); background: var(--vk-color-surface); color: var(--vk-color-text); font: 600 15px/1 var(--vk-font-body); cursor: pointer; box-shadow: 0 var(--vk-lift) 0 var(--vk-color-ground); }
.dy-filter .cnt { padding: 3px 8px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); color: var(--vk-color-muted); font-size: 13px; }
.dy-note { font-size: 14px; color: var(--vk-sky-text); }
```

`.dy-sun` position (`right: 540px`) is fixed in px as drawn at 1440; keep.

#### 1.3.3 Crew derivation (rail "3 agents / 2 wait on you")
`crew` = distinct agents, in this order, over the current board's non-archived cards that are not done/closed: (1) `lastAgentId` (G2) of cards whose urgency is `needs` → mood `needs`; (2) `lastAgentId` of working cards → `working`; (3) `queuedByAgentId` agents not already listed → `resting` if they hold no working card, else `working`. Fixture: tester-tim (needs), coder-kai (needs), super-chotu (resting). `crewLine` = `${m} wait on you` where m = count with mood `needs` (m=0 → `${k} at work` where k = working count; both 0 → "resting"). `crewTitle` = `${names(needs)} wait on you; ${names(queuers)} queues the work` ("tester-tim and coder-kai wait on you; super-chotu queues the work"). Hidden when `crew` is empty (Production Releases). The mockup draws super-chotu with the `working` face; ruling G5 (resting — nobody is working).

#### 1.3.4 States
Hover per CSS. Focus: global focus ring (vk.css). Account `<details>`: Esc closes and returns focus to summary; click outside closes. Disconnected: G13.

### 1.4 Paper — `ShellPaper.svelte` (desktop)
```svelte
<header class="mh">
  <div class="mh-top">
    <a class="mh-name" href={homeHref} aria-label="Superpipeline home">Superpipeline</a>
    <p class="mh-date">{dateline}</p>
    <div class="mh-quiet">
      <button class="mh-q" type="button" aria-haspopup="dialog" onclick={openAppearance}>Appearance</button>
      <button class="mh-q" type="button" aria-pressed={theme==='dark'} onclick={toggleTheme}>{themeToggleLabel}</button>
      <details class="mh-acct"><summary class="mh-q" aria-haspopup="menu">{userName}<Icon name="chev" size={14}/></summary><div class="mh-menu" role="menu"><p>Signed in as {userName}</p><button type="button" role="menuitem" onclick={signOut}>Sign out</button></div></details>
    </div>
  </div>
  <div class="mh-sections">
    <nav aria-label="Superpipeline" style="display: flex; flex-wrap: wrap; align-items: center">
      <a class="mh-sec" href={planHref} aria-current={here==='plan' ? 'page' : undefined}>Plan</a>
      <a class="mh-sec" href={operateHref} aria-current=…>Operate {#if n}<span class="n">({n})</span><span class="vk-visually-hidden"> need you</span>{/if}</a>
      <a class="mh-sec" href="/workspace/agents" aria-current=…>Workspace</a>
    </nav>   <!-- vibekit:NavItem variant=section ×3 -->
    <span class="mh-live" role="status" title="Live: changes arrive as they happen"><span class="mh-livedot" aria-hidden="true"></span><b>Live</b> · changes appear as they happen</span>
  </div>
  {#if boardName}<div class="mh-ed">
    <h1 class="mh-title">{boardName}</h1>
    <button class="mh-change" type="button" aria-haspopup="menu" aria-label="Change board, now {boardName}" onclick={openBoardSwitcher}>Change board</button>
    <div class="mh-acts">
      {#if view && view !== 'projects'}<button class="mh-btn" type="button" aria-haspopup="dialog" onclick={openFilter}><Icon name="filter-paper" size={16}/>Filter cards <span class="cnt">· {filterSummary}</span></button>{/if}
      <button class="mh-btn" type="button" aria-label="Search cards, agents and actions" onclick={openSearch}><Icon name="search" size={16}/>Search<span class="mh-kbd">⌘K</span></button>
      <button class="mh-btn mh-btn--write" type="button" onclick={compose}><Icon name="pen" size={16}/>Write a new card</button>
    </div>
  </div>{/if}
  {#if view}<div class="mh-tabs">
    <div role="group" aria-label="View">{#each views as v}<button class="mh-tab" type="button" aria-pressed={view===v} onclick={() => setView(v)}>{Label}</button>{/each}</div>
    {#if paperShowing}<span class="mh-showing">{paperShowing}</span>{/if}
  </div>{/if}
</header>
{@render children()}
```
Non-board pages: `.mh-title--sm` variant exists in the CSS for smaller titles (used by other specs). The `<h1>` is the page heading on board pages (board content therefore starts at h2).

CSS (verbatim `dc:SP-Board-Paper:20-65`); `:where(.mh button)` stays; `.mh a`, `.mh *` → `:global` descendants as in 1.3.2:

`dc:SP-Board-Paper:20-65`
```css
/* Paper shell: a masthead, no rail */
.mh { padding: 0 var(--mh-gutter, 56px); background: var(--vk-color-bg); color: var(--vk-color-text); font-family: var(--vk-font-body); }
.mh *, .mh *::before, .mh *::after { box-sizing: border-box; }
.mh a { color: inherit; }
:where(.mh button) { font: inherit; color: inherit; }
.mh .mh-top { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 24px; margin-top: 16px; padding: 6px 0; border-top: 1px solid var(--vk-color-text); }
.mh .mh-name { display: inline-flex; align-items: center; min-height: 48px; margin-right: auto; font-family: var(--vk-font-display); font-variant-caps: all-small-caps; font-size: 32px; font-weight: 600; letter-spacing: 0.07em; line-height: 1; text-decoration: none; }
.mh .mh-date { margin: 0; font-family: var(--vk-font-display); font-style: italic; font-size: 17px; color: var(--vk-color-muted); }
.mh .mh-quiet { display: flex; flex-wrap: wrap; align-items: center; }
.mh .mh-quiet > * + * { border-left: 1px solid var(--vk-color-line); }
.mh .mh-q { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 12px; border: 0; background: transparent; font-size: 14px; color: var(--vk-color-muted); cursor: pointer; list-style: none; }
.mh .mh-q:hover { color: var(--vk-color-text); text-decoration: underline; text-underline-offset: 4px; }
.mh .mh-acct { position: relative; }
.mh .mh-acct > summary::-webkit-details-marker { display: none; }
.mh .mh-acct > summary { color: var(--vk-color-text); }
.mh .mh-menu { position: absolute; right: 0; top: 100%; z-index: 5; display: flex; flex-direction: column; min-width: 200px; padding: 6px; background: var(--vk-color-surface); border: 1px solid var(--vk-color-text); border-radius: var(--vk-radius-sm); }
.mh .mh-menu p { margin: 0; padding: 8px 10px; font-size: 13px; color: var(--vk-color-muted); border-bottom: 1px solid var(--vk-color-line); }
.mh .mh-menu button { min-height: 44px; padding: 0 10px; border: 0; background: transparent; text-align: left; font-size: 15px; cursor: pointer; }
.mh .mh-menu button:hover { text-decoration: underline; text-underline-offset: 4px; }
.mh .mh-sections { display: flex; flex-wrap: wrap; align-items: center; border-top: 1px solid var(--vk-color-line); border-bottom: 1px solid var(--vk-color-line); }
.mh .mh-sec { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 20px; font-size: 15px; color: var(--vk-color-muted); text-decoration: none; }
.mh .mh-sec:first-child { padding-left: 0; }
.mh .mh-sec + .mh-sec { border-left: 1px solid var(--vk-color-line); }
.mh .mh-sec:hover { color: var(--vk-color-text); }
.mh .mh-sec[aria-current="page"] { font-family: var(--vk-font-display); font-style: italic; font-size: 18px; color: var(--vk-color-text); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 6px; }
.mh .mh-sec .n { color: var(--vk-color-signal-text); font-weight: 700; font-style: normal; font-family: var(--vk-font-body); font-size: 14px; }
.mh .mh-live { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; font-size: 12.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--vk-color-muted); }
.mh .mh-live b { color: var(--vk-color-success-text); font-weight: 700; }
.mh .mh-livedot { width: 8px; height: 8px; border-radius: 50%; background: var(--vk-color-success); box-shadow: 0 0 0 3px var(--vk-color-success-wash); }
.mh .mh-ed { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px 20px; padding: 22px 0 10px; }
.mh .mh-title { margin: 0; font-family: var(--vk-font-display); font-size: 46px; font-weight: 500; line-height: 1.05; letter-spacing: -0.012em; }
.mh .mh-title--sm { font-size: 30px; }
.mh .mh-change { display: inline-flex; align-items: center; min-height: 44px; padding: 0; border: 0; background: transparent; font-size: 14px; color: var(--vk-color-muted); text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.mh .mh-change:hover { color: var(--vk-color-text); }
.mh .mh-acts { display: flex; flex-wrap: wrap; gap: 8px; margin-left: auto; }
.mh .mh-btn { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; height: 44px; line-height: 1; padding: 0 14px; border: 1px solid var(--vk-color-line); border-radius: var(--vk-radius-sm); background: transparent; font-size: 15px; font-weight: 600; text-decoration: none; cursor: pointer; }
.mh .mh-btn:hover { border-color: var(--vk-color-text); }
.mh .mh-btn .cnt { font-weight: 400; color: var(--vk-color-muted); }
.mh .mh-btn--write { border-color: var(--vk-color-text); font-family: var(--vk-font-display); font-style: italic; font-weight: 500; font-size: 17px; }
.mh .mh-kbd { padding: 1px 6px; border: 1px solid var(--vk-color-line); border-radius: var(--vk-radius-sm); font: 12px/1.4 var(--vk-font-mono); color: var(--vk-color-faint); }
.mh .mh-tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 28px; border-bottom: 3px double var(--vk-color-text); }
.mh .mh-tabs [role="group"] { display: flex; gap: 24px; }
.mh .mh-tab { min-height: 44px; padding: 0 2px; border: 0; border-bottom: 2px solid transparent; background: transparent; font-variant-caps: all-small-caps; font-size: 17px; font-weight: 600; letter-spacing: 0.09em; color: var(--vk-color-muted); cursor: pointer; }
.mh .mh-tab:hover { color: var(--vk-color-text); }
.mh .mh-tab[aria-pressed="true"] { color: var(--vk-color-text); border-bottom-color: var(--vk-color-text); }
.mh .mh-showing { margin-left: auto; font-family: var(--vk-font-display); font-style: italic; font-size: 16px; color: var(--vk-color-muted); }
```

### 1.5 Studio (Annual report) — `ShellStudio.svelte` (desktop)

#### 1.5.1 Shared Studio base `lib/styles/annual.css`
Verbatim `dc:SP-Board-Studio:15-199` (identical, byte for byte, in SP-Phone-Board-Studio, SP-List-Studio, SP-Operate-Studio, SP-Card-Studio — checked by diff). It is global (imported once from `app.css`) because every Studio screen's content uses `.ar-btn`, `.kick`, `.u`, `.chip`, `.ar-tbl`, `.ar-facts` …; every selector is already under `.ar`, which the Studio shells put on their root. Only the rail/masthead/sub/status parts are shell-owned; the rest is the Studio content vocabulary (vibekit candidates: `.ar-btn`=`vibekit:Button`, `.u`=`vibekit:StateMarker`, `.chip`=`vibekit:StageChip`, `.ar-ramp`=`vibekit:StageRamp`, `.ar-figs`=`vibekit:FigureRow`, `.ar-tbl`=`vibekit:DataTable`, `.ar-notes`/`.fn`=`vibekit:FootnoteList`/`Footnote`, `.ar-q`=`vibekit:AgentQuote`, `.ar-kv`=`vibekit:KeyValues`, `.ar-field`=`vibekit:Field`, `.ar-status`=`vibekit:StatusLine`).

`dc:SP-Board-Studio:15-199`
```css
:where(.ar) *, :where(.ar) *::before, :where(.ar) *::after { box-sizing: border-box; }
:where(.ar) :where(h1, h2, h3, h4, p, ul, ol, dl, dd, dt, table, form, blockquote, figure, fieldset) { margin: 0; padding: 0; }
:where(.ar) :where(ul, ol) { list-style: none; }
:where(.ar) :where(fieldset) { border: 0; min-width: 0; }
:where(.ar) :where(button, input, select, textarea) { font: inherit; color: inherit; }
:where(.ar) :where(a) { color: inherit; }
body { margin: 0; }
/* local alias layer: every value comes from the Studio (Annual report) tokens in vk.css */
.ar {
  --bg: var(--vk-color-bg); --paper: var(--vk-color-surface); --text: var(--vk-color-text); --muted: var(--vk-color-muted);
  --rule: var(--vk-color-rule); --hair: var(--vk-color-line); --field: var(--vk-color-raised);
  --soft: color-mix(in srgb, var(--vk-color-text) 6%, var(--vk-color-bg));
  --s1: var(--vk-stage-1); --s2: var(--vk-stage-2); --s3: var(--vk-stage-3); --s4: var(--vk-stage-4); --s5: var(--vk-stage-5); --s6: var(--vk-stage-6); --s7: var(--vk-stage-7);
  --st-text: var(--vk-color-stage-text);
  --sig: var(--vk-color-signal); --sig-text: var(--vk-color-signal-text); --sig-wash: var(--vk-color-signal-wash); --sig-fg: var(--vk-face-ink);
  --ff: var(--vk-font-body); --fm: var(--vk-font-mono); --fs: var(--vk-font-serif);
  background: var(--bg); color: var(--text); font: 400 14px/1.45 var(--ff); font-variant-numeric: tabular-nums lining-nums;
}
.ar :focus-visible { outline: 3px solid var(--text); outline-offset: 3px; box-shadow: none; }
.ar .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.ar .h44 { position: relative; }
.ar .h44::after { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: max(44px, 100%); transform: translateY(-50%); }
.ar .kick { font: 700 12px/1.2 var(--ff); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
.ar .mono { font-family: var(--fm); }
.ar .muted { color: var(--muted); }
.ar .serif { font-family: var(--fs); }
.ar .fn { font: 600 11px/1 var(--fm); vertical-align: super; margin-left: 2px; color: var(--st-text); }
.ar .kbd { display: inline-block; padding: 2px 5px; border: 1px solid currentColor; border-radius: 2px; font: 500 11px/1 var(--fm); white-space: nowrap; }
.ar .chip { display: inline-block; flex: none; width: 10px; height: 10px; }
.ar .c1 { background: var(--s1); } .ar .c2 { background: var(--s2); } .ar .c3 { background: var(--s3); } .ar .c4 { background: var(--s4); } .ar .c5 { background: var(--s5); } .ar .c6 { background: var(--s6); } .ar .c7 { background: var(--s7); }
.ar .u { display: inline-block; flex: none; width: 18px; height: 18px; }
.ar .u.needs { background: var(--sig); }
.ar .u.blocked { background: repeating-linear-gradient(135deg, var(--s5) 0 1.5px, transparent 1.5px 4px); box-shadow: inset 0 0 0 1.5px var(--s5); }
.ar .u.queued { box-shadow: inset 0 0 0 1.5px var(--s5); }
.ar .u.done { background: var(--s7); }
.ar .u.off { box-shadow: inset 0 0 0 1.5px var(--muted); }
.ar .ar-ini { flex: none; display: inline-grid; place-items: center; background: var(--text); color: var(--bg); font-family: var(--ff); font-weight: 800; line-height: 1; }
.ar svg[data-mood] { flex: none; }

/* buttons */
.ar .ar-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 16px; border: 0; border-radius: 2px; background: var(--text); color: var(--bg); font: 800 14px var(--ff); white-space: nowrap; text-decoration: none; cursor: pointer; }
.ar .ar-btn .kbd { border-color: currentColor; }
.ar .ar-btn2 { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 14px; border: 1px solid var(--rule); border-radius: 2px; background: transparent; color: var(--text); font: 700 14px var(--ff); white-space: nowrap; text-decoration: none; cursor: pointer; }
.ar .ar-btn2:hover { background: var(--text); color: var(--bg); }
.ar .ar-lk { position: relative; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 8px 0 0; border: 0; background: transparent; color: var(--text); font: 700 13.5px var(--ff); text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 3px; white-space: nowrap; cursor: pointer; }
.ar .ar-lk.quiet { color: var(--muted); }
.ar .ar-ib { position: relative; display: inline-grid; place-items: center; flex: none; width: 44px; height: 44px; border: 1px solid var(--rule); border-radius: 2px; background: transparent; color: var(--text); text-decoration: none; cursor: pointer; }
.ar .ar-ib:hover { background: var(--text); color: var(--bg); }

/* rail */
.ar-rail { position: relative; z-index: 3; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px 0; background: var(--text); color: var(--bg); }
.ar-mark { display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: 16px; background: var(--bg); color: var(--text); text-decoration: none; }
.ar-nav { position: relative; display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 2px; background: transparent; color: var(--bg); text-decoration: none; cursor: pointer; }
.ar-nav:hover { outline: 1px solid var(--bg); outline-offset: -1px; }
.ar-rail .ar-nav:focus-visible, .ar-rail .ar-mark:focus-visible, .ar-rail .ar-acct:focus-visible { outline-color: var(--bg); }
.ar-nav[aria-current="page"] { background: var(--bg); color: var(--text); }
.ar-nav .ct { position: absolute; right: -3px; top: -3px; min-width: 18px; height: 18px; padding: 0 4px; background: var(--sig); color: var(--sig-fg); font: 800 12px/18px var(--ff); text-align: center; }
.ar-nav .tip, .ar-acct .tip { position: absolute; left: 54px; top: 50%; transform: translateY(-50%); display: none; align-items: center; gap: 8px; padding: 6px 10px; border: 1px solid var(--rule); background: var(--bg); color: var(--text); font: 700 13px var(--ff); white-space: nowrap; pointer-events: none; }
.ar-nav:hover .tip, .ar-nav:focus-visible .tip, .ar-acct:hover .tip, .ar-acct:focus-visible .tip { display: inline-flex; }
.ar-acct { position: relative; width: 44px; height: 44px; margin-top: 4px; border: 1.5px solid var(--bg); border-radius: 2px; background: transparent; color: var(--bg); font: 800 14px var(--ff); cursor: pointer; }

/* masthead */
.ar-top { display: flex; align-items: center; gap: 20px; min-height: 76px; padding: 0 24px 0 40px; border-bottom: 1px solid var(--rule); }
.ar-board { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ar-sw { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0; border: 0; background: transparent; color: var(--text); font: 800 28px/1 var(--ff); font-stretch: 80%; letter-spacing: -.01em; white-space: nowrap; cursor: pointer; }
.ar-sw:hover { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 5px; }
.ar-cmd { flex: 1; max-width: 480px; margin-left: auto; display: flex; align-items: center; min-height: 44px; cursor: text; }
.ar-cmd .box { flex: 1; display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 10px; border-bottom: 1.5px solid var(--rule); color: var(--muted); }
.ar-cmd input { flex: 1; min-width: 0; border: 0; background: transparent; font: 500 16px var(--ff); outline: none; color: var(--text); }
.ar-cmd input::placeholder { color: var(--muted); }
.ar-cmd:focus-within .box { outline: 3px solid var(--text); outline-offset: 2px; }
.ar-live { display: inline-flex; align-items: center; gap: 6px; font: 700 12px var(--ff); letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; }
.ar-live i { width: 8px; height: 8px; background: var(--st-text); }

/* sub bar */
.ar-sub { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 24px; min-height: 48px; padding: 0 40px; border-bottom: 1px solid var(--hair); }
.ar-tab { position: relative; display: inline-flex; align-items: center; gap: 6px; min-height: 48px; padding: 0; border: 0; background: transparent; color: var(--muted); font: 700 14px var(--ff); text-decoration: none; white-space: nowrap; cursor: pointer; }
.ar-tab[aria-current="page"], .ar-tab[aria-pressed="true"], .ar-tab[aria-selected="true"] { color: var(--text); }
.ar-tab[aria-current="page"]::after, .ar-tab[aria-pressed="true"]::after, .ar-tab[aria-selected="true"]::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 3px; background: var(--text); }
.ar-tab .mono { font-size: 12px; font-weight: 500; }
.ar-fl { position: relative; display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1px solid var(--rule); border-radius: 2px; background: transparent; color: var(--text); font: 700 13px var(--ff); white-space: nowrap; cursor: pointer; }
.ar-fl i { font: 500 12px var(--fm); font-style: normal; color: var(--muted); }
.ar-sub .r { margin-left: auto; font: 500 12px var(--fm); color: var(--muted); white-space: nowrap; }

/* hero */
.ar-hero { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 28px; align-items: end; }
.ar-hero .big { font: 900 184px/.78 var(--ff); font-stretch: 72%; letter-spacing: -.04em; color: var(--sig); }
.ar-hero .big.ink { color: var(--text); }
.ar-hero .txt { display: flex; flex-direction: column; gap: 12px; padding-bottom: 4px; }
.ar-hero h1 { font: 800 44px/1.02 var(--ff); font-stretch: 82%; letter-spacing: -.02em; }
.ar-hero p { max-width: 640px; font: 400 18px/1.45 var(--fs); }

/* numbered sections */
.ar-sec { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.ar-sec > .hd { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; padding-top: 10px; border-top: 1.5px solid var(--rule); }
.ar-sec > .hd .no { font: 500 12px var(--fm); color: var(--muted); }
.ar-sec > .hd h2 { font: 800 16px/1.2 var(--ff); }
.ar-sec > .hd .r { margin-left: auto; display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; font: 500 12px var(--fm); color: var(--muted); }

/* figures row */
.ar-figs { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); border-top: 1.5px solid var(--rule); border-bottom: 1px solid var(--hair); }
.ar-figs > div { display: flex; flex-direction: column; gap: 6px; min-width: 0; padding: 12px 12px 14px 0; }
.ar-figs > div + div { padding-left: 14px; border-left: 1px solid var(--hair); }
.ar-figs b { font: 900 52px/.86 var(--ff); font-stretch: 72%; letter-spacing: -.03em; white-space: nowrap; }
.ar-figs b small { font-size: 17px; font-weight: 700; margin-left: 3px; letter-spacing: 0; }
.ar-figs b.z { font-weight: 300; color: var(--muted); }
.ar-figs .sig b { color: var(--sig); }
.ar-figs .sig span { color: var(--sig-text); }
.ar-figs span { font-size: 12.5px; font-weight: 600; color: var(--muted); }

/* stage ramp track */
.ar-ramp { display: flex; gap: 2px; }
.ar-ramp i { width: 14px; height: 8px; opacity: .28; }
.ar-ramp i.on { opacity: 1; }
.ar-track { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 3px; }
.ar-track li { display: flex; flex-direction: column; gap: 6px; min-width: 0; font: 500 11.5px/1.25 var(--fm); color: var(--muted); }
.ar-track li .b { height: 8px; opacity: .3; }
.ar-track li.done .b { opacity: 1; }
.ar-track li.cur .b { opacity: 1; height: 14px; margin-top: -6px; }
.ar-track li.cur.sig .b { box-shadow: inset 0 -4px 0 var(--sig); }
.ar-track li.cur { color: var(--text); font-weight: 600; }
.ar-track li.cur.sig { color: var(--sig-text); }

/* quote (agent words) */
.ar-q { display: flex; flex-direction: column; gap: 8px; padding: 2px 0 0 18px; border-left: 4px solid var(--sig); }
.ar-q.ink { border-left-color: var(--text); }
.ar-q.done { border-left-color: var(--s7); }
.ar-q.off { border-left-color: var(--hair); }
.ar-q h3 { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font: 800 14px var(--ff); color: var(--sig-text); }
.ar-q.ink h3, .ar-q.done h3, .ar-q.off h3 { color: var(--text); }
.ar-q h3 .mono { margin-left: auto; font-weight: 500; font-size: 12px; }
.ar-q blockquote { font: 400 19px/1.42 var(--fs); overflow-wrap: anywhere; }
.ar-q blockquote code, .ar-id { font: 500 .78em var(--fm); overflow-wrap: anywhere; }

/* footnote row with copy */
.ar-pfn { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; align-items: center; column-gap: 0; padding-top: 6px; border-top: 1px solid var(--hair); font: 400 14px/1.4 var(--fs); }
.ar-pfn .k { font: 600 11.5px var(--fm); color: var(--st-text); }
.ar-pfn code { font: 500 12.5px var(--fm); overflow-wrap: anywhere; }

/* notes */
.ar-notes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 32px; row-gap: 10px; padding-top: 10px; border-top: 1px solid var(--hair); }
.ar-notes li { display: grid; grid-template-columns: 22px minmax(0, 1fr); font: 400 14.5px/1.45 var(--fs); }
.ar-notes li .k { font: 600 11.5px/1.9 var(--fm); color: var(--st-text); }
.ar-notes li i { font-style: italic; }

/* tables */
.ar .ttl { position: relative; padding: 0; border: 0; background: transparent; color: var(--text); font: 700 14px/1.3 var(--ff); text-align: left; text-decoration: none; overflow-wrap: anywhere; cursor: pointer; }
.ar .ttl::after { content: ""; position: absolute; left: -4px; right: -4px; top: 50%; height: max(44px, calc(100% + 8px)); transform: translateY(-50%); }
.ar .ttl:hover { text-decoration: underline; text-underline-offset: 3px; }
.ar-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
.ar-tbl th { height: 30px; padding: 0 10px 0 0; text-align: left; font: 700 12px var(--ff); color: var(--muted); border-bottom: 1px solid var(--rule); vertical-align: bottom; }
.ar-tbl td { overflow-wrap: break-word; padding: 10px 10px 10px 0; border-bottom: 1px solid var(--hair); vertical-align: top; }
.ar-tbl tr.sel td { background: var(--soft); }
.ar-tbl tr.sel td:first-child { box-shadow: inset 3px 0 0 var(--text); padding-left: 8px; }
.ar-tbl .ix { font: 500 12.5px var(--fm); color: var(--muted); }
.ar-tbl .stg { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; white-space: nowrap; }
.ar-tbl .ag { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; white-space: nowrap; }
.ar-tbl .m { font: 500 12.5px var(--fm); color: var(--muted); }
.ar-tbl .m.sig, .ar .sigt { color: var(--sig-text); font-weight: 600; }
.ar-st { display: inline-flex; align-items: center; gap: 7px; font-weight: 700; font-size: 13px; white-space: nowrap; }
.ar-st .u { width: 11px; height: 11px; }
.ar-st.needs { color: var(--sig-text); }
.ar-facts { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 4px; font: 500 12px/1.35 var(--fm); color: var(--muted); }
.ar-facts > span { display: inline-flex; align-items: center; gap: 5px; overflow-wrap: anywhere; }
.ar-facts .p { color: var(--text); font-weight: 600; }

/* key/value rows */
.ar-kv { display: grid; grid-template-columns: max-content minmax(0, 1fr); column-gap: 16px; }
.ar-kv > dt, .ar-kv > dd { padding: 9px 0; border-top: 1px solid var(--hair); }
.ar-kv > dt { font-weight: 700; font-size: 13px; }
.ar-kv > dd { overflow-wrap: anywhere; }

/* fields */
.ar-field { display: flex; flex-direction: column; gap: 6px; }
.ar-field > label, .ar .lab { font-weight: 700; font-size: 14px; }
.ar-in, .ar-sel, .ar-ta { width: 100%; min-height: 44px; padding: 0 10px; border: 1px solid var(--rule); border-radius: 0; background: var(--field); color: var(--text); font: 400 16px/1.45 var(--ff); }
.ar-ta { min-height: 88px; padding: 10px 12px; resize: vertical; }
.ar-in::placeholder, .ar-ta::placeholder { color: var(--muted); }
.ar-hint { font: 500 12px/1.4 var(--fm); color: var(--muted); }

/* status bar */
.ar-status { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 20px; min-height: 32px; padding: 0 40px; border-top: 1px solid var(--rule); font: 500 12px var(--fm); color: var(--muted); }
.ar-status .sig { color: var(--sig-text); font-weight: 600; }
.ar-status .r { margin-left: auto; display: flex; flex-wrap: wrap; gap: 16px; }
```

Plus one rule not in the mockup (state never drawn; G14): `.ar .u.working { background: var(--s5); }`.

#### 1.5.2 Markup
```svelte
<div class="ar bd" data-shell="studio">   <!-- grid 64px | 1fr, see 1.5.3 -->
  <nav class="ar-rail" aria-label="Superpipeline">
    <a class="ar-mark" href={homeHref} aria-label="Superpipeline home"><Icon name="mark" size={22} strokeWidth={2}/></a>
    <a class="ar-nav" href={planHref} aria-current=… aria-label="Plan" aria-keyshortcuts="G P"><Icon name="plan-sq" size={20}/><span class="tip" aria-hidden="true">Plan <span class="kbd">G P</span></span></a>
    <a class="ar-nav" href={operateHref} aria-current=… aria-label={n ? `Operate, ${n} need you` : 'Operate'} aria-keyshortcuts="G O"><Icon name="operate" size={20}/>{#if n}<span class="ct" aria-hidden="true">{n}</span>{/if}<span class="tip" aria-hidden="true">Operate{#if n} · {n} need you{/if} <span class="kbd">G O</span></span></a>
    <a class="ar-nav" href="/workspace/agents" aria-current=… aria-label="Workspace" aria-keyshortcuts="G W"><Icon name="people" size={20}/><span class="tip" aria-hidden="true">Workspace <span class="kbd">G W</span></span></a>
    <span style="flex: 1"></span>
    <button class="ar-nav" type="button" aria-label={themeToggleLabel} onclick={toggleTheme}><Icon name="moon" size={18}/><span class="tip" aria-hidden="true">{themeToggleLabel}</span></button>
    <button class="ar-nav" type="button" aria-label="Appearance" aria-haspopup="dialog" onclick={openAppearance}><Icon name="sun" size={20}/><span class="tip" aria-hidden="true">Appearance</span></button>
    <button class="ar-acct" type="button" aria-label="{userName}, account" aria-haspopup="menu">{initials}<span class="tip" aria-hidden="true">{userName}</span></button>   <!-- opens vibekit:Menu [heading userName, item Sign out] placement right-end -->
    <button class="ar-nav" type="button" aria-label="Sign out" onclick={signOut}><Icon name="signout-studio" size={18}/><span class="tip" aria-hidden="true">Sign out</span></button>
  </nav>
  <div class="bd-body">
    <header class="ar-top">
      <div class="ar-board"><span class="kick">Superpipeline · {section}</span>
        {#if boardName}<button class="ar-sw" type="button" aria-haspopup="menu" aria-label="Board: {boardName}. Change board" onclick={openBoardSwitcher}>{boardName} <Icon name="chev" size={20}/></button>{/if}</div>
      <label class="ar-cmd"><span class="sr">Search or run a command</span><span class="box"><Icon name="search" size={18}/><input type="search" placeholder="Search or run a command" aria-keyshortcuts="Meta+K" onfocus={openSearch} readonly><span class="kbd" aria-hidden="true">⌘K</span></span></label>
      <span class="ar-live" role="status" title="Live: changes appear as they happen"><i aria-hidden="true"></i>Live</span>
      <button class="ar-btn" type="button" aria-keyshortcuts="N" onclick={compose}><Icon name="plus" size={16}/>New card <span class="kbd" aria-hidden="true">N</span></button>
    </header>
    {#if view}<div class="ar-sub">
      <div role="group" aria-label="View" style="display: flex; gap: 24px">
        <button class="ar-tab" type="button" aria-pressed={view==='board'}>Board</button>
        <button class="ar-tab" type="button" aria-pressed={view==='list'}>List <span class="mono">{listCount}</span></button>
        <button class="ar-tab" type="button" aria-pressed={view==='projects'}>Projects <span class="mono">{projectCount}</span></button></div>
      {#if view !== 'projects'}<button class="ar-fl h44" type="button" aria-haspopup="dialog" aria-keyshortcuts="F" onclick={openFilter}><Icon name="funnel" size={14}/>Filter cards <i>{filterSummary}</i></button>{/if}
      {#if showing}<span class="ar-hint">{showing}</span>{/if}
      {#if studioSubRight}<span class="r">{studioSubRight}</span>{/if}
    </div>{/if}
    {@render children()}
    {#if status}<footer class="ar-status" aria-label="Status">{#each status.items as s}<span class:sig={s.signal}>{s.text}</span>{/each}<span class="r">{#each status.right as r}<span>{r}</span>{/each}</span></footer>{/if}   <!-- vibekit:StatusLine -->
  </div>
</div>
```
The command field is a visual trigger: focusing or clicking it calls `openSearch()` (the palette owns typing); `readonly` keeps the 16px input from opening the phone keyboard. Keyboard: `G P`/`G O`/`G W` (two-key sequence within 1 s) navigate; `N` composes; `F` opens filter; `⌘K` opens search (handled in AppShell `svelte:window` keydown, ignored while an input/textarea/contenteditable has focus).

#### 1.5.3 Shell-only CSS (`dc:SP-Board-Studio:201-203`, the grid that hosts rail + body)
`dc:SP-Board-Studio:201-203`
```css
.ar.bd { display: grid; grid-template-columns: 64px minmax(0, 1fr); }
.ar.bd > .ar-rail { grid-row: 1; }
.bd-body { display: flex; flex-direction: column; min-width: 0; }
```
Rename `.ar.bd` stays (the board's own `.bd-grid` etc. live in the board component). `.bd-body` is the shell body for every Studio page.

Studio sub-right and status for the board (§4.3): `studioSubRight = "The board at {HH:MM} · {greeting(phase,'studio').toLowerCase()} · {weekday} {d} {Month}"` → "The board at 13:51 · midday · Sunday 11 October" (HH:MM = time of the last snapshot receipt `app.syncedAt`, NEW `$state<Date|null>`, set on every successful `getBoard`/feed event). The mockup prints 13:19 (G6).

### 1.6 Quiet — `ShellQuiet.svelte` (desktop)
```svelte
<div class="sh-root">
<header class="qn">
  <div class="qn-row">
    <a class="qn-skip" href="#content">Skip to content</a>   <!-- vibekit:SkipLink -->
    <a class="qn-name" href={homeHref} aria-label="Superpipeline home">Superpipeline</a>
    <nav aria-label="Superpipeline"><ul class="qn-links">
      <li><a href={planHref} aria-current=…>Plan</a></li>
      <li><a href={operateHref} aria-current=…>Operate{#if n} <span class="qn-need">({n} need you)</span>{/if}</a></li>
      <li><a href="/workspace/agents" aria-current=…>Workspace</a></li></ul></nav>
    <div class="qn-end"><button class="qn-link" type="button" aria-haspopup="dialog" onclick={openAppearance}>Appearance</button><button class="qn-link" type="button" onclick={toggleTheme}>{themeToggleLabel}</button><span><a href="/workspace/people" aria-haspopup="menu">{userName}</a> <span class="qn-dash" aria-hidden="true">—</span> <button class="qn-link" type="button" onclick={signOut}>Sign out</button></span></div>
  </div>
  {#if boardName}<div class="qn-row">
    <span class="qn-board">Board: <b>{boardName}</b> <span class="qn-dash" aria-hidden="true">—</span> <button class="qn-link" type="button" aria-haspopup="menu" aria-label="Change board, now {boardName}" onclick={openBoardSwitcher}>Change board</button></span>
    <span class="qn-live" role="status" title="Live: changes arrive as they happen"><b>Live.</b> Changes appear as they happen.</span>
    <button class="qn-btn" type="button" aria-label="Search cards, agents and actions" onclick={openSearch}>Search <span class="qn-kbd" aria-hidden="true">⌘K</span></button>
    <button class="qn-btn" type="button" onclick={compose}>New card</button>
    {#if view}<div class="qn-view" role="group" aria-label="View">View: <button class="qn-link" aria-pressed=…>Board</button> <span class="qn-dot" aria-hidden="true">·</span> <button …>List</button> <span class="qn-dot" aria-hidden="true">·</span> <button …>Projects</button></div>
      {#if view !== 'projects'}<button class="qn-link" type="button" aria-haspopup="dialog" onclick={openFilter}>Filter cards ({filterSummary})</button>{/if}{/if}
    {#if showing}<span class="qn-note">{showing}</span>{/if}
  </div>{/if}
</header>
{@render children()}   <!-- content provides <main id="content" tabindex="-1"> -->
</div>
```
The account link points to `/workspace/people` (the person's own row; the menu affordance is `aria-haspopup="menu"` in the mockup — open `vibekit:Menu` with [heading userName, Sign out]; G15).

CSS (verbatim `dc:SP-Board-Quiet:19-43`):
`dc:SP-Board-Quiet:19-43`
```css
.sh-root { min-height: 100%; display: flex; flex-direction: column; background: var(--vk-color-bg); color: var(--vk-color-text); font-family: var(--vk-font-body); font-size: 16px; line-height: 1.45; }
/* Quiet shell: plain text navigation, no rail, no icons */
.qn { position: relative; background: var(--vk-color-bg); color: var(--vk-color-text); border-bottom: 1px solid var(--vk-color-line); font-family: var(--vk-font-body); font-size: 18px; line-height: 1.4; }
.qn *, .qn *::before, .qn *::after { box-sizing: border-box; }
.qn-skip { position: absolute; left: var(--vk-space-6); top: -200px; z-index: 2; display: inline-flex; align-items: center; min-height: 44px; padding: 0 var(--vk-space-4); background: var(--vk-color-surface); border: 2px solid var(--vk-color-text); border-radius: var(--vk-radius-sm); color: var(--vk-color-text); font-weight: 700; }
.qn-skip:focus { top: var(--vk-space-2); }
.qn-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--vk-space-5); min-height: 60px; padding: var(--vk-space-1) var(--vk-space-6); }
.qn-row + .qn-row { border-top: 1px solid var(--vk-color-line); }
.qn a, .qn-link { display: inline-flex; align-items: center; min-height: 44px; padding: 0; border: 0; background: transparent; color: var(--vk-color-text); font: inherit; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.qn a[aria-current="page"], .qn-link[aria-pressed="true"] { font-weight: 700; text-decoration: none; }
.qn a.qn-name { font-weight: 700; text-decoration: none; margin-right: var(--vk-space-3); }
.qn-links { display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--vk-space-5); margin: 0; padding: 0; list-style: none; }
.qn-need { font-weight: 700; color: var(--vk-color-signal-text); }
.qn-end { margin-left: auto; display: flex; flex-wrap: wrap; align-items: center; gap: 0 var(--vk-space-5); }
.qn-dash { color: var(--vk-color-muted); }
.qn-board { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 0 var(--vk-space-2); }
.qn-board b { font-weight: 700; }
.qn-btn { display: inline-flex; align-items: center; gap: var(--vk-space-2); min-height: 44px; padding: 0 var(--vk-space-4); border: 2px solid var(--vk-color-text); border-radius: var(--vk-radius-sm); background: var(--vk-color-surface); color: var(--vk-color-text); font: inherit; font-size: 17px; font-weight: 700; cursor: pointer; }
.qn-kbd { font: 400 14px/1 var(--vk-font-mono); color: var(--vk-color-muted); }
.qn-view { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 0 var(--vk-space-2); }
.qn-view .qn-dot { color: var(--vk-color-muted); }
.qn-live { color: var(--vk-color-muted); font-size: 17px; }
.qn-live b { color: var(--vk-color-success-text); }
.qn-note { color: var(--vk-color-muted); font-size: 17px; }
.qn a:focus-visible, .qn button:focus-visible { outline: 3px solid var(--vk-color-text); outline-offset: 3px; }
```

The mockup's Quiet board (Agent Onboarding) shows "Operate" with no count; by the count rule it reads "Operate (3 need you)" (G4).

### 1.7 Phone shells (<900px)
Each phone shell = top header (inside the page flow, scrolls away) + sticky bottom bar. Each has a root wrapper carrying the phone base rules.

**Shared phone base** for Daylight, Paper, Quiet (verbatim `dc:SP-Phone-Board-Daylight:15-29`; identical in Paper/Quiet). Root class `.r` (rename to `.ph-root` to avoid collision with Studio's `.r` utility; every `.r` below becomes `.ph-root`); `width: 390px` becomes `width: 100%` (the artboard width is the viewport). Descendant selectors use `:global`. Put it in `app.css` as `.ph-root …` since content components rely on `.wrap/.mono/.muted/.ico/.ib/.face/.sr`.
`dc:SP-Phone-Board-Daylight:15-29`
```css
body{margin:0}
.r{width:390px;box-sizing:border-box;background:var(--vk-color-bg);color:var(--vk-color-text);font-family:var(--vk-font-body);font-size:16px;line-height:1.45;display:flex;flex-direction:column}
.r *,.r *::before,.r *::after{box-sizing:border-box}
.r h1,.r h2,.r h3,.r h4,.r p,.r ul,.r ol,.r dl,.r dd,.r figure{margin:0}
.r ul,.r ol{padding:0;list-style:none}
:where(.r button,.r select,.r textarea,.r input){font:inherit;color:inherit}
.r a{color:var(--vk-color-text);text-underline-offset:3px}
.wrap{overflow-wrap:anywhere;min-width:0}
.mono{font-family:var(--vk-font-mono)}
.muted{color:var(--vk-color-muted)}
.ico{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ib{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;border:0;background:transparent;border-radius:var(--vk-radius-sm);cursor:pointer;color:var(--vk-color-text);padding:0}
.face{flex:none;display:inline-flex;line-height:0}
.face svg{border-radius:50%}
.sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
```

#### 1.7.1 `PhoneShellDaylight.svelte`
```svelte
<div class="ph-root" data-shell="daylight-phone">
  <div class="greet">   <!-- vibekit:Sky (phone) -->
    <span class="sun" aria-hidden="true"></span>
    <header class="pd-top">
      {#if boardName}<button class="sw" type="button" aria-haspopup="menu" aria-label="Switch board: {boardName}" onclick={openBoardSwitcher}><span>{boardName}</span><Icon name="chev" size={20} strokeWidth={2}/></button>{/if}
      <button class="ib pd-search" type="button" aria-label="Search cards, agents and actions (⌘K)" onclick={openSearch}><Icon name="search-phone" size={20} strokeWidth={2}/></button>
      <button class="nc" type="button" onclick={compose}><Icon name="plus" size={20} strokeWidth={2}/><span>New card</span></button>
    </header>
    {#if view}<div class="pd-sub">
      <div class="vt" role="group" aria-label="View"><button type="button" aria-pressed=…>Board</button><button …>List</button><button …>Projects</button></div>
      {#if view!=='projects'}<button class="fb" type="button" aria-haspopup="dialog" onclick={openFilter}><Icon name="funnel" size={20} strokeWidth={2}/><span>Filter</span></button>{/if}
      <span class="pd-live" role="status">Live</span>
    </div>{/if}
    {@render sky?.()}
  </div>
  {@render children()}
  <nav class="nav" aria-label="Main">
    <a href={planHref} aria-current=…><Icon name="plan-phone" size={20} strokeWidth={2}/><span>Plan</span></a>
    <a href={operateHref} aria-current=…><Icon name="operate" size={20} strokeWidth={2}/><span>Operate</span>{#if n}<span class="cnt" aria-hidden="true">{n}</span><span class="sr">, {n} need you</span>{/if}</a>
    <a href="/workspace/agents" aria-current=…><Icon name="workspace" size={20} strokeWidth={2}/><span>Workspace</span></a>
    <a href="#you" aria-haspopup="menu" onclick={openYou}><span class="av" aria-hidden="true">{initials}</span><span>You</span><span class="sr">, {userName}</span></a>
  </nav>
</div>
```
CSS: shell part verbatim `dc:SP-Phone-Board-Daylight:30-49`, plus the sky rules that belong to the shell `.greet`, `.sun`, and their dark-theme overrides (`dc:SP-Phone-Board-Daylight:52-53, 106-107`, quoted with the board CSS in §5.1; move those four rules into the shell).
`dc:SP-Phone-Board-Daylight:30-49`
```css
/* shell: Daylight. Top bar sits on the sky; a floating bottom bar */
.pd-top{position:relative;display:flex;align-items:center;gap:6px}
.sw{flex:1;min-width:0;display:flex;align-items:center;gap:4px;min-height:48px;border:0;background:transparent;padding:0;color:inherit;font:700 22px/1.1 var(--vk-font-display);letter-spacing:-0.01em;text-align:left;cursor:pointer}
.sw span{overflow-wrap:anywhere}
.pd-search{background:var(--vk-color-surface);color:var(--vk-color-text);border-radius:50%;box-shadow:0 var(--vk-lift) 0 var(--vk-color-ground)}
.nc{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;border:0;border-radius:var(--vk-radius-pill);background:var(--vk-color-primary);color:var(--vk-color-primary-fg);font-weight:700;cursor:pointer;box-shadow:0 var(--vk-lift) 0 var(--vk-color-ground)}
.pd-sub{position:relative;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.vt{display:inline-flex;gap:2px;padding:3px;border-radius:var(--vk-radius-pill);background:color-mix(in oklch,var(--vk-color-surface) 55%,transparent)}
.vt button{min-height:44px;padding:0 11px;border:0;border-radius:var(--vk-radius-pill);background:transparent;color:inherit;font-size:15px;font-weight:600;cursor:pointer}
.vt button[aria-pressed="true"]{background:var(--vk-color-surface);color:var(--vk-color-text);font-weight:700;box-shadow:0 var(--vk-lift) 0 var(--vk-color-ground)}
.fb{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px;border:0;border-radius:var(--vk-radius-pill);background:var(--vk-color-surface);color:var(--vk-color-text);font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 var(--vk-lift) 0 var(--vk-color-ground)}
.pd-live{margin-left:auto;display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:0 10px;border-radius:var(--vk-radius-pill);background:var(--vk-color-success-wash);color:var(--vk-color-success-text);font-size:13px;font-weight:700}
.pd-live::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--vk-color-success)}
.pd-hello{position:relative;display:flex;flex-direction:column;gap:12px;padding-top:8px;border-top:1px solid color-mix(in oklch,var(--vk-color-surface) 50%,transparent)}
.nav{position:sticky;bottom:12px;z-index:5;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin:auto 12px 12px;padding:6px;border-radius:var(--vk-radius-lg);background:var(--vk-color-surface);box-shadow:0 0 0 1px var(--vk-color-line),0 12px 28px -8px var(--vk-color-ground)}
.nav a{position:relative;min-height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:var(--vk-radius-md);font-size:13px;font-weight:600;text-decoration:none;color:var(--vk-color-muted)}
.nav a[aria-current="page"]{color:var(--vk-color-text);background:var(--vk-color-raised);font-weight:700;box-shadow:inset 0 0 0 2px var(--vk-color-primary)}
.nav a[aria-current="page"] .ico{fill:currentColor}
.nav .cnt{position:absolute;top:3px;left:calc(50% + 6px);min-width:20px;height:20px;padding:0 6px;border-radius:var(--vk-radius-pill);background:var(--vk-color-signal);color:var(--vk-color-primary-fg);font:800 12px/20px var(--vk-font-body);text-align:center;box-shadow:0 0 0 2px var(--vk-color-surface)}
.nav .av{width:26px;height:26px;border-radius:50%;display:inline-grid;place-items:center;font-size:10px;font-weight:800;background:var(--vk-mood-resting);color:var(--vk-face-ink)}
```

#### 1.7.2 `PhoneShellPaper.svelte`
```svelte
<div class="ph-root">
<header class="pm">
  <div class="pm-top"><a class="pm-name" href={homeHref} aria-label="Superpipeline home">Superpipeline</a><span class="pm-live" role="status">Live</span><button class="pm-tx" type="button" aria-label="Search cards, agents and actions (⌘K)" onclick={openSearch}><Icon name="search-phone" size={16} strokeWidth={2}/>Search</button></div>
  {#if boardName}<div class="pm-ed"><h1>{boardName}</h1><p class="pm-date">{dateline}{editionCount ? ` · ${editionCount}` : ''}</p>
    <div class="pm-links"><button class="pm-link" type="button" aria-haspopup="menu" aria-label="Change board, now {boardName}" onclick={openBoardSwitcher}>Change board</button><button class="pm-link w" type="button" onclick={compose}>Write a new card</button></div></div>{/if}
  {#if view}<div class="pm-tabs"><div role="group" aria-label="View">…3 × <button class="pm-tab" aria-pressed=…></div>{#if view!=='projects'}<button class="pm-tx" type="button" aria-haspopup="dialog" onclick={openFilter}><Icon name="filter-paper" size={16} strokeWidth={2}/>Filter</button>{/if}</div>{/if}
</header>
{@render children()}
<nav class="nav" aria-label="Main"><a href={planHref} aria-current=…>Plan</a><a href={operateHref} aria-current=…>Operate{#if n} <span class="n">({n})</span><span class="sr"> need you</span>{/if}</a><a href="/workspace/agents" aria-current=…>Workspace</a><a href="#you" aria-haspopup="menu" onclick={openYou}>You<Icon name="chev" size={20} strokeWidth={2}/><span class="sr">, {userName}</span></a></nav>
</div>
```
Icon sizes in the mockup: search and filter 16 (`style="width:16px;height:16px"`), chevron 20 (`.ico` default; `apply_phone_sp.py` declares 14 but the rendered file uses the `.ico` default 20 — use what renders). editionCount = `plural(nonArchived,'card','cards')` → "6 cards".
CSS verbatim `dc:SP-Phone-Board-Paper:30-53` (`.pm .pm-x` selectors are already scoped):
`dc:SP-Phone-Board-Paper:30-53`
```css
/* Paper shell (phone): a masthead on top, a ruled text bar below */
.pm{padding:0 16px;display:flex;flex-direction:column}
.pm .pm-top{display:flex;align-items:center;gap:4px;margin-top:10px;border-top:1px solid var(--vk-color-text);border-bottom:1px solid var(--vk-color-line)}
.pm .pm-name{flex:1;min-width:0;display:inline-flex;align-items:center;min-height:44px;font-family:var(--vk-font-display);font-variant-caps:all-small-caps;font-size:25px;font-weight:600;letter-spacing:0.07em;line-height:1;text-decoration:none}
.pm a.pm-name{text-decoration:none}
.pm .pm-live{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;letter-spacing:0.1em;text-transform:uppercase;color:var(--vk-color-success-text);font-weight:700;padding-right:6px}
.pm .pm-live::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--vk-color-success)}
.pm .pm-tx{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 10px;border:1px solid var(--vk-color-line);border-radius:var(--vk-radius-sm);background:transparent;font-size:15px;font-weight:600;cursor:pointer;color:var(--vk-color-text)}
.pm .pm-ed{display:flex;flex-direction:column;gap:2px;padding:16px 0 4px}
.pm .pm-ed h1{font-family:var(--vk-font-display);font-size:34px;line-height:1.1;font-weight:500;overflow-wrap:anywhere}
.pm .pm-date{font-family:var(--vk-font-display);font-style:italic;font-size:17px;color:var(--vk-color-muted)}
.pm .pm-links{display:flex;flex-wrap:wrap;align-items:center;gap:0 16px}
.pm .pm-link{min-height:44px;display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;padding:0;font-size:15px;text-decoration:underline;text-underline-offset:4px;cursor:pointer;color:var(--vk-color-text)}
.pm .pm-link.w{font-family:var(--vk-font-display);font-style:italic;font-size:17px}
.pm .pm-tabs{display:flex;align-items:center;gap:18px;border-bottom:3px double var(--vk-color-text)}
.pm .pm-tabs [role="group"]{display:flex;gap:18px}
.pm .pm-tab{min-height:44px;padding:0 1px;border:0;border-bottom:2px solid transparent;background:transparent;font-variant-caps:all-small-caps;font-size:17px;font-weight:600;letter-spacing:0.08em;color:var(--vk-color-muted);cursor:pointer}
.pm .pm-tab[aria-pressed="true"]{color:var(--vk-color-text);border-bottom-color:var(--vk-color-text)}
.pm .pm-tabs .pm-tx{margin-left:auto;min-height:40px;margin-bottom:2px}
.nav{position:sticky;bottom:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--vk-color-bg);border-top:3px double var(--vk-color-text);margin-top:auto}
.nav a{position:relative;min-height:56px;display:flex;align-items:center;justify-content:center;gap:4px;font-variant-caps:all-small-caps;font-size:16px;font-weight:600;letter-spacing:0.05em;text-decoration:none;color:var(--vk-color-muted)}
.nav a + a{border-left:1px solid var(--vk-color-line)}
.nav a[aria-current="page"]{color:var(--vk-color-text);font-family:var(--vk-font-display);font-style:italic;font-variant-caps:normal;font-size:18px;font-weight:500;letter-spacing:0;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:6px}
.nav .n{color:var(--vk-color-signal-text);font-weight:700;font-variant-caps:normal;font-size:14px;letter-spacing:0}
```

#### 1.7.3 `PhoneShellStudio.svelte`
```svelte
<div class="ar ph">
<header class="ph-top">
  <div class="r1"><span class="kick">Superpipeline · {section}</span><span class="ar-live" role="status" title="Live: changes appear as they happen"><i aria-hidden="true"></i>Live</span><button class="ph-ib b" type="button" aria-label="Search cards, agents and actions (⌘K)" onclick={openSearch}><Icon name="search" size={18}/></button></div>
  {#if boardName}<div class="r2"><button class="ar-sw" type="button" aria-haspopup="menu" aria-label="Switch board: {boardName}" onclick={openBoardSwitcher}>{boardName} <Icon name="chev" size={18}/></button><button class="ar-btn" type="button" onclick={compose}><Icon name="plus" size={16}/>New card</button></div>{/if}
</header>
{#if view}<div class="pb-sub"><div role="group" aria-label="View" style="display: flex; gap: 18px"><button class="ar-tab" aria-pressed=…>Board</button><button class="ar-tab" …>List <span class="mono">{listCount}</span></button><button class="ar-tab" …>Projects <span class="mono">{projectCount}</span></button></div>{#if view!=='projects'}<button class="ar-fl h44" type="button" aria-haspopup="dialog" onclick={openFilter}><Icon name="funnel" size={14}/>Filter</button>{/if}</div>{/if}
{@render children()}
<nav class="ph-nav" aria-label="Main">
  <a href={planHref} aria-current=…><span class="ic"><Icon name="plan-sq" size={20}/></span><span>Plan</span></a>
  <a href={operateHref} aria-current=…><span class="ic"><Icon name="operate" size={20}/>{#if n}<span class="cnt" aria-hidden="true">{n}</span>{/if}</span><span>Operate</span>{#if n}<span class="sr">, {n} need you</span>{/if}</a>
  <a href="/workspace/agents" aria-current=…><span class="ic"><Icon name="people" size={20}/></span><span>Workspace</span></a>
  <a href="#you" aria-haspopup="menu" onclick={openYou}><span class="me" aria-hidden="true">{initials}</span><span>You</span><span class="sr">, {userName}</span></a>
</nav>
</div>
```
CSS verbatim `dc:SP-Phone-Board-Studio:201-216` (`.ar.ph width:390px` → `width: 100%`) and `.pb-sub` lines 218-219 belong to the shell:
`dc:SP-Phone-Board-Studio:201-219`
```css
.ar.ph { width: 390px; display: flex; flex-direction: column; }
.ph-top { display: flex; flex-direction: column; gap: 4px; padding: 10px 16px 12px; border-bottom: 1px solid var(--rule); }
.ph-top .r1 { display: flex; align-items: center; gap: 10px; }
.ph-top .r1 .ar-live { margin-left: auto; }
.ph-top .r2 { display: flex; align-items: center; gap: 10px; }
.ph-top .ar-sw { flex: 1; min-width: 0; font-size: 24px; white-space: normal; text-align: left; }
.ph-top .ar-btn { padding: 0 12px; }
.ph-ib { position: relative; display: grid; place-items: center; flex: none; width: 44px; height: 44px; border: 0; border-radius: 2px; background: transparent; color: var(--text); text-decoration: none; cursor: pointer; }
.ph-ib.b { border: 1px solid var(--rule); }
.ph-nav { position: sticky; bottom: 0; z-index: 3; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: auto; background: var(--text); color: var(--bg); }
.ph-nav a { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-height: 60px; color: var(--bg); text-decoration: none; font: 500 11px var(--fm); letter-spacing: .04em; text-transform: uppercase; }
.ph-nav a[aria-current="page"] { background: var(--bg); color: var(--text); }
.ph-nav a:focus-visible { outline-color: var(--bg); outline-offset: -4px; }
.ph-nav .ic { position: relative; display: grid; place-items: center; }
.ph-nav .cnt { position: absolute; right: -12px; top: -6px; min-width: 18px; height: 18px; padding: 0 4px; background: var(--sig); color: var(--sig-fg); font: 800 12px/18px var(--ff); text-align: center; letter-spacing: 0; }
.ph-nav .me { display: grid; place-items: center; width: 22px; height: 22px; border: 1.5px solid currentColor; font: 800 10px var(--ff); }

.pb-sub { display: flex; align-items: center; gap: 18px; padding: 0 16px; border-bottom: 1px solid var(--hair); }
.pb-sub .ar-fl { margin-left: auto; }
```

#### 1.7.4 `PhoneShellQuiet.svelte`
```svelte
<div class="ph-root">
<header class="pq">
  <a class="pq-skip" href="#content">Skip to content</a>
  {#if boardName}<div class="pq-row"><span class="pq-board">Board: <b>{boardName}</b> <span class="pq-dash" aria-hidden="true">—</span> <button class="pq-link" type="button" aria-haspopup="menu" aria-label="Switch board: {boardName}" onclick={openBoardSwitcher}>Change board</button></span><span class="sr" role="status">Live</span></div>{/if}
  <div class="pq-row"><button class="pq-btn" type="button" aria-label="Search cards, agents and actions (⌘K)" onclick={openSearch}>Search</button><button class="pq-btn" type="button" onclick={compose}>New card</button>{#if view && view!=='projects'}<button class="pq-link" type="button" aria-haspopup="dialog" onclick={openFilter}>Filter</button>{/if}</div>
  {#if view}<div class="pq-row"><div class="pq-view" role="group" aria-label="View">View: <button class="pq-link" aria-pressed=…>Board</button><span class="pq-dot" aria-hidden="true">·</span><button …>List</button><span class="pq-dot" aria-hidden="true">·</span><button …>Projects</button></div></div>{/if}
</header>
{@render children()}
<nav class="pqb" aria-label="Main"><a href={planHref} aria-current=…>Plan</a><a href={operateHref} aria-current=…>Operate{#if n}&#160;<span class="need">({n})</span><span class="sr"> need you</span>{/if}</a><a href="/workspace/agents" aria-current=…>Workspace</a><a href="#you" aria-haspopup="menu" onclick={openYou}>You<span class="sr">, {userName}</span></a></nav>
</div>
```
CSS verbatim `dc:SP-Phone-Board-Quiet:30-46`:
`dc:SP-Phone-Board-Quiet:30-46`
```css
/* shell: plain text, no icons */
.pq-skip { position: absolute; left: var(--vk-space-4); top: -200px; z-index: 2; display: inline-flex; align-items: center; min-height: 44px; padding: 0 var(--vk-space-4); background: var(--vk-color-surface); border: 2px solid var(--vk-color-text); border-radius: var(--vk-radius-sm); color: var(--vk-color-text); font-weight: 700; text-decoration: underline; }
.pq-skip:focus { top: var(--vk-space-2); }
.pq{position:relative;display:flex;flex-direction:column;gap:2px;padding:6px 16px 10px;background:var(--vk-color-bg);border-bottom:1px solid var(--vk-color-line);font-size:17px}
.pq-row{display:flex;flex-wrap:wrap;align-items:center;gap:0 16px}
.pq a,.pq-link{display:inline-flex;align-items:center;min-height:44px;padding:0;border:0;background:transparent;color:var(--vk-color-text);font:inherit;text-decoration:underline;text-underline-offset:4px;cursor:pointer}
.pq-link[aria-pressed="true"]{font-weight:700;text-decoration:none}
.pq-board{overflow-wrap:anywhere}
.pq-board b{font-weight:700}
.pq-dash,.pq-dot{color:var(--vk-color-muted)}
.pq-btn{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border:2px solid var(--vk-color-text);border-radius:var(--vk-radius-sm);background:var(--vk-color-surface);color:var(--vk-color-text);font:inherit;font-weight:700;cursor:pointer}
.pq-view{display:inline-flex;flex-wrap:wrap;align-items:center;gap:0 8px}
.pqb{position:sticky;bottom:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--vk-color-bg);border-top:2px solid var(--vk-color-text);margin-top:auto;padding:0 4px}
.pqb a{min-height:52px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:16px;color:var(--vk-color-text);text-decoration:underline;text-underline-offset:4px}
.pqb a[aria-current="page"]{font-weight:700;text-decoration:none}
.pqb .need{font-weight:700;color:var(--vk-color-signal-text)}
.pq a:focus-visible,.pq button:focus-visible,.pqb a:focus-visible{outline:3px solid var(--vk-color-text);outline-offset:2px}
```

#### 1.7.5 `YouMenu.svelte` (all four phones; not drawn — G15)
`vibekit:Menu` opened above the bottom bar (`placement: 'top'`), items: heading `userName` / sub "Signed in"; `Appearance` (openAppearance); checkbox `Dark theme` (toggleTheme, checked = dark); `Sign out`. Styling reuses the vibe's desktop account menu rules (`.dy-menu`, `.mh-menu`, `.ar` menu = `.mh-menu` look with `--rule` border and radius 0, Quiet = plain list of underlined `qn-link`s with 44px rows). Esc / outside click closes; focus returns to "You".

### 1.8 Shell interactions (all vibes)

| Control | Call | Notes |
|---|---|---|
| Plan / Operate / Workspace | `<a href>` → SvelteKit navigation | `aria-current="page"` from `here` |
| Board switcher | `shellModel.openBoardSwitcher()` → `app.boardSwitcherOpen = true` → `BoardSwitcher` dialog (spec: dialogs group, SP-Dlg-BoardSwitcher); choosing → `app.switchBoard(id)` + `goto('/b/'+id)` | |
| Search / command field / ⌘K | `app.toggleCmdk()` | CommandPalette |
| New card / Write a new card / N | `app.requestCompose()` → ComposeSheet (mounted by AppShell) | |
| View switch | `app.setView(v)` | Studio tabs, Paper tabs: `aria-pressed` |
| Filter | `app.filterOpen = true` → `plan/FilterDialog.svelte` (NEW: FilterBar's controls inside the vibe's dialog frame, title "Filter cards"; G16) | count = `filterSummary` |
| Appearance | `appearance.pickerOpen = true` | AppearanceDialog |
| Dark/Light theme | `appearance.toggleTheme()` | label flips |
| Account menu | `<details>` (Daylight, Paper) / `vibekit:Menu` (Studio, Quiet, phones) | |
| Sign out | `signOut()` | |
| Skip to content (Quiet) | `href="#content"`; the page's main has `id="content" tabindex="-1"` | visible on focus |

---

## 2. Board data model shared by the eight board artboards

`BoardLayoutProps` (modify `board/layouts/types.ts`):
```ts
export interface BoardLayoutProps {
  model: BoardModel;           // NEW, from buildBoardModel()
  vibe: Vibe; phase: Phase;
  onCompose: () => void;
}
```
(`summaries`, `stages`, `attention`, `boardName`, `cardCount` move into `model`.) PlanView (modify): computes `model = $derived(buildBoardModel(app.board, app.filteredCards(), ctx))`, renders `<AppShell here="plan" section={view} boardName view showing paperShowing editionCount studioSubRight status sky={vibe==='daylight' && view==='board' && !viewport.phone ? dlGreeting : vibe==='daylight' && viewport.phone ? pdHello : undefined}>` and inside: empty board → `BoardEmpty`; else `BOARD_LAYOUTS[vibe][phone?'phone':'desktop']`.

`board/board-model.ts` (NEW):
```ts
export interface BoardModel {
  boardId: string; boardName: string;
  cards: CardSummary[];               // non-archived, filtered, each with the fields below
  ordered: CardSummary[];             // "people needed first": groupByUrgency flattened (needs, working, queued, done, closed)
  stages: StageSummary[];             // + ownerLong, ownerShort, units
  needs: CardSummary[]; working: CardSummary[]; queued: CardSummary[]; done: CardSummary[]; closed: CardSummary[];
  counts: { all: number; needs: number; working: number; queued: number; queuedBlocked: number; done: number; closed: number; overdue: number; overBudget: number; blocked: number };
  spend7d: number | null;             // getUsage(boardId,'7d').totalCostUsd, fetched by PlanView once per board open + on usage feed events
  crew: CrewMember[];                 // §1.3.3
}
```
`CardSummary` additions (`card-summary.ts`):
```ts
lastAgent: AgentRef | null;        // from NEW Card.lastAgentId (G2)
ageShort: string; ageLong: string; agoWords: string;   // §0.3
stopReason: string | null;         // card.needsHuman.detail verbatim, else for no-owner the attention instruction
summaryLine: string | null;        // NEW Card.needsHuman.summary (G3)
labelsAll: number;                 // c.labels.length (ids without a catalogue entry still count toward "+N"; G8)
moreLabels: number;                // labelsAll - shown (shown = first 3 resolvable)
kind: AttentionKind | null;        // attention?.kind
terminal: boolean;                 // stage is the last stage
fnNumber: number;                  // Studio footnote number (§4.3)
```
Stage owner labels (extend `stage-owner.ts`):
- `ownerLong` (desktop): human → `a person` / `a person · approval` (gate); capability → `${label} · ${declaredBy.length===1 ? declaredBy[0] : plural(n,'agent','agents')}` ("testing · tester-tim", "code · 2 agents", "integration or api or testing · 3 agents", "diagnostics · error-eric"); undeclared → existing coral warning path.
- `ownerShort(sep=' · ')` (phones): human → `a person`; human gate → `gate${sep}approval by a person`; capability with exactly one capability → `${cap}${sep}${who}` (who as above); multi-capability → `stage.owner` only ("integration"). Quiet phone uses `sep=': '`.

---

## 3. SP-Board-Daylight — 1440 × 1017, Daylight, route `/b/brd_134a0ddb6d434478` (view board), peek open on card 02

### 3.1 Component tree
- `board/layouts/BoardDaylight.svelte` (rewrite): `<section class="dl-board" aria-label="{boardName} stages" style="grid-template-columns: {cols}">` with one child per stage: non-empty → `DlLane`; empty → `DlStrip` (collapsed) or `DlLane` (expanded).
- `board/daylight/DlGreeting.svelte` (NEW, rendered through the shell `sky` snippet by PlanView): `.dl-band`.
- `board/daylight/DlLane.svelte` (NEW) props `{ stage: StageSummary; cards: CardSummary[]; peekId: string | null; style?: string; onCollapse?: () => void }`.
- `board/daylight/DlStrip.svelte` (NEW) props `{ stage: StageSummary; ownerFace: { name: string; mood: Mood } | null; onExpand: () => void }`.
- `board/daylight/DlTile.svelte` (NEW, replaces `CardTile.svelte` for Daylight) props `{ s: CardSummary; stages: Stage[]; peekOpen: boolean; onPeek: (id: string|null) => void }`.
- `board/daylight/DlPeek.svelte` (NEW, replaces `Peek.svelte`) props `{ s: CardSummary; onClose: () => void }` — `vibekit:Popover`.
- Reuse: `CardMoveMenu.svelte` (Move button opens it; `visible` true), `peek.ts` debounce helpers, `attention.ts`, `card-summary.ts`.
- Delete: `board/BoardKanban.svelte`, `board/GreetingBand.svelte`, `board/Peek.svelte` (+ tests; port their assertions), `CardTile.svelte` if no other user remains (ListView uses its own rows — confirm with list spec).

### 3.2 CSS (verbatim `dc:SP-Board-Daylight:23-77`)
Split by component: `.dl-band…dl-jump` → DlGreeting; `.dl-board`, `.dl-lane…`, `.dl-lanehead…`, `.dl-count`, `.dl-blocked`, `.dl-owner` → DlLane/BoardDaylight; `.dl-strip…` → DlStrip; `.dl-tile…`, `.dl-title`, `.dl-move`, `.dl-chips`, `.dl-chip`, `.dl-ref`, `.dl-meta`, `.dl-who`, `.dl-mood`, `.dl-asked`, `.dl-due`, `.dl-act` → DlTile; `.dl-peek…dl-close` → DlPeek. The selector `.dl-lane:not(:last-child)::after, .dl-strip:not(:last-child)::after` is split into one rule in each component (the arrow between columns). `.dl-act .vk-button` → `.dl-act :global(.vk-button)`.

`dc:SP-Board-Daylight:23-77`
```css
.dl-band { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; margin: 0 16px; padding: 14px 4px 18px; border-top: 1px solid color-mix(in oklch, var(--vk-color-surface) 50%, transparent); }
.dl-greet { margin: 0; font-family: var(--vk-font-display); font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
.dl-crew { display: flex; align-items: center; gap: 10px; font-size: 14px; }
.dl-crew ul { display: flex; gap: 6px; margin: 0; padding: 0; list-style: none; }
.dl-crew li { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px 3px 3px; border-radius: var(--vk-radius-pill); background: color-mix(in oklch, var(--vk-color-surface) 70%, transparent); font-weight: 600; }
.dl-jump { margin-left: auto; font-size: 14px; font-weight: 600; }
.dl-board { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) 60px minmax(0, 1.15fr) minmax(0, 1fr) 60px 60px minmax(0, 1fr); gap: 22px; padding: 20px 4px 28px; align-items: start; }
.dl-lane { position: relative; display: flex; flex-direction: column; gap: 10px; min-width: 0; padding: 12px; border-radius: var(--vk-radius-md); background: var(--vk-color-raised); }
.dl-lane:not(:last-child)::after, .dl-strip:not(:last-child)::after { content: ""; position: absolute; top: 22px; right: -16px; width: 10px; height: 10px; border-top: 2px solid var(--vk-color-faint); border-right: 2px solid var(--vk-color-faint); transform: rotate(45deg); }
.dl-lanehead { display: flex; flex-direction: column; gap: 2px; padding: 2px 4px 4px; }
.dl-lanehead h2 { display: flex; align-items: baseline; gap: 8px; margin: 0; font-family: var(--vk-font-display); font-size: 17px; font-weight: 700; }
.dl-count { font: 600 14px/1 var(--vk-font-mono); color: var(--vk-color-muted); }
.dl-blocked { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: var(--vk-color-muted); }
.dl-owner { font-size: 13px; color: var(--vk-color-muted); overflow-wrap: anywhere; }
.dl-strip { position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px; width: 60px; min-height: 260px; padding: 12px 0; border: 2px dashed var(--vk-color-line); border-radius: var(--vk-radius-md); background: transparent; color: var(--vk-color-muted); cursor: pointer; }
.dl-strip:hover { background: var(--vk-color-raised); color: var(--vk-color-text); }
.dl-strip .v { writing-mode: vertical-rl; font-family: var(--vk-font-display); font-weight: 700; font-size: 15px; color: var(--vk-color-text); }
.dl-strip .n { font: 600 13px/1 var(--vk-font-mono); }
.dl-strip .gate { writing-mode: vertical-rl; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--vk-color-muted); }
.dl-strip .owner { writing-mode: vertical-rl; font-size: 12px; color: var(--vk-color-muted); }
.dl-tile { position: relative; display: flex; flex-direction: column; gap: 9px; padding: 12px 12px 12px 15px; border-radius: var(--vk-radius-sm); background: var(--vk-color-surface); box-shadow: 0 var(--vk-lift) 0 var(--vk-color-ground); overflow: visible; }
.dl-tile::before { content: ""; position: absolute; left: 0; top: 10px; bottom: 10px; width: 4px; border-radius: 0 4px 4px 0; }
.dl-tile.p1::before { background: var(--vk-color-signal); }
.dl-tile.p2::before { background: var(--vk-color-primary); }
.dl-tile.needs { box-shadow: inset 0 0 0 2px var(--vk-color-signal), 0 var(--vk-lift) 0 var(--vk-color-ground); }
.dl-tile.focused { outline: 3px solid var(--vk-color-text); outline-offset: 3px; }
.dl-tile h3 { margin: 0; font-size: 15.5px; line-height: 1.35; font-weight: 700; padding-right: 64px; overflow-wrap: anywhere; }
.dl-title { all: unset; cursor: pointer; }
.dl-title::after { content: ""; position: absolute; inset: 0; border-radius: var(--vk-radius-sm); }
.dl-title:focus-visible::after { outline: 3px solid var(--vk-color-text); outline-offset: 2px; }
.dl-move { position: absolute; z-index: 2; top: 6px; right: 6px; display: inline-flex; align-items: center; gap: 4px; min-height: 36px; padding: 0 8px; border: 0; border-radius: var(--vk-radius-sm); background: transparent; color: var(--vk-color-muted); font-size: 13px; font-weight: 600; cursor: pointer; }
.dl-move:hover { background: var(--vk-color-raised); color: var(--vk-color-text); }
.dl-chips { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 5px; }
.dl-chip { display: inline-flex; align-items: center; gap: 4px; padding: 1px 9px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); color: var(--vk-color-muted); font-size: 12.5px; font-weight: 600; }
.dl-chip.block { background: var(--vk-color-bg); color: var(--vk-color-text); box-shadow: inset 0 0 0 1px var(--vk-color-line); }
.dl-ref { position: relative; z-index: 1; display: flex; align-items: flex-start; gap: 6px; padding: 6px 9px; border-radius: 8px; background: var(--vk-color-bg); font: 12px/1.45 var(--vk-font-mono); color: var(--vk-color-muted); overflow-wrap: anywhere; }
.dl-meta { position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; font-size: 13.5px; }
.dl-who { display: inline-flex; align-items: center; gap: 7px; font-weight: 700; }
.dl-mood { font-weight: 600; color: var(--vk-color-muted); }
.dl-mood.needs { color: var(--vk-color-signal-text); }
.dl-asked { display: inline-flex; align-items: center; gap: 5px; padding: 1px 8px 1px 2px; border-radius: var(--vk-radius-pill); background: var(--vk-mood-thinking); color: var(--vk-face-ink); font-size: 12.5px; font-weight: 600; }
.dl-due { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 700; color: var(--vk-color-signal-text); }
.dl-act { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
.dl-act .vk-button { min-height: 44px; max-width: 100%; padding: 0 14px; font-size: 14.5px; overflow: hidden; text-overflow: ellipsis; }
.dl-peek { position: absolute; z-index: 10; top: -6px; left: calc(100% + 18px); width: 380px; display: flex; flex-direction: column; gap: 14px; padding: 18px 18px 16px; border-radius: var(--vk-radius-md); background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: 0 0 0 1px var(--vk-color-line), 0 18px 48px color-mix(in oklch, var(--vk-color-text) 22%, transparent); }
.dl-peek::before { content: ""; position: absolute; left: -8px; top: 26px; width: 14px; height: 14px; background: var(--vk-color-surface); transform: rotate(45deg); box-shadow: -1px 1px 0 var(--vk-color-line); }
.dl-peek .eyebrow { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--vk-color-muted); }
.dl-peek h3 { margin: 0; font-family: var(--vk-font-display); font-size: 19px; line-height: 1.25; }
.dl-say { display: flex; gap: 12px; align-items: flex-start; }
.dl-bubble { flex: 1; min-width: 0; padding: 10px 12px; border-radius: 4px var(--vk-radius-md) var(--vk-radius-md) var(--vk-radius-md); background: var(--vk-color-signal-wash); color: var(--vk-color-text); font-size: 14.5px; line-height: 1.5; overflow-wrap: anywhere; }
.dl-bubble .who { display: block; margin-bottom: 4px; font-weight: 700; font-size: 13px; color: var(--vk-color-signal-text); }
.dl-clamp { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.dl-peekfoot { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.dl-hint { margin-left: auto; font-size: 12.5px; color: var(--vk-color-faint); }
.dl-close { position: absolute; top: 8px; right: 8px; }
```

Grid columns (`cols`): one entry per stage in order: empty & collapsed → `60px`; the stage(s) with the highest count when that count > 1 → `minmax(0, 1.15fr)`; others → `minmax(0, 1fr)`. Fixture → `minmax(0, 1fr) 60px minmax(0, 1.15fr) minmax(0, 1fr) 60px 60px minmax(0, 1fr)` (= mockup). The lane holding the open peek gets `style="z-index: 5"`.
Responsive: this layout renders only ≥900px; between 900 and 1279 the grid keeps the same template (lanes shrink); the peek renders only at ≥1440 (`window.matchMedia('(min-width: 1440px)')`, as Peek today) — below that, pointing does nothing and Enter opens the card.

### 3.3 Content map

**Greeting band (`.dl-band`, inside the sky)**
| Visible | Source |
|---|---|
| "Good afternoon, Rakesh. 3 cards want you." | `${greeting(phase,'daylight').replace(/\.$/,'')}, ${firstName}. ${needs===0 ? 'Nothing needs you.' : `${needs} ${needs===1?'card wants':'cards want'} you.`}` |
| "Holding cards" | fixed copy |
| two chips face 28 + name | distinct `lastAgent` of needs cards, mood `needs` (tester-tim, coder-kai) — `vibekit:Face` |
| "Show me the first one" | fixed; `href="#first-needs"` → scrolls to and focuses the first needs tile (its title button has `id="first-needs"`). Hidden when needs = 0 |

**Lanes** (`dl-lanehead`): h2 = stage name; `.dl-count` = count, `aria-label="{n} cards"`; `.dl-blocked` (only if `stage.blocked > 0`) icon `blocked 14` + "{n} blocked", title "Blocked cards are skipped when agents claim work"; `.dl-owner` = `ownerLong`.

**Strips** (empty stages): `.n` = 0; face 28 of the single declaring agent (resting) when `declaredBy.length===1` (error-eric on Reproduce), else none; `.v` = name; `.gate` = "gate" when approval gate; `.owner` vertical = for capability multi → `plural(n,'agent','agents')` ("3 agents"), human → "a person"; single-agent stages show the face instead of owner text. `aria-label="{name}, no cards. {ownerLong}{gate ? ', approval gate' : ''}. Expand stage"`, `title={ownerLong}` (Signed off title "a person · approval"; aria "a person · approval, approval gate").

**Tiles** — order within a lane: `groupByUrgency` order. Classes: `p1` when priority 1, `p2` when priority 2, `needs` when urgency needs, `focused` when it is the peek's card.
| Element | Source / rule |
|---|---|
| h3 title button | `s.title`; aria-label "{title}, in {stageName}. Enter to open, M to move, Alt with left or right arrow to move between stages." |
| Move | icon `move 16` + "Move"; aria-label "Move {title} to another stage" → CardMoveMenu |
| `.dl-chips` | sr "Priority {p}" when p>0; label chips (first 3 names); "+{moreLabels}" title "1 more label"/"{n} more labels"; Blocked chip (`.dl-chip.block`, icon `blocked 13`, "Blocked", title "Blocked by another card. This card will not be claimed") when `s.blocked`. Omitted when empty except the sr span. |
| `.dl-ref` | icon `link 14` + `firstRef.title` (only cards with a reference) |
| `.dl-who` | needs+no-owner & owner is me: `vibekit:Initials` RG 24 (raised-line, 9px) + "With you" + `<span class="dl-mood needs">· no agent works this stage</span>`; needs+lastAgent: face 24 needs + name + `· needs you`; queued unclaimed: muted "Unclaimed · starts when unblocked" (blocked) / "Unclaimed · waiting to be picked up" (not blocked; not drawn); done: success-text icon `check 18` + terminal stage name ("Shipped"); working: face 24 working + name + `· working` (not drawn) |
| `.dl-asked` | when `queuedBy` agent: face 18 (resting, G5) + "asked by {name}", title "Queued by {name}, not by you" |
| `.dl-due` | when overdue: icon `warn 14` + "Overdue · due {dueShort}" ("Overdue · due 6 Oct"); due not overdue: same span without signal colour: "Due {dueShort}" in `--vk-color-muted` (not drawn) |
| `.dl-act` | needs/no-owner: `vk-button--signal` "Move to another stage" (opens CardMoveMenu); needs/blocked or repeated-failure: `vk-button--signal` "Resume" (opens the card at its resume box: `app.openCard(id)` + `CardDrawer` focus `resume`) ; other kinds: question → "Answer", review → "Review" (open card). None for queued/done |

**Peek (`DlPeek`)** for card 02:
| Visible | Source |
|---|---|
| close button (`sh-iconbtn dl-close`, icon `close 18`, "Close peek") | onClose |
| "Peek · Failing test · 33h in this stage" | `Peek · ${stageName} · ${ageShort} in this stage` |
| h3 | title |
| face 36 `role="img" aria-label="tester-tim, needs you"` | lastAgent, mood |
| bubble `.who` "tester-tim · I’ve stopped and need you" | `${name} · ${KIND_SAYS[kind]}` with `KIND_SAYS = { blocked: 'I’ve stopped and need you', 'repeated-failure': 'I keep failing and need you', question: 'I have a question', review: 'please review my work', 'no-owner': 'nobody works this stage' }` |
| bubble text (clamped 4 lines) | `needsHuman.detail` verbatim |
| buttons "Resume" (primary) · "Open card to read it all" (secondary) | resume → as tile; open → `app.openCard(id)` |
| hint "Opens when you point at or focus a card · Esc closes" | fixed |

Last tile: Shipped card: chips sr "Priority 2" only; ref "test(api): pin immutable approval subject binding"; who "✓ Shipped".

### 3.4 Interactions & states
| Interaction | Behaviour |
|---|---|
| Point at / focus a tile (≥1440) | `peek.look(id)` debounced 300 ms → peek opens beside the tile; Esc or close → closes, focus back to the title |
| Enter on title / click | `app.openCard(id)` |
| M on focused tile | opens CardMoveMenu |
| Alt+←/→ | `CardMoveMenu.step(±1)` → `app.moveCard` |
| Strip click / Enter | toggles `expanded[stageKey]`; expanded empty stage renders a `DlLane` whose body is `<p class="dl-owner">No cards in this stage.</p>` (not drawn; G14); its lanehead gets a "Collapse" `sh-iconbtn` (icon `chev 18`, rotated 180°) |
| Drag and drop | unchanged (pragmatic-drag-and-drop on `.dl-tile`) |
| Loading | board layout shows the shell with the existing "establishing link to the board…" line in place of `.dl-board` |
| Error (`app.error`) | existing error bar above the board |

### 3.5 Fixture needs
Developer Experience board, 6 non-archived cards + 3 archived (archived are never shown), stages, agents, references, labels — all in §7.

---

## 4. SP-Board-Paper / SP-Board-Studio / SP-Board-Quiet (desktop)

### 4.1 SP-Board-Paper — 1440 × 1543, Paper, `/b/brd_134a0ddb6d434478`
**Tree**: `board/layouts/BoardPaper.svelte` (rewrite) → `<main class="pp">` with `.pp-cols` (three `section.pp-col`) + `PaperPipeline` (`.pp-pipe`). `board/paper/PaperStory.svelte` (NEW) props `{ s: CardSummary; size: 'lead' | 'small'; stages: Stage[] }`; `board/paper/PaperPipeline.svelte` props `{ stages: StageSummary[] }`. Reuse CardMoveMenu. Delete the old BoardPaper body and its test (rewrite test).

**CSS** verbatim `dc:SP-Board-Paper:67, 72-110` (lines 68-71 `.pp-mast/.pp-date/.pp-folio` are never rendered — the masthead is the shell's — do not port):
`dc:SP-Board-Paper:67-67`
```css
.pp { padding: 28px 56px 64px; display: flex; flex-direction: column; gap: 28px; }
```
`dc:SP-Board-Paper:72-110`
```css
.pp-cols { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr); gap: 0; }
.pp-col { display: flex; flex-direction: column; gap: 0; padding: 0 28px; min-width: 0; }
.pp-col:first-child { padding-left: 0; }
.pp-col:last-child { padding-right: 0; }
.pp-col + .pp-col { border-left: 1px solid var(--vk-color-line); }
.pp-kicker { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; padding-bottom: 8px; border-bottom: 1px solid var(--vk-color-text); font-size: 12.5px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; }
.pp-kicker.live { color: var(--vk-color-signal-text); }
.pp-kicker.live::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--vk-color-signal); }
.pp-kicker + .pp-none, .pp-sub { margin-top: 2px; }
.pp-none { margin: 10px 0 26px; font-family: var(--vk-font-display); font-style: italic; font-size: 18px; color: var(--vk-color-muted); }
.pp-story { display: flex; flex-direction: column; gap: 10px; padding: 18px 0 20px; border-bottom: 1px solid var(--vk-color-line); }
.pp-story h3 { margin: 0; font-family: var(--vk-font-display); font-weight: 500; line-height: 1.22; overflow-wrap: anywhere; }
.pp-story h3 a { text-decoration: none; }
.pp-story h3 a:hover { text-decoration: underline; text-underline-offset: 4px; }
.pp-lead h3 { font-size: 27px; }
.pp-small h3 { font-size: 20px; }
.pp-quote { margin: 0; font-family: var(--vk-font-display); font-style: italic; font-size: 18.5px; line-height: 1.5; overflow-wrap: anywhere; }
.pp-clamp { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.pp-more { align-self: flex-start; min-height: 44px; margin-top: -8px; padding: 0; border: 0; background: transparent; font-size: 15px; font-weight: 600; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.pp-by { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 14.5px; color: var(--vk-color-muted); }
.pp-by em { font-family: var(--vk-font-display); font-size: 16px; color: var(--vk-color-text); }
.pp-facts { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--vk-color-muted); overflow-wrap: anywhere; }
.pp-facts .due { color: var(--vk-color-signal-text); font-weight: 700; }
.pp-facts .ref { text-transform: none; letter-spacing: 0; font-family: var(--vk-font-mono); font-size: 12px; }
.pp-acts { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.pp-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 16px; border: 1px solid var(--vk-color-text); border-radius: var(--vk-radius-sm); background: transparent; font-size: 15px; font-weight: 600; text-decoration: none; cursor: pointer; }
.pp-btn.reply { background: var(--vk-color-signal-wash); border-color: var(--vk-color-signal); color: var(--vk-color-signal-text); }
.pp-btn.ghost { border-color: var(--vk-color-line); color: var(--vk-color-muted); }
.pp-write { display: flex; flex-direction: column; gap: 8px; margin-top: 26px; padding: 18px; border: 1px solid var(--vk-color-line); border-radius: var(--vk-radius-sm); background: var(--vk-color-surface); }
.pp-write h3 { margin: 0; font-family: var(--vk-font-display); font-size: 21px; font-weight: 500; }
.pp-write p { margin: 0; font-size: 14.5px; color: var(--vk-color-muted); }
.pp-pipe { border-top: 1px solid var(--vk-color-text); padding-top: 10px; }
.pp-pipe h2 { margin: 0 0 12px; font-size: 12.5px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; }
.pp-pipe ol { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 0; margin: 0; padding: 0; list-style: none; }
.pp-pipe li { display: flex; flex-direction: column; gap: 3px; padding: 0 14px; border-left: 1px solid var(--vk-color-line); font-size: 13.5px; color: var(--vk-color-muted); overflow-wrap: anywhere; }
.pp-pipe li:first-child { padding-left: 0; border-left: 0; }
.pp-pipe b { font-family: var(--vk-font-display); font-size: 18px; font-weight: 500; color: var(--vk-color-text); }
.pp-pipe .n { font-family: var(--vk-font-display); font-style: italic; color: var(--vk-color-text); }
```
`.pp` padding 56px matches the shell gutter `--mh-gutter: 56px`. Below 1100px: `.pp-cols { grid-template-columns: minmax(0,1fr); } .pp-col { padding: 0 } .pp-col + .pp-col { border-left: 0; border-top: 1px solid var(--vk-color-line); padding-top: 18px } .pp-pipe ol { grid-template-columns: repeat(2, minmax(0,1fr)); row-gap: 12px }` (no mockup between 900–1100; G14).

**Content map**
| Column / element | Source |
|---|---|
| Col 1 kicker `.pp-kicker.live` "Waiting on you · 3 letters" | `Waiting on you · ${plural(needs,'letter','letters')}`; when 0: kicker without `.live` + `.pp-none` "Nothing waits on you." |
| lead stories | `needs` in board order (ordered); `.pp-lead` |
| story h3 link | title; `href="/b/{id}/c/{cardId}"`, aria-label as Daylight |
| `.pp-quote` | no-owner: `“${instruction}”`; blocked etc.: `“${needsHuman.detail}”` verbatim inside typographic quotes; clamped (`.pp-clamp`, 3 lines) when the text exceeds 3 lines (measured: `scrollHeight > clientHeight`), with `.pp-more` "Read the rest" / "Show less" (`aria-expanded`) — only rendered when clamped |
| `.pp-by` | no-owner mine: Initials RG 24 + `<em>With you</em> · {stage} · {ageShort}`; agent: face 24 needs + `<em>{agent}</em> · {stage} · {ageShort} · {attempts===1 ? 'attempt 1' : `${n} attempts`}`; queued: `<em>Unclaimed</em> · {stage} · starts when unblocked`; done: icon `check 18` + `<em>{terminal stage name}</em> · {stageName}` |
| `.pp-facts` | `P{p}` (when p>0) · labels joined " · " + " · +{more}" as one span · ref (`.ref` mono, firstRef title) · `[icon blocked 13] Blocked` when blocked · "asked by {queuer}" · `.due` "Overdue · due 6 Oct" |
| `.pp-acts` | needs no-owner: `.pp-btn.reply` "Move to a stage someone works" (CardMoveMenu); blocked: `.pp-btn.reply` "Resume" (open card at resume); every story: `a.pp-btn` "Open" + icon `arrow 16` (aria "Open {title}") and `.pp-btn.ghost` icon `move 16` "Move" (aria "Move {title} to another stage") |
| Col 2 kicker "In progress" + `.pp-none` "Nothing in progress." / working stories (small) | working |
| kicker "Coming up · 2" + small stories | queued |
| Col 3 kicker "Shipped · 1" + small stories | done whose stage is terminal (label = terminal stage name) |
| kicker "Closed" (margin-top 26px) + "No card has been closed." / closed stories | closed |
| `.pp-write` h3 "Write a new card", p "Describe it in a sentence; an agent drafts the brief.", `.pp-btn` icon `plus 16` "New card" | fixed; onCompose |
| `.pp-pipe` h2 "The pipeline · read left to right"; per stage li: `<b>{name}</b>`, `.n` count `plural(n,'card','cards')` or "empty", optional "{n} blocked", optional "approval gate", owner `ownerLong` | stages (`grid-template-columns: repeat(7,…)` = stage count; set inline `repeat({stages.length}, minmax(0, 1fr))`) |

Interactions: Read the rest toggle (local `$state` per story); Open (link); Move (CardMoveMenu); Resume; New card (`onCompose`).

### 4.2 SP-Board-Studio — 1440 × 2355, Studio, `/b/brd_134a0ddb6d434478`
**Tree**: `board/layouts/BoardStudio.svelte` (rewrite) → `<div class="bd-grid"><main class="bd-main">…</main><aside class="bd-panel">…</aside></div>`; NEW `board/studio/StudioHero.svelte`, `StudioNeedsPanel.svelte`, `studio-prose.ts` (hero sentence + footnotes). vibekit: `QuickFilter` (`.bd-qf`), `FigureRow` (`.ar-figs`), `StageMultiples` (`.ar-sm/.ar-mul`), `ShareBar` (`.ar-share`), `DataTable` (`.ar-tbl`), `StageRamp`, `StateMarker`, `Footnote(List)`, `Face`, `Initials`. Shell props: `status = { items: [ '6 cards', {text:'3 need you', signal:true}, '2 blocked', '1 shipped', 'synced 13:51' ], right: ['⌘K commands','N new card'] }` (parts with 0 omitted except cards), `studioSubRight` §1.5.

**CSS** verbatim `dc:SP-Board-Studio:204-260` (the `.ar.bd` grid lines 201-203 are the shell's):
`dc:SP-Board-Studio:204-260`
```css
.bd-grid { flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) 400px; }
.bd-main { min-width: 0; display: flex; flex-direction: column; gap: 36px; padding: 24px 40px 40px; }
.bd-qf { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 0; }
.bd-qf .lb { margin-right: 14px; }
.bd-qf button { position: relative; display: inline-flex; align-items: baseline; gap: 6px; min-height: 44px; padding: 0 14px; border: 0; border-left: 1px solid var(--hair); background: transparent; color: var(--muted); font: 700 14px var(--ff); white-space: nowrap; cursor: pointer; }
.bd-qf button:first-of-type { border-left: 0; padding-left: 0; }
.bd-qf button b { font: 500 12.5px var(--fm); }
.bd-qf button[aria-pressed="true"] { color: var(--text); text-decoration: underline; text-decoration-thickness: 3px; text-underline-offset: 8px; }
.bd-qf button.sig b { color: var(--sig-text); font-weight: 600; }
.bd-qf .r { margin-left: auto; font: 500 12px var(--fm); color: var(--muted); white-space: nowrap; }

/* small multiples */
.ar-sm { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); column-gap: 12px; }
.ar-mul { display: flex; flex-direction: column; gap: 8px; min-width: 0; color: var(--text); text-decoration: none; }
.ar-mul .band { height: 6px; }
.ar-mul .lb { display: flex; flex-direction: column; gap: 1px; }
.ar-mul .lb .mono { font-size: 11.5px; color: var(--muted); }
.ar-mul .nm { font: 700 13.5px/1.2 var(--ff); white-space: nowrap; }
.ar-mul:hover .nm { text-decoration: underline; text-underline-offset: 3px; }
.ar-mul .n { font: 900 72px/.9 var(--ff); font-stretch: 72%; letter-spacing: -.03em; }
.ar-mul.z .n { font-weight: 300; color: var(--muted); }
.ar-mul .units { display: flex; flex-wrap: wrap; gap: 3px; min-height: 18px; padding-bottom: 8px; border-bottom: 1px solid var(--rule); }
.ar-mul .note { font: 500 12.5px/1.35 var(--ff); color: var(--muted); overflow-wrap: anywhere; }
.ar-mul .who { font: 500 11.5px/1.35 var(--fm); color: var(--muted); overflow-wrap: anywhere; }
.ar-mul .gate { align-self: flex-start; padding: 1px 5px; border: 1px solid var(--rule); font: 700 11px/1.4 var(--ff); letter-spacing: .08em; text-transform: uppercase; color: var(--text); }

/* share bar */
.ar-share { display: grid; grid-template-columns: 3fr 2fr 1fr; column-gap: 3px; row-gap: 8px; }
.ar-share .lab { display: flex; align-items: baseline; gap: 8px; font: 700 13.5px var(--ff); white-space: nowrap; }
.ar-share .lab b { font: 900 48px/.9 var(--ff); font-stretch: 72%; letter-spacing: -.02em; }
.ar-share .lab.s { color: var(--sig-text); }
.ar-share .lab.s b { color: var(--sig); }
.ar-share i { height: 14px; }
.ar-share .needs { background: var(--sig); }
.ar-share .blocked { background: repeating-linear-gradient(135deg, var(--s5) 0 1.5px, transparent 1.5px 5px); box-shadow: inset 0 0 0 1.5px var(--s5); }
.ar-share .done { background: var(--s7); }

.bd-move { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 10px; border: 1px solid var(--rule); border-radius: 2px; background: transparent; color: var(--text); font: 700 13px var(--ff); white-space: nowrap; cursor: pointer; }
.bd-move:hover { background: var(--text); color: var(--bg); }
.ar-tbl td.mv { padding-right: 0; text-align: right; }

/* needs-you panel */
.bd-panel { min-width: 0; display: flex; flex-direction: column; gap: 22px; padding: 24px 28px 32px; border-left: 1px solid var(--rule); background: var(--paper); }
.bd-panel > header h2 { margin-top: 6px; font: 800 30px/1.04 var(--ff); font-stretch: 82%; letter-spacing: -.015em; }
.bd-panel > header p { margin-top: 8px; font: 400 16px/1.45 var(--fs); }
.bd-need { display: flex; flex-direction: column; gap: 10px; padding-top: 14px; border-top: 1.5px solid var(--rule); }
.bd-need .row { display: flex; align-items: baseline; gap: 10px; }
.bd-need .row .mono { font-size: 12px; color: var(--muted); }
.bd-need .row .age { margin-left: auto; color: var(--sig-text); font-weight: 600; }
.bd-need h3 { font: 800 17px/1.25 var(--ff); overflow-wrap: anywhere; }
.bd-need .by { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; font-size: 13px; color: var(--muted); }
.bd-need .by b { color: var(--text); font-weight: 700; }
.bd-need .by .stg { display: inline-flex; align-items: center; gap: 6px; }
.bd-need .acts { display: flex; flex-wrap: wrap; gap: 8px; }
.bd-keys { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 14px; padding-top: 14px; border-top: 1px solid var(--hair); font-size: 13px; }
.bd-keys dt { display: flex; gap: 4px; }
```
Below 1200px: `.bd-grid { grid-template-columns: minmax(0,1fr); } .bd-panel { border-left: 0; border-top: 1px solid var(--rule); } .ar-sm { grid-template-columns: repeat(4, minmax(0,1fr)); row-gap: 20px }` (G14).

**Content map**
| Element | Source |
|---|---|
| Quick filter "Show" + All 6 · Need you 3 (`.sig`) · Working 0 · Queued 2 · Done 1 | counts; local `quick` state (`'all'|'needs'|'working'|'queued'|'done'`), default `all`; filters the table rows and the panel list; figures/multiples/share stay whole-board |
| Hero `.big` "3" | needs count (`.big.ink` when 0) |
| kick "The state of the board" | fixed |
| h1 "<sr>3 </sr>of 6 cards are waiting on a person" | `${needs} of ${all} cards are waiting on a person` (needs=1 → "card is"); 0 → "None of the {all} cards is waiting on a person" |
| hero p | `studio-prose.ts heroSentence(model)`: needs items in table order, each clause + `<sup class="fn">{fn}</sup>`: no-owner → `one sits in a stage nobody works` + (overdue ? ` and is ${numWord(daysOverdue)} days overdue` : ''); blocked attempts≤1 → `one stopped in ${stage} on its first try`; blocked attempts>1 → `one stopped in ${stage} after ${numWord(n)} tries`; joined "; ", first letter capitalised, ending "."; then queued-blocked group: ` ${numWord(q,true)} more ${q===1?'is':'are'} queued behind a blocker,<fn>` and done: ` and ${numWord(d)} has shipped.<fn>`. Fixture output: "One sits in a stage nobody works and is five days overdue;¹ one stopped in Failing test on its first try;² one stopped in Fix after five tries.³ Two more are queued behind a blocker,⁴ and one has shipped.⁵" (mockup clause 2 differs: G7) |
| 01 "The board in figures" / "this week" | FigureRow: Cards 6 · Need you 3 (sig) · Working 0 (z) · Spend this week `$0.00` (z, fn 6) · Over budget 0 (z) · Overdue 1. `z` when value is 0/`$0.00`; spend = `model.spend7d` formatted `$x.xx` |
| 02 "Where the cards are, stage by stage" / "1 square = 1 card · stages darken towards Shipped" ("…towards {terminal stage name}") | StageMultiples per stage: band `c{i}` (i = order+1, capped 7), `0{i}`, name, count (`.z` when 0), units = one StateMarker per card ordered needs/blocked/queued/working/done, `.gate` "Gate · approval" for gate stages, `.who` ownerLong, `.note` (rules below) |
| multiple notes | empty → "Empty"; all done → "Done" + fn; single no-owner needs card overdue → `Overdue since ${dueShort}` + fn; single blocked needs card attempts>1 → `Stopped after ${n} tries` + fn; mixed → `${blocked} blocked, ${needs} stopped` + fn of the needs card ("2 blocked, 1 stopped²") |
| 03 "What state they are in" / "share of 6 cards" | ShareBar: segments needs ("waiting on you", `.lab.s`), queued ("queued, blocked" when every queued card is blocked, else "queued"), working ("working"), done ("done"); `grid-template-columns` inline = `${count}fr` per present segment; `role="img"` aria "3 waiting on you, 2 queued and blocked, 1 done" |
| 04 "Every card, people needed first" + key hints (↑ ↓ row · Enter open · M move · Alt + ← → stage) | DataTable caption sr "6 cards, people needed first"; columns No. 32 / Card / Stage 116 / Agent 112 / Tries 44 / Age 44 / Due 92 / State 140 / Move 84 (sr) |
| row No. | `01`…, zero-padded index in `ordered` |
| Card cell | `.ttl` title button + `<sup class="fn">` + `.ar-facts`: `P{p}` (`.p`, when p>0), labels (3) + "+N", ref title, `[lock 12] Blocked` (title as Daylight) when blocked, face 14 + "asked by {queuer}" |
| Stage cell | StageChip + name; StageRamp `aria-label="Stage {i} of {n}: {name}{needs&&blocked ? ', stopped' : ''}. Stages: {all names}"` |
| Agent cell | needs no-owner & mine: Initials RG 20 square ink + sr "Rakesh Gangwar, " + "You"; lastAgent: face 20 + name; queued unclaimed: `.m` "Unclaimed"; done: `.m` terminal stage name |
| Tries | `.m` attemptCount; `.m.sig` when needs and attempts > 1 |
| Age | `.m` ageShort for open cards; "—" for done |
| Due | overdue: `.m.sig` "Overdue · {dueShort}"; due: `.m` dueShort; else "—" |
| State | needs: `.ar-st.needs` StateMarker needs + "Waiting on you"; queued blocked: "Queued · blocked"; queued: "Queued"; working: "Working"; done: "Done"; closed: "Closed" |
| Move | `.bd-move.h44` icon `move 14` "Move" → CardMoveMenu |
| Notes (`.ar-notes`) | `studio-prose.ts notes(model)`: 1 no-owner mine: `Card ${ix} is yours, in ${stage}.` + (due ? ` It was due on <i>${dueLong}</i>.` : '') + ` No agent works this stage and no review is asked for here, so it will sit until it is moved.`; blocked attempts==1: `Card ${ix} stopped on ${agent}’s first try, ${ageLong} ago: it ${lcFirst(summaryLine)}` ; blocked attempts>1: `Card ${ix} stopped in ${stage} after ${numWord(n)} tries: ${lcFirst(summaryLine)}`; queued-blocked group: `Cards ${list} are queued in ${stage} behind another card. Nobody has claimed them; each starts on its own when unblocked.`; done group: `Shipped, nothing to do: <i>${titles}.</i>`; spend 0: `No card has spent anything yet: every card’s cost reads <i>—</i>.` Fixture: note 2 = "Card 02 stopped on tester-tim’s first try, 33 hours ago: it needs a writable Forge URL for agentpod." (= mockup); note 3 = "Card 03 stopped in Fix after five tries: missing commit ×2." (mockup differs, G7) |
| Panel kick "Needs you now · 3", h2 "Three cards are waiting for a decision", p "Each one says what it needs. Answer here, or open the card for the whole story." | `Needs you now · ${n}`; `${numWord(n,true)} ${n===1?'card is':'cards are'} waiting for a decision`; fixed p. 0 → kick "Needs you now · 0", h2 "Nothing is waiting for a decision", no p |
| `.bd-need` per needs card | row: `0{ix}`, kick "Waiting on you", `.age` ageShort; h3 title; `.by`: Initials RG + "You" or face 20 + agent; StageChip + stage; mono `{i}/{n}`; serif p: no-owner → instruction; blocked → `Stopped. ${summaryLine}` (fallback when no summary: the first sentence of detail); actions: no-owner → `.ar-btn` icon `move 15` "Move it" (CardMoveMenu) + `a.ar-btn2` "Open" (`/b/{id}/c/{card}`); blocked → `.ar-btn` "Read why and resume" (open card at resume) |
| `.bd-keys` | fixed: ⌘K Search or run a command · N New card · F Filter cards · M Move the selected card |

Interactions: quick filter; ↑/↓ moves the selected row (`tr.sel`, `aria-selected` on the row via `selectedIndex`); Enter opens; M move; Alt+←/→ stage step; multiples link `href="#stage-{i}"` scrolls to the first table row in that stage (or does nothing if empty); all buttons as above.

### 4.3 SP-Board-Quiet — 1440 × 2297, Quiet, `/b/brd_f47143722126442c` (Agent Onboarding, nothing needs you)
**Tree**: `board/layouts/BoardQuiet.svelte` (rewrite) → `<main class="qt" id="content" tabindex="-1">` header, empty groups list (`.qt-zero`), Done section (`.qt-list` of `QuietItem`), Closed, Stages table. NEW `board/quiet/QuietItem.svelte` props `{ s: CardSummary; stages: Stage[] }`. vibekit: `DataTable` (`.qt-table`), `Face` (`tone='grey'`).

**CSS** verbatim `dc:SP-Board-Quiet:47-73`:
`dc:SP-Board-Quiet:47-73`
```css
.qt { width: 100%; max-width: 860px; margin: 0 auto; padding: 40px 32px 72px; display: flex; flex-direction: column; gap: 32px; font-size: 18px; line-height: 1.55; }
.qt a { text-decoration: underline; text-underline-offset: 4px; }
.qt h1 { margin: 0; font-size: 34px; line-height: 1.2; font-weight: 700; }
.qt-sub { margin: 6px 0 0; color: var(--vk-color-muted); }
.qt-lede { margin: 14px 0 0; font-size: 19px; }
.qt-newcard { display: inline-flex; align-items: center; min-height: 44px; margin-top: 8px; padding: 0; border: 0; background: transparent; font-size: 18px; font-weight: 700; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.qt h2 { margin: 0; font-size: 22px; font-weight: 700; }
.qt-zero { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; list-style: none; }
.qt-zero li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; padding: 10px 0; border-bottom: 1px solid var(--vk-color-line); }
.qt-zero h2 { font-size: 20px; }
.qt-zero span { color: var(--vk-color-muted); }
.qt-list { margin: 12px 0 0; padding: 0; list-style: none; border-top: 1px solid var(--vk-color-line); }
.qt-item { display: flex; flex-direction: column; gap: 6px; padding: 18px 0; border-bottom: 1px solid var(--vk-color-line); overflow-wrap: anywhere; }
.qt-item h3 { margin: 0; font-size: 19px; line-height: 1.4; font-weight: 700; }
.qt-titlebtn { all: unset; cursor: pointer; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; text-decoration-color: var(--vk-color-line); }
.qt-titlebtn:focus-visible { outline: 3px solid var(--vk-color-text); outline-offset: 3px; }
.qt-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; color: var(--vk-color-muted); font-size: 17px; }
.qt-meta .vk-face { filter: grayscale(1); opacity: 0.85; }
.qt-facts { margin: 0; font-size: 16px; color: var(--vk-color-text); }
.qt-acts { display: flex; flex-wrap: wrap; gap: 4px 20px; }
.qt-acts a, .qt-acts button { display: inline-flex; align-items: center; min-height: 44px; padding: 0; border: 0; background: transparent; font-size: 17px; font-weight: 700; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.qt-more { display: inline-flex; align-items: center; min-height: 48px; margin-top: 12px; padding: 0 18px; border: 2px solid var(--vk-color-text); border-radius: var(--vk-radius-sm); background: var(--vk-color-surface); font-size: 17px; font-weight: 700; cursor: pointer; }
.qt-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 16px; }
.qt-table th, .qt-table td { padding: 10px 12px 10px 0; text-align: left; vertical-align: top; border-bottom: 1px solid var(--vk-color-line); overflow-wrap: anywhere; }
.qt-table th { font-weight: 700; }
.qt-table td.n { font-variant-numeric: tabular-nums; }
```
`.qt` is max-width 860, so no breakpoint rules are needed ≥900.

**Content map**
| Element | Source |
|---|---|
| h1 "Agent Onboarding" | boardName |
| "Superpipeline · 20 cards" | `Superpipeline · ${plural(all,'card','cards')}` |
| lede "Nothing needs you. All 20 cards are done." | needs 0 & all done → `Nothing needs you. All ${n} cards are done.`; needs 0 otherwise → `Nothing needs you.`; needs>0 → `${n} ${n===1?'card needs':'cards need'} your decision.` |
| "Write a new card" | onCompose |
| Groups in order: "Needs your decision (n)", "In progress (n)", "Waiting to start (n)", "Done (n)", "Closed (n)" | groupByUrgency (needs, working, queued, done, closed). Every empty group is listed in a `.qt-zero` list (h2 + "None."); empty groups before the first non-empty one form one `ul.qt-zero aria-label="Empty groups"`, empty groups after it each form their own (`aria-label="Closed"` — the group name) |
| Done: "The last 5, newest first." | shown when a group has > 5 cards; the list shows the first 5 by `stateSince` desc; `.qt-more` "Show all 20 done cards" (`aria-expanded`) reveals the rest |
| item h3 button | title, aria as Daylight; `.qt-titlebtn` |
| `.qt-meta` | face 20 (mood from lead: done) + `Ran by ${lastAgent} · ${stage} · done ${agoWords}` (done); needs: `${agent} · ${stage} · ${ageLong}`; queued: `Not picked up yet · ${stage}` |
| `.qt-facts` | done: `Done.` + (p ? ` Priority ${p}.`) + (labels ? ` Labels: ${a, b, c}${more ? ` and ${more} more` : ''}.`) + (blocked ? ' Blocked by another card.') + (ref ? ` Reference: ${ref}.`) + (queuer ? ` Asked by ${queuer}.`) + (due ? ` Due ${dueLong}.`) + ` ${plural(attempts,'attempt','attempts')}.` |
| actions | `a` "Open" (`/b/{id}/c/{card}`), button "Move to another stage" (aria "Move {title} to another stage") → CardMoveMenu |
| Stages table: Stage · Cards · Who works it · Gate | name; `0 (empty)` or count; ownerLong without the " · approval" suffix for gate stages (gate is its own column); Gate: "Approval gate" / "—" |

Mockup deviations: Resident is an approval-gate stage in the data but the mockup prints "—" and "a person" (G9); Operate count missing (G4).

---

## 5. Phone board artboards (390 wide)

### 5.1 SP-Phone-Board-Daylight — 390 × 3158
**Tree**: `board/layouts/BoardDaylightPhone.svelte` (NEW) → `nav.step`, `section.lane.wants`, per-stage `section.lane` (non-empty only) with `.sep` between, `section.empties`. NEW `board/daylight/PdHello.svelte` (sky snippet: `.pd-hello`), `board/daylight/PdTile.svelte` props `{ s: CardSummary; place: 'wants' | 'stage'; stages: Stage[] }`.

**CSS** verbatim `dc:SP-Phone-Board-Daylight:51-109` (`.greet`, `.sun` and the two `[data-theme="dark"] .greet/.sun` rules move to PhoneShellDaylight; `.r{font-family…}` → `.ph-root`):
`dc:SP-Phone-Board-Daylight:51-109`
```css
.r{font-family:var(--vk-font-body)}
.greet{position:relative;overflow:hidden;background:linear-gradient(180deg,var(--vk-sky-noon-top),var(--vk-sky-noon-bottom));color:var(--vk-sky-noon-text);margin:8px 8px 0;border-radius:var(--vk-radius-lg);padding:8px 12px 18px;display:flex;flex-direction:column;gap:12px}
.sun{position:absolute;top:128px;right:-28px;width:80px;height:80px;border-radius:50%;background:var(--vk-sky-noon-sun);box-shadow:0 0 36px 10px color-mix(in oklch,var(--vk-sky-noon-sun) 45%,transparent)}
.greet h1{font-family:var(--vk-font-display);font-size:26px;line-height:1.15;font-weight:700;padding-right:56px;text-wrap:balance}
.greet p{font-size:17px;padding-right:56px}
.crew{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.crew ul{display:flex;gap:6px}
.crew li{display:flex;line-height:0;border-radius:50%;box-shadow:0 0 0 2px var(--vk-color-surface)}
.crew small{font-size:14px;color:var(--vk-sky-noon-text)}
.step{display:flex;flex-wrap:wrap;gap:6px;padding:14px 16px 6px}
.step a{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px;border-radius:var(--vk-radius-pill);background:var(--vk-color-surface);border:1px solid var(--vk-color-line);text-decoration:none;font-size:15px;color:var(--vk-color-text)}
.step a b{font-family:var(--vk-font-mono);font-size:13px;font-weight:500}
.step a[aria-current="true"]{background:var(--vk-color-primary);color:var(--vk-color-primary-fg);border-color:var(--vk-color-primary)}
.step a.needs{background:var(--vk-color-signal-wash);color:var(--vk-color-signal-text);border-color:var(--vk-color-signal);font-weight:700}
.step a.empty{color:var(--vk-color-muted);border-style:dashed}
.lane{display:flex;flex-direction:column;gap:12px;padding:16px}
.lh{display:flex;flex-direction:column;gap:2px}
.lh h2{font-family:var(--vk-font-display);font-size:20px;font-weight:700;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.lh h2 .n{font-family:var(--vk-font-mono);font-size:14px;font-weight:500;color:var(--vk-color-muted)}
.lh p{font-size:14px;color:var(--vk-color-muted)}
.lane.wants{background:var(--vk-color-signal-wash);border-top:2px solid var(--vk-color-signal)}
.lane.wants .lh h2{color:var(--vk-color-signal-text)}
.tile{position:relative;display:flex;flex-direction:column;gap:10px;padding:14px 14px 14px 18px;background:var(--vk-color-surface);border-radius:var(--vk-radius-md);border:1px solid var(--vk-color-line);overflow:hidden}
.tile::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:transparent}
.tile.p1::before{background:var(--vk-color-signal)}
.tile.p2::before{background:var(--vk-color-primary)}
.trow{display:flex;align-items:center;gap:8px;justify-content:space-between}
.stg{font-size:13px;color:var(--vk-color-muted);overflow-wrap:anywhere;min-width:0}
.mv{display:inline-flex;align-items:center;gap:4px;min-height:44px;padding:0 10px;margin:-10px -6px -10px 0;border:0;background:transparent;border-radius:var(--vk-radius-sm);font-size:14px;color:var(--vk-color-muted);cursor:pointer}
.tt{display:block;width:100%;border:0;background:transparent;padding:0;text-align:left;font-family:var(--vk-font-display);font-size:18px;line-height:1.25;font-weight:650;cursor:pointer;overflow-wrap:anywhere}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{display:inline-flex;align-items:center;gap:5px;min-height:26px;padding:2px 10px;border-radius:var(--vk-radius-pill);background:var(--vk-color-raised);border:1px solid var(--vk-color-line);font-size:13px;color:var(--vk-color-text);max-width:100%;overflow-wrap:anywhere}
.chip .ico{width:14px;height:14px}
.chip.ref{font-family:var(--vk-font-mono);font-size:12px;border-radius:var(--vk-radius-sm)}
.chip.blk{background:var(--vk-color-surface);border-color:var(--vk-color-muted)}
.bub{display:flex;gap:10px;align-items:flex-start}
.bub .say{flex:1;min-width:0;background:var(--vk-mood-needs);color:var(--vk-face-ink);border-radius:4px var(--vk-radius-md) var(--vk-radius-md) var(--vk-radius-md);padding:10px 12px;display:flex;flex-direction:column;gap:4px}
.say .who{font-size:13px;font-weight:700}
.say p{font-size:15px;line-height:1.45;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.say button{align-self:flex-start;min-height:32px;border:0;background:transparent;padding:0;font-weight:700;font-size:14px;text-decoration:underline;text-underline-offset:3px;color:var(--vk-face-ink);cursor:pointer}
.meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;font-size:14px;color:var(--vk-color-muted)}
.agent{display:inline-flex;align-items:center;gap:6px;color:var(--vk-color-text)}
.mood{font-size:13px;color:var(--vk-color-muted)}
.due{display:inline-flex;align-items:center;gap:4px;color:var(--vk-color-signal-text);font-weight:700}
.due .ico{width:16px;height:16px}
.act{display:flex;gap:8px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 18px;border-radius:var(--vk-radius-md);font-weight:700;font-size:16px;cursor:pointer;border:0}
.btn.go{flex:1;background:var(--vk-color-primary);color:var(--vk-color-primary-fg)}
.btn.sec{background:var(--vk-color-surface);color:var(--vk-color-text);box-shadow:inset 0 0 0 2px var(--vk-color-line)}
.note{font-size:14px;color:var(--vk-color-muted);padding:12px 14px;border:1px dashed var(--vk-color-line);border-radius:var(--vk-radius-md);background:var(--vk-color-surface)}
.note a{font-weight:700}
.empties{margin:0 16px 20px;padding:12px 14px;border:1px dashed var(--vk-color-line);border-radius:var(--vk-radius-md);display:flex;flex-direction:column;gap:6px}
.empties h2{font-size:15px;font-weight:700}
.empties li{font-size:14px;color:var(--vk-color-muted);overflow-wrap:anywhere}
.empties li b{color:var(--vk-color-text);font-weight:600}
[data-theme="dark"] .greet{background:linear-gradient(180deg,var(--vk-sky-dusk-top),var(--vk-sky-dusk-bottom));color:var(--vk-sky-dusk-text)}
[data-theme="dark"] .sun{background:var(--vk-sky-night-sun);box-shadow:0 0 24px 4px color-mix(in oklch,var(--vk-sky-night-sun) 30%,transparent)}
[data-theme="dark"] .crew small{color:var(--vk-sky-dusk-text)}
.sep{height:1px;background:var(--vk-color-line);margin:0 16px}
```
Sky colours use `--vk-sky-noon-*` literally in the mockup; port as `--vk-sky-{phase}-*` with `phase` from appearance (light) and `dusk` (dark, as drawn). 

**Content map**
| Element | Source |
|---|---|
| hello h1 "Good afternoon, Rakesh." | `${greeting(phase,'daylight').replace(/\.$/,'')}, ${firstName}.` |
| p "<strong>3 cards want you.</strong> Two agents stopped and one card waits in a person's stage." | strong as desktop greeting; then clauses: stopped (blocked/repeated-failure) `${numWord(k,true)} ${k===1?'agent':'agents'} stopped`; no-owner `${numWord(m)} card waits in a person's stage` (m>1 "cards wait"); questions `${k} asked a question`; review `${k} ${k===1?'waits':'wait'} for your review`; joined " and " / ", " and "." |
| crew faces 32 with labels "tester-tim, needs you", "coder-kai, needs you", "error-eric, resting", "super-chotu, resting"; small "tester-tim and coder-kai need you" | agents on this board: lastAgents of open cards (mood), then single declaring agents of empty stages (resting), then queuers (resting); small = `${names(needs)} need you` |
| `nav.step` chips: "Needs you 3" (`.needs`, `aria-current="true"`), then every stage "{name} {count}" (`.empty` when 0) | hrefs `#wants`, `#stage-{key}`; empty stages → `#empty` |
| wants lane: h2 "Needs you 3", p "From three stages, most urgent first." | `From ${numWord(distinctStages)} ${…'stage'/'stages'}, most urgent first.`; tiles ordered by attention: blocked/stopped first (by age desc), then no-owner, then others |
| PdTile (wants) `.trow .stg` | `${stage} · stage ${i} of ${n} · ${ageShort}`; for human stages `${stage} · a person's stage · ${ageShort}` |
| Move `.mv` icon `move-phone` "Move" | aria "Move card to another stage" |
| `.bub` (stopped cards) | face 24 (label "{agent}, needs you") + `.say` `.who` "{agent} · needs you", p detail verbatim (3-line clamp), "Read the rest" (`aria-expanded`) only when clamped |
| chips | ref chip (`a.chip.ref`, icon `doc`, firstRef title, href = ref.url, target _blank); labels/+N for label cards; blocked chip `Blocked by ${plural(n,'card','cards')}` title "Waits on {titles joined '; '}" |
| no-owner text | `<p style="font-size: 15px">{stage} is a person's stage. Waiting for you to pick it up or move it on.</p>` |
| `.meta` | asked chip (face 16 resting + " asked by {queuer}"); cost `$0.00` (`$x.xx` of costUsd); `attempt ${n}` (needs); due `.due` icon `warn-phone` "Due 6 Oct, overdue"; queued: `.agent` "— <span class=mood>not picked up yet</span>" |
| `.act` | blocked → `.btn.go` "Resume"; no-owner → `.btn.go` "Open" |
| stage lanes (non-empty): h2 name + `.n` count (+ blocked chip "2 blocked" `.chip.blk` icon `blocked-phone`, title "2 cards wait on other cards"); p ownerShort | stage |
| `.note` | when all of the stage's cards are in wants: `${plural(n,'card','cards')}, waiting on you above.`… exactly: n=1 → "1 card, waiting on you above."; partial → "1 card is waiting on you above. 2 are queued here." |
| stage tiles (not in wants): `.stg` queued → `Queued · ${ageShort}`; done → `Done · ${ageShort} ago · ${n} attempts` | |
| done meta: chip (bg `--vk-mood-done`, icon `check`) "Done" + cost | |
| empties: h2 "Empty stages · 3", li `<b>{name}</b> · {ownerShort}` | empty stages |

Interactions: step chips scroll (and set `aria-current` on the clicked chip); Read the rest; Move (CardMoveMenu as a bottom sheet); Resume/Open (open card page `/b/{id}/c/{card}`); ref chip opens link; title opens card.

### 5.2 SP-Phone-Board-Paper — 390 × 2606
**Tree**: `board/layouts/BoardPaperPhone.svelte` (NEW): sections `.col` (Waiting on you, In progress, Coming up, Shipped [+ Closed none], The pipeline), `.write`. NEW `board/paper/PaperLetterPhone.svelte` (`article.letter`) and `PaperEntryPhone.svelte` (`article.entry`).
**CSS** verbatim `dc:SP-Phone-Board-Paper:55-85`:
`dc:SP-Phone-Board-Paper:55-85`
```css
.col{padding:0 16px;display:flex;flex-direction:column}
.eh{display:flex;align-items:center;gap:8px;padding:18px 0 10px;border-bottom:1px solid var(--vk-color-line);font-size:12px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600}
.eh.sig{color:var(--vk-color-signal-text)}
.eh.sig::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--vk-color-signal)}
.letter{padding:16px 0;border-bottom:1px solid var(--vk-color-line);display:flex;flex-direction:column;gap:10px;min-width:0}
.lt{display:block;width:100%;border:0;background:transparent;padding:0;text-align:left;font-family:var(--vk-font-display);font-size:21px;line-height:1.25;font-weight:500;cursor:pointer;overflow-wrap:anywhere;text-decoration:underline;text-decoration-color:var(--vk-color-line);text-underline-offset:5px}
.q{font-family:var(--vk-font-display);font-style:italic;font-size:17px;line-height:1.45;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;border-left:2px solid var(--vk-color-line);padding-left:12px}
.rest{align-self:flex-start;min-height:44px;margin:-10px 0 -8px 12px;border:0;background:transparent;padding:0;font-size:14px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;color:var(--vk-color-text)}
.sig-line{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--vk-color-muted);flex-wrap:wrap}
.sig-line em{font-family:var(--vk-font-display);font-size:16px;color:var(--vk-color-text)}
.portrait{display:inline-flex;line-height:0;border-radius:50%;box-shadow:0 0 0 1px var(--vk-color-line)}
.facts{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:var(--vk-color-muted);min-width:0}
.facts span{overflow-wrap:anywhere;min-width:0}
.facts .od{color:var(--vk-color-signal-text);font-weight:600}
.facts .ref{text-transform:none;letter-spacing:0;font-size:13px;color:var(--vk-color-text)}
.acts{display:flex;gap:8px;flex-wrap:wrap}
.pb{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 18px;border-radius:var(--vk-radius-sm);font-size:16px;cursor:pointer;border:1px solid var(--vk-color-text);background:var(--vk-color-surface);color:var(--vk-color-text)}
.pb.pri{background:var(--vk-color-primary);color:var(--vk-color-primary-fg);border-color:var(--vk-color-primary)}
.entry{padding:12px 0;border-bottom:1px solid var(--vk-color-line);display:flex;flex-direction:column;gap:6px}
.entry .lt{font-size:18px}
.by{font-size:15px;color:var(--vk-color-muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.by em{font-family:var(--vk-font-display);font-size:16px;color:var(--vk-color-text)}
.none{padding:12px 0;font-family:var(--vk-font-display);font-style:italic;color:var(--vk-color-muted);border-bottom:1px solid var(--vk-color-line)}
.mvb{min-height:44px;display:inline-flex;align-items:center;gap:4px;padding:0 10px;border:1px solid var(--vk-color-line);border-radius:var(--vk-radius-sm);background:transparent;font-size:14px;cursor:pointer;color:var(--vk-color-text)}
.pipe li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:4px 6px;padding:10px 0;border-bottom:1px solid var(--vk-color-line);font-size:15px}
.pipe li .ar{color:var(--vk-color-faint);font-family:var(--vk-font-display)}
.pipe li b{font-family:var(--vk-font-display);font-weight:600;font-size:17px}
.pipe li span{overflow-wrap:anywhere}
.write{margin:20px 16px 24px;padding:16px;border:1px solid var(--vk-color-text);border-radius:var(--vk-radius-sm);display:flex;flex-direction:column;gap:10px}
.write h2{font-family:var(--vk-font-display);font-size:20px;font-weight:500}
details.more summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-size:15px;text-decoration:underline;text-underline-offset:3px}
```
**Content map**
| Element | Source |
|---|---|
| `.eh.sig` "Waiting on you · 3 letters" | as desktop |
| letter `.lt` title button | title (opens card) |
| `.q` | blocked: `“${detail}”`; no-owner: `“Waiting to be picked up.” ${stage} is a person's stage.`; 3-line clamp; `.rest` "Read the rest" only when clamped |
| `.sig-line` | portrait (face 24 in `.portrait`) + `<em>{agent}</em> · {stage} · {ageLong} ago` (+ ` · attempt ${n}` when n>1); no-owner: queuer face (resting) + `<em>asked by {queuer}</em> · {stage} · {ageLong} ago` |
| `.facts` | `P{p}` · (no-owner) labels each a span + "+1" · "asked by {queuer}" (agent letters) · `$0.00` · `.ref` firstRef · `.od` "Due 6 Oct · overdue" |
| acts | `.pb.pri` "Resume" (blocked) / "Open" (no-owner); `.mvb` icon `move-phone` "Move" |
| "In progress" + `.none` "Nobody is working on a card right now." | working |
| "Coming up · 2" entries: `.by` `<em>Not picked up yet</em> · {stage} · {ageLong}`; facts `P{p}` · "Blocked by 3 cards" · "asked by …"; acts `.mvb` Move | queued |
| "Shipped · 1" entry: `.by` "Done {agoWords} · after {n} attempts" ("Done yesterday · after 15 attempts"); facts P2 · $0.00; Move | done |
| `.none` "Nothing closed." | closed = 0 |
| "The pipeline": li `.ar` "1" then "→"; `<b>{name}</b> · {count or 'empty'}{ · n blocked} · {ownerShort}` | stages |
| `.write` h2 "Write a new card", p "It starts in {firstStage}, with you." ("It starts in Reported, with you."), `.pb` "Write a new card" | first stage name; onCompose |

### 5.3 SP-Phone-Board-Studio — 390 × 2619
**Tree**: `board/layouts/BoardStudioPhone.svelte` (NEW) → `<main class="pb-main">` summary section, 01 multiples (`vibekit:StageMultiples size=phone`), 02 cards (`board/studio/StudioCardPhone.svelte`, `article.pb-card`), 03 `details.pb-stages` (`vibekit:Disclosure`).
**CSS** verbatim `dc:SP-Phone-Board-Studio:220-276`:
`dc:SP-Phone-Board-Studio:220-276`
```css
.pb-main { display: flex; flex-direction: column; gap: 28px; padding: 18px 16px 28px; }
.pb-hero { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 14px; align-items: end; }
.pb-hero .big { font: 900 112px/.78 var(--ff); font-stretch: 72%; letter-spacing: -.04em; color: var(--sig); }
.pb-hero h1 { font: 800 26px/1.05 var(--ff); font-stretch: 82%; letter-spacing: -.015em; }
.pb-lede { font: 400 16.5px/1.45 var(--fs); }
.pb-qf { display: flex; flex-wrap: wrap; }
.pb-qf button { display: inline-flex; align-items: baseline; gap: 5px; min-height: 44px; padding: 0 10px; border: 0; border-left: 1px solid var(--hair); background: transparent; color: var(--muted); font: 700 14px var(--ff); white-space: nowrap; cursor: pointer; }
.pb-qf button:first-child { border-left: 0; padding-left: 0; }
.pb-qf b { font: 500 12px var(--fm); }
.pb-qf button[aria-pressed="true"] { color: var(--text); text-decoration: underline; text-decoration-thickness: 3px; text-underline-offset: 8px; }
.pb-qf button.sig b { color: var(--sig-text); font-weight: 600; }
.pb-figs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1.5px solid var(--rule); }
.pb-figs > div { display: flex; flex-direction: column; gap: 4px; padding: 10px 10px 12px 0; border-bottom: 1px solid var(--hair); }
.pb-figs > div:nth-child(2n) { padding-left: 12px; border-left: 1px solid var(--hair); }
.pb-figs b { font: 900 40px/.9 var(--ff); font-stretch: 72%; letter-spacing: -.02em; }
.pb-figs b.z { font-weight: 300; color: var(--muted); }
.pb-figs b small { font-size: 14px; font-weight: 700; margin-left: 3px; letter-spacing: 0; }
.pb-figs .sig b { color: var(--sig); }
.pb-figs .sig span { color: var(--sig-text); }
.pb-figs span { font-size: 12.5px; font-weight: 600; color: var(--muted); }
.pb-sm { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.pb-sm a { display: flex; flex-direction: column; gap: 4px; min-height: 44px; color: var(--text); text-decoration: none; }
.pb-sm .band { height: 5px; }
.pb-sm .no { font: 500 10.5px var(--fm); color: var(--muted); }
.pb-sm .n { font: 900 30px/.9 var(--ff); font-stretch: 72%; }
.pb-sm .z .n { font-weight: 300; color: var(--muted); }
.pb-sm .units { display: flex; flex-wrap: wrap; gap: 2px; min-height: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--rule); }
.pb-sm .u { width: 12px; height: 12px; }
.pb-card { display: flex; flex-direction: column; gap: 10px; padding: 14px 0 16px; border-top: 1.5px solid var(--rule); }
.pb-card .rl { display: flex; align-items: center; gap: 8px; font: 700 12px var(--ff); letter-spacing: .08em; text-transform: uppercase; }
.pb-card .rl .ix { font: 500 12px var(--fm); letter-spacing: 0; color: var(--muted); }
.pb-card .rl .u { width: 11px; height: 11px; }
.pb-card .rl.needs { color: var(--sig-text); }
.pb-card .rl .age { margin-left: auto; font: 500 12px var(--fm); letter-spacing: 0; color: var(--muted); }
.pb-card h3 { font: 800 18px/1.25 var(--ff); }
.pb-card h3 .ttl { font-size: 18px; font-weight: 800; }
.pb-card .stg { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; font-size: 13px; }
.pb-card dl { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1.3fr; border-top: 1px solid var(--hair); }
.pb-card dl > div { display: flex; flex-direction: column; gap: 3px; padding: 8px 6px 0 0; min-width: 0; }
.pb-card dt { font: 500 11px var(--fm); color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
.pb-card dd { display: flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 700; }
.pb-card dd.sig { color: var(--sig-text); }
.pb-card .nx { display: flex; align-items: center; gap: 8px; }
.pb-card .nx p { flex: 1; min-width: 0; font: 400 15.5px/1.4 var(--fs); overflow-wrap: anywhere; }
.pb-card .nx p.q { font: 500 12px/1.4 var(--fm); color: var(--muted); }
.pb-stages summary { display: flex; align-items: center; gap: 10px; min-height: 44px; padding-top: 10px; border-top: 1.5px solid var(--rule); cursor: pointer; list-style: none; }
.pb-stages summary::-webkit-details-marker { display: none; }
.pb-stages summary .no { font: 500 12px var(--fm); color: var(--muted); }
.pb-stages summary h2 { font: 800 16px var(--ff); }
.pb-stages summary .r { margin-left: auto; font: 500 12px var(--fm); color: var(--muted); }
.pb-stages li { display: grid; grid-template-columns: 14px minmax(0, 1fr) 28px; column-gap: 10px; align-items: baseline; padding: 9px 0; border-top: 1px solid var(--hair); }
.pb-stages li .chip { align-self: center; }
.pb-stages li b { font-weight: 700; }
.pb-stages li .o { grid-column: 2; font: 500 12px/1.4 var(--fm); color: var(--muted); overflow-wrap: anywhere; }
.pb-stages li .c { grid-column: 3; grid-row: 1; text-align: right; font: 900 22px/1 var(--ff); font-stretch: 72%; }
.pb-stages .gate { padding: 0 4px; border: 1px solid var(--rule); font: 700 10.5px var(--ff); letter-spacing: .06em; color: var(--text); }
```
**Content map**
| Element | Source |
|---|---|
| hero `.big` 3; kick "13:51 · midday" (`${HH:MM of syncedAt} · ${greeting(phase,'studio').toLowerCase()}`; mockup 13:31, G6); h1 "<sr>3 </sr>of 6 cards are waiting on a person" | as desktop |
| `.pb-lede` "Two stopped and need resuming; one sits in your own stage and is five days overdue. Two are queued behind a blocker; one has shipped." | `studio-prose.ts phoneLede`: `${numWord(stopped,true)} stopped and need resuming` ; `${numWord(noOwnerMine)} sits in your own stage` + overdue clause; then `${numWord(queuedBlocked,true)} are queued behind a blocker; ${numWord(done)} has shipped.` |
| quick filter All 6 · Needs 3 (sig) · Working 0 · Idle 2 · Done 1 | same state as desktop; labels per this layout ("Needs", "Idle") |
| figures (2 columns): `$0.00` "Spend · 7 days" (z) · 0 "Over budget" (z) · 1 "Overdue" (`.sig`) · `7<small>stages</small>` "2 blocked" | spend7d; counts; stage count; blocked |
| 01 "Where the cards are" / "1 square = 1 card": per stage band, `0{i}`, count (`.z`), units 12px | stages; aria "Stage {i}, {name}: {plural}" |
| 02 "Cards, needs you first" / "6 rows"; sr "Each row: status, card, agent, stage, attempts, age, next step, cost, due." | ordered |
| `.rl` | ix, StateMarker, state text: needs blocked → "Needs you · stopped"; needs no-owner → "Needs you · your stage"; queued blocked → `Queued · blocked by ${n}`; done → "Done"; `.age` ageShort |
| h3 `.ttl` | title |
| `.ar-facts` | P{p} · labels/+N · ref · "asked by {queuer}" (text only, no face) |
| `.stg` | StageChip, name, StageRamp (aria-hidden), `{i}/{n}` |
| dl (needs cards only): Agent (face 18 + name / "a person") · Tries (`.sigt` when >1) · Cost `$0.00` · Due (`.sigt` "6 Oct, overdue" / "—") | |
| `.nx` p | blocked: `summaryLine` (mockup shows a longer paraphrase, G3); no-owner: `Pick it up or move it on. Overdue since ${dueShort}.` (without the second sentence when not overdue); queued `.q`: `auto · waits on ${plural(n,'card','cards')} · not picked up yet · $0.00`; done `.q`: `${n} tries · $0.00` |
| `.nx` buttons | `.ar-btn` "Resume" (blocked) / "Open" (no-owner); `.ph-ib.b` icon `move 16` aria "Move card" (CardMoveMenu) |
| 03 summary "Stages · 7, who works each" / "2 blocked · show" | `Stages · ${n}, who works each`; `${blocked} blocked · show` (open: "· hide") |
| stage li: chip, `<b>{i} {name}</b>`, `.c` count, `.o` `{n blocked · }{ownerShort with gate → <span class="gate">GATE</span> approval by a person}{ · empty}` | stages |

### 5.4 SP-Phone-Board-Quiet — 390 × 2827
**Tree**: `board/layouts/BoardQuietPhone.svelte` (NEW): header `.hd#content`, five `.grp` sections, stages `.tbl`; `board/quiet/QuietItemPhone.svelte` (`article.it`).
**CSS** verbatim `dc:SP-Phone-Board-Quiet:48-73`:
`dc:SP-Phone-Board-Quiet:48-73`
```css
.r{font-size:17px;line-height:1.5}
.hd{padding:20px 16px 8px;display:flex;flex-direction:column;gap:4px}
.hd h1{font-size:28px;line-height:1.2;font-weight:700;overflow-wrap:anywhere}
.lk{align-self:flex-start;min-height:44px;display:inline-flex;align-items:center;border:0;background:transparent;padding:0;text-decoration:underline;text-underline-offset:4px;font-size:17px;cursor:pointer;color:var(--vk-color-text)}
.grp{padding:20px 16px 4px;display:flex;flex-direction:column}
.grp h2{font-size:21px;font-weight:700;padding-bottom:8px}
.it{position:relative;display:flex;flex-direction:column;gap:6px;padding:14px 0 14px 18px;border-top:1px solid var(--vk-color-line)}
.it.nd::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:5px;background:var(--vk-color-signal)}
.it.plain{padding-left:0}
.tr{display:flex;gap:8px;align-items:flex-start}
.tt{flex:1;min-width:0;border:0;background:transparent;padding:0;text-align:left;font-size:18px;line-height:1.35;font-weight:700;cursor:pointer;overflow-wrap:anywhere;color:var(--vk-color-text)}
.mvb{flex:none;min-height:44px;margin-top:-10px;display:inline-flex;align-items:center;padding:0 6px;border:0;background:transparent;text-decoration:underline;text-underline-offset:4px;font-size:15px;cursor:pointer;color:var(--vk-color-text)}
.mt{display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:var(--vk-color-muted);font-size:16px}
.mt .face svg{filter:saturate(0.4)}
.rs{overflow-wrap:anywhere}
.fs{font-size:15px;color:var(--vk-color-text);overflow-wrap:anywhere}
.fs .od{font-weight:700;color:var(--vk-color-signal-text)}
details.full summary{min-height:44px;display:flex;align-items:center;cursor:pointer;text-decoration:underline;text-underline-offset:4px;font-size:16px}
details.full p{overflow-wrap:anywhere;padding-bottom:6px}
.ac{align-self:flex-start;min-height:44px;display:inline-flex;align-items:center;font-size:17px;font-weight:700;text-decoration:underline;text-underline-offset:4px}
.nn{padding:10px 0;border-top:1px solid var(--vk-color-line);color:var(--vk-color-muted)}
.tbl{width:100%;border-collapse:collapse;font-size:15px}
.tbl caption{text-align:left;font-size:21px;font-weight:700;padding-bottom:8px}
.tbl th,.tbl td{text-align:left;vertical-align:top;padding:8px 12px 8px 0;border-top:1px solid var(--vk-color-line);overflow-wrap:anywhere}
.tbl thead th{font-size:14px;color:var(--vk-color-muted);font-weight:700}
.tbl td.n{white-space:nowrap}
```
**Content map**
| Element | Source |
|---|---|
| h1 board name; `.muted` "Superpipeline · 6 cards · 3 need your decision" | counts (third part omitted when 0) |
| `.lk` "Write a new card" | onCompose |
| groups "Needs your decision (3)", "In progress (0)" + `.nn` "None.", "Waiting to start (2)", "Done (1)", "Closed (0)" + "None." | groupByUrgency; needs ordered as Daylight phone wants |
| item `.it.nd` (needs) / `.it.plain` | |
| `.tr` title button + `.mvb` "Move" | |
| `.mt` | face 20 (`tone` saturate .4) + `{agent} · {stage} · {ageLong}` (+ ` · attempt ${n}` when n>1); no-owner: queuer face + `asked by {queuer} · {stage} · {ageLong}`; queued: `Not picked up yet · {stage} · {ageLong}`; done: `Completed {agoWords} · {stage} · {n} attempts` |
| `.rs` | blocked: `Stopped. ${firstSentence(detail)}` where firstSentence = text up to and including the first ". " boundary at index ≥ 40 (whole text when none); no-owner: `Not started. ${stage} is a person's stage.` |
| `details.full` "Show the full reason" | rendered only when detail has a remainder after the first sentence; body = remainder |
| `.fs` | `Priority {p}` or "No priority" · `labels: a, b, c, and {n} more` · `asked by {queuer}` · `$0.00` · ref · `blocked by {plural}` · `.od` "Due 6 October, overdue" — parts joined " · " in the order drawn per state |
| `.ac` | needs blocked: "Decide" (`/b/{id}/c/{card}`); others: "Open" |
| Stages `.tbl` caption "Stages"; rows `{i}. {name}` · cards (`empty` / `3, 2 blocked`) · `ownerShort(': ')` | |

Mockup deviation: card 03 `.rs` reads "Stopped after two refused handoffs: …" (G10).

---

## 6. SP-Board-Empty — 1440 × 1060, shared by all four vibes (`vibe` tweak), `/b/brd_2441b5578f704b93` (Production Releases, 0 cards)

**Tree**: `board/BoardEmpty.svelte` (NEW, one component; composes `vibekit:EmptyState`), rendered by PlanView when the board has no non-archived cards (filters ignored) and view is `board`. Shell: the canonical shell of the active vibe (G1), `showing = "No cards on this board"`, Studio status `{ items: ['Production Releases', '0 cards', {text: '3 need you', signal: true}, 'synced 13:51'], right: [] }`, Studio tabs read "List 0" and "Projects 0" (the board has no cards; the mockup's "Projects 5" comes from the shared-shell family, G1).

**CSS** verbatim `dc:SP-Board-Empty:23-47`; the per-vibe Studio content rules `dc:SP-Board-Empty:204-210` target classes this page does not use — do not port. Phone (<900, not drawn, G14): `.em{padding:16px 16px 32px}.em-card{padding:24px 20px;gap:24px}.em-head{grid-template-columns:minmax(0,1fr)}.em-flow{grid-template-columns:minmax(0,1fr)}.em-step:not(:last-child)::after{display:none}`.
`dc:SP-Board-Empty:23-47`
```css
.em { flex: 1; display: flex; align-items: flex-start; justify-content: center; padding: 48px 40px 64px; }
.em-card { width: 100%; max-width: 1180px; display: flex; flex-direction: column; gap: 36px; padding: 44px 48px 40px; border: 1px solid var(--vk-color-line); border-radius: var(--vk-radius-lg); background: var(--vk-color-surface); box-shadow: 0 var(--vk-lift) 0 var(--vk-color-ground); }
.em-head { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 24px 56px; align-items: end; }
.em-eyebrow { margin: 0 0 10px; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--vk-product-superpipeline-fg); }
.em-eyebrow span { padding: 3px 10px; border-radius: var(--vk-radius-pill); background: var(--vk-product-superpipeline-bg); }
.em-head h1 { margin: 0; font-family: var(--vk-font-display); font-size: 44px; line-height: 1.08; font-weight: 700; letter-spacing: -0.015em; }
.em-lede { margin: 14px 0 0; font-size: 19px; line-height: 1.55; color: var(--vk-color-muted); max-width: 60ch; }
.em-lede b { color: var(--vk-color-text); }
.em-cta { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
.em-cta .vk-button { min-height: 52px; padding: 0 28px; font-size: 18px; }
.em-cta p { margin: 0; font-size: 15px; color: var(--vk-color-muted); }
.em-flow { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 18px; margin: 0; padding: 0; list-style: none; counter-reset: st; }
.em-step { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 18px 16px; border: 2px dashed var(--vk-color-line); border-radius: var(--vk-radius-md); background: var(--vk-color-bg); min-width: 0; overflow-wrap: anywhere; }
.em-step:not(:last-child)::after { content: ""; position: absolute; top: 34px; right: -15px; width: 9px; height: 9px; border-top: 2px solid var(--vk-color-faint); border-right: 2px solid var(--vk-color-faint); transform: rotate(45deg); }
.em-step.gate { border-style: solid; border-color: var(--vk-color-text); }
.em-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.em-num { font: 600 12px/1 var(--vk-font-mono); color: var(--vk-color-faint); }
.em-step h2 { margin: 0; font-family: var(--vk-font-display); font-size: 20px; line-height: 1.2; font-weight: 700; }
.em-who { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
.em-does { margin: 0; font-size: 14.5px; line-height: 1.45; color: var(--vk-color-muted); }
.em-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; font-size: 12.5px; }
.em-tag { padding: 1px 8px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); color: var(--vk-color-muted); font-weight: 600; }
.em-tag.g { background: var(--vk-color-primary); color: var(--vk-color-primary-fg); }
.em-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 24px; padding-top: 20px; border-top: 1px solid var(--vk-color-line); font-size: 15px; color: var(--vk-color-muted); }
.em-foot a { font-weight: 600; color: var(--vk-color-text); text-underline-offset: 4px; }
```

**Content map**
| Element | Source |
|---|---|
| eyebrow pill "Production Releases" | boardName |
| h1 "No cards yet. Here is what this board does." | fixed copy |
| lede "It takes a release from **proposal to production** in five stages. **devops-dave** stages it, **vulnerability-victor** checks it, and **you** give the go or no-go before it is released." | NEW `BoardSnapshot.intro.lede` (G11), rendered with `**bold**` → `<b>` only (escape everything else); absent → `This board has ${numWord(n)} stages.` |
| primary `vk-button` icon `plus 20` "Write the first card" | onCompose |
| CTA note "Say what you want released in a sentence; an agent drafts the brief." | `intro.composeHint` (G11); absent → "Say what you want in a sentence; an agent drafts the brief." |
| `ol.em-flow aria-label="Stages, in order"` per stage `li.em-step` (`.gate` for approval stages) | stages |
| `.em-num` "01" + `.em-num` "0 cards" (`aria-label="0 cards"`) | order, count |
| h2 | stage name |
| `.em-who` | human, no gate: Initials "P" 32 (raised-line, 12px, `aria-label="A person"`) + "a person"; human gate: Initials RG 32 (`aria-label="Rakesh Gangwar"`) + "you decide"; capability with one declaring agent: face 32 resting + name; several: first face + `${plural(n,'agent','agents')}` |
| `.em-does` | NEW `Stage.summary` (G11): Proposed "Someone writes up the release: what ships and why." · Staged "Stages the release. Picks up cards that need the release skill." · Checks "Runs the security review before anyone decides." · Go / no-go "An approval gate. One release at a time waits here for your yes or no." · Released "A person marks it live. The card is done." Absent → omitted |
| `.em-tags` | capability → `stage.owner` tag ("release", "security-review"); gate → `.em-tag.g` "Approval gate"; wipLimit → "limit {n}"; count 0 → "empty" |
| foot "Stages come from this board’s rules." + link "Change the stages in Board settings" | fixed; href `/b/{id}/settings` |

Interactions: Write the first card; Board settings link; the shell's.

---

## 7. Fixture (seed; `apps/api/scripts/seed-dev.sql` + `e2e/support/seed.ts` NEW `seedVibesFixture()`)

All values are the live production data of 10–11 Oct 2026 (snapshots `now_brd_134a0ddb6d434478.json`, `after_brd_f47143722126442c.json`, `after_brd_2441b5578f704b93.json` in the session scratchpad), adjusted only where marked ★.

**User / members**: `usr_b19776fac3c94df4` "Rakesh Gangwar", role owner. Tenant `tnt_e080b7a2cc39469e`.

**Agents** (`AgentSummary`: id, name, capabilities): super-chotu `agt_bb586732b807460c` [command]; error-eric [diagnostics]; tester-tim [testing]; coder-kai [code]; optimizer-ollie [code]; integration-ian [integration]; api-alan [api]; onboarding-olivia [onboarding]; artistic-lyra [design]; analyst-echo [analysis]; devops-dave [release]; vulnerability-victor [security-review]; research-ray [research]; writer-quill [writing]; cleaner-cody [maintenance]. (ids other than super-chotu: `agt_<name>` ★ deterministic; `iconUrl` null; faces come from the vibekit generator by name.)

**Labels**: `lbl_0259a14014754f69` clean-room, `lbl_e9ccaacaa2f94509` evidence-required, `lbl_8430ce51795447c3` superpipeline (catalogue = these 3; card label ids `lbl_c5ee8f164fb54eb0`, `lbl_8f31b566952f4d0f` have no catalogue entry, G8).

**Board Developer Experience `brd_134a0ddb6d434478`** — usage `{totalCostUsd:0, estimatedCostUsd:0, budgetUsd:null, cardUsdCap:null, overBudget:false}`, stale `{enabled:true, afterHours:24}`, gates [], elicitations []. `getUsage('7d').totalCostUsd = 0`.
Stages: reported "Reported" human · reproduce "Reproduce" capability diagnostics · test "Failing test" capability testing · fix "Fix" capability code · integrate "Integrate" capability integration, requires.any [integration, api, testing], returnStage fix · signed-off "Signed off" human gate approval · shipped "Shipped" human (orders 0–6; instructions/completion as in the snapshot).

| id | title | stage | state | prio | attempts | stateSince | due | queuedByAgentId | labels | blockedBy | needsHuman | lastAgentId (G2) | project |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| card_ace250c9c25342e4 | Fix the highest-severity blocker found in the clean-room journey | reported | submitted | 1 | 0 | 2026-10-08T09:51:01.514Z | 2026-10-06 | agt_bb586732b807460c | the 3 + lbl_c5ee8f164fb54eb0 | — | — | null | prj_23b93f2d16d54b27 / mls_84a0895ad61a4ec7 |
| card_9ac2116a050840df | AgentPod: connector interface and generic effects ledger, state machine and executor | test | input-required | 2 | 1 | 2026-10-09T22:24:49.862Z | — | agt_bb586732b807460c | — | — | blocked, detail = verbatim (below), summary ★ "Needs a writable Forge URL for agentpod." | tester-tim | prj_34b48f840daa4309 |
| card_e10fb4fe39a9467f | Superpipeline: manual-delivery completion and approval-subject hardening | fix | input-required | 0 | 5 | 2026-10-09T22:45:45.522Z | — | null (queued by the user) | — | — | blocked, detail "this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit", summary ★ "Missing commit ×2." | coder-kai | null |
| card_691a65ff98944697 | Integrate editorial workflows and prove no-write publishing acceptance | test | submitted | 2 | 0 | 2026-10-08T17:50:23.062Z | — | agt_bb586732b807460c | — | 482b, 9ac2, e10f (titles as cards) | — | null | prj_34b48f840daa4309 |
| card_482b4aa0bdd64c02 | agentpod-connectors: X connector (connector x) | test | submitted | 0 | 0 | 2026-10-09T23:04:43.288Z | — | null | — | 9ac2 | — | null | null |
| card_8f2c1a5e58294d27 | Build immutable approval subjects and digest-bound gates | shipped | completed | 2 | 15 | 2026-10-09T22:19:24.419Z | — | null | — | — | (stale blocked detail in data; ignored because state is completed) | null | prj_34b48f840daa4309 |
| card_05823a57e8224605, card_47630a307f58426f, card_54ec7bee6c7e4828 | (archived; as snapshot) | | | | | | | | | | | | |

card_9ac2 detail (verbatim): "Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim's station write access. The matching URL ssh://git@forge.superjackfruit.com:2222/SuperJackfruitLabs/agentpod.git authenticates as tester-tim and is readable, but push is refused with “Mirror Repository SuperJackfruitLabs/agentpod is read-only”. Local red-test commit 7a444f3a and verbatim failure evidence are preserved at https://app.superlibrary.dev/a/itm_569034f61d1b4b1a; no GitHub push was attempted." (Note: the data uses a straight apostrophe in "Tim's"; desktop mockups render a curly one — render the data, G10.)
References (first per card, in this order): 9ac2 "Deterministic X publisher red-test evidence"; e10f "test(api): pin manual delivery reminder" (+3 more); 8f2c "test(api): pin immutable approval subject binding" (+15 more) — full list as in the snapshot. All cards: ownerUserId usr_b19776fac3c94df4, costUsd 0, overBudget false, openChildCount 0.
Projects (Studio "Projects 3"): prj_23b93f2d16d54b27, prj_34b48f840daa4309 (non-archived cards) and prj_42ab5ec961104f65 (archived card_05823a57e8224605); `projectCount` = 3 by the G12 rule.

**Board Agent Onboarding `brd_f47143722126442c`**: stages requested (human), drafted (capability onboarding), provisioned (onboarding), portrait (design), credentialed (human, gate approval), proving (capability claim-check, requires.any [claim-check, analysis]), resident (human, gate approval). 21 cards, 1 archived (card_e3c7940daca24158). 20 completed in resident:
| id | title | prio | attempts | stateSince ★ | labels | ref | queuedByAgent | blockedBy | lastAgent |
|---|---|---|---|---|---|---|---|---|---|
| card_9d48db2717044b69 | Run and record the clean-room SuperPipeline operator journey | 1 | 10 ★ | 2026-10-10T12:21:00Z ★ (20 h) | 3 catalogue + lbl_8f31b566952f4d0f | "Clean-room SuperPipeline operator journey — attempt 6 evidence" ★ | — | — | onboarding-olivia |
| card_f180b1627c594b41 | Onboard Message Melissa — marketing and messaging | 2 | 5 | 2026-10-08T13:56:34.900Z ★ | — | "Message Melissa — pinned Sketchbook persona" | super-chotu | e3c7 | onboarding-olivia |
| card_fa51f3d3e5e94ace | Onboard Audience Anna — community and feedback | 2 | 5 | 2026-10-08T13:56:34.688Z | — | "Audience Anna pinned Sketchbook persona" | super-chotu | e3c7 | onboarding-olivia |
| card_94266a0d5c984dc8 | Onboard Artistic Lyra | 0 | 5 | 2026-10-02T03:50:00Z ★ | — | — | — | — | onboarding-olivia |
| card_09a6d0a769af4f53 | Onboard Chaos Charlie | 0 | 8 | 2026-10-02T03:49:00Z ★ | — | — | — | — | onboarding-olivia |
| the other 15 (Ulrich, Eric, Alan, Ian, Rachel, Tim, Karen, Alex, Kevin, Diana, Betty, Pete, Mike, Victor, Dave) | as snapshot | 0 | as snapshot | each ★ moved to before 2026-10-02T03:49:00Z keeping their relative order | | | | | onboarding-olivia |
card_9d48 dueAt 2026-10-05.

**Board Production Releases `brd_2441b5578f704b93`**: 0 cards; stages proposed (human), staged (capability release), checks (capability security-review), go-no-go "Go / no-go" (human, gate approval, wipLimit 1), released (human); `intro` and `Stage.summary` values in §6 ★ (new fields).

**Workspace attention** (`GET /v1/stale?attention=1`): the 3 Developer Experience cards ace2 (no-owner), 9ac2 (blocked), e10f (blocked); `boardsUnanswered: 0`.

**Socket**: connected (`app.connected = true`); `syncedAt` = frozen clock.

---

## 8. Gaps and rulings

| # | Gap | Ruling |
|---|---|---|
| G1 | Two shell families in the mockups: per-vibe screens use `dy/mh/ar/qn`; shared screens + dialogs (incl. SP-Board-Empty) use `vs-*`, which differs (Daylight pills 76px wide, top bar a gradient not `.vk-sky`, separate Dark-theme rail button, "2 at work" crew; Paper masthead max-width 1280, live in edition row, triple rule under sections; Studio crumb "Superpipeline" not "Superpipeline · board", 32px status padding 6px 40px, Projects count 5; Quiet bar max-width 1280, Filter/Search/New card right-aligned, filled primary New card, note on its own line; mark icon `M4 7h10…`). | (c) one shell per vibe = `dy/mh/ar/qn` (it is on 4× more artboards and on the flagship screens). Shared artboards: regenerate references with this shell or mask the shell region (rail column and header rows) in their pixel diffs. Each shared-screen spec must use `AppShell` unchanged. |
| G2 | Agent on a stopped/finished card (tester-tim, coder-kai, onboarding-olivia) — `delegateAgentId` is null; the agent is the latest attempt's. | (b) add `lastAgentId: string \| null` to `CardView` (board snapshot + `/v1/stale`) = `agentId` of the card's most recent attempt (any status); contract package + `api.ts Card`. |
| G3 | Short agent-written stop summary (Studio panel "Stopped. Needs a writable Forge URL for agentpod.", phone "Forge mirror is read-only…") — not in the data; agent text must be verbatim. | (b) add optional `needsHuman.summary?: string` (≤ 120 chars), written by the agent through the MCP block/stop tool's new optional `summary` argument, stored with the stop. Desktop strings are canonical in the fixture; the Studio phone `.nx` paragraphs (longer paraphrases) render the same summary → (c) phone text changes. Fallback when absent: first sentence of `detail`. |
| G4 | Operate count source: board-scoped today (`app.needsYou()` = 0 for this board) but mockups show 3 (also on Production Releases with 0 cards); Quiet board mockup omits it. | (a)+(b-client) count = workspace attention (`listAttention().cards.length`), new `app.attention`; Quiet board shows "Operate (3 need you)" → (c) for SP-Board-Quiet's header. |
| G5 | Face moods for agents not on a running card: mockups draw super-chotu "working" (desktop chips, Daylight rail) and "resting" (phones). | (a) mood = working only when the agent holds a `working` card, else resting → desktop chips/rail render resting (c). |
| G6 | Clock in mockups varies: Studio "13:19", Studio phone "13:31", others "13:51". | (a) one clock: synced time = `app.syncedAt`, frozen at 13:51 → Studio texts read 13:51 (c). |
| G7 | Studio editorial prose (hero clause 2 "for want of a writable Forge URL", note 3 "coder-kai’s handoff was missing a commit, twice") is not derivable. | (a) templates in §4.2 (`studio-prose.ts`); clauses that differ: hero clause 2 → "on its first try", note 3 → "…after five tries: missing commit ×2." (c). |
| G8 | "+1" label: the card's 4th label id has no catalogue entry; `summarize` drops unknown ids. | (a) `moreLabels` counts every label id beyond the 3 shown, catalogued or not; tooltip "{n} more label(s)". |
| G9 | Mockup data that contradicts live data: card e10f shown P2 (desktop Daylight stripe/sr, Paper P2, Studio P2) but priority 0; Shipped card "Tries 0" (Studio desktop) but 15 attempts; card 482b Age "—" (Studio) but 33h; phone Daylight/Quiet show "asked by super-chotu" on e10f but it was queued by the user; Paper story/phone "starts in Reported" fine; Quiet Agent Onboarding Resident shown without a gate but it is an approval gate; "Integrate" owner short text "integration" on phones vs long form on desktop. | (c) render the data: e10f has no priority mark; Shipped Tries 15, Age "—" (done); 482b Age 33h; no asked chip on e10f; Resident row "a person" + "Approval gate"; owner short/long forms per §2 (both mockup forms are reproduced by the two formatters). |
| G10 | Agent text normalised in mockups: capitalised + full stop added ("This stage…commit."), curly apostrophe in "Tim’s", Quiet phone "Stopped after two refused handoffs:". | (c) verbatim agent text (decision 4): "this stage … missing commit" as written; straight apostrophe; Quiet `.rs` = "Stopped. " + first sentence. |
| G11 | Empty board prose: board lede, compose hint and one-line stage descriptions are board-specific copy not in the API. | (b) add `BoardSnapshot.intro?: { lede: string; composeHint: string }` and `Stage.summary?: string` (board template fields; `setStages`/`patchStage` accept `summary`; a board settings field "One line about this stage"). Fixture values = mockup strings. |
| G12 | Studio "Projects 3" — the live Developer Experience board has 2 distinct projects on non-archived cards (3 including an archived card). | (a) `projectCount` counts projects of all cards including archived (the Projects view lists archived cards' projects too) → 3. |
| G13 | Disconnected / reconnecting state of Live is not drawn. | (a) same element, text "Reconnecting…", dot/square `--vk-color-faint`, `role="status"` announces it. |
| G14 | Undrawn states/sizes: expanded empty stage (Daylight), Workspace active filled icon, `.u.working`, 900–1440 widths for Paper/Studio boards, phone Empty board. | (a) the rules given in place (§1.3.1, §1.5.1, §3.4, §4.1, §4.2, §6); no new tokens, only existing spacing values. |
| G15 | Phone "You" menu and Studio/Quiet account menus are not drawn. | (a) `vibekit:Menu` with the items in §1.7.5, styled from the vibe's drawn desktop menu. |
| G16 | Filter dialog not drawn (all shells open it). | (a) `plan/FilterDialog.svelte` = existing FilterBar controls inside the vibe's dialog frame (the frame from SP-Dlg-Move, dialogs group); title "Filter cards"; `filterSummary` counts set filters. |
| G17 | vibekit 0.0.1 (vendored) lacks the Annual-report Studio tokens (`--vk-color-rule`, `--vk-stage-1..7`, `--vk-color-stage-text`, `--vk-font-serif`, Archivo/Azeret Mono/Newsreader) and `--vk-sky-*-text` used here. | (b, dependency) the vibekit component library release must ship the mockup `vk.css` token set; Superpipeline bumps the vendored tarball before any Studio screen lands. **Blocker for Studio implementation, not for this spec.** |
