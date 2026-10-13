# vibekit 0.1.0 digest, for the Superpipeline consumer plan

Sources:
- the spec, `superpipeline-worktrees/vibes-sweep-plan/docs/superpowers/specs/vibes-sweep/vibekit-components.md` (2039 lines, "proposed, 2026-10-11"), read in full;
- the vibekit repo at `vibekit-worktrees/components-plan` @ `53dba27`, which is `origin/main` and still at version 0.0.1;
- the accent brief, `accent-tokens.md` (this folder);
- the SP code in `apps/web`.

**The spec never says "0.1.0".** It also never mentions `exports`, `HEAD_SCRIPT`, the appearance store or accent. The gaps are listed in §4.

Notation: D/P/S/Q are Daylight, Paper, Studio and Quiet. "Class" is the CSS root that a component emits. Where a class is marked (inf.), it is inferred from the spec's naming rule and not spelled out.

## 0. Ground rules for consumers

**Two modes:**
- **Mode C** (CSS-scoped): the DOM is the same in every vibe. The class is `.vk-<name>`, and per-vibe rules are written as `:where([data-vibe="<vibe>"]) .vk-<name>`. These add zero specificity, so a single SP class still overrides them.
- **Mode T** (template): each vibe has its own Svelte template, `src/lib/components/<name>/<Name>.<Vibe>.svelte`. The public `<Name>.svelte` renders `FORMS[useVibe().current]`. The root class is `.vk-<name>--<vibe>`, with BEM parts `.vk-<name>__<part>`.
- All CSS lives in `src/lib/styles/components/<name>.css`, never in `<style>` blocks. The classes are the API. All four forms take the same `<Name>Props` and render the same accessible tree.

**Vibe context** (new file `src/lib/appearance/context.ts`):
```ts
export interface VibeState { readonly current: Vibe; readonly theme: Theme }
export function provideVibe(get: () => { vibe: Vibe; theme: Theme }): void; // setContext
export function useVibe(): VibeState; // getContext, falling back to document.documentElement.dataset (client) or 'daylight'/'light' (server)
```
- **`VibeRoot.svelte`** takes `{ vibe: Vibe; theme: Theme; children: Snippet }`. It calls `provideVibe`, and on mount and on change it sets `data-vibe` and `data-theme` on `<html>`. It does not set `data-phase` or `data-time`. It is meant for the root `+layout.svelte`.
- **SP is `ssr = false`.** SP still needs `<VibeRoot>`, fed from `appearance.value.vibe` and `appearance.theme`. Without it, Mode T templates read the dataset once and do not react to changes.
- **Two writers to `<html>`.** VibeRoot and `AppearanceStore.#apply` both write to `<html>`, and #apply does it inside a View Transition. The planner has to decide which one owns the writes.

**Shared rules** (`base.css`):
```css
.vk-button, .vk-tabs__item, .vk-iconbutton--labelled, .vk-chip { white-space: nowrap; flex-shrink: 0; }
:where(.vk-button, .vk-iconbutton) { color: var(--_fg); background: var(--_bg); } /* colours come from component-private vars, so a container's `a { color }` can't repaint them */
```

**Other contract points:**
- `.vk-hit` adds an `::after` hit area of at least 44px, for controls drawn smaller.
- `vk-visually-hidden-focusable` is new and is the skip-link class. Only `.vk-visually-hidden` exists today.
- Existing types: `Product = 'superpipeline'|'agentpod'|'superlibrary'|'superwitness'|'supermessage'` and `Mood = 'working'|'thinking'|'needs'|'done'|'resting'`.

## 1. Components (§2.2: 40 rows, 34 components plus VibeRoot, FootnoteRef, Dialog/Drawer/Sheet and Sky)

**Imports.** Everything is imported from the package root: `import { X, type XProps } from '@superjackfruit/vibekit'`. Spec §6.5 says `index.ts` "exports every component and the types".
- Separate names: `Toaster` (from the Toast file), `FootnoteRef`, `Dialog`, `Drawer`, `Sheet` and `Sky`.
- `StatusPill` stays for one minor as a deprecated alias of `StateLabel form="pill"`.
- The spec does not say whether `Overlay`, `Column` or `Multiple` are exported.

| # | Name | Mode | Status |
|---|---|---|---|
| 1 | VibeRoot | — | new |
| 2–7 | AppShell, AppNav, Masthead, StatusLine, PhoneTabBar, PhoneHeader | T | new |
| 8 | Button | C | rewrite |
| 9–10 | IconButton, Tabs | T | new |
| 11 | Segmented | T | rewrite |
| 12 | QuickFilter | T | new |
| 13 | Field | C | rewrite |
| 14 | Choice | C | new |
| 15 | CommandField | T | new |
| 16, 17 | CommandPalette, Kbd | C | new |
| 18, 19 | CopyId, Disclosure | T | new |
| 20 | Menu | C | new |
| 21 | DataTable | T | new |
| 22 | FactList | C | new |
| 23–26 | PageHead, Hero, FigureRow, SmallMultiples | T | new |
| 27 | StageTrack | T | rewrite |
| 28 | StateLabel | T | new, absorbs StatusPill |
| 29 | AgentName | T | new |
| 30 | Face | C | kept, extended |
| 31–34 | AgentQuote, Footnotes (+FootnoteRef), SectionHeader, Overlay (Dialog/Drawer/Sheet) | T | new |
| 35 | Toast (+Toaster) | T | rewrite |
| 36 | Notice | C | new |
| 37 | EmptyState | T | new |
| 38, 39 | Loading, LoadMore | C | new |
| 40 | Meter | T | new |
| — | Sky | C | kept |

Each entry below gives the interface verbatim, then one line on the per-vibe forms, then the class.

**2 AppShell**
```ts
interface AppShellProps {
  product: Product;
  nav: Snippet;           // usually <AppNav>
  masthead: Snippet;      // usually <Masthead>
  children: Snippet;      // main
  aside?: Snippet;        // drawer slot for side panels (SP card, SW span margin)
  status?: Snippet;       // <StatusLine>
  phone?: { header: Snippet; tabbar: Snippet }; // used below 640px
  skipLabel?: string;     // default 'Skip to content'
}
```
Forms: D 88px floating rail + main, masthead in `<Sky>` · P nav inside masthead, 1240px column · S 64px rail spanning rows + main + ruled aside · Q one 72ch column. <640px: phone.header, children, phone.tabbar. Landmarks nav/header/main#main/footer + skip link. Class `.vk-appshell--<vibe>` (inf.)

**3 AppNav**
```ts
interface AppNavProps { label: string; items: NavItem[]; account: { initials: string; name: string; href?: string; menu?: Snippet }; appearance?: Snippet }
```
Forms: D rail of 72×64 labelled pills, current inset 2px primary · P section bar under the nameplate, current italic underlined, count "(3)" · S 64px ink rail of 44px icons, current inverted, square count, ink tooltip, mark, account square · Q underlined link row, current bold. `aria-current="page"`; hidden "{n} need you". Class `.vk-appnav--<vibe>` with `__item __count __tip __mark __account`

**4 Masthead** (includes LiveDot)
```ts
interface MastheadProps {
  eyebrow: string;                 // "SUPERPIPELINE · BOARD"
  title: string;
  switcher?: { label: string; onopen: () => void };   // title becomes a button with a chevron
  dateline?: string;               // Paper italic dateline / Studio right-hand mono
  command?: Snippet;               // <CommandField>
  live?: { state: 'live' | 'reconnecting' | 'offline'; label?: string };
  actions?: Snippet;               // primary <Button>
  tabs?: Snippet;                  // <Tabs> row under the masthead
}
```
Forms: D 72px bar on the sky, 700 28px display title · P nameplate from the eyebrow's product word, italic dateline, 46px edition title · S 76px ruled, uppercase eyebrow, 800 28px title at 80% stretch · Q 60px row, 700 18px title. Live: D success-wash pill, P ringed dot, S stage-text square + "LIVE", Q bold word; offline is ink, never signal. Title is `<h1>` (a button when there is a switcher); live has `role=status`. Class `.vk-masthead--<vibe>` with `__title __eyebrow __name __dateline`

**5 StatusLine**
```ts
interface StatusLineProps { items: { text: string; tone?: 'needs' | 'plain' }[] }
```
Forms: S 32px mono muted strip with a rule above, needs items in signal-text · D/P/Q a footer, items joined by " · ". Class `.vk-statusline--<vibe>`

**6 PhoneTabBar**
```ts
interface PhoneTabBarProps { label: string; items: NavItem[] }  // 4 or 5 items
```
Forms: D floating card, 58px tabs, current inset primary ring · P 3px double rule above, small-caps tabs · S ink bar, mono 11px uppercase, current inverted · Q 2px rule above, underlined text, no icons. Counts use signal-text. Class `.vk-phonetabbar--<vibe>` (inf.)

**7 PhoneHeader**
```ts
interface PhoneHeaderProps { title: string; eyebrow?: string; back?: { href: string; label: string }; actions?: Snippet; below?: Snippet /* greeting, tabs */ }
```
Forms: D sky card · P small-caps nameplate between rules · S 56px ruled, 800 22px title, ink mark · Q text actions, back reads "← label". `<header><h1>`. Class `.vk-phoneheader--<vibe>` (inf.)

**8 Button**
```ts
type ButtonProps = (HTMLButtonAttributes | HTMLAnchorAttributes) & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'signal' | 'danger';   // default 'primary'
  size?: 'md' | 'sm';               // sm = 36px drawn, 44px hit (vk-hit)
  href?: string;                    // renders <a>
  busy?: boolean;                   // aria-busy, disabled, keeps width, shows "Working…" when busyLabel set
  busyLabel?: string;
  pressed?: boolean;                // aria-pressed toggle
  icon?: Snippet;                   // leading icon
  children: Snippet;
};
```
Forms: D radius 18 + 3px lift, 600 · P radius 4, no lift, 15px, secondary 1px text edge · S radius 2, primary ink slab 800 14px, secondary 1.5px rule that inverts on hover, danger 2.5px rule, sm 36px + `vk-hit` · Q 48px, 700 17px, 2px text edge. `signal` only for replying to the person needed; `danger` is an ink outline and needs a verb + object label. Class `.vk-button` `--secondary --quiet --signal --danger --sm`. No `--primary` (the base is primary). Colours via `--_bg --_fg --_edge --_edge-w`. States `[aria-busy]`, `[aria-pressed]`, `:disabled`

**9 IconButton**
```ts
interface IconButtonProps extends HTMLButtonAttributes { label: string; icon: Snippet; expanded?: boolean; href?: string; showLabel?: boolean /* label beside icon */ }
```
Forms: D/P/S 44×44 transparent muted (S inverts on hover), expanded gets an inset 2px text ring · Q label as underlined text, no icon. Class `.vk-iconbutton--<vibe>`, `--labelled`

**10 Tabs**
```ts
interface TabsProps<T extends string> { label: string; items: (Option<T> & { href?: string })[]; value: T; onchange?: (v: T) => void; mode?: 'links' | 'panels' }
```
`links` renders `<nav><a aria-current>`; `panels` renders a bits-ui tablist. Forms: D pills on a translucent track, current primary ring · P all-small-caps, 2px ink underline · S 700 14px muted, current 3px ink bar · Q underlined, current bold. Class `.vk-tabs--<vibe>` `__item`

**11 Segmented**
```ts
interface SegmentedProps<T extends string> { label: string; options: Option<T>[]; value?: T /* $bindable */; name?: string; form?: 'auto' | 'box' }
```
bits-ui RadioGroup. Forms: D existing pill · P underlined text · S auto: run-in, 3px underline · S box: ruled uppercase, ink-filled when checked · Q underlined with a drawn radio ring. Class `.vk-segmented--<vibe>` `__item`

**12 QuickFilter**
```ts
interface QuickFilterProps<T extends string> { label: string; options: (Option<T> & { tone?: State })[]; value: T; onchange: (v: T) => void; total?: number }
```
Forms: D pill chips, checked primary + lift, needs count in signal-text · P text tabs with a 3px ink bar · S becomes SmallMultiples `interactive` · Q underlined. Scrolls horizontally on phone. Class `.vk-quickfilter--<vibe>` (inf.)

**13 Field**
```ts
type FieldProps = { id: string; label: string; hint?: string; error?: string; control?: 'input' | 'textarea' | 'select'; type?: 'text' | 'email' | 'password' | 'search' | 'number'; value?: string /* $bindable */; options?: Option<string>[]; rows?: number; maxlength?: number; counter?: boolean } & HTMLInputAttributes;
```
Forms: D 2px faint border, radius 12 · P 1px text border, radius 4 (`inline` variant is a bottom rule; not in the type) · S 1px rule, radius 0, raised, 700 12px label · Q 2px text border, 48px, 18px. Invalid: signal border + signal-text error with icon. Class `.vk-field` `__label __input __hint __error`

**14 Choice**
```ts
interface ChoiceProps { type: 'radio' | 'checkbox'; name: string; value: string; checked?: boolean /* $bindable */; label: string; description?: string; card?: boolean; disabled?: boolean }
```
Card form: checked inset 2px primary (S square, Q ink ring). List-pick variant (`pick`, untyped) for the SP Move dialog. Class `.vk-choice`

**15 CommandField**
```ts
interface CommandFieldProps { placeholder: string; kbd?: string /* '⌘K' */; onopen: () => void }
```
A `<button>` that looks like a field. D surface pill + lift · P italic underline · S 1.5px rule, min 420px · Q link "Search or run a command (⌘K)". Class `.vk-commandfield--<vibe>`

**16 CommandPalette**
```ts
interface CommandPaletteProps { open: boolean /* $bindable */; label: string; groups: { heading: string; items: { id: string; label: string; hint?: string; kbd?: string; icon?: Snippet; onselect: () => void }[] }[]; empty?: string; footer?: Snippet }
```
bits-ui Command in a dialog: 52px input; selected `inset 3px 0 0 text` (Q ring); P headings italic display. Class `.vk-commandpalette`

**17 Kbd**
```ts
interface KbdProps { keys: string[] }  // renders <kbd> per key, joined by a thin space
```
D raised mono pill · P 1px line box, faint · S 1px currentColor box · Q bare muted mono. Class `.vk-kbd`

**18 CopyId**
```ts
interface CopyIdProps { value: string; label: string /* 'session id' */; display?: string /* truncated form */; oncopied?: () => void }
```
Id in mono 12px muted. D 44px icon button · P/Q "Copy" link · S "Copy {label}" + `vk-hit`. Shows "Copied" for 2s with a live announcement. Class `.vk-copyid--<vibe>`

**19 Disclosure**
```ts
interface DisclosureProps { summary: string | Snippet; open?: boolean /* $bindable */; meta?: string; size?: 'section' | 'inline'; children: Snippet }
```
Native `<details>`. D 56px raised, chevron 180° · P 56px under a text rule, display · S 60px ruled, mono +/– · Q bold, "Show"/"Hide". Class `.vk-disclosure--<vibe>`

**20 Menu**
```ts
interface MenuProps { label: string; trigger: Snippet<[props: Record<string, unknown>]>; items: ({ label: string; kbd?: string; onselect: () => void; disabled?: boolean; danger?: boolean } | { separator: true } | { heading: string })[]; width?: number /* default 280 */ }
```
bits-ui DropdownMenu, `--vk-shadow-pop`, 44px items, `danger` in ink. P 1px text border · S rule, square, inverts · Q 2px text border. Class `.vk-menu`

**21 DataTable**
```ts
interface Column<R> { key: string; label: string; align?: 'start' | 'end'; numeric?: boolean; width?: string; sortable?: boolean; cell?: Snippet<[row: R]> }
interface DataTableProps<R> { label: string; columns: Column<R>[]; rows: R[]; rowKey: (r: R) => string; groups?: { label: string; count: number; rows: R[] }[]; selected?: string; needs?: (r: R) => boolean; index?: boolean /* Studio-style 01, 02 */; sort?: { key: string; dir: 'asc' | 'desc' }; onsort?: (key: string) => void; onrowopen?: (r: R) => void; keys?: string /* "J / K to move · ↵ to open" */; empty?: Snippet }
```
Hidden caption, `<button aria-sort>`, stretched title link opens the row, J/K moves. D sticky header, needs 4px signal edge · P italic display headers, 3px edge · S mono numbers + index, `--vk-color-select`, needs as the signal square in the State column · Q 17px, 5px edge. `<dl>` per row below 640px. Class `.vk-datatable--<vibe>`

**22 FactList**
```ts
interface FactListProps { label?: string; items: { term: string; value: string | Snippet; note?: string }[]; layout?: 'grid' | 'stack' }
```
`<dl>`, `max-content 1fr`. D muted dt · P uppercase dt, ruled · S 9px ruled rows · Q bold 18px. Class `.vk-factlist`

**23 PageHead**
```ts
interface PageHeadProps { eyebrow?: string; title: string; lede?: string | Snippet; byline?: Snippet /* AgentName "Carried out by …" */; actions?: Snippet; crumbs?: { label: string; href?: string }[] }
```
Title uses `--vk-type-h1`. Eyebrow D 700 · P uppercase .12em · S uppercase .1em · Q 700. Lede D 18 · P italic display 20 · S serif 18 · Q 20. Studio uses Hero instead. Class `.vk-pagehead--<vibe>`

**24 Hero**
```ts
interface HeroProps { figure: number | string; unit?: string; tone?: 'needs' | 'plain'; kicker: string; headline: string; lede?: Snippet /* may contain FootnoteRef */; size?: 'page' | 'section' | 'phone' }
```
S giant 900 Archivo figure (`--vk-hero-size` 184/120/96), signal when `needs`, 800 44px headline, serif lede · D/P/Q a PageHead sentence with the figure in `<strong>`. One heading. Class `.vk-hero--studio` `__figure`

**25 FigureRow**
```ts
interface FigureRowProps { label: string; items: { value: number | string; unit?: string; label: string; tone?: 'needs' | 'plain'; meter?: { value: number; max: number } }[]; size?: 'lg' | 'md' | 'sm' /* 52 / 40 / 30px */ }
```
S ruled cells, 900 display figures, zero muted 300 (`cap` variant, untyped, adds a 6px stage top) · D raised tiles, 700 28px · P ruled, 2.6rem · Q inset boxes. Class `.vk-figurerow--<vibe>`

**26 SmallMultiples** (also UnitChart and ShareBar)
```ts
interface Multiple { key: string; label: string; count: number; units: State[]; note?: string | Snippet; stage?: 1|2|3|4|5|6|7 }
interface SmallMultiplesProps { label: string; caption?: string /* "1 square = 1 card · stages darken towards Shipped" */; items: Multiple[]; interactive?: { value: string; onchange: (k: string) => void }; share?: { label: string; parts: { key: string; label: string; count: number; state: State }[]; total: number } }
```
S grid, stage band, 900 72px count, 18px unit squares (needs signal, done stage-7, working stage-6, queued stage-5 outline, blocked hatch, off muted outline), share bar of 14px bars · D lane-head chips + pill share bar · P ruled columns, share as a sentence · Q `<ul>` of "label: count". `<figure>`. Class `.vk-smallmultiples--<vibe>`

**27 StageTrack**
```ts
interface StageTrackProps { stages: string[]; current: number; state?: 'current' | 'stopped' | 'needs' | 'failed' | 'finished'; label?: string; size?: 'md' | 'phone'; numbered?: boolean }
```
ARIA unchanged: `<ol>`, `aria-current="step"`, hidden "(done)" / "(stopped — needs you)" / "(to do)" / "(failed)". D 8px pill bars (done success, current primary + outline, flex 2.6, stopped signal) · P ruled columns, current italic, signal underline when stopped · S `--vk-stage-n` bands, current 14px, stopped inset signal · Q `<ol>`, current bold, " — stopped, needs you". Class `.vk-stagetrack--<vibe>` (inf.; was `.vk-stages`)

**28 StateLabel**
```ts
interface StateLabelProps { state: State; label?: string /* default from copy: 'Waiting on you', 'Working', 'Blocked', 'Stopped', 'Failed', 'Done', … */; form?: 'auto' | 'pill' | 'marker' /* marker = glyph only + hidden text, for table columns/rails */ }
```
D mood pill (needs signal ring, stopped/failed ink ring + glyph, queued/off muted, marker 9px dot) · P uppercase word, signal dot for needs · S 11px square + 700 word (ramp, hatch, ink X for failed) · Q bold word only. D/P put an icon on failed, stopped and done. Class `.vk-statelabel--<vibe>` (inf.; replaces `.vk-pill--*`)

**29 AgentName / 30 Face**
```ts
interface AgentNameProps { id: string; name: string; mood?: Mood; src?: string; role?: string /* 'Delegate', 'Asked by', 'Carried out by' */; href?: string; size?: 24 | 32 | 44; initials?: string /* person, not agent */ }
```
Face keeps `{ id: string; label: string; mood?: Mood; size?: number; src?: string }` and adds `ring?: boolean`. Agent faces are round in every vibe (the Studio square rule is deleted); only Studio person initials are square (`.vk-agentname__initials`); Quiet uses `grayscale(.6)`. D name + muted role, stack `.vk-agentname-stack` · P italic display name · S 700 14px · Q 700. Classes `.vk-agentname--<vibe>`, `.vk-face`

**31 AgentQuote** (NeedsYou is `tone="needs"` with no `who`; the spec says `who` is optional, but the type has it required)
```ts
interface AgentQuoteProps { who: { id: string; name: string; mood?: Mood }; tone?: 'needs' | 'plain' | 'done' | 'off'; heading?: string /* 'Stopped — waiting on you' */; meta?: string /* 'attempt 2' */; text: string /* verbatim, rendered as text with preserved line breaks */; clamp?: number /* lines, with "Show full reason" */; children?: Snippet /* footnote refs, links after the text */ }
```
Text uses `pre-line`, never `{@html}`. D bubble `6px lg lg lg`, needs signal-wash · P letter, italic "— name" · S 4px edge by tone, serif 19px, "Show full reason" · Q needs is a 3px signal fieldset. NeedsYou is `tone="needs"` with no `who` (the spec says optional; the type says required). Class `.vk-agentquote--<vibe>`

**32 Footnotes / FootnoteRef**
```ts
interface FootnoteRefProps { n: number }   // <sup><a href="#fn-{n}" id="fnref-{n}">
interface FootnotesProps { items: { n: number; text: string | Snippet; copy?: { value: string; label: string } }[]; label?: string /* 'Notes' */ }
```
S mono stage-text refs, 2-column serif notes · P italic numerals · D/Q hidden refs, plain list (Q headed "Details"). Class `.vk-footnotes--<vibe>`

**33 SectionHeader**
```ts
interface SectionHeaderProps { n?: number /* renders 01 */; title: string; level?: 2 | 3; meta?: string | Snippet; count?: number; action?: Snippet }
```
S rule above, mono number, 800 16px · P ink rule below, 600 28px display · D 700 display + mono count · Q 700 24px, "— 43 agents". Class `.vk-sectionheader--<vibe>`

**34 Dialog / Drawer / Sheet**
```ts
interface OverlayBase { open: boolean /* $bindable */; title: string; description?: string; onclose?: () => void; children: Snippet; actions?: Snippet; lead?: Snippet /* left-aligned action */ }
interface DialogProps extends OverlayBase { size?: 'sm' | 'md' | 'lg' /* 420 / 560 / 720 */; eyebrow?: string; role?: 'dialog' | 'alertdialog' }
interface DrawerProps extends OverlayBase { width?: string /* default per vibe */; eyebrow?: string; tools?: Snippet /* header icon buttons */ }
interface SheetProps extends OverlayBase { grab?: boolean }
```
bits-ui Dialog; `--vk-scrim`; actions at right, `lead` at left. Dialog: D radius lg · P ink ring · S square, 3px rule cap · Q 2px ink ring, no shadow. Drawer width: D 680 · P min(780, 100%) centred · S 940 (SP card) / 420 · Q min(1120, 100%). Sheet top: D rounded + grab · P double · S 6px ink · Q 3px. The SP reply dock is meant to be `Sheet modal={false}`, but `modal` is NOT in the type. Classes `.vk-dialog|drawer|sheet--<vibe>` (inf.)

**35 Toast (+ Toaster)**
```ts
interface ToastProps { message: string; tone?: 'plain' | 'ok' | 'bad' | 'busy'; actionLabel?: string; onaction?: () => void; ondismiss?: () => void }
```
Mount one `<Toaster>` (`status`, or `alert` for `bad`). D primary pill · P ink ring · S 4px ink edge, serif · Q 2px border. `bad` is ink, never signal. Class `.vk-toast`

**36 Notice**
```ts
interface NoticeProps { tone: 'needs' | 'error' | 'ok' | 'info' | 'secret'; title?: string; children: Snippet; action?: Snippet }
```
`needs` = signal-wash + signal ring · `error` ink · `ok` success-wash · S square, 4px signal edge (`inverse` archived banner, untyped) · Q 3px borders. `alert` when it appears after load, else `note`. Class `.vk-notice`

**37 EmptyState**
```ts
interface EmptyStateProps { title: string; body?: string; action?: Snippet; size?: 'page' | 'inline' }
```
D centred surface box + product chip · P italic display under a rule · S serif 17px (page size: 800 34px title) · Q plain. Class `.vk-emptystate--<vibe>`

**38 Loading**
```ts
interface LoadingProps { kind: 'skeleton' | 'spinner' | 'bar'; label: string /* 'Loading the board' */; lines?: number; progress?: number /* bar only, 0..1 */ }
```
Skeleton breathes 1.6s (S shimmer, square; Q/reduced motion static) · spinner 36px · bar 6px primary (S stage-7). Class `.vk-loading`

**39 LoadMore**
```ts
interface LoadMoreProps { shown: number; total: number; label?: string /* 'Show 25 more' */; busy?: boolean; onmore: () => void }
```
"{shown} of {total} shown" + a secondary Button. P rule · S right-aligned, mono · Q full width. Class `.vk-loadmore`

**40 Meter**
```ts
interface MeterProps { value: number; max: number; label: string; segments?: number /* Studio discrete */; tone?: 'good' | 'plain' }
```
D 8px pill, success (`good`) or primary (`plain`, used for spend) · P 4px text fill · S discrete stage-7 segments · Q ink outline. `role=meter`. Class `.vk-meter--<vibe>`

**Sky** `{ phase: Phase; children?: Snippet }`, unchanged; `.vk-sky` `__content` `__sun`.

## 2. Shared types (§2.3, verbatim)
```ts
export type State = 'needs' | 'working' | 'thinking' | 'queued' | 'blocked' | 'stopped' | 'failed' | 'done' | 'resting' | 'off';
export type Tone = 'needs' | 'good' | 'neutral' | 'quiet';
export interface NavItem { id: string; label: string; href: string; icon: Snippet | Component; count?: number; countIsNeeds?: boolean; current?: boolean; kbd?: string }
export interface Option<T extends string> { value: T; label: string; count?: number; disabled?: boolean }
```
- **Colour rule:** "`State` has no colour of its own except `needs`. `failed` and `stopped` render in ink with the word, and an icon where the form shows icons."
- **Mappings given:**
  - SW: pass→done, fail→failed, changes→queued, superseded→off with a strike-through.
  - SL: approved/completed→done, in-progress→working, superseded/abandoned→off, rejected/failed→failed.
  - SP: the spec gives **no table**. SP maps its own urgency and moods onto `State`.

## 3. Token changes

**Studio becomes Annual report** (`studio.ts` is rewritten):

| Token | Light | Dark |
|---|---|---|
| bg | `#F6F3EC` | `#14130F` |
| surface | `#EEEAE0` | `#1C1B17` |
| raised | `#FBF9F4` | `#23211C` |
| line | `#D8D2C5` | `#36332C` |
| text | `#15130F` | `#F1EDE4` |
| muted | `#5C564D` | `#AAA398` |
| faint | `#6B655B` | `#8F887D` |
| primary / fg | `#15130F` / `#F6F3EC` | `#F1EDE4` / `#14130F` |
| signal (vermilion) / wash / text | `#E8461C` / `#FBE5DA` / `#B2300C` | `#FF6A3D` / `#2E1D16` / `#FF8D68` |
| success (blue) / wash / text | `#354E92` / `#E4E8F4` / `#233772` | `#93A7DA` / `#23283A` / `#A3B6EC` |
| ground | `#E6E1D5` | `#0C0B09` |

- **Fonts:** display and body `'Archivo Variable', system-ui, sans-serif`; mono `'Azeret Mono Variable', ui-monospace, monospace`; serif `'Newsreader Variable', Georgia, serif`.
- **Shape:** radius 2/2/4, pill 999, lift 2.
- **Moods** are now per vibe (`VibeSource.mood`); Studio has its own moods.
- **`--vk-face-ink`** is overridden in Studio to `#15130F` and `#14130F`.
- **Sky:** Studio stays flat with LED suns.

**Fonts** (vibekit `dependencies`, loaded through vibekit `fonts.css`, so SP needs no direct dependency):
- **Adds** `@fontsource-variable/archivo@5.3.0`, as `@import "@fontsource-variable/archivo/wdth.css"` for the wdth axis that `font-stretch` needs, and `@fontsource-variable/azeret-mono@5.3.0`.
- **Removes** `@fontsource-variable/instrument-sans`.
- **Unchanged:** Newsreader, Bricolage, Figtree, Geist, Martian Mono and Atkinson 400/700.
- **Family names** in the tokens become Fontsource names ending in ` Variable`. The colours of D, P and Q are unchanged.

**New `LookColors` keys** (every look, both themes):

| Key → CSS | Daylight L / D | Paper L / D | Studio L / D | Quiet L / D |
|---|---|---|---|---|
| `rule` → `--vk-color-rule` | `#F0DCCF` / `#36355A` (= line) | `#1C1B18` / `#EDE7DC` (= text) | `#15130F` / `#F1EDE4` | `#111113` / `#FAFAFA` |
| `stageText` → `--vk-color-stage-text` | `#1D5A35` / `#AEE6C3` | `#3A5E44` / `#A9CDB2` | `#2B3F8C` / `#A3B6EC` | `#15803D` / `#4ADE80` |
| `stage[7]` → `--vk-stage-1..7` | line→text ramp, steps 6/7 = successText/text | same | blue `#C9D3EC…#233772` / `#2A3864…#BCCAEE` | same as D |

- **`--vk-font-serif`** is defined in every look: Newsreader in S and P, Figtree in D, Atkinson in Q.
- **Stage ramps** in D, P and Q are only used by FigureRow `cap` and Meter.

**Type scale** (§2.5, `--vk-type-*` font shorthands):

| Token | Daylight | Paper | Studio | Quiet |
|---|---|---|---|---|
| `--vk-type-h1` | 700 34px/1.1 display | 500 46px/1.04 display | 800 44px/1.02 display (stretch 82% via `--vk-type-h1-stretch`) | 700 34px/1.2 body |
| `--vk-type-h2` | 700 22px/1.2 display | 600 28px/1.15 display | 800 16px/1.2 body | 700 24px/1.3 body |
| `--vk-type-eyebrow` | 700 12px/1.2 body | 600 12px/1 body | 700 12px/1.25 body | 700 16px/1.4 body |
| `--vk-type-meta` | 400 14px/1.4 body | 400 14px/1.4 body | 500 12px/1.4 mono | 400 16px/1.5 body |
| `--vk-type-mono` | 400 12px/1.4 mono | 400 12px/1.4 mono | 500 12.5px/1.4 mono | 400 14px/1.4 mono |
| `--vk-type-quote` | 400 17px/1.55 body | 400 20px/1.6 display | 400 19px/1.42 serif | 400 18px/1.55 body |
| `--vk-type-body` | 400 16px/1.5 body | 400 16px/1.5 body | 400 14px/1.45 body | 400 18px/1.6 body |

**Derived tokens** live in a new `derived.css` in `@layer vk.tokens`, imported by `vibekit.css`:
- **Scrim and shadows:** `--vk-scrim` is 42% text in light and 74% bg in dark; Studio uses 45% text and 72% ground. Also `--vk-shadow-pop`, `-dialog`, `-drawer`, `-sheet` and `-rail`; Quiet sets every shadow to none.
- **Others:** `--vk-live-halo`, `--vk-color-select` (6% text into bg), `--vk-hatch-blocked` (stage-5 diagonal; faint in Paper), `--vk-sky-glass` and `--vk-sky-glass-hover`, `--vk-code-bg` (= raised, for all code and pre), and `--vk-warn-row`.

**Count badges:** every count badge is `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg)`. That pair measures 5.6–6.0 in light and 7.5–9.8 in dark. Plain signal measures 3.7–4.1 and fails at 12px. Large figures and squares keep `--vk-color-signal`. Any badge SP draws itself must follow this rule.

**No danger colour:**
- There is no `--vk-color-danger` and no outcome palette. Destructive means an ink outline plus a verb, and failure means ink plus a word plus a glyph. Signal only ever means "a person is needed now".
- **SP impact:** `app.css` has `--color-destructive: var(--vk-color-signal-text)`, which should become ink. `--sp-scrim: rgb(14 13 24 / .55)`, which is on the raw-colour allow-list, should become `--vk-scrim`.

## 4. CSS exports, the appearance store, HEAD_SCRIPT and the unspecified parts

**Current `exports`** (0.0.1; the spec proposes no change):
- `"."` → `dist/index.js` (svelte and types)
- `./vibekit.css` imports tokens, base and components into the layers `vk.tokens`, `vk.base` and `vk.components`
- `./tokens.css`
- `./fonts.css` (`@font-face` only, loaded separately)
- `./tailwind.css`
- `./llms.txt`
- `./tokens/*` (DTCG)

**New in 0.1.0:**
- **`derived.css`** is imported inside `vibekit.css`. It has no export entry of its own, so importing `tokens.css` alone does not include it.
- **`components/<name>.css`** files are pulled in by `components.css` and are not exported individually.
- **SP keeps** `@import '@superjackfruit/vibekit/fonts.css'; @import '@superjackfruit/vibekit/vibekit.css';`. SP's layer order is `theme, base, vk, components, utilities`, so all vk layers sit below SP's components and utilities.

**Appearance and HEAD_SCRIPT:** the spec does not touch them.
- `Appearance = { vibe; theme: 'sun'|'light'|'dark'; timeStrength; useLocation }`.
- The cookie is `vk_appearance=<vibe>.<theme>.<strength>.<0|1>`.
- `HEAD_SCRIPT` sets `data-vibe`, `data-theme`, `data-phase` and `data-time`.
- SP's `head-script.test.ts` asserts that `app.html` inlines `HEAD_SCRIPT` verbatim.
- **Nothing knows `accent`:** not Appearance, the cookie, `htmlAttributes`, HEAD_SCRIPT, VibeRoot or VibeState.

**Not specified, so the planner must assume:**
1. The version number. SP depends on `file:./vendor/vibekit-0.0.1.tgz` and will need a new 0.1.0 tarball.
2. Everything about accent: tokens, `data-accent`, cookie, picker, and the Studio ramp regeneration.
3. The export names of types, and whether `Overlay` and `Column` are exported.
4. The class names of some Mode T roots, marked (inf.) above.
5. Props used in the text but missing from the types: `Sheet.modal` (the SP reply dock), `Field.inline`, `Choice.pick`, `Notice.inverse`, `FigureRow.cap`, and `AgentQuote.who` being optional.
6. Whether the 0.0.1 classes `.vk-stages*`, `.vk-pill*` and `.vk-button--primary` survive.
7. Which of VibeRoot and the SP AppearanceStore writes the `<html>` attributes.

**Accent (from the brief only):**
- **Tokens:**
  - `--vk-accent`: fills, rings, underlines and bars. Needs ≥3:1 on bg and surface, and ≥4.5:1 under fg.
  - `--vk-accent-fg`: equals the vibe's `bg`.
  - `--vk-accent-wash`: the background of the current nav item and of the selected tab or segment.
  - `--vk-accent-text`: links and current labels. Needs ≥4.5:1 on bg, surface and wash.
- **Studio only:** `--vk-stage-1..7` is regenerated from the accent hue. `--vk-color-stage-text` and `--vk-color-success-text` become accent-text, `--vk-color-success` becomes stage-6, and `--vk-color-success-wash` becomes accent-wash.
- **Where accent applies:** the product mark, the current nav item, the selected tab or segment, links, the focus ring and Studio stages.
- **Where it never applies:** the signal, body text, and ink primary buttons.
- **Mechanism:** `data-vibe`, `data-theme` and `data-accent` go on the same element, so for SP that is `<html>`. The mockups use `.acc[data-vibe][data-theme][data-accent]`.
- **The 8 keys:**

  | Key | Hue | Default for |
  |---|---|---|
  | `gold` | 95° | **Superpipeline** |
  | `moss` | 128° | — |
  | `jade` | 155° | Superwitness |
  | `teal` | 192° | — |
  | `azure` | 230° | — |
  | `cobalt` | 260° | AgentPod |
  | `violet` | 290° | Supermessage |
  | `plum` | 335° | Superlibrary |

- **Picker:** "Product colour (default)" comes first, then the eight. Choosing another product's colour is allowed, with a note.
- **Gold values** (accent / fg / wash / text):

  | Look | Light | Dark |
  |---|---|---|
  | Daylight | `#866f00` / `#fff8ee` / `#f8f1d3` / `#806b00` | `#ac9000` / `#17162a` / `#352c09` / `#ae9319` |
  | Paper | `#83701f` / `#fbf8f2` / `#f5f0dd` / `#7c6a1f` | `#a3914c` / `#1a1916` / `#322c18` / `#a59453` |
  | Studio | `#826c00` / `#f6f3ec` / `#f7f0d9` / `#7c6700` | `#a58c26` / `#14130f` / `#332c13` / `#ab9337` |
  | Quiet | `#8a7300` / `#ffffff` / `#f8f2dc` / `#806b00` | `#a18a31` / `#0e0e10` / `#332c15` / `#a99442` |

- **Studio gold ramp:** light `#dad4b9 #c5ba90 #af9e60 #96812e #7d6800 #625100 #483b00`; dark `#473a00 #584800 #6c5900 #87710a #9e8a3e #b8a86f #d5cba4`.
- **Brief caveat:** gold at 4.5:1 is a deep olive-gold. The pale `--vk-product-superpipeline-bg` can stay as a decorative tile colour.
- **Suggested assumption (mine, not the spec's):**
  - vibekit ships `[data-accent="<key>"]` blocks, and an absent attribute means the product default.
  - SP sets `data-accent` on `<html>`, defaulting to `gold`.
  - SP persists the accent in a separate key, set by its own inline head script before paint, so the verbatim-HEAD_SCRIPT test still holds. Extending the cookie instead would need vibekit to coordinate `parseAppearance` and HEAD_SCRIPT.
  - Fallback if vibekit does not ship accent: SP defines the gold table locally under `[data-vibe][data-theme]`.

## 5. Breaking changes SP must absorb

**What SP uses today:**
- **Imports:** Face, Sky, StageTrack, greeting, say, HEAD_SCRIPT, the appearance functions, VIBES, and the types Mood, Phase, Vibe, Theme, Place and Appearance.
- **Raw classes:** `vk-button` ×15, `--primary` ×9, `--signal` ×5, `--secondary` ×4, `vk-segmented` and `__item` (AppearanceDialog), `vk-sky` ×2, `vk-stages` ×2.

**Changes, one by one:**
- **StageTrack**
  - The `stopped?: boolean` prop is replaced by `state?: 'current'|'stopped'|'needs'|'failed'|'finished'`. This breaks `BoardStudio.svelte:113`, `CardStudio.svelte:87` and `CardDaylight.svelte:40`. The fix is `state={needs ? 'needs' : 'current'}`.
  - It is now Mode T and the class changes from `.vk-stages`, so SP CSS on `.vk-stages` breaks.
  - The ARIA text is unchanged.
- **Face / AgentFace**
  - Face still compiles and gains `ring`.
  - The Studio square-face rule is deleted, so agent faces become round. Quiet faces turn `grayscale(.6)`.
  - The new AgentName duplicates `AgentFace.svelte`'s mood, portrait, light and name variants. Replace or slim AgentFace; `status-led` stays SP-local.
- **Sky:** unchanged (`Landing`, `GreetingBand`). In Daylight, AppShell puts the masthead in Sky itself.
- **say and greeting:** unchanged (`superlibrary.ts:103`, `CardDaylight.svelte:23`, plus greeting in 5 files).
- **Button classes**
  - `vk-button--primary` is gone, but the base already draws the primary, so the class becomes harmless and should be dropped.
  - `--danger` and `--sm` are new.
  - Colours move to `--_bg` and `--_fg`, and `:where(.vk-button){background:var(--_bg)}` decides the paint. An SP rule that sets `background` or `color` directly on these buttons should set `--_bg`/`--_fg` instead.
  - Sizes change per vibe: Quiet 48px 700 17px, Studio 800 14px, Paper 15px.
  - Files: Peek, BoardStudio, BoardPaper, GatePaper, GateQuiet, QuestionPaper, QuestionQuiet, RelatedWork, LibraryArtifact, AppearanceDialog, and the `*-panel.contract.ts` files.
  - Check that every `--signal` use is really a reply to the person who is needed.
- **Segmented**
  - It is now Mode T.
  - AppearanceDialog's hand-rolled `.vk-segmented` markup will not get the Paper, Studio or Quiet forms. Switch it to `<Segmented>`.
- **StatusPill, Toast, Field:** SP does not use these from vibekit. Toast needs one `<Toaster>` mounted.
- **Studio tokens**
  - Every SP Studio view changes: vermilion instead of amber `#A86400`, blue success instead of green (so `--color-live` turns blue), radius 2 instead of 6/10/14, and Archivo instead of Instrument Sans.
  - SP's `[data-vibe='studio'] .eyebrow` rule (mono uppercase 11px) conflicts with the new Studio eyebrow (body 700 12px .1em).
  - SP Studio screenshot baselines must be redone.
- **Font family strings** change to `"… Variable"`. SP reads `var(--vk-font-*)`, so it is safe.
- **VibeRoot is required** for Mode T, so it goes in SP's root layout.
- **Destructive and scrim:** remap destructive to ink, and use `--vk-scrim`. Then drop the allow-list entry from `no-raw-colour.test.ts`.

## 6. §1.6 "Left product-local, not in vibekit" (verbatim)

> These pass the recurrence rule inside one product only, and their structure is domain-specific. They build on vibekit primitives but are not shared:
> - SP board lanes and card tile (`dl-tile`, `pp-story`);
> - SL file viewer reading column, TOC, version list, diff, upload dropzone and redaction;
> - AP log/terminal (`.log`, `.term`; one background decision noted in §3.2) and roster node cards;
> - SW span waterfall (`wf-*`, 8 artboards), transcript step (`tx-*`, 7) and rubric editor.
>
> SL's dropzone and sign-in panel use `Field`, `Button` and `Notice`.

**SP builds itself:**
- the board lanes and the card tile, in all four vibe forms, on top of StateLabel, AgentName, StageTrack, SmallMultiples, Kbd and so on;
- its mapping of card state onto `State`;
- its existing SP-only pieces, such as `status-led`, `flow-arrow` and `.gate-actions`.

## 7. Reference sheets and Storybook

These are not published (`files` is unchanged).
- **Use:** inspection and visual targets only. The sheets live in the vibekit repo at `references/components/<Name>.<vibe>.html` (add `?theme=dark` for dark), and the Storybook runs with `pnpm storybook`.
- **Forced states:** `.is-hover`, `.is-focus` and `.is-active` exist only in Storybook and the sheet CSS. SP must not rely on them.
- **Build order (§6):** tokens, then the runtime (context and VibeRoot), then Storybook with Button, then controls (8–20), data display (21–33) and overlays (34–40). The shell (2–7) comes last.
- **For SP:** if SP consumes a partial vibekit, tokens, Button, Segmented and StageTrack arrive first. AppShell, AppNav, Masthead, PhoneTabBar, PhoneHeader and StatusLine arrive last.
