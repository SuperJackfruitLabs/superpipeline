## 30. Studio ("Annual report") — drawer, card page, card states, phone card

Sources: `scratchpad/vibes-mockups/project/SP-Card-Studio.dc.html`, `SP-CardPage-Studio.dc.html`, `SP-Card-States-Studio.dc.html`, `SP-Phone-Card-Studio.dc.html`; tokens `vk.css` (Studio = Annual report); brief `brief/studio-annual.md`. Everything in 00-shared applies; this part adds only what is Studio's.

### 30.0 vibekit components used

Names and base props are the ones in 00-shared §1.7; the Studio column says the Studio variant/props each use needs. CSS quoted below under "vibekit sheet reference" is the Studio reference for that component's per-vibe sheet; it is **not** copied into app `<style>` blocks.

| Component | Studio props / variant | Where used (Studio) |
|---|---|---|
| `vibekit:Drawer` | `{ width: 'min(940px, 100%)', align: 'end', labelledBy: 'cw-title' }`; scrim `color-mix(in srgb, var(--vk-color-text) 45%, transparent)`; panel `background: var(--vk-color-bg); border-left: 1.5px solid var(--vk-color-rule); box-shadow: -24px 0 60px color-mix(in srgb, var(--vk-color-text) 22%, transparent)` | SP-Card-Studio |
| `vibekit:Sheet` | `{ labelledBy: 'drawer-title' }`, Studio sheet = `.ar.ph` root (bg, no radius) | SP-Phone-Card-Studio |
| `vibekit:Button` | `variant: 'primary'` = `.ar-btn` (ink fill); `'secondary'` = `.ar-btn2` (1px rule frame, inverts on hover); `'link'` = `.ar-lk` (underlined text, `quiet` → muted); optional `kbd` renders `vibekit:Kbd` after the label; `icon` before the label | every button and link-button |
| `vibekit:IconButton` | `.ar-ib` (44×44, 1px rule frame) or `.ph-ib` (44×44, frameless) → prop `frame?: boolean` | Close (Esc), Edit card (phone), Open as a page (phone), Appearance (page) |
| `vibekit:Kbd` (new) | `{ keys: string }` — `.kbd` | ⇧O, E, ⌘↵, A, C, G B, ←, →, ⌘K, ⇧C, N |
| `vibekit:CopyButton` | Studio forms: icon-only 44×44 (`.cw-bar .id button`, `.cp-crumb .id button`), text link `.ar-lk` ("Copy session id", "Copy"), id chip (`.pc-bar .sid`, text "4605" + icon) | card id, session id, raw JSON, digest |
| `vibekit:Tabs` | `{ label: 'Card sections', tabs, active, panel, hint?: boolean }` — Studio tab = `.ar-tab` with underline `::after`, count in `.mono` (desktop) or `<b>` (phone); `hint` renders the "← →" Kbd pair at the end (`.cd-tabs .end`, `aria-label="Arrow keys switch sections"`) | drawer §04, phone tabs |
| `vibekit:StageStrip` | `{ stages, current, status: 'needs' \| 'active' \| 'archived' \| 'done', labels: 'all' \| 'current' \| 'none', ramp: true, label }` — Studio = `.ar-track` (one ramp colour per stage `--vk-stage-n`, done = opacity 1, current taller with signal underline when `status='needs'`); `labels: 'current'` (states cells) gives the current item `grid-column: span 2` and numbers-only for the rest; `labels: 'none'` (phone) sets `font-size: 0` and keeps the sr text | head of drawer, page, states, phone |
| `vibekit:StageSwatch` (new) | `{ index: 1..7 }` — `.chip.cN` 10×10 square | kicker "stage 02 Reproduce" |
| `vibekit:FigureRow` / `vibekit:Figure` | `{ figures: { value: string; unit?: string; label: string; tone?: 'needs' \| 'zero' }[] }` — `.ar-figs` (desktop, 52px Archivo 72% stretch), `size: 'sm'` = `.ss-figs` (30px, 4 columns), `size: 'phone'` = `.pc-figs` (34px, 3 columns, `<dl>` with label after value) | drawer, page, states D/F, phone |
| `vibekit:StatePill` | Studio = `.cd-pill` with `.u` unit square: `tone: 'needs'` → signal square + signal-text; `'archived'` → archive icon, ink; `'done'` → `.u.done` (darkest ramp) | Who and what, page people row, phone status row, states D |
| `vibekit:AgentFace` | `{ name, mood, size: 20 \| 24, variant: 'light' }` (FACE_VARIANT.studio) | quotes (24), tables/rows (20), page people (24) |
| `vibekit:Initials` (new, also used by PersonRow) | `{ text: 'RG', size: 20 \| 24 }` — `.ar-ini` (ink square, bg text, font-size 8px at 20, 10px at 24) | Owner rows |
| `vibekit:AgentQuote` | `{ agent, who, text, tone: 'needs' \| 'ink' \| 'done' \| 'off', at?, tokens: true, footnotes? }` — `.ar-q` (4px left rule: signal / ink / `--vk-stage-7` / hair; `h3` header with face + who + mono time; `blockquote` Newsreader 19px; `size: 'md'` 18px page, `'sm'` 17px states/phone) | 01 Why it stopped; states A/B/C/D/F; phone readout |
| `vibekit:Footnote` / `vibekit:FootnoteRef` | `.fn` superscript (`--vk-color-stage-text`); row form `.ar-pfn` (number · text · trailing action); list form `.ar-notes` | session id (drawer, page), digest (states) |
| `vibekit:FactList` | Studio `variant: 'who'` = `.cd-who` (mono dt, rule between rows); `variant: 'inline'` = `.cp-people`; `variant: 'three'` = `.pc-fx3`; `variant: 'kv'` = `.ss-kv` | 02 Who and what, page people row, phone Facts, states C/D |
| `vibekit:Field` | `.ar-field` + `.ar-sel` / `.ar-ta` / `.ar-in` + `.ar-hint`; `error` → `.ss-field-bad` (2px border) + `.ss-err` line with alert icon | resume, comment, gate note, answer, sub-task, reference |
| `vibekit:Meter` | `variant: 'steps'` = `.cd-meter` (one cell per step, done = `--vk-stage-7`, open = hairline box) | plan, page cost |
| `vibekit:NumberedList` (new) | `{ items: { text: string; done?: boolean }[]; columns?: 1 \| 2 }` — `.cd-ol` / `.pc-nl` (01, 02 … mono counters; done = muted + line-through + sr ", done") | criteria, plan steps, phone "Things to prove" |
| `vibekit:DataTable` | `{ caption?, columns: { key, label, width?, mono?: boolean }[], rows, rowGroups?: true }` — `.cd-dt` (and `.ar-tbl` on the board behind) | Details (row groups), Runs, Latest run, Links, Attempts |
| `vibekit:DefinitionGroups` | Studio desktop renders through `vibekit:DataTable rowGroups` (`th[scope=rowgroup]`); phone `variant: 'stacked'` = `.pc-grp` + `.pc-kv` | Details |
| `vibekit:Disclosure` | `.pc-det` (summary h3 underlined until open), `.pc-run` (run rows); raw JSON uses the `.ar-lk` `aria-expanded` toggle form | phone Details, phone runs, View raw JSON |
| `vibekit:RunRow` | phone `.pc-run` + `.pc-ev` (event verb 74px column, time under text) | phone Log |
| `vibekit:LinkList` | phone `variant: 'rich'` = `.pc-refs` (bold underlined title, serif subtitle, mono provenance) | phone References |
| `vibekit:Alert` | Studio `.ss-alert` (1.5px rule frame, bg, alert icon, **ink** not signal — the decision already happened) | cell E |
| `vibekit:Banner` | `variant: 'ink'` = `.ss-banner` (ink fill, mono right text) and `.pc-arch` (ink block with serif text + inverted primary button) | cell C, phone archived |
| `vibekit:Skeleton` / `vibekit:LoadingNote` | `.ss-sk` (shimmer gradient `--soft`→`--vk-color-line`, 12px; 26px/70% inside figures) | cell F |
| `vibekit:EmptyState` | `.cd-p` / `.note` sentence | Decisions none, comments none, delivery none, plan none |
| `vibekit:CommandField` (new; the shell's search field) | `{ placeholder: 'Search or run a command', shortcut: '⌘K', tone: 'onInk' }` — `.ar-cmd` in `.cp-top` | page top bar |
| `vibekit:StatusBar` (new) | `{ items: { text: string; tone?: 'needs' }[]; hints: string[] }` — `.ar-status` | page footer |

### 30.0.1 `CARD_LAYOUTS.studio`

```ts
studio: { drawer: CardStudio, phone: CardPhoneStudio, width: 'min(940px, 100%)', align: 'end' }
```
From `.ar.cw { grid-template-columns: 64px minmax(0, 1fr) 940px }` — the drawer column is 940px at 1440 (the old 760px is wrong). `CARD_PAGE_LAYOUTS.studio = CardPageStudio`, `CARD_STATES_LAYOUTS.studio = CardStatesStudio`.

### 30.0.2 Studio card stylesheet (shared by the four Studio components)

All four Studio artboards carry the same base block (verified identical line for line in the four `.dc.html` files, lines 15–198). It becomes **one global stylesheet** `lib/components/card/studio/card-studio.css`, imported once from each of the four Studio components (`import './studio/card-studio.css'` — relative to `card/layouts`, `card/page`, `card/states`), with every rule rooted at `.ar` so nothing leaks; the resets are `:where()` so they never outrank a component (operator correction 3). The parts tagged **vibekit sheet reference** are what the vibekit Studio sheets must reproduce and are deleted from this file once the vibekit component exists; until then they live here. The board-behind rules (`.ar-rail`, `.ar-top`, `.ar-board`, `.ar-sw`, `.ar-live`, `.ar-sub`, `.ar-fl`, `.ar-hero`, `.ar-tbl`, `.ar-ramp`) belong to the shell and board groups and are **not** part of this file.

App layout CSS (stays in `card-studio.css`):

```css
:where(.ar) *, :where(.ar) *::before, :where(.ar) *::after { box-sizing: border-box; }
:where(.ar) :where(h1, h2, h3, h4, p, ul, ol, dl, dd, dt, table, form, blockquote, figure, fieldset) { margin: 0; padding: 0; }
:where(.ar) :where(ul, ol) { list-style: none; }
:where(.ar) :where(fieldset) { border: 0; min-width: 0; }
:where(.ar) :where(button, input, select, textarea) { font: inherit; color: inherit; }
:where(.ar) :where(a) { color: inherit; }
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
.ar svg[data-mood] { flex: none; }
/* numbered sections */
.ar-sec { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.ar-sec > .hd { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; padding-top: 10px; border-top: 1.5px solid var(--rule); }
.ar-sec > .hd .no { font: 500 12px var(--fm); color: var(--muted); }
.ar-sec > .hd h2 { font: 800 16px/1.2 var(--ff); }
.ar-sec > .hd .r { margin-left: auto; display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; font: 500 12px var(--fm); color: var(--muted); }
.ar .ttl { position: relative; padding: 0; border: 0; background: transparent; color: var(--text); font: 700 14px/1.3 var(--ff); text-align: left; text-decoration: none; overflow-wrap: anywhere; cursor: pointer; }
.ar .ttl::after { content: ""; position: absolute; left: -4px; right: -4px; top: 50%; height: max(44px, calc(100% + 8px)); transform: translateY(-50%); }
.ar .ttl:hover { text-decoration: underline; text-underline-offset: 3px; }
.ar-tbl .m.sig, .ar .sigt { color: var(--sig-text); font-weight: 600; }
.cd-fig { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); }
.cd-two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 28px; }
.cd-h { margin-bottom: 8px; font: 800 14px/1.3 var(--ff); }
.cd-h .mono { margin-left: 6px; font-weight: 500; font-size: 12px; color: var(--muted); }
.cd-p { font: 400 16px/1.5 var(--fs); overflow-wrap: anywhere; }
.cd-acts { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
.cd-panel { display: flex; flex-direction: column; gap: 22px; padding-top: 20px; }
```

(`.cd-*` rules are present in the drawer, page and phone files; the States file does not carry them and does not need them.)

vibekit sheet reference (Studio) — move into the named vibekit components:

```css
/* vibekit:Footnote / FootnoteRef */
.ar .fn { font: 600 11px/1 var(--fm); vertical-align: super; margin-left: 2px; color: var(--st-text); }
.ar-pfn { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; align-items: center; column-gap: 0; padding-top: 6px; border-top: 1px solid var(--hair); font: 400 14px/1.4 var(--fs); }
.ar-pfn .k { font: 600 11.5px var(--fm); color: var(--st-text); }
.ar-pfn code { font: 500 12.5px var(--fm); overflow-wrap: anywhere; }
.ar-notes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 32px; row-gap: 10px; padding-top: 10px; border-top: 1px solid var(--hair); }
.ar-notes li { display: grid; grid-template-columns: 22px minmax(0, 1fr); font: 400 14.5px/1.45 var(--fs); }
.ar-notes li .k { font: 600 11.5px/1.9 var(--fm); color: var(--st-text); }
.ar-notes li i { font-style: italic; }
/* vibekit:Kbd */
.ar .kbd { display: inline-block; padding: 2px 5px; border: 1px solid currentColor; border-radius: 2px; font: 500 11px/1 var(--fm); white-space: nowrap; }
/* vibekit:StageSwatch + StatePill unit squares */
.ar .chip { display: inline-block; flex: none; width: 10px; height: 10px; }
.ar .c1 { background: var(--s1); } .ar .c2 { background: var(--s2); } .ar .c3 { background: var(--s3); } .ar .c4 { background: var(--s4); } .ar .c5 { background: var(--s5); } .ar .c6 { background: var(--s6); } .ar .c7 { background: var(--s7); }
.ar .u { display: inline-block; flex: none; width: 18px; height: 18px; }
.ar .u.needs { background: var(--sig); }
.ar .u.blocked { background: repeating-linear-gradient(135deg, var(--s5) 0 1.5px, transparent 1.5px 4px); box-shadow: inset 0 0 0 1.5px var(--s5); }
.ar .u.queued { box-shadow: inset 0 0 0 1.5px var(--s5); }
.ar .u.done { background: var(--s7); }
.ar .u.off { box-shadow: inset 0 0 0 1.5px var(--muted); }
.cd-pill { display: inline-flex; align-items: center; gap: 7px; font-weight: 800; white-space: nowrap; }
.cd-pill .u { width: 11px; height: 11px; }
.cd-pill.needs { color: var(--sig-text); }
/* vibekit:Initials */
.ar .ar-ini { flex: none; display: inline-grid; place-items: center; background: var(--text); color: var(--bg); font-family: var(--ff); font-weight: 800; line-height: 1; }
/* vibekit:Button / IconButton */
.ar .ar-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 16px; border: 0; border-radius: 2px; background: var(--text); color: var(--bg); font: 800 14px var(--ff); white-space: nowrap; text-decoration: none; cursor: pointer; }
.ar .ar-btn .kbd { border-color: currentColor; }
.ar .ar-btn2 { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 14px; border: 1px solid var(--rule); border-radius: 2px; background: transparent; color: var(--text); font: 700 14px var(--ff); white-space: nowrap; text-decoration: none; cursor: pointer; }
.ar .ar-btn2:hover { background: var(--text); color: var(--bg); }
.ar .ar-lk { position: relative; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 8px 0 0; border: 0; background: transparent; color: var(--text); font: 700 13.5px var(--ff); text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 3px; white-space: nowrap; cursor: pointer; }
.ar .ar-lk.quiet { color: var(--muted); }
.ar .ar-ib { position: relative; display: inline-grid; place-items: center; flex: none; width: 44px; height: 44px; border: 1px solid var(--rule); border-radius: 2px; background: transparent; color: var(--text); text-decoration: none; cursor: pointer; }
.ar .ar-ib:hover { background: var(--text); color: var(--bg); }
/* vibekit:Tabs */
.ar-tab { position: relative; display: inline-flex; align-items: center; gap: 6px; min-height: 48px; padding: 0; border: 0; background: transparent; color: var(--muted); font: 700 14px var(--ff); text-decoration: none; white-space: nowrap; cursor: pointer; }
.ar-tab[aria-current="page"], .ar-tab[aria-pressed="true"], .ar-tab[aria-selected="true"] { color: var(--text); }
.ar-tab[aria-current="page"]::after, .ar-tab[aria-pressed="true"]::after, .ar-tab[aria-selected="true"]::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 3px; background: var(--text); }
.ar-tab .mono { font-size: 12px; font-weight: 500; }
.cd-tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 0 22px; border-bottom: 1px solid var(--hair); }
.cd-tabs .end { margin-left: auto; display: inline-flex; gap: 4px; }
/* vibekit:FigureRow */
.ar-figs { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); border-top: 1.5px solid var(--rule); border-bottom: 1px solid var(--hair); }
.ar-figs > div { display: flex; flex-direction: column; gap: 6px; min-width: 0; padding: 12px 12px 14px 0; }
.ar-figs > div + div { padding-left: 14px; border-left: 1px solid var(--hair); }
.ar-figs b { font: 900 52px/.86 var(--ff); font-stretch: 72%; letter-spacing: -.03em; white-space: nowrap; }
.ar-figs b small { font-size: 17px; font-weight: 700; margin-left: 3px; letter-spacing: 0; }
.ar-figs b.z { font-weight: 300; color: var(--muted); }
.ar-figs .sig b { color: var(--sig); }
.ar-figs .sig span { color: var(--sig-text); }
.ar-figs span { font-size: 12.5px; font-weight: 600; color: var(--muted); }
/* vibekit:StageStrip */
.ar-track { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 3px; }
.ar-track li { display: flex; flex-direction: column; gap: 6px; min-width: 0; font: 500 11.5px/1.25 var(--fm); color: var(--muted); }
.ar-track li .b { height: 8px; opacity: .3; }
.ar-track li.done .b { opacity: 1; }
.ar-track li.cur .b { opacity: 1; height: 14px; margin-top: -6px; }
.ar-track li.cur.sig .b { box-shadow: inset 0 -4px 0 var(--sig); }
.ar-track li.cur { color: var(--text); font-weight: 600; }
.ar-track li.cur.sig { color: var(--sig-text); }
/* vibekit:AgentQuote */
.ar-q { display: flex; flex-direction: column; gap: 8px; padding: 2px 0 0 18px; border-left: 4px solid var(--sig); }
.ar-q.ink { border-left-color: var(--text); }
.ar-q.done { border-left-color: var(--s7); }
.ar-q.off { border-left-color: var(--hair); }
.ar-q h3 { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font: 800 14px var(--ff); color: var(--sig-text); }
.ar-q.ink h3, .ar-q.done h3, .ar-q.off h3 { color: var(--text); }
.ar-q h3 .mono { margin-left: auto; font-weight: 500; font-size: 12px; }
.ar-q blockquote { font: 400 19px/1.42 var(--fs); overflow-wrap: anywhere; }
.ar-q blockquote code, .ar-id { font: 500 .78em var(--fm); overflow-wrap: anywhere; }
/* vibekit:FactList (kv) */
.ar-kv { display: grid; grid-template-columns: max-content minmax(0, 1fr); column-gap: 16px; }
.ar-kv > dt, .ar-kv > dd { padding: 9px 0; border-top: 1px solid var(--hair); }
.ar-kv > dt { font-weight: 700; font-size: 13px; }
.ar-kv > dd { overflow-wrap: anywhere; }
.cd-who { display: grid; grid-template-columns: max-content minmax(0, 1fr); column-gap: 14px; }
.cd-who dt, .cd-who dd { padding: 9px 0; border-top: 1px solid var(--hair); }
.cd-who dt { font: 500 12px/1.6 var(--fm); color: var(--muted); }
.cd-who dd { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 14px; overflow-wrap: anywhere; }
.cd-who dd b { font-weight: 700; }
/* vibekit:Field */
.ar-field { display: flex; flex-direction: column; gap: 6px; }
.ar-field > label, .ar .lab { font-weight: 700; font-size: 14px; }
.ar-in, .ar-sel, .ar-ta { width: 100%; min-height: 44px; padding: 0 10px; border: 1px solid var(--rule); border-radius: 0; background: var(--field); color: var(--text); font: 400 16px/1.45 var(--ff); }
.ar-ta { min-height: 88px; padding: 10px 12px; resize: vertical; }
.ar-in::placeholder, .ar-ta::placeholder { color: var(--muted); }
.ar-hint { font: 500 12px/1.4 var(--fm); color: var(--muted); }
/* vibekit:NumberedList */
.cd-ol { counter-reset: n; display: flex; flex-direction: column; }
.cd-ol li { counter-increment: n; display: grid; grid-template-columns: 26px minmax(0, 1fr); padding: 7px 0; border-top: 1px solid var(--hair); overflow-wrap: anywhere; }
.cd-ol li::before { content: counter(n, decimal-leading-zero); font: 500 12px/1.6 var(--fm); color: var(--muted); }
.cd-ol li.done { color: var(--muted); }
.cd-ol li.done span { text-decoration: line-through; }
/* vibekit:Meter (steps) */
.cd-meter { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2px; margin: 4px 0 8px; }
.cd-meter i { height: 8px; background: var(--s7); }
.cd-meter i.off { background: transparent; box-shadow: inset 0 0 0 1px var(--hair); }
/* vibekit:DataTable */
.cd-dt { width: 100%; border-collapse: collapse; table-layout: fixed; }
.cd-dt td, .cd-dt th { padding: 9px 12px 9px 0; border-top: 1px solid var(--hair); vertical-align: top; text-align: left; overflow-wrap: anywhere; }
.cd-dt th[scope="rowgroup"] { width: 112px; font: 700 12px/1.4 var(--ff); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); border-top: 1.5px solid var(--rule); }
.cd-dt th[scope="row"] { width: 132px; font-weight: 700; font-size: 13px; }
.cd-dt tr.g td { border-top: 1.5px solid var(--rule); }
.cd-dt thead th { height: 30px; padding-top: 0; font: 700 12px var(--ff); color: var(--muted); border-top: 0; border-bottom: 1px solid var(--rule); vertical-align: bottom; }
.cd-dt .m { font: 500 12.5px var(--fm); white-space: nowrap; }
.cd-dt .ag { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
/* vibekit:StatusBar */
.ar-status { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 20px; min-height: 32px; padding: 0 40px; border-top: 1px solid var(--rule); font: 500 12px var(--fm); color: var(--muted); }
.ar-status .sig { color: var(--sig-text); font-weight: 600; }
.ar-status .r { margin-left: auto; display: flex; flex-wrap: wrap; gap: 16px; }
/* vibekit:CommandField (shell sheet; used on the page top bar) */
.ar-cmd { flex: 1; max-width: 480px; margin-left: auto; display: flex; align-items: center; min-height: 44px; cursor: text; }
.ar-cmd .box { flex: 1; display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 10px; border-bottom: 1.5px solid var(--rule); color: var(--muted); }
.ar-cmd input { flex: 1; min-width: 0; border: 0; background: transparent; font: 500 16px var(--ff); outline: none; color: var(--text); }
.ar-cmd input::placeholder { color: var(--muted); }
.ar-cmd:focus-within .box { outline: 3px solid var(--text); outline-offset: 2px; }
.ar-live { display: inline-flex; align-items: center; gap: 6px; font: 700 12px var(--ff); letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; }
.ar-live i { width: 8px; height: 8px; background: var(--st-text); }
```

Fonts: Studio uses Archivo (body/display, `font-stretch` 72–85%), Azeret Mono, Newsreader — loaded by vibekit's `fonts.css` (self-hosted, never Google Fonts). The mockup's Google Fonts `<link>` is canvas-only.

### 30.0.3 Studio formatting helpers (new, `lib/components/card/studio/studio-format.ts`, unit-tested)

| Helper | Rule | Examples (fixture) |
|---|---|---|
| `stageNo(i: number)` | `String(i + 1).padStart(2, '0')` | "02" |
| `stageOption(stage, i, current)` | desktop: `` `${stageNo(i)} ${stage.name}` `` + `" (this stage)"` when current; phone: `` `${i + 1} · ${stage.name}` `` + `" (where it stopped)"` | "02 Reproduce (this stage)", "2 · Reproduce (where it stopped)" |
| `figAge(hours)` | `{ value: String(n), unit: n === 1 ? 'day' : 'days' }` with `n = Math.round(hours / 24)` when hours ≥ 24; `{ value: String(Math.round(hours)), unit: 'h' }` below; `ageWords` from 00-shared §1.5 uses the same rounding | 41.8 h → "2" "days" |
| `quoteWhen(iso, now, { padDay })` | same calendar day → `HH:mm`; else `ddd D MMM HH:mm` (en-GB short weekday, no comma); `padDay` → `DD` | "Fri 9 Oct 19:41"; phone "Thu 08 Oct 19:41"; states "12:48" |
| `runEnded(iso)` | `MMM D HH:mm` (en-US short month first) | "Oct 9 19:41" |
| `clock(now, phase)` | `` `${HH}:${mm} · ${PHASE_WORD[phase]}` ``; `PHASE_WORD = { dawn: 'dawn', morning: 'morning', noon: 'midday', afternoon: 'afternoon', evening: 'evening', night: 'night' }`; `aria-label` = `` `Local time ${HH}:${mm}, ${word}` `` (drawer) / `` `${HH}:${mm}, ${word}` `` (phone). Updates every 30 s (as CardStudio does today) | "13:27 · midday" |
| `usd(n)` | `$` + `n.toFixed(2)`; `usdShort(n)` (phone tab count) = integer when whole: `$0`, else 2 dp | "$0.00", "$0" |
| `dayMonth(iso, pad)` | `D MMM` / `DD MMM` | "9 Oct", "08 Oct" |
| `finishedFig(iso)` | `{ value: 'MMM D', label: 'Finished HH:mm' }` | "Oct 9", "Finished 19:26" |
| `shortDigest(d)` | strip `sha256:`, first 8 hex, `` `sha256:${h}…` ``; seal = existing `sealOf(d)` | "sha256:9f3ac2e1…", "9f3a·c2e1" |

---

### 30.1 SP-Card-Studio — the drawer

- **Size** 1440×2322 · **vibe** studio · **route** `/b/brd_devx/c/card_05823a57e8224605` (Plan, board view, drawer open), viewport ≥ 640px. Default tab `spec`; the artboard's `tab` tweak (`spec|log|links|talk|cost`) gives five baselines: `SP-Card-Studio` (spec) plus the same artboard rendered with `{"tab":"log"}` etc. if the pixel suite exports them; the e2e test clicks the tab before each capture.
- **Behind the drawer**: the Studio shell (rail 64px, masthead, sub-bar — shell group) and the Studio board ("3 of 6 cards are waiting on a person" hero + table — board group), both `inert` under the scrim. The selected table row (`tr.sel`) is the board group's highlight of `app.openCardId`.

#### Component tree

| File | Change |
|---|---|
| `lib/components/CardDrawer.svelte` | rewritten per 00-shared §1.6; renders `vibekit:Drawer` with `CARD_LAYOUTS.studio.width` and `L.drawer` |
| `lib/components/card/layouts/CardStudio.svelte` | **rewritten** from this artboard. Props `CardLayoutProps` (00-shared §1.3). Root `<div class="ar cw-drawer-root" data-vibe="studio">` |
| `lib/components/card/studio/card-studio.css` | new, §30.0.2 |
| `lib/components/card/studio/studio-format.ts` | new, §30.0.3 |
| `lib/components/card/studio/StudioWhoWhat.svelte` | new, section 02 (also used by the page as the people row via `variant`) — props `{ model: CardModel; variant: 'list' \| 'inline' \| 'phone' }` |
| `lib/components/card/studio/StudioResumeForm.svelte` | new, section 03 — props `{ model: CardModel; variant: 'drawer' \| 'page' \| 'phone' }`, wraps `model.resume` |
| `lib/components/card/studio/StudioPanels.svelte` | new: the five tab panels as snippets-in-a-component, props `{ model: CardModel; vibe; panel: 'spec' \| 'log' \| 'links' \| 'talk' \| 'cost'; density: 'drawer' \| 'page' }` — reused by the page (which shows them as sections 04–07 instead of tabs) |
| `lib/components/card/gate/GateStudioFrame.svelte` | rewritten from States cell A body (subject table + seal) |
| `lib/components/card/gate/GateStudioBar.svelte` | rewritten from States cell A/E command area (`.ss-cmd`): note field, Approve/Request changes/Reject, error alert |
| `lib/components/card/question/QuestionStudioFrame.svelte` | rewritten from cell B quote; `showQuestion` prop removed (the quote IS the question, shown once) |
| `lib/components/card/question/QuestionStudioBar.svelte` | rewritten from cell B form |
| `lib/components/card/gate/GateStudio.svelte`, `question/QuestionStudio.svelte` | **deleted** (Frame+Bar pair is the only Studio form; their tests move to the Frame/Bar files) |
| `lib/components/LeadWords.svelte`, `lib/components/Tabs.svelte` | no longer imported by Studio (Tabs → `vibekit:Tabs`); LeadWords stays for other callers |

Where the gate/question sit in the drawer: when `gate` (or `question`) is set, section 01 "Why it stopped" is replaced by **01 "Waiting for your review"** (gate) / **01 "Question"** (question) containing `GateStudioFrame` / `QuestionStudioFrame` in the left column, and section 03 "Send it back to work" is replaced by **03 "Your decision"** / **03 "Your answer"** containing `GateStudioBar` / `QuestionStudioBar` (the same right-column slot as the resume form). Archived cards replace 01 with `CardStateStudio kind="archived"` and drop 03 (no live controls); done cards replace 01 with `kind="done"` and drop 03; while `!model.detailLoaded`, 01–04 render `kind="loading"`. These are the States artboard blocks; their CSS is in §30.3.

#### Structure (port verbatim; class names kept)

```
div.ar (Drawer content root; the Drawer frame itself = .cw-drawer)
  div.cw-bar
    a.crumb[href=/b/{boardId}]  (icon arrow-left 16) "Developer Experience"          → onClose() then navigate (same as Back to the board)
    span.id "Card 4605" vibekit:CopyButton(icon-only, label "Copy card id 4605", value card.id)
    span.r
      time[aria-label="Local time 13:27, midday"] "13:27 · midday"
      vibekit:Button(secondary, href=pageHref, target=_blank, icon external 15, kbd "⇧O", aria-label "Open in new window, Shift O", aria-keyshortcuts "Shift+O") "Open"
      vibekit:IconButton(frame, icon close, label "Close (Esc)") → onClose
  div.cw-in
    header.cw-head
      span.kick  vibekit:StageSwatch(index=stageIndex+1) "Developer Experience · stage 02 Reproduce"
      div.row  h2#cw-title {card.title}  vibekit:Button(secondary, icon pencil, kbd "E", aria-keyshortcuts "E") "Edit"   [data-section=editButton]
    vibekit:FigureRow  (6 figures)                                                    [data-section=facts — figures part]
    vibekit:StageStrip(labels 'all', status needs)
    div.cw-cols
      div  section.ar-sec "01 Why it stopped" (r: "attempt 2")  vibekit:AgentQuote + vibekit:Footnote row   [data-section=status — lead part]
      div  section.ar-sec "02 Who and what"  StudioWhoWhat(list)                       [data-section=status]
           section.ar-sec "03 Send it back to work"  StudioResumeForm(drawer)          [data-section=resume]
    section.ar-sec "04 The card in full"
      vibekit:Tabs(label "Card sections", hint) → StudioPanels(panel=active, density drawer)
    div.cw-foot  [data-section=cardActions]
```

`error` renders as `vibekit:Alert tone="neutral" role="alert"` as the first child of `.cw-in` (above `.cw-head`) only when `model.localError` is set. `editForm` replaces `.cw-head .row` + the FigureRow while `model.edit.editing` (title kept as `h2.sr`), using `vibekit:Field` rows in a `.cw-form` box (`.cw-form` CSS below) — not drawn in the artboard.

#### Section placement (all 23 keys)

| Key | Place in SP-Card-Studio | Label / count shown |
|---|---|---|
| `error` | top of `.cw-in`, `vibekit:Alert` | `model.localError` verbatim |
| `status` | 02 Who and what: State, Agent, Owner, Asked by (+ "Assign to me" link when owner ≠ viewer; hidden here) | "02 Who and what" |
| `facts` | FigureRow (Stage, Attempts, Waiting on you, Cost, Blocks, Sub-tasks open) + 02 rows Priority / Due / Labels + `.cw-bar .id` (card 4605 + copy) | — |
| `editButton` | `.cw-head .row` "Edit [E]" | — |
| `editForm` | replaces head row while editing | — |
| `description` | tab Spec → "Description" | — |
| `delivery` | tab Cost → "Delivery: none approved on this card." | — |
| `resume` | 03 Send it back to work | "03" |
| `plan` | tab Spec → "Agent plan 1 of 4 · 25%" | `1 of 4 · 25%` |
| `criteria` | tab Spec → "Acceptance criteria 3" | `3` |
| `details` | tab Spec → "Details 10 fields" table + View raw JSON + Copy | tab count `10` |
| `project` | tab Spec → "PROJECT None · Assign to a project" | — |
| `links` | tab Links → table rows kind "Relates to" + "Add link" | tab count `5` (= links 3 + sub-tasks 0 + references 2) |
| `subtasks` | tab Links → "Sub-tasks: 0 open of 0" | — |
| `activity` | tab Log → "PROVENANCE …", "Runs 2" table + "Show tool calls", "Latest run Reproduce · 0 errors" | tab count `2` (= `counts.runs`) |
| `decisions` | tab Log → "Decisions · None yet." | — |
| `comments` | tab Talk | tab count `0` (= `model.comments.items.length`) |
| `handoff` | tab Log → "Handoff from Reported" | — |
| `cost` | tab Cost → figure "$0.00 Spent · no estimate yet" | tab count `$0.00` |
| `attempts` | tab Cost → "Attempts" table | — |
| `related` | tab Links → "RELATED PRIOR WORK · 1 Fixed: …" | — |
| `references` | tab Links → rows kind "Reference" | — |
| `cardActions` | `.cw-foot` Archive card / Delete card | — |

Non-active tab panels are not rendered (vibekit:Tabs renders only the active panel), so each panel's sections carry `data-section` inside the panel; the parity test renders each tab in turn and counts the union (update `card-layouts.svelte.test.ts` accordingly: for Studio, iterate `['spec','log','links','talk','cost']`).

#### Layout & CSS — app layout (`CardStudio.svelte` `<style>`, verbatim from the artboard)

```css
.cw-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; min-height: 60px; padding: 8px 20px 8px 32px; border-bottom: 1px solid var(--rule); }
.cw-bar .crumb { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; font: 700 14px var(--ff); text-decoration: none; }
.cw-bar .crumb:hover { text-decoration: underline; }
.cw-bar .id { display: inline-flex; align-items: center; gap: 2px; font: 500 12.5px var(--fm); color: var(--muted); }
.cw-bar .id button { width: 44px; height: 44px; display: grid; place-items: center; border: 0; background: transparent; color: var(--muted); cursor: pointer; }   /* vibekit:CopyButton icon-only sheet reference */
.cw-bar .r { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.cw-bar time { font: 500 12px var(--fm); color: var(--muted); }
.cw-in { flex: 1; display: flex; flex-direction: column; gap: 28px; padding: 24px 32px 32px; }
.cw-head { display: flex; flex-direction: column; gap: 14px; }
.cw-head .row { display: flex; align-items: flex-start; gap: 16px; }
.cw-head h2 { flex: 1; font: 800 34px/1.04 var(--ff); font-stretch: 82%; letter-spacing: -.015em; overflow-wrap: anywhere; }
.cw-cols { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 32px; }
.cw-cols > div { display: flex; flex-direction: column; gap: 28px; min-width: 0; }
.cw-form { display: flex; flex-direction: column; gap: 12px; padding: 16px; border: 1.5px solid var(--rule); background: var(--paper); }
.cw-form .row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.cw-form .row .ar-btn { margin-left: auto; }
.cw-foot { display: flex; flex-wrap: wrap; gap: 12px; padding-top: 14px; border-top: 1.5px solid var(--rule); }
```

Drawer frame (vibekit:Drawer Studio sheet reference; the artboard's grid placement `grid-column: 3` is canvas-only — the app's Drawer is `position: fixed; inset-block: 0; inset-inline-end: 0; width: min(940px, 100%)`):

```css
.cw-scrim { position: absolute; inset: 0; z-index: 4; background: color-mix(in srgb, var(--vk-color-text) 45%, transparent); }
.cw-drawer { grid-column: 3; grid-row: 1; position: relative; z-index: 5; min-width: 0; display: flex; flex-direction: column; background: var(--bg); border-left: 1.5px solid var(--rule); box-shadow: -24px 0 60px color-mix(in srgb, var(--vk-color-text) 22%, transparent); }
```
The drawer panel scrolls as one column (`overflow-y: auto` on the panel, `overflow-wrap: anywhere` on `.cw-in`); there is no sticky bar any more (the old `GateStudioBar` sticky footer and `scroll-padding-bottom` measurement are removed — the decision controls are section 03, beside the reason). `--card-scrim` for the shell (00-shared §1.6) = the `.cw-scrim` background above.

Inline styles that matter: `.kick` in `.cw-head` has `display: inline-flex; align-items: center; gap: 8px`; the plan list uses `style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 24px"` (→ `vibekit:NumberedList columns={2}`); Details/Runs header rows use `.cd-acts` with `justify-content: space-between` and `h3.cd-h { margin: 0 }`; the footnote row's Copy link has `padding-right: 0`; the Cost panel's figure uses `.ar-figs` with `grid-auto-flow: row; border-bottom: 0`. Table column widths (inline `style="width: …"`): Runs — Attempt 64px, Events 56px, Errors 52px, Ended 96px; Latest run — time 56px, type 92px; Links — Kind 96px, Where 200px, Actions 84px; Attempts — Attempt 64px, Spent 72px.

Responsive (drawer ≥ 640px but narrower than 940px, e.g. a 900px window): add to `CardStudio.svelte`
```css
@container card (max-width: 760px) { .cw-cols { grid-template-columns: minmax(0, 1fr); } .cd-two { grid-template-columns: minmax(0, 1fr); } }
```
with `container: card / inline-size` on the content root. Below 640px the phone layout (§30.4) is used instead. This is the only rule not in the mockup; it exists so the 300px column never squeezes the reason (no-side-scroll rule).

#### Content map

| Visible | Source |
|---|---|
| "Developer Experience" (crumb) | `model.boardName` |
| "Card 4605" | `'Card ' + model.shortId`; copy value `card.id` = `card_05823a57e8224605`; aria-label `` `Copy card id ${shortId}` `` |
| "13:27 · midday" | `clock(now, appearance.phase)` (§30.0.3); phase `noon` → "midday" |
| "Open" + ⇧O | copy; href `pageHref` |
| kicker "Developer Experience · stage 02 Reproduce" | `` `${boardName} · stage ${stageNo(stageIndex)} ${stageName}` ``; swatch = `--vk-stage-{stageIndex+1}` |
| title | `card.title` |
| "Edit" + E | copy |
| Figure 1 "2 of 7" / "Stage" | `stageIndex+1`, unit `` `of ${stages.length}` `` |
| Figure 2 "2" / "Attempts" | `card.attemptCount` |
| Figure 3 "2 days" / "Waiting on you" (signal) | `figAge(model.ageHours)`; label = `stateWord` (00-shared §1.5) without the age; `tone: 'needs'` only when `lead.needsYou` |
| Figure 4 "$0.00" / "Cost · no estimate" | `usd(card.costUsd)`; label "Cost · no estimate" when `!estimate?.estimatedUsd`, else `` `Cost · of ${usd(estimate.estimatedUsd)}` ``; `tone: 'zero'` when 0 |
| Figure 5 "0" / "Blocks" | `linkGroups.blocks.length`; zero tone |
| Figure 6 "0 of 0" / "Sub-tasks open" | `card.openChildCount`, unit `` `of ${children.length}` ``; zero tone when `children.length === 0` |
| Stage strip labels "01 Reported", "02 Reproduce · stopped", "03 Failing test" … "07 Shipped" | `` `${stageNo(i)} ${s.name}` ``; current suffix " · stopped" when `lead.kind` ∈ stopped/failed/budget, " · review" for review, " · question" for question, none otherwise; sr ", done" on done items; aria-label `` `Stages: stage ${i+1} of ${n}, ${name}, stopped` `` |
| "01 Why it stopped" / "attempt 2" | copy; `` `attempt ${card.attemptCount}` `` |
| quote header "error-eric · Stopped · needs you" + face (24, mood needs, role img aria-label "error-eric, needs you") | who = name of `model.attempts.at(-1).agentId` (G-2) when unclaimed, else `agent.name`; `" · Stopped · needs you"` copy for stopped (review → " · awaiting review", question → " · question pending") |
| "Fri 9 Oct 19:41" | `quoteWhen(lead.at, now)` |
| quote body | `lead.sentence` verbatim, tokens in `<code>` (G-3); the first `acps_…` token gets `vibekit:FootnoteRef n=1` |
| footnote "1 Session acps_8f86…9023" + "Copy session id" | footnote text `` `Session ${token}` ``; CopyButton value = token (G-4); hidden with its ref when no token |
| 02 rows | State → `vibekit:StatePill(needs, "Waiting on you")` (`stateWord`); Agent → "Unclaimed" + muted "(error-eric ran attempt 2)" (G-2) or face 20 + name when claimed; Owner → `vibekit:Initials(RG, 20)` + **Rakesh Gangwar** (`displayPrincipal(ownerUserId)`); Asked by → face 20 (mood working) + **super-chotu**, `title="An agent with dispatch authority on this board"` (`provenance.byAgent`; for a person: initials + name, no title); Priority "P3" / "none"; Due "none" / `DD MMM YYYY`; Labels "none" / names joined ", " |
| "03 Send it back to work" form | label "Resume at stage"; options `stageOption` desktop: "01 Reported", "02 Reproduce (this stage)"; label `` `Note to ${who}: what changed, or what to do differently` ``; placeholder "Fresh DMs sent 14:05; trace those event IDs."; hint "Note needed · 0/8000" (`` `Note needed · ${len}/8000` ``, becomes `` `${len}/8000` `` once non-empty); button "Send back to work" + Kbd "⌘↵" |
| "04 The card in full" + tabs "Spec 10", "Log 2", "Links 5", "Talk 0", "Cost $0.00" + "← →" | counts per Section placement table |
| Spec panel | "Description" `spec.description`; "Acceptance criteria 3"; "Agent plan 1 of 4 · 25%" (`` `${done} of ${n} · ${Math.round(done/n*100)}%` ``; meter `aria-label="1 of 4 steps done"`); "Details 10 fields" + "View raw JSON" (`aria-expanded`) + "Copy"; table rows from `specGroups(spec)` with row-group headers "What to do"/"Where it goes"/"Rules", caption sr "Brief details, 10 fields"; values that are agent ids/names in `agentsInScope` render face 20 + name joined " · "; "PROJECT None" + "Assign to a project" (`projectName ?? 'None'`; button "Change project" when set) |
| Log panel | "PROVENANCE Asked by super-chotu, an agent allowed to dispatch the one working it. Unclaimed now." = `` `Asked by ${queuedByName}, ${provenance.byAgent ? 'an agent' : 'a person'} ${grantCovers ? 'allowed to dispatch the one working it' : …}.` `` + `" Unclaimed now."` when no delegate (Gap S-7 for the phrase table); "Runs 2" + "Show tool calls" (`aria-pressed`); runs table columns Stage/Agent/Outcome/Attempt/Events/Errors/Ended, newest first, outcome word (`OUTCOME_WORD`: blocked → "Stopped", rejected_completion → "Sent back", completed → "Done", failed → "Failed"), newest-run outcome in `.sigt` when `lead.needsYou`, its agent face mood needs, older faces resting; Events = activities in that run (`activityGroups[i].items.length`), Errors = count of `type === 'error'`, Ended = `runEnded(attempt.endedAt)` (Gap S-3); "Latest run Reproduce · 0 errors"; rows time `HH:mm` / type label (`TYPE_LABEL = { action: 'Action', response: 'Response', thought: 'Thought', prompt: 'You', elicitation: 'Question' }`, stop row "Stopped" in `.sigt`) / `body` verbatim (Gap S-4); "Decisions" + "None yet."; "Handoff from Reported" + `“${handoff.summary}”` |
| Links panel | table Kind/Card or reference/Where/(sr "Actions"); link rows: Kind "Relates to" / "Blocked by" / "Blocks" / "Supersedes" / "Was blocked by"; title `a.ttl[href=/b/{board}/c/{card}]`; Where "This board" or `` `${boardName} · advisory` ``; "Remove" (`ar-lk quiet`) → `model.links.remove(row.remove)`; reference rows Kind "Reference", title `refLabel` (G-6), Where = host word (Gap S-5), no action; "Add link" (`ar-btn2`, icon plus) + muted "Sub-tasks: 0 open of 0"; "RELATED PRIOR WORK · 1 Fixed: Hermes agent stuck on an E2EE device with 0 olm sessions; a fresh device fixed it." (`` `${statusWord}: ${text}` ``) |
| Talk panel | "No comments yet. The agent that works this card reads them." (empty); field label "Add a comment", placeholder "⌘ or Ctrl + Enter posts it", maxlength 8192; "Comment" |
| Cost panel | figure "$0.00" / "Spent · no estimate yet"; "Attempts" table Attempt/Agent/Spent/Outcome (oldest first: 1, 2); "Delivery: none approved on this card." |
| foot | "Archive card" (icon archive) / "Delete card" |

#### Interactions & states (Studio additions to 00-shared §4)

Keyboard (listener: `onkeydown` on `CardStudio`'s root element, which is inside the Drawer's focus trap; ignored when `e.target` is `input, textarea, select, [contenteditable]` or any modifier other than Shift is held, except ⌘↵):

| Keys | Action |
|---|---|
| `Shift+O` | `window.open(pageHref, '_blank', 'noopener')` |
| `E` | `model.edit.start()` |
| `⌘↵` / `Ctrl+Enter` inside the resume note | `model.resume.submit()` |
| `←` / `→` / `Home` / `End` on a focused tab | vibekit:Tabs roving focus + activation (automatic activation) |
| `Esc` | close (root layout, unchanged) |
| `A` / `C` (gate pending, focus not in a field) | `GateDecisionModel.decide('approve')` / `decide('request_changes')` — registered by `GateStudioBar` on the same root via a `onkeydown` prop the layout forwards |

Tabs state machine (`vibekit:Tabs`): ids `spec | log | links | talk | cost`; default `spec`; `active` is local `$state` in `CardStudio` reset to `spec` when `card.id` changes; roving `tabindex` (active 0, others −1); tab buttons `role=tab id=cw-{id} aria-controls=cw-panel aria-selected`; panel `role=tabpanel id=cw-panel aria-labelledby=cw-{active}`; arrow keys wrap; the "← →" Kbd pair is decorative (`aria-label="Arrow keys switch sections"` on its wrapper). Counts recompute live.

States: hover on `.ar-btn2` / `.ar-ib` inverts (ink fill); focus ring 3px ink, offset 3px; "Send back to work" with empty note → `vibekit:Field error="Add a note for error-eric first."` under the textarea and focus moves to it (no request); while submitting the button is `disabled` and reads "Sending…"; resume refusal (`refusalOf`) shows under the button as `vibekit:Alert tone="neutral"`. "Show tool calls" flips to "Hide tool calls" and `aria-pressed=true`, and the Latest run table includes tool rows. "View raw JSON" toggles a `RawJson` block under the Details table. Copy buttons show a check icon + sr "Copied" for 2 s. Remove link: row button disabled with text "Removing…" while `model.links.removing.has(key)`. Empty sentences as listed. Loading: §30.3 cell F block replaces 01–04 while `!model.detailLoaded` (figures show skeletons, quote shows "Loading readout…").

#### Fixture needs

Only 00-shared §5 (desktop stopped card). Additional for this artboard: the fixed clock **2026-10-11T13:27:00+05:30** (the drawer's own clock reads 13:27; Gap S-1). Agent `agt_super_chotu` must be queuer with `queuedByAgentId = 'agt_super_chotu'` and `queuedGrant` including `agt_error_eric` (→ "allowed to dispatch the one working it"). Attempts need `endedAt` (Gap S-3): run 2 `2026-10-09T19:41:00+05:30`, run 1 `2026-10-09T11:12:00+05:30`. Run-2 activities: 14 total (3 narrative listed in 00-shared + 11 tool calls, none of type `error`; the stop row is `type: 'response', signal: 'stop'` so Errors = 0 — see shared-contract note N-2). Run-1 activities: 9, none of type error. References: `url` on the forge host (Gap S-5) e.g. `https://forge.superjackfruit.com/SuperJackfruitLabs/agentpod/pulls/642` and `/648`, `provider: 'forge'`.

---

### 30.2 SP-CardPage-Studio — the standalone card page

- **Size** 1440×2383 · **vibe** studio · **route** `/b/brd_devx/c/card_05823a57e8224605/page` (00-shared §2), shell slot `bare`. The page draws its own ink top bar (`.cp-top`) and a status bar (`.ar-status`); no rail.

#### Component tree

| File | Change |
|---|---|
| `routes/b/[boardId]/c/[cardId]/page/+page@.svelte`, `+page.ts` | 00-shared §2.1; renders `CARD_PAGE_LAYOUTS[vibe]` |
| `lib/components/card/page/CardPageStudio.svelte` | **new**. Props `CardPageProps`. Root `<div class="ar cp" data-vibe="studio">` |
| reused | `StudioWhoWhat` (`variant='inline'`), `StudioResumeForm` (`variant='page'`), `StudioPanels` (`panel='spec' \| 'links' \| 'log' \| 'cost'`, `density='page'`), `GateStudioFrame/Bar`, `QuestionStudioFrame/Bar`, `CardStateStudio` (same replacement rules as the drawer: gate/question/archived/done/loading replace sections 01 and 02) |
| vibekit | `CommandField` (opens `app.cmdkOpen = true` on focus/click — it is the palette trigger, not a live input), `CopyButton`, `Button`, `IconButton`, `Kbd`, `FigureRow`, `StageStrip`, `StatePill`, `AgentFace`, `Initials`, `AgentQuote`, `Footnote`, `Field`, `DataTable`, `NumberedList`, `Meter`, `StatusBar` |

#### Structure

```
div.ar.cp
  header.cp-top
    a.mk[href=/] (logo 22, aria-label "Superpipeline home")
    nav.cp-crumb[aria-label=Breadcrumb]  "Superpipeline" / a[href=/b/{boardId}] "Developer Experience board" / span.id "Card 4605" + CopyButton(icon, onInk)
    vibekit:CommandField(onInk)
    button.cp-tb (icon link 15) "Copy link to this card" Kbd "⇧C"  [aria-keyshortcuts Shift+C]  → model.copyLink()
    IconButton.cp-ic (icon sun/moon 20) "Appearance" [aria-haspopup=dialog] → appearance.pickerOpen = true
    button.cp-acct "RG" [aria-haspopup=menu, aria-label "Account, Rakesh Gangwar. Menu has Sign out"] → account menu (shell group's menu component, Studio variant)
  main.cp-body#content
    div.cp-from "Opened from Developer Experience" · a "Back to the board" (icon arrow-left) Kbd "G B"
    div.cp-head  [kick swatch "Card 4605 · stage 02 Reproduce", h1 title]  Button(secondary, pencil, kbd E) "Edit"
    FigureRow (8 figures)
    StageStrip(labels all)
    dl.cp-people (StudioWhoWhat inline: State, Agent, Owner, Asked by, Priority, Due, Labels, Project)
    div.cp-cols
      col 1: 01 Why it stopped · 02 Send it back to work · 03 Talk
      col 2: 04 Spec · 05 Links
      col 3: 06 Log · 07 Cost · 08 Card actions
  footer.ar-status (StatusBar)
```

#### Section placement

| Key | Place | Label / count |
|---|---|---|
| `error` | `vibekit:Alert` first child of `main.cp-body` | — |
| `status` | `dl.cp-people` (State, Agent, Owner, Asked by) | — |
| `facts` | FigureRow + `cp-people` Priority/Due/Labels + crumb id | — |
| `editButton` | `.cp-head` "Edit [E]" | — |
| `editForm` | replaces `.cp-head` while editing (`.cp-form` box styling) | — |
| `description` | 04 Spec → Description | — |
| `delivery` | 07 Cost → "Delivery: none approved on this card." | — |
| `resume` | 02 Send it back to work | r: "stopped after 2 attempts" |
| `plan` | 04 Spec → Agent plan | "1 of 4 · 25%" |
| `criteria` | 04 Spec → Acceptance criteria | "3" |
| `details` | 04 Spec → Details table | r: "10 fields" |
| `project` | 04 Spec → "PROJECT None" + Assign; also `cp-people` "Project none" | — |
| `links` | 05 Links table + header "Add link" | r: "5" |
| `subtasks` | 05 Links → "Sub-tasks 0 open of 0 · …" sentence | — |
| `activity` | 06 Log → provenance, runs table, Latest run, header "Show tool calls" | r: "2 runs" |
| `decisions` | 06 Log → "DECISIONS None yet." | — |
| `comments` | 03 Talk | r: "0 comments · [C]" |
| `handoff` | 06 Log → "HANDOFF FROM REPORTED “…”" | — |
| `cost` | 07 Cost figure + meter | r: "$0.00" |
| `attempts` | 07 Cost → Attempts table | — |
| `related` | 05 Links → same sentence as sub-tasks | — |
| `references` | 05 Links table rows "Reference" | — |
| `cardActions` | 08 Card actions | — |

#### Layout & CSS — app layout (`CardPageStudio.svelte` `<style>`, verbatim)

```css
.ar.cp { display: flex; flex-direction: column; min-height: 900px; }
.cp-top { display: flex; align-items: center; gap: 16px; min-height: 64px; padding: 0 24px; background: var(--text); color: var(--bg); }
.cp-top .mk { display: grid; place-items: center; width: 44px; height: 44px; background: var(--bg); color: var(--text); text-decoration: none; }
.cp-top :focus-visible { outline-color: var(--bg); }
.cp-crumb { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font: 700 13px var(--ff); letter-spacing: .06em; text-transform: uppercase; }
.cp-crumb a { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; text-decoration: underline; text-underline-offset: 4px; }
.cp-crumb .id { display: inline-flex; align-items: center; font: 500 12.5px var(--fm); letter-spacing: 0; text-transform: none; }
.cp-crumb .id button { display: grid; place-items: center; width: 44px; height: 44px; border: 0; background: transparent; color: var(--bg); cursor: pointer; }
.cp-top .ar-cmd .box { border-bottom-color: var(--bg); color: var(--bg); }
.cp-top .ar-cmd input { color: var(--bg); }
.cp-top .ar-cmd input::placeholder { color: color-mix(in srgb, var(--vk-color-bg) 78%, transparent); }
.cp-top .ar-cmd:focus-within .box { outline-color: var(--bg); }
.cp-tb { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px; border: 1px solid var(--bg); border-radius: 2px; background: transparent; color: var(--bg); font: 700 14px var(--ff); white-space: nowrap; cursor: pointer; }
.cp-ic { display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 2px; background: transparent; color: var(--bg); cursor: pointer; }
.cp-acct { width: 44px; height: 44px; border: 1.5px solid var(--bg); border-radius: 2px; background: transparent; color: var(--bg); font: 800 14px var(--ff); cursor: pointer; }
.cp-body { flex: 1; display: flex; flex-direction: column; gap: 28px; padding: 16px 40px 40px; }
.cp-from { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; font-size: 13px; color: var(--muted); border-bottom: 1px solid var(--hair); }
.cp-from a { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; color: var(--text); font-weight: 700; }
.cp-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 12px 24px; }
.cp-head h1 { font: 800 52px/1 var(--ff); font-stretch: 80%; letter-spacing: -.02em; overflow-wrap: anywhere; max-width: 1100px; }
.cp-people { display: flex; flex-wrap: wrap; gap: 8px 28px; padding: 10px 0; border-top: 1px solid var(--hair); border-bottom: 1px solid var(--hair); font-size: 14px; }   /* vibekit:FactList inline — sheet reference */
.cp-people > div { display: inline-flex; align-items: center; gap: 7px; }
.cp-people dt { font: 500 12px var(--fm); color: var(--muted); }
.cp-people dd { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; }
.cp-cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, .85fr); gap: 36px; align-items: start; }
.cp-cols > div { display: flex; flex-direction: column; gap: 32px; min-width: 0; }
.cp-cols .cd-dt th[scope="rowgroup"] { width: 92px; }
.cp-cols .cd-dt th[scope="row"] { width: 116px; }
.cp-cols .cd-two { grid-template-columns: minmax(0, 1fr); gap: 18px; }
.cp-form { display: flex; flex-direction: column; gap: 12px; padding: 16px; border: 1.5px solid var(--rule); background: var(--paper); }
.cp-form .row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
.cp-q blockquote { font-size: 18px; }   /* → vibekit:AgentQuote size="md" */
```

`.cp-top` and the CommandField inside it are the Studio "card window" bar (the `bare` slot); the CommandField `onInk` tone is the `.cp-top .ar-cmd …` rules above (sheet reference). Inline styles that matter: `.cp-head` left column `display: flex; flex-direction: column; gap: 12px; min-width: 0`; section-header link-buttons (`Copy session id`, `Add link`, `Show tool calls`) have `min-height: 0` (their 44px hit area comes from the row height; keep them in `.hd .r`, which is ≥ 44px tall once the h2 line-height + padding are counted — verify with the 44px target test; if it fails, use the `.h44` pseudo hit area); the Log runs table column widths Run 40px / Outcome 74px / Ev 36px / Ended 92px; Latest run time 52px; Links Kind 84px / Where 120px / Actions 76px; Attempts Attempt 64px / Spent 60px; the cost figure `.ar-figs` with `grid-auto-flow: row; border-bottom: 0`, meter `aria-hidden="true"` with all four cells `.off` (0 of no estimate).

Responsive (not in the artboard; required by the no-side-scroll rule for 640–1279px windows):
```css
@media (max-width: 1279.98px) { .cp-cols { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .cp-cols > div:nth-child(3) { grid-column: 1 / -1; } }
@media (max-width: 899.98px) { .cp-cols { grid-template-columns: minmax(0, 1fr); } .cp-head h1 { font-size: 34px; } .ar-figs { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, 1fr)); } .cp-top { flex-wrap: wrap; } }
@media (max-width: 639.98px) { /* the page at phone width reuses CardPhoneStudio's body inside the page bar */ }
```
At < 640px the page route renders `CardPhoneStudio` (with `surface: 'page'`, its `.pc-bar` back button navigating to `/b/{boardId}`, and no Close button) — no separate phone page artboard exists.

#### Content map (differences from the drawer only; everything else as §30.1)

| Visible | Source |
|---|---|
| "SUPERPIPELINE / DEVELOPER EXPERIENCE BOARD / Card 4605" | copy "Superpipeline"; `` `${boardName} board` `` (CSS uppercases); `'Card ' + shortId`; copy aria "Copy card id 4605" |
| "Search or run a command" ⌘K | copy (shell) |
| "Copy link to this card" ⇧C | copy; becomes "Link copied" 2 s |
| "Opened from Developer Experience · Back to the board  G B" | `` `Opened from ${boardName}` ``; link `/b/{boardId}` |
| kicker "Card 4605 · stage 02 Reproduce" | `` `Card ${shortId} · stage ${stageNo(i)} ${stageName}` `` |
| h1 | `card.title` |
| 8 figures | "2 of 7 Stage"; "2 Attempts"; "2 days Waiting on you" (signal); "2 days In Reproduce" (`figAge(stageAgeHours)`, label `` `In ${stageName}` ``, Gap S-2); "$0.00 Cost · no estimate" (zero); "1 of 4 Plan" (`done of n`, hidden when no plan — then 7 figures); "0 Blocks" (zero); "0 of 0 Sub-tasks open" (zero) |
| people row | sr dt "State" + StatePill "Waiting on you"; "Agent" + face 24 (error-eric, resting) + "Unclaimed" + muted regular "(error-eric ran attempt 2)"; "Owner" + Initials 24 + "Rakesh Gangwar"; "Asked by" + face 24 (super-chotu, working) + "super-chotu" (div `title="An agent with dispatch authority on this board"`); "Priority P3"; "Due none"; "Labels none"; "Project none" (`projectName ?? 'none'`) |
| 01 header right "Copy session id" | CopyButton (link form, `min-height: 0`) — the footnote row's button reads "Copy" here |
| 02 header right "stopped after 2 attempts" | `` `stopped after ${attemptCount} attempt${attemptCount === 1 ? '' : 's'}` `` |
| 02 hint | "Note needed · 0/8000 · with no note: “Add a note for error-eric first.”" (`` `Note needed · ${len}/8000 · with no note: “Add a note for ${who} first.”` ``); the button row has only the submit button |
| 03 Talk header right "0 comments · C" | `` `${n} comment${n === 1 ? '' : 's'} · ` `` + Kbd "C" |
| 04 Spec header right "10 fields" | `specGroups` row count |
| 05 Links header right "5 · Add link" | count = links + references + sub-tasks; Add link link-button (icon plus) |
| 05 sentence | `` `Sub-tasks ${open} open of ${n} · Related prior work ${k}: ${statusLower}, ${text}` `` → "Sub-tasks 0 open of 0 · Related prior work 1: fixed, Hermes agent stuck on an E2EE device with 0 olm sessions; a fresh device fixed it." |
| 06 Log header right "2 runs · Show tool calls" | `` `${runs} run${runs === 1 ? '' : 's'}` `` |
| runs table | columns Run ("#2", "#1" = `` `#${attemptNo}` ``) / Agent / Outcome / Ev / Ended — no Stage/Errors columns at page density |
| Latest run | 2 columns: time / sentence; the stop row prefixed `<span class="sigt">Stopped.</span> ` |
| "HANDOFF FROM REPORTED “…”", "DECISIONS None yet." | kick + sentence paragraphs |
| 07 Cost header right "$0.00"; figure "$0.00" / "no estimate yet" | `usd(costUsd)` |
| 08 Card actions | "Archive card", "Delete card" |
| status bar | Live mark (`.ar-live`, font-size 11px) "Live"; "card 4605"; `` `stage ${i+1}/${n} ${stageName}` `` "stage 2/7 Reproduce"; signal item "waiting on you 2d" (`ageLabel` compact; only when `lead.needsYou`); `` `synced ${HH:mm}` `` "synced 13:51" (`app.syncedAt`, Gap S-6); right hints "E edit", "C comment", "⌘↵ send", "G B back to the board" |

#### Interactions (Studio page keyboard; listener `<svelte:window onkeydown>` in `CardPageStudio`, same field-guard as the drawer)

| Keys | Action |
|---|---|
| `Shift+C` | `model.copyLink()` |
| `G` then `B` within 1000 ms | `goto('/b/' + boardId)` (a pending `G` is cleared after 1 s or by any other key; `G P`/`G O`/`G W` are the shell's and are honoured the same way here: Plan `/b/{boardId}`, Operate `/b/{boardId}/operate`, Workspace `/workspace/needs-you`) |
| `E` | `model.edit.start()` |
| `C` | no gate pending → focus `#cp-comment`; gate pending → `decide('request_changes')` (gate owns C; the status bar hint then reads "C request changes") |
| `A` | gate pending → `decide('approve')` |
| `⌘↵` in a textarea | submit that textarea's form (resume / comment / gate note) |
| `⌘K` | shell palette (`app.cmdkOpen = true`) |

Everything else as §30.1 (states, copy feedback, empty sentences). Account menu: "Rakesh Gangwar" + "Sign out" (`logout()`).

#### Fixture needs

00-shared §5 + §30.1 additions. Clock **2026-10-11T13:51:00+05:30**; `app.syncedAt` = the snapshot fetch time (13:51). Stage age (Gap S-2): `stageSince = 2026-10-09T10:30:00+05:30` (= `startedAt` of attempt 1, the first run in Reproduce → 51.4 h → "2 days"); attempt `startedAt`: run 1 `2026-10-09T10:30:00+05:30`, run 2 `2026-10-09T19:05:00+05:30`.

---

### 30.3 SP-Card-States-Studio — card states gallery (A–F)

- **Size** 1440×2107 · **vibe** studio · **route** `/dev/card-states` (00-shared §3), shell slot `bare`. Clock **2026-10-11T13:51:00+05:30**.
- Each cell = a compact Studio panel (`.ss-panel`): a mono bar (board / stage), the title, a stage strip with only the current stage labelled, then the **real** lead block the drawer uses for that state, then the command area.

#### Component tree

| File | Change |
|---|---|
| `lib/components/card/states/CardStatesStudio.svelte` | **new** gallery: `.ar.ss` root, header, `.ss-grid` of six `.ss-cell`s, footnote list. Props `CardStatesProps` |
| `lib/components/card/gate/GateStudioFrame.svelte` | rewritten = cell A body after the title/track: quote + `.ss-subj` table + `.ss-seal`. Props `{ gate: Gate; agent: CardAgent; lead: CardLead; vibe: Vibe; footnote: number }` (`showLead` removed: the quote shows the gate summary once) |
| `lib/components/card/gate/GateStudioBar.svelte` | rewritten = cell A/E `.ss-cmd`: `vibekit:Field` note, buttons from `gate.options`, `vibekit:Alert` for `error`. Props `{ boardId; gate; error: string \| null; onResponse; registerKeys?: (h: (e: KeyboardEvent) => boolean) => void }` |
| `lib/components/card/question/QuestionStudioFrame.svelte` | rewritten = cell B quote. Props `{ elicitation; agent }` |
| `lib/components/card/question/QuestionStudioBar.svelte` | rewritten = cell B `form.ss-cmd`. Props `{ model: QuestionAnswer; elicitation; agent }` |
| `lib/components/card/state/CardStateStudio.svelte` | **new**: `kind='archived'` → `.ss-banner` + off-quote + `.ss-kv` + Restore command; `kind='done'` → `.ss-figs` + done quote + `.ss-kv`; `kind='loading'` → skeleton figs + "Loading readout…" |
| vibekit | `StageStrip(labels='current')`, `AgentQuote(size='sm')`, `DataTable`/`SubjectFrame`+`Seal` (subject), `Footnote`, `CopyButton`, `Field`, `Button`, `Kbd`, `Banner(ink)`, `FactList(kv)`, `FigureRow(size='sm')`, `StatePill(done)`, `Alert(neutral)`, `Skeleton`, `LoadingNote` |

In the drawer (§30.1) and page (§30.2) these blocks sit in the 01/03 slots: the Frame (A/B/C/D/F body) in section 01, the Bar (A/B/E command area, C Restore) in section 03; inside a drawer the cell's own `.ss-bar`, `.ss-title` and compact track are **not** used (the drawer has its own head); they exist only in the gallery cell header.

#### Layout & CSS — gallery + state blocks (verbatim; `.ss-*` in `CardStatesStudio.svelte` for the gallery frame, the block rules in the owning component as marked)

```css
/* CardStatesStudio.svelte (gallery frame) */
.ar.ss { display: flex; flex-direction: column; gap: 32px; padding: 40px 40px 56px; }
.ss-head { display: flex; flex-direction: column; gap: 10px; padding-bottom: 20px; border-bottom: 1.5px solid var(--rule); }
.ss-head h1 { font: 800 52px/1 var(--ff); font-stretch: 80%; letter-spacing: -.02em; }
.ss-head p { max-width: 760px; font: 400 18px/1.45 var(--fs); }
.ss-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 40px 32px; align-items: start; }
.ss-cell { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.ss-label { display: flex; align-items: baseline; gap: 12px; padding-top: 10px; border-top: 1.5px solid var(--rule); }
.ss-label .no { font: 500 12px var(--fm); color: var(--muted); }
.ss-label b { font: 800 16px var(--ff); }
.ss-panel { display: flex; flex-direction: column; min-width: 0; background: var(--paper); border: 1px solid var(--hair); }
.ss-bar { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-bottom: 1px solid var(--hair); font: 500 12px var(--fm); color: var(--muted); }
.ss-body { display: flex; flex-direction: column; gap: 16px; padding: 18px; }
.ss-title { font: 800 22px/1.12 var(--ff); font-stretch: 85%; letter-spacing: -.01em; overflow-wrap: anywhere; }
.ss .ar-track li { font-size: 11px; }
/* shared by GateStudioBar / QuestionStudioBar / CardStateStudio command areas (put in card-studio.css) */
.ss-cmd { display: flex; flex-direction: column; gap: 12px; padding: 16px 18px 18px; border-top: 1.5px solid var(--rule); }
.ss-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
.ss .ar-q blockquote { font-size: 17px; }   /* → AgentQuote size="sm" */
/* GateStudioFrame — vibekit:SubjectFrame / Seal sheet reference */
.ss-subj { width: 100%; border-collapse: collapse; table-layout: fixed; }
.ss-subj th, .ss-subj td { padding: 8px 10px 8px 0; border-top: 1px solid var(--hair); text-align: left; vertical-align: top; overflow-wrap: anywhere; }
.ss-subj th { width: 88px; font: 700 12.5px var(--ff); color: var(--muted); }
.ss-subj td.serif { font: 400 15.5px/1.45 var(--fs); }
.ss-subj .mono { font-size: 12.5px; }
.ss-seal { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; padding: 10px 0 0; border-top: 1.5px solid var(--rule); font-size: 13px; font-weight: 700; }
.ss-seal .mono { font-weight: 500; }
/* CardStateStudio — vibekit:Banner(ink) sheet reference */
.ss-banner { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 12px 18px; background: var(--text); color: var(--bg); font: 800 14px var(--ff); }
.ss-banner span { margin-left: auto; font: 500 12px var(--fm); }
/* vibekit:FigureRow size="sm" sheet reference */
.ss-figs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1.5px solid var(--rule); border-bottom: 1px solid var(--hair); }
.ss-figs > div { display: flex; flex-direction: column; gap: 6px; padding: 10px 8px 12px 0; min-width: 0; }
.ss-figs > div + div { padding-left: 10px; border-left: 1px solid var(--hair); }
.ss-figs b { font: 900 30px/.95 var(--ff); font-stretch: 72%; overflow-wrap: anywhere; }
.ss-figs b.st { display: inline-flex; align-items: center; gap: 6px; }
.ss-figs b.st .u { width: 14px; height: 14px; }
.ss-figs span { font-size: 12px; font-weight: 600; color: var(--muted); }
/* vibekit:FactList kv sheet reference */
.ss-kv { width: 100%; border-collapse: collapse; }
.ss-kv td { padding: 8px 10px 8px 0; border-top: 1px solid var(--hair); vertical-align: top; overflow-wrap: anywhere; }
.ss-kv td:first-child { width: 96px; font: 700 12.5px var(--ff); color: var(--muted); }
.ss-ag { display: inline-flex; align-items: center; gap: 6px; }
/* vibekit:Field error + vibekit:Alert(neutral) sheet reference */
.ss-err { color: var(--text); font-weight: 700; }
.ss-field-bad .ar-ta { border-width: 2px; }
.ss-alert { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 10px; flex-basis: 100%; padding: 12px 14px; border: 1.5px solid var(--rule); background: var(--bg); }
.ss-alert b { font-weight: 800; }
/* vibekit:Skeleton sheet reference */
.ss-sk { display: block; height: 12px; background: linear-gradient(90deg, var(--soft) 40%, var(--hair) 50%, var(--soft) 60%); background-size: 300% 100%; animation: ss-fill 1.4s linear infinite; }
.ss-figs .ss-sk { width: 70%; height: 26px; }
@keyframes ss-fill { from { background-position: 100% 0; } to { background-position: 0 0; } }
```
Add `@media (prefers-reduced-motion: reduce) { .ss-sk { animation: none; } }` (not in the mockup; motion rule). Footnotes list at the bottom uses `.ar-notes` with inline `grid-template-columns: minmax(0, 1fr)`. Current-stage items in the cells' tracks carry inline `grid-column: span 2`. Responsive: `.ss-grid` → 2 columns below 1280px, 1 column below 900px (gallery only; added rule).

#### Content map (verbatim copy; per-cell)

Header: kick "Superpipeline · card states"; h1 "Card states · Studio"; p "Labels in Azeret Mono, sentences in Archivo, the agent’s own words in Newsreader. Vermilion only where a person is needed now; done is the darkest blue, archived is ink." (copy constants in `CardStatesStudio`). Cell labels: "A Approval gate", "B Agent question", "C Archived", "D Done", "E Decision error", "F Loading" (`.no` letter + `b` text). Bars: `` `${boardName} / ${stageName}` ``; cell F `` `${boardName} / ${shortId}` ``. Tracks: numbers "01"…; current item `` `${stageNo} ${stageName}` ``; sr text `` ` ${name}, done` `` / `` ` ${name}` ``; `title="{n} · {name}"`; aria-labels: A "Stage 5 of 6, Recommendation, awaiting review"; B "Stage 4 of 7, Fix, question pending"; C "Was at stage 3 of 8, Messaging approval" (status archived: current not signal, plain ink).

**A · Approval gate** (`GateStudioFrame` + `GateStudioBar`)
- quote (needs, face research-ray 24 "research-ray, needs you"): header `` `${agent} · awaiting review` `` + time `quoteWhen(gate.createdAt)` "12:48"; body = `gate.summary` verbatim: **"Ready for your review. Approve exactly the subject below."** (Gap S-8: Daylight's mockup has a different sentence for the same gate).
- subject table (caption sr "The subject you are approving"): Revision `approvalSubject.revision` "2" (mono); Kind `canonical.kind` "Recommendation, one paragraph"; Synthesis `canonical.synthesis` (serif) "The organization plane exists so that one issuer, Accounts, says who a person or an agent is in every product. Before it, each product kept its own users and tokens, so a grant made in one place meant nothing in the next. With one issuer, a workspace, its members and its agents are defined once, and every product checks the same token."; Digest `shortDigest` "sha256:9f3ac2e1…" + FootnoteRef 1 + CopyButton (link, "Copy", aria "Copy the full digest", value full digest). Rows = every key of `canonical` in its own order (label via `humanizeKey`; `kind`, `synthesis`, `sources`), with Revision first and Digest last (Gap S-10: the artboard omits Sources).
- seal: icon lock "Approving exactly this version" + mono muted `` `sealed ${sealOf(digest)}` `` "sealed 9f3a·c2e1" + "View raw JSON" (link, `aria-expanded`, `margin-left: auto`).
- command: label "Add a note (optional)" + hint "· 0/8192" (`` `· ${len}/8192` ``); placeholder "Recorded with your decision. Request changes needs one."; buttons from `gate.options` in order with role mapping (`roleOf`): approve → primary "Approve" Kbd "A" (`aria-keyshortcuts="A"`); changes → secondary "Request changes" Kbd "C"; reject → link quiet "Reject".
- footnote list: "1 The full digest is copied by the button beside it; only its first eight characters are shown, and the seal repeats them." (copy).

**B · Agent question** (`QuestionStudioFrame` + `QuestionStudioBar`)
- quote (needs, coder-kai 24): `` `${agent} · question pending` `` + "11:05"; body `elicitation.question` verbatim "The handoff to Failing test needs a commit, and the fix for the manual delivery reminder is still on an unmerged branch. Should I hand on the branch commit, or wait until it is merged?".
- form: label `` `Answer to ${agent}` `` "Answer to coder-kai"; textarea (no placeholder); submit primary "Send answer" (icon send) Kbd "⌘↵"; hint "Empty: “Type an answer first.”". When the elicitation has `options`, they render as secondary buttons above the textarea (none in this fixture).

**C · Archived** (`CardStateStudio kind="archived"`)
- banner (ink, role status): icon archive + `` `Archived ${dayMonth(archivedAt)}` `` "Archived 9 Oct" + right mono "No decisions open" (`decidedGates`/pending none → "No decisions open"; with a cancelled gate still "No decisions open" — archiving cancels them).
- off-quote, no face: header "Archived · reason"; body = derived archive reason (Gap S-9) "Its pending review was cancelled when the card was archived.".
- kv: Board `boardName` "Marketing & Community"; Last agent face 20 + "message-melissa" (`attempts.at(-1).agentId`); Owner Initials 20 + "Rakesh Gangwar"; Attempts mono "1".
- command: primary "Restore" (icon restore) → `model.restore()`; hint `` `Returns it to ${stageNo} ${stageName}.` `` "Returns it to 03 Messaging approval.". No gate controls, no signal anywhere.

**D · Done** (`CardStateStudio kind="done"`)
- figures sm: StatePill done "Done" / "State"; `finishedFig(doneAt)` "Oct 9" / "Finished 19:26"; "5" / "Attempts"; `` `P${priority}` `` "P2" / "Priority".
- done quote (face onboarding-olivia 24 mood done): header `` `${agent} · finished it` ``; body = last `response` activity of the final run verbatim "Melissa is resident. Her identity, router description and portrait are in place, and you credentialed her at the resident gate."
- kv: Handed on = `handoff.summary` "Profile, router description, safe profile and portrait drafted. No posting, DMs or scheduling without separate operator authorisation." (Gap S-8: Daylight shows "…drafted through this pipeline. …"); Asked by face + "super-chotu"; Owner initials + "Rakesh Gangwar". No command area.

**E · Decision error** (`GateStudioBar` with `error` set and `needNote`)
- body: title only.
- field (bad): label switches to "Say what needs to change" when `GateDecisionModel.needNote`; textarea `aria-invalid="true" aria-describedby` → error line (icon alert) "Request changes needs a note."; maxlength 8192.
- buttons: primary "Approve", secondary "Request changes" (this fixture gate's options are approve + request_changes only, so no Reject); no Kbd hints in this cell (the gallery E cell's gate has `registerKeys` unset — Kbd hints render only when keys are registered).
- alert (role alert, `flex-basis: 100%`, icon alert, ink): **"Not recorded."** + `` ` Already decided from ${viaWord} by ${name} at ${HH:mm}.` `` "Already decided from Matrix by Rakesh Gangwar at 13:02." (G-1 payload) + link "Refresh" (`min-height: 0`) → `model.refresh()`.

**F · Loading** (`CardStateStudio kind="loading"`, `aria-busy="true"` on the panel)
- title shown (it is in the snapshot); figures sm: four skeletons over labels "Stage", "Attempts", "Waiting", "Cost"; off-quote with `h3 role="status"` "Loading readout…" and three skeleton lines (100%, 80%, 60%).

#### Interactions & states

Gate: `A`/`C` shortcuts as §30.1 (only when `registerKeys` is provided, i.e. in drawer/page); Approve/Request changes/Reject → `GateDecisionModel.decide(name)`; request changes with an empty note → `needNote = true` → cell E field state, focus to textarea, no request; server 409 → `error` → alert under the buttons; "Refresh" re-fetches and the panel then shows the decided state. Question: empty submit → `vibekit:Field error="Type an answer first."`; ⌘↵ submits. Restore: busy → button disabled "Restoring…". Copy digest → clipboard full digest. View raw JSON → RawJson of `approvalSubject.canonical`.

#### Fixture needs (all literal; ids are the gallery's fixed ids)

| Cell | Records |
|---|---|
| A | board `brd_research` "Research & Intelligence", stages `question` Question, `gather` Gather, `measure` Measure, `synthesise` Synthesise, `recommendation` Recommendation, `filed` Filed; card `card_states_gate` title "P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix)", stage `recommendation`, state `input-required`, delegate null; gate `gat_states_a` status pending, stageKey recommendation, producedBy `agt_research_ray`, createdAt `2026-10-11T12:48:00+05:30`, summary "Ready for your review. Approve exactly the subject below." (see Gap S-8 for the cross-vibe value), options approve/request_changes/reject (titles "Approve", "Request changes", "Reject"), approvalSubject `{ id: 'sub_a', revision: 2, schema: 'recommendation.v1', digest: 'sha256:9f3ac2e1' + 56 × '0', canonical: { kind: 'Recommendation, one paragraph', synthesis: '<text above>', sources: 'Organization plane cutover record, 7 Oct' } }` (every canonical key renders as a row — Studio therefore shows a third row "Sources" / "Organization plane cutover record, 7 Oct" after Synthesis, Gap S-10) |
| B | board `brd_devx` (00-shared); card `card_states_question` "Superpipeline: manual-delivery completion and approval-subject hardening", stage `fix`, state `input-required`; elicitation `eli_states_b` agentId `agt_coder_kai`, status pending, createdAt `2026-10-11T11:05:00+05:30`, question as above, options [] |
| C | board `brd_marketing` "Marketing & Community", stages `requested` Requested, `messaging-brief` Messaging brief, `messaging-approval` Messaging approval, `cleared-to-publish` Cleared to publish, `community-triage` Community triage, `reply-approval` Reply approval, `cleared-to-reply` Cleared to reply, `done` Done; card `card_states_archived` "Coordinator dispatch canary — Melissa", stage `messaging-approval`, archivedAt `2026-10-09T…` (any time on 9 Oct, e.g. `T18:10:00+05:30`), owner usr_rakesh, attemptCount 1, one attempt by `agt_message_melissa`; one gate `gat_states_c` with status `cancelled`, `resolvedAt` equal to `archivedAt` (→ the derived reason sentence, Gap S-9) |
| D | board `brd_onboarding` "Agent Onboarding", stages (in order) ending at `resident` Resident (the strip is not shown in Studio D; stage list per the onboarding group's fixture); card `card_states_done` "Onboard Message Melissa — marketing and messaging", stage `resident`, state `completed`, stateSince `2026-10-09T19:26:00+05:30`, priority 2, attemptCount 5, queuedBy `agt_super_chotu`, owner usr_rakesh; final run by `agt_onboarding_olivia` with last response activity body "Melissa is resident. Her identity, router description and portrait are in place, and you credentialed her at the resident gate." at 19:26; handoff `{ summary: 'Profile, router description, safe profile and portrait drafted. No posting, DMs or scheduling without separate operator authorisation.' }` (Gap S-8) |
| E | board `brd_research`; card `card_states_error` "P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’", stage `recommendation`; gate `gat_states_e` shown as pending in the snapshot but already decided server-side (the seed writes the snapshot copy pending and the gate row decided: `decision approve`, `decidedBy usr_rakesh`, `resolvedAt 2026-10-11T13:02:00+05:30`, `via matrix`) so `resolveGate` answers 409 with the G-1 payload; options approve + request_changes only. The gallery builds E's model with `holdDetail: true` so the card's own fetch (which would show the gate decided) never replaces the snapshot's pending copy; the gallery decides which block each cell shows, so `holdDetail` does not trigger the loading block here |
| F | card `card_05823a57e8224605` (00-shared) with `holdDetail: true` |

---

### 30.4 SP-Phone-Card-Studio — the phone card sheet

- **Size** 390×2571 · **vibe** studio · **route** `/b/brd_devx/c/card_05823a57e8224605` at viewport 390×844 (full-screen `vibekit:Sheet`). Tweaks: `archived` false (default baseline, "live") / true (second baseline); tab state `spec` default (other tabs captured by clicking, as §30.1).
- No shell chrome is visible (the sheet covers the bottom nav). The `.ph-top` / `.ph-nav` rules present in the file are the shell group's phone bar and are **not** used by this artboard's markup.

#### Component tree

| File | Change |
|---|---|
| `lib/components/card/layouts/CardPhoneStudio.svelte` | **new**. Props `CardLayoutProps`. Root `<div class="ar ph" data-vibe="studio">` inside `vibekit:Sheet labelledBy="drawer-title"` (the Sheet owns `role=dialog aria-modal`) |
| reused | `StudioWhoWhat` (`variant='phone'` → `.pc-srow`), `StudioResumeForm` (`variant='phone'`), `GateStudioFrame/Bar`, `QuestionStudioFrame/Bar`, `CardStateStudio` |
| new | `lib/components/card/studio/StudioPhonePanels.svelte` — the five phone tab panels; props `{ model: CardModel; panel: 'spec' \| 'log' \| 'links' \| 'talk' \| 'cost' }` |
| vibekit | `Sheet`, `CopyButton` (chip form), `IconButton`, `FigureRow(size='phone')`, `StageStrip(labels='none')`, `AgentQuote(size='sm')`, `Banner(ink)`, `StatePill`, `Button`, `Tabs`, `FactList(three)`, `NumberedList`, `Disclosure`, `DefinitionGroups(stacked)`, `RunRow`, `LinkList(rich)`, `Field`, `EmptyState`, `AgentFace` |

#### Structure

```
div.ar.ph
  div.pc-bar
    button.back (icon arrow-left 16) "Developer Experience"      → onClose()
    CopyButton(chip) "4605" + icon copy 13, aria-label "Copy card id card_05823a57e8224605"
    span.clk[aria-label="13:31, midday"] "13:31 · midday"
    a.ph-ib[href=pageHref] (icon external 18) aria-label/title "Open as a page"   (same tab, 00-shared §2.2)
    button.ph-ib (icon close 18) aria-label "Close (Esc)"         → onClose()
  div.pc-in
    header.pc-hd  kick swatch "Stage 02 · Reproduce"; div.tl h2#drawer-title + IconButton(frame, pencil) "Edit card"
    dl.pc-figs (6)
    div.pc-trk  StageStrip(labels none, role img) + p "<b>Reproduce · stopped here</b> · next Failing test"
    [live]     section.ar-q "Readout" (needs)  +  section.pc-cmd (resume)
    [archived] section.ar-q.off "Readout" (last word)  +  section.pc-arch (banner + Restore)
    div.pc-srow  StatePill / "Unclaimed ·" Assign to me / owner / asked-by chip
    div  Tabs(.pc-tabs) + div.pc-pane#p-pane
  footer.pc-foot[aria-label="Card actions"]
```

#### Section placement

| Key | Place | Label / count |
|---|---|---|
| `error` | `vibekit:Alert` first child of `.pc-in` | — |
| `status` | `.pc-srow` (StatePill, Unclaimed · Assign to me, owner, asked by) | — |
| `facts` | `.pc-figs` + tab Spec "Facts" (Priority/Due/Labels) + `.pc-bar .sid` | — |
| `editButton` | `.pc-hd .tl` icon "Edit card" | — |
| `editForm` | replaces `.pc-hd` + figures while editing (`.pc-cmd` box) | — |
| `description` | Spec → "Description" | — |
| `delivery` | Cost → "Delivery" + "No approved delivery on this card." | — |
| `resume` | `.pc-cmd` "Resume · blocked" (live only) | "2 tries" |
| `plan` | Spec → "Plan" + note "error-eric did not post a plan for this card." | — |
| `criteria` | Spec → "Things to prove 5" | `5` |
| `details` | Spec → disclosure "Details 10 fields · what to do, who, background, rules, where work goes" + "View raw JSON" + "Copy" | tab "Spec 10" |
| `project` | Spec → "Project" + text + "Change project" | — |
| `links` | Links → "Links" note + "Add a link" | tab "Links 5" (= links 0 + sub-tasks 0 + references 5) |
| `subtasks` | Links → "Sub-tasks 0/0" + note + add row | — |
| `activity` | Log → "Session activity 2 runs" + note + run disclosures + "Show tool calls" | tab "Log 2 runs" |
| `decisions` | Log → "Decisions" + note | — |
| `comments` | Talk → "Comments" | tab "Talk 0" |
| `handoff` | Log → "Handoff" | — |
| `cost` | Cost → "Cost" line | tab "Cost $0" |
| `attempts` | Log → "Attempts 2" list | — |
| `related` | Links → "Related prior work" + note | — |
| `references` | Links → "References 5" rich list + attach row | — |
| `cardActions` | `.pc-foot` | — |

#### Layout & CSS — app layout (`CardPhoneStudio.svelte` `<style>`, verbatim)

```css
.ar.ph { width: 390px; display: flex; flex-direction: column; }      /* app: width: 100% (390 is the artboard) */
.ph-ib { position: relative; display: grid; place-items: center; flex: none; width: 44px; height: 44px; border: 0; border-radius: 2px; background: transparent; color: var(--text); text-decoration: none; cursor: pointer; }   /* vibekit:IconButton frameless — sheet reference */
.ph-ib.b { border: 1px solid var(--rule); }
.pc-bar { display: flex; align-items: center; gap: 4px; padding: 6px 8px 6px 4px; border-bottom: 1px solid var(--rule); }
.pc-bar .back { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 8px; border: 0; background: transparent; color: var(--text); font: 700 13px var(--ff); white-space: nowrap; cursor: pointer; }
.pc-bar .sid { display: inline-flex; align-items: center; gap: 4px; min-height: 44px; padding: 0 6px; border: 0; background: transparent; color: var(--muted); font: 500 12px var(--fm); cursor: pointer; }   /* vibekit:CopyButton chip — sheet reference */
.pc-bar .clk { margin-left: auto; font: 500 11.5px var(--fm); color: var(--muted); white-space: nowrap; }
.pc-in { display: flex; flex-direction: column; gap: 24px; padding: 16px 16px 24px; }
.pc-hd { display: flex; flex-direction: column; gap: 10px; }
.pc-hd .tl { display: flex; align-items: flex-start; gap: 8px; }
.pc-hd h2 { flex: 1; font: 800 26px/1.06 var(--ff); font-stretch: 82%; letter-spacing: -.01em; overflow-wrap: anywhere; }
.pc-trk p { margin-top: 8px; font: 500 11.5px var(--fm); color: var(--muted); }
.pc-trk p b { color: var(--sig-text); font-weight: 600; }
.pc-cmd { display: flex; flex-direction: column; gap: 12px; padding: 14px; border: 1.5px solid var(--rule); background: var(--paper); }
.pc-cmd .h { display: flex; align-items: baseline; gap: 8px; font: 800 15px var(--ff); }
.pc-cmd .h .mono { margin-left: auto; font-size: 12px; font-weight: 500; color: var(--muted); }
.pc-srow { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 4px 0; border-top: 1px solid var(--hair); border-bottom: 1px solid var(--hair); font-size: 13.5px; }
.pc-srow .chipx { display: inline-flex; align-items: center; gap: 6px; }
.pc-pane { display: flex; flex-direction: column; gap: 12px; }
.pc-pane h3 { margin-top: 10px; padding-top: 10px; border-top: 1.5px solid var(--rule); font: 800 14px var(--ff); }
.pc-pane h3:first-child { margin-top: 0; }
.pc-pane h3 .mono { margin-left: 6px; font-weight: 500; font-size: 12px; color: var(--muted); }
.pc-pane .p { font: 400 16px/1.48 var(--fs); overflow-wrap: anywhere; }
.pc-pane .note { font-size: 13px; color: var(--muted); }
.pc-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.pc-add { display: flex; gap: 8px; }
.pc-add .ar-in { flex: 1; min-width: 0; }
.pc-foot { display: flex; flex-wrap: wrap; gap: 10px; padding: 14px 16px 18px; border-top: 1.5px solid var(--rule); }
.pc-kv a, .pc-pane a { text-underline-offset: 3px; }
```

vibekit sheet references (phone variants):

```css
/* vibekit:FigureRow size="phone" */
.pc-figs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1.5px solid var(--rule); }
.pc-figs > div { display: flex; flex-direction: column; gap: 4px; padding: 10px 6px 12px 0; border-bottom: 1px solid var(--hair); min-width: 0; }
.pc-figs > div:not(:nth-child(3n+1)) { padding-left: 10px; border-left: 1px solid var(--hair); }
.pc-figs dt { order: 2; font-size: 12px; font-weight: 600; color: var(--muted); }
.pc-figs dd { font: 900 34px/.9 var(--ff); font-stretch: 72%; letter-spacing: -.02em; white-space: nowrap; }
.pc-figs dd small { font-size: 13px; font-weight: 700; margin-left: 2px; letter-spacing: 0; }
.pc-figs dd.z { font-weight: 300; color: var(--muted); }
/* vibekit:StageStrip labels="none"; AgentQuote size="sm" */
.ph .ar-track li { font-size: 0; }
.ph .ar-q blockquote { font-size: 17px; }
/* vibekit:Banner(ink) phone */
.pc-arch { display: flex; flex-direction: column; gap: 10px; padding: 14px; background: var(--text); color: var(--bg); }
.pc-arch h3 { display: flex; align-items: center; gap: 8px; font: 800 15px var(--ff); }
.pc-arch p { font: 400 16px/1.4 var(--fs); }
.pc-arch .ar-btn { align-self: flex-start; background: var(--bg); color: var(--text); }
.pc-arch :focus-visible { outline-color: var(--bg); }
/* vibekit:Tabs phone (scrolling strip, count in <b>) */
.pc-tabs { display: flex; gap: 16px; overflow-x: auto; border-bottom: 1px solid var(--hair); }
.pc-tabs .ar-tab b { font: 500 11.5px var(--fm); color: var(--muted); margin-left: 4px; }
/* vibekit:FactList three */
.pc-fx3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.pc-fx3 > div { display: flex; flex-direction: column; gap: 2px; }
.pc-fx3 dt { font: 500 11px var(--fm); color: var(--muted); text-transform: uppercase; }
.pc-fx3 dd { font-weight: 700; }
/* vibekit:NumberedList phone */
.pc-nl { counter-reset: n; }
.pc-nl li { counter-increment: n; display: grid; grid-template-columns: 24px minmax(0, 1fr); padding: 8px 0; border-top: 1px solid var(--hair); font-size: 14.5px; overflow-wrap: anywhere; }
.pc-nl li::before { content: counter(n, decimal-leading-zero); font: 500 12px/1.7 var(--fm); color: var(--muted); }
/* vibekit:Disclosure (heading form) */
.pc-det summary { display: block; min-height: 44px; cursor: pointer; list-style: none; }
.pc-det summary::-webkit-details-marker { display: none; }
.pc-det summary h3 { text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 4px; }
.pc-det summary h3 .mono { display: block; margin: 4px 0 0; text-decoration: none; }
.pc-det[open] summary h3 { text-decoration: none; }
/* vibekit:DefinitionGroups stacked */
.pc-grp h4 { margin-top: 6px; font: 700 12px var(--ff); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
.pc-kv > div { padding: 8px 0; border-top: 1px solid var(--hair); }
.pc-kv dt { font-weight: 700; font-size: 13.5px; }
.pc-kv dd { margin-top: 2px; font-size: 14.5px; overflow-wrap: anywhere; }
.pc-kv .id { font: 500 12px var(--fm); overflow-wrap: anywhere; }
/* vibekit:RunRow phone */
.pc-run { border-top: 1px solid var(--hair); }
.pc-run summary { display: flex; flex-direction: column; gap: 2px; min-height: 44px; padding: 8px 0; cursor: pointer; }
.pc-run summary .rt { font-weight: 800; }
.pc-run summary .rm { font: 500 12px var(--fm); color: var(--muted); }
.pc-ev li { display: grid; grid-template-columns: 74px minmax(0, 1fr); gap: 2px 10px; padding: 8px 0 8px 12px; border-left: 2px solid var(--hair); font-size: 14px; }
.pc-ev .evt { font-weight: 800; }
.pc-ev .tm { grid-column: 2; font: 500 11.5px var(--fm); color: var(--muted); }
/* attempts list (vibekit:DataTable list form) */
.pc-att li { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; gap: 2px 8px; align-items: center; padding: 8px 0; border-top: 1px solid var(--hair); font-size: 14px; }
.pc-att li > span:last-child { grid-column: 2 / 4; color: var(--muted); font-size: 13px; }
.pc-att .who { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; }
/* vibekit:LinkList rich */
.pc-refs li { border-top: 1px solid var(--hair); }
.pc-refs a { display: flex; flex-direction: column; gap: 3px; padding: 10px 0; text-decoration: none; }
.pc-refs a b { text-decoration: underline; text-underline-offset: 3px; overflow-wrap: anywhere; }
.pc-refs a span { font: 400 14.5px/1.4 var(--fs); }
.pc-refs a small { font: 500 11.5px var(--fm); color: var(--muted); overflow-wrap: anywhere; }
```

Inline styles that matter: `.pc-hd .kick` `display: inline-flex; align-items: center; gap: 8px`; the pane `style="padding-top: 16px"`; Talk's button row `.pc-row` with `justify-content: space-between`; Show more link-buttons `min-height: 0` (inline in the value text; their hit area is the `.h44` pseudo — add `class="h44"`). Phone tab strip scrolls horizontally inside itself (`overflow-x: auto`) — the page never scrolls sideways. Safe-area: `.pc-bar` gets `padding-top: max(6px, env(safe-area-inset-top))`, `.pc-foot` `padding-bottom: max(18px, env(safe-area-inset-bottom))` (added; device rule).

#### Content map (phone data = the production card, see Fixture)

| Visible | Source |
|---|---|
| "Developer Experience" (back) | `boardName` |
| "4605" + copy icon | `shortId`; aria `` `Copy card id ${card.id}` `` "Copy card id card_05823a57e8224605" (the full id, unlike desktop) |
| "13:31 · midday" | `clock(now, phase)`; aria-label `"13:31, midday"` |
| kicker "Stage 02 · Reproduce" | `` `Stage ${stageNo(i)} · ${stageName}` `` |
| figures | "2/7 Stage" (unit `` `/${n}` ``); "2 Tries" (`attemptCount`); "2 days Stopped for" (label `` `${stateVerb} for` `` with stateVerb "Stopped" for input-required, "Working" / "Waiting" otherwise; value `figAge` — Gap S-11); "$0.00 Cost · no est." (zero; label "Cost · no est." when no estimate); "0 Blocks" (zero); "0/0 Sub-tasks" (zero) |
| track caption | `<b>${stageName} · stopped here</b> · next ${nextStage}` — "Reproduce · stopped here · next Failing test" (archived: `<b>${stageName} · archived here</b>`) |
| live readout | quote (needs, face error-eric 24 "error-eric, needs you"); header "error-eric · Stopped · needs decision" (phone wording: " · Stopped · needs decision"); time `quoteWhen(lead.at, now, { padDay: true })` "Thu 08 Oct 19:41"; body `needsHuman.detail` verbatim (phone fixture text starts "Not reproduced …", capital N) with code tokens; no footnote on phone (the session id is in the body; no Copy session id button on phone — Gap S-12) |
| resume box | `p.h` `` `Resume · ${needsHuman.reason}` `` "Resume · blocked" + mono `` `${attemptCount} tries` `` "2 tries"; select label "Resume at stage", options `stageOption` phone form (Gap S-13 for the later stages); input label `` `Note to ${who}: what changed? It reads this.` ``; single-line `input.ar-in type=text` maxlength 8000; primary "Send back to work" (icon send) |
| archived readout | off-quote, face error-eric 24 mood resting "error-eric, resting"; header `` `${who} · last word before archive` ``; same body |
| archived banner | h3 icon archive + `` `Archived · ${dayMonth(archivedAt, true)}` `` "Archived · 08 Oct"; p "Not running. Nothing to resume. Restore puts it back in Reproduce." (`` `Not running. Nothing to resume. Restore puts it back in ${stageName}.` ``); button (inverted primary) "Restore" (icon restore) |
| status row | live: StatePill needs "Waiting on you"; archived: StatePill archived (icon) "Archived"; "Unclaimed ·" + link "Assign to me" (Gap S-14); muted `` `owner · ${ownerName}` ``; chip face 20 (super-chotu, resting) + " asked by super-chotu", `title` `` `Queued on ${grantOwnerName}'s grant` `` "Queued on Rakesh Gangwar's grant" (Gap S-15) |
| tabs | "Spec" `<b>10</b>`; "Log" `<b>2 runs</b>`; "Links" `<b>5</b>`; "Talk" `<b>0</b>`; "Cost" `<b>$0</b>` (`usdShort`); panel `aria-label` = active tab name |
| Spec pane | "Facts" Priority "P3" / Due "none" / Labels "none"; "Description" `.p` verbatim; "Things to prove 5" (`acceptanceCriteria`, phone heading copy; desktop says "Acceptance criteria") numbered; "Plan" + note `` `${agent} did not post a plan for this card.` `` when `normalisePlan` is null; disclosure "Details" + mono `` `${n} fields · ${groupHeadings.map(lower).join(', ')}` `` "10 fields · what to do, who, background, rules, where work goes"; groups (h4) "What to do", "Who it is about", "Background", "Rules", "Where work goes" with rows as in Fixture; long values clamp with "Show more" (Gap S-16); ids in `.id` mono; links "onboarding card" (to the linked onboarding card), "policy" (external); "View raw JSON" + "Copy" row; "Project" + `` `${projectName} · ${milestoneName ?? 'no milestone'}` `` + link "Change project" (or "Assign to a project" when none) |
| Log pane | "Session activity 2 runs"; note `` `Queued by ${queuedByName} on ${grantOwnerName}'s grant · ${agentCount} agents may be dispatched.` `` (agentCount = `queuedGrant.filter(p => p.startsWith('agt_')).length` = 32; Gap S-15); run disclosures (newest open): summary `` `Run ${n} · ${stageName}` `` / `` `${agent} · ${outcomeWord} · attempt ${n}` ``; events (narrative only unless "Show tool calls"): verb (G-5) + body + time (`HH:mm` same day as previous event, else `ddd D MMM`); run 2 events "Started" / "Rework run on this card session; read prior persisted evidence first." / "Thu 8 Oct", "Stopped" (sig) / "Blocked. Waiting on you; the reason is shown at the top of this card." / "19:41"; run 1 "Sent back" / "The board refused completion: repro and observed were missing." / "Thu 8 Oct"; "Show tool calls" (`aria-pressed`); "Decisions" + note "No decisions on this card yet."; "Handoff" + `.p` (Gap S-17) "From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output."; "Attempts 2" list: n / face 20 + name / `usd` / `` `${outcomeWord}: ${failureReason}` `` — "Sent back: repro and observed missing", "Stopped: waiting on you" (newest face mood needs) |
| Links pane | "Links" + note "Nothing blocks this card and it blocks nothing." (no link rows at all); secondary "Add a link" (icon plus); "Sub-tasks 0/0" + note "0 of 0 open. No sub-tasks yet." + add row (sr label "New sub-task title", placeholder "Add a sub-task", secondary "Add"); "References 5" rich list: `b` = `ref.title`, `span` = `ref.subtitle`, `small` = `` `${providerWord} · ${repo} · ${file} lines ${a}–${b}` `` derived from the GitHub blob URL (`#L379-L786` → "lines 379–786"); attach row (sr label "Attach a link or Superlibrary item", `type=url`, placeholder "Paste a link to attach", "Add"); "Related prior work" + note "No related prior work found in Superlibrary." |
| Talk pane | "Comments"; note "No comments yet."; field label "Comment", `rows=2`, placeholder "Write a comment"; hint "⌘ or Ctrl + Enter to post"; secondary "Comment" |
| Cost pane | "Cost"; `<strong class="mono">$0.00</strong> spent · no estimate · no card cap set` (`` `${usd} spent · ${estimate ? 'of ' + usd(est) : 'no estimate'} · ${cap ? 'cap ' + usd(cap) : 'no card cap set'}` `` with cap = `app.board.usage.cardUsdCap`); "Delivery" + note "No approved delivery on this card." |
| footer | live: secondary "Archive card" (icon archive) + quiet link "Delete card…"; archived: secondary "Archived — restore" (icon restore) → `model.restore()` + "Delete card…" |

#### Interactions & states

All of 00-shared §4. Phone specifics: back button and Close both `onClose()`; "Open as a page" navigates in the same tab; tabs (`vibekit:Tabs`) ids `spec | log | links | talk | cost`, default `spec`, roving tabindex (active 0, others −1), ids `t-{id}`, panel `p-pane` with `aria-label` = tab name, arrow keys switch; no keyboard shortcut hints on phone. Details disclosure closed by default; run 2 open, run 1 closed. "Show more" expands one value in place (button text → "Show less", `aria-expanded`). "Assign to me" → `model.assignToMe()` (see Gap S-14). Add sub-task / Add reference → `model.subtasks.add()` / `model.refsForm.add()`; disabled while empty. Archived variant: no resume box, no live controls, no signal (StatePill archived is ink).

#### Fixture needs — the phone card is a separate seed

The phone artboard shows the **production** record of card 4605 (11 Oct 13:31), which disagrees with the desktop artboards' paraphrase (00-shared §5). Ruling: per-artboard seed — `e2e/support/seed.ts` gains `seedPhoneCard4605(request)` which writes the same card id on a fresh `brd_devx` with the values below; the desktop seed stays as 00-shared §5. Clock **2026-10-11T13:31:00+05:30**. Ideally the seed author exports the real `spec` JSON of production card `card_05823a57e8224605` (so the clamped "Show more" values carry their real continuations); the visible text below is the minimum it must reproduce.

| Field | Value |
|---|---|
| stage / state | `reproduce` / `input-required`; `needsHuman = { reason: 'blocked', detail: <phone stop reason>, failureCount: 0 }` |
| phone stop reason | identical to 00-shared §5 except the first letter: "Not reproduced end-to-end: …" |
| stateSince | `2026-10-08T19:41:00+05:30` (quote "Thu 08 Oct 19:41"; see Gap S-11 for the "2 days" figure) |
| archived variant | `archivedAt = 2026-10-08T…+05:30` (e.g. `T20:15:00`) — banner "Archived · 08 Oct" |
| attemptCount / cost | 2 / 0 |
| owner / delegate / queuedBy | `usr_rakesh` / null / `agt_super_chotu`; `queuedGrant` = 32 principals, all `agt_…`, including `agt_message_melissa`, `agt_audience_anna`, `agt_error_eric`; grant owner `usr_rakesh` (Gap S-15) |
| projectId / milestoneId | `prj_melissa_anna` "Marketing & Community — Melissa and Anna onboarding" / null |
| spec.description | "Reproduce and localize why the existing AgentPod bridge Matrix identities for Message Melissa and Audience Anna do not respond to Rakesh in Supermessage. Produce an evidence-backed diagnosis and exact repair proposal; do not attribute silence to missing grants without live evidence." |
| spec.acceptanceCriteria (5) | 1 "Trace user DM ingress, room routing/bridge identity, control-pair authorization, station dispatch, ACP transport/model request and reply delivery; identify the first failing hop for each agent." 2 "Check real current shared-profile servicing rather than stale local gateway_state.json; these profiles are not separately startable." 3 "Check credential availability by presence only; never print .env, tokens or secret files. Profiles were cloned without messaging tokens intentionally because identities are bridge-owned." 4 "Read current AgentPod, Hermes and Accounts contracts/code; do not use retired Fleet grant endpoints or guess API behavior." 5 "Report separately what was reproduced, what cannot be accessed and the exact bounded repair needed; link evidence and preserve tenant/principal boundaries." |
| spec.plan | absent |
| spec detail fields (10) and `spec.groups` | `spec.groups = { "What to do": ["rework","requiredEvidence"], "Who it is about": ["messageMelissa","audienceAnna"], "Background": ["context","latestConfirmedGrant"], "Rules": ["scope","accountsIssues"], "Where work goes": ["repository","routingRule"] }`; values: rework "Previous run ended with interim prose while child traces were pending; board rejected completion because repro and observed were missing. Do not spawn background delegate_task children on this rework: finish the bounded diagnosis in this card session." (+ production continuation); requiredEvidence = the 5 criteria array → rendered "5 items, listed under Things to prove." (array equal to `acceptanceCriteria` → that sentence; Gap S-18); messageMelissa `{ matrixId: '@agent_message-melissa:id.agentpod.dev', card: <onboarding card ref> }`; audienceAnna `{ matrixId: '@agent_audience-anna:id.agentpod.dev', card: … }`; context "Rakesh states his own mayDispatch grant already includes both agents and has now added them to Super Chotu's grant. The coordinator station JWT observed immediately after this still contained the original 30-principal list; distinguish token propagation from configured grants." (+ continuation); latestConfirmedGrant "Super Chotu fresh station JWT now contains both Melissa and Anna principals in mayDispatch (32 total). Token propagation is confirmed; do not continue treating the grant as missing."; scope "Diagnosis and repair proposal only. No gate decisions, credentials, principal links, grants, board policy, membership, service lifecycle changes or bypasses. No public posts or third-party messages." (+ continuation); accountsIssues "If the investigation identifies an Accounts implementation defect, raise a GitHub issue in SuperJackfruitLabs/accounts. No confirmed Accounts defect means no speculative issue." (+ continuation); repository `{ name: 'SuperJackfruitLabs/atelier', visibility: 'private', policy: 'https://github.com/SuperJackfruitLabs/atelier/blob/main/AGENTS.md' }` → "SuperJackfruitLabs/atelier · private · policy"; routingRule "Internal artifacts and all Guild work default to Atelier. Verify destination visibility and classification before any push, PR, issue, comment or attachment; never use public fallback." (+ continuation). The Details group also shows "Project" = `projectName` as the last row of "Where work goes" (derived, not a spec field; it is not counted in "10 fields") |
| links | none (no edges) |
| references (5) | each `{ provider: 'github', sourceType: 'url', title, subtitle, url }`: (1) "AgentPod v0.1.91 Matrix inbound bridge contract" / "DM ingress → room lookup → Accounts identity/grant → ACP dispatch" / `https://github.com/SuperJackfruitLabs/agentpod/blob/3f625b618d443aa8ef1dad7c04d3ddd14dcf6708/apps/hub/src/services/matrix-as/inbound.ts#L379-L786`; (2) "AgentPod v0.1.91 Matrix reply delivery contract" / "ACP chunks buffered and flushed via bridge-owned Matrix identity" / `…/apps/hub/src/services/matrix-as/outbound.ts#L373-L486`; (3) "AgentPod v0.1.91 ACP transport contract" / "acp.open/attach and bidirectional broker framing" / `…/apps/hub/src/services/acp-transport.ts#L90-L248`; (4) "Accounts current claims/grant contract" / "Fresh tokens read the stored grant; bridge authorization reads Accounts principal view directly" / `https://github.com/SuperJackfruitLabs/accounts/blob/77ca37e43cd6f98d0799ecbdd230b857404d77ec/src/issuer/claims.ts#L17-L43`; (5) "Hermes ACP adapter at the reproduced build" / "Hermes streams agent_message_chunk and returns end_turn over ACP stdio" / `https://github.com/NousResearch/hermes-agent/blob/0b70608a58ac4a8d4505cff15302695350ff6ccc/acp_adapter/server.py#L818-L883` |
| related prior work | none |
| attempts | run 1 `run_eric_p1` agent `agt_error_eric`, stage reproduce, outcome `rejected_completion`, failureReason "repro and observed missing", cost 0; run 2 `run_eric_p2`, outcome `blocked`, failureReason "waiting on you", cost 0 |
| activities (narrative) | run 2: `{ type: 'response', action: 'Started', body: 'Rework run on this card session; read prior persisted evidence first.', ts: '2026-10-08T…' }`, `{ type: 'response', signal: 'stop', body: 'Blocked. Waiting on you; the reason is shown at the top of this card.', ts: '2026-10-08T19:41:00+05:30' }`; run 1: `{ type: 'response', action: 'Sent back', body: 'The board refused completion: repro and observed were missing.', ts: '2026-10-08T…' }` |
| handoff | null (→ derived sentence, Gap S-17); card `queuedAt` 2026-10-08 |
| comments / decisions / estimate / delivery | none / none / null / none; `board.usage.cardUsdCap` null |

---

### 30.5 Studio gaps (rulings)

| # | Mockup shows | API / code today | Ruling |
|---|---|---|---|
| S-1 | Clock "13:27 · midday" (drawer), "13:31 · midday" (phone); page status "synced 13:51"; 00-shared fixes the clock at 13:51 | `Date` | (a) The pixel test fakes `Date` per artboard: drawer 2026-10-11T13:27+05:30, phone 13:31, page and states 13:51. `clock()` reads `now`; nothing else changes. |
| S-2 | Page figure "2 days · In Reproduce" (time in the stage, distinct from "Waiting on you") | `Card.stateSince` only | (b) API: add `stageSince: string` (ISO, set whenever `currentStageKey` changes) to `Card` in the board snapshot (`@superpipeline/contract` `CardSnapshot`, `BoardDO` card row column `stage_since`, backfilled from the latest `card.moved` event or `created_at`). Client: `stageAgeHours = (now − stageSince)/3.6e6`. |
| S-3 | Runs "Ended Oct 9 19:41"; page Run "#2" | `Attempt` has no times | (b) API: `GET /boards/:b/cards/:c/attempts` adds `startedAt: string` and `endedAt: string \| null` per attempt (from `runs.started_at` / `runs.ended_at`). |
| S-4 | Latest-run rows reworded vs the activity body ("Read the AgentPod hub matrix-inbound log …", "Session acps_8f86d4e4… reached Hermes; a model reply was produced", "No fresh DM event to trace; needs one per agent") | `Activity.body` (one value, also shown by Daylight with different wording) | (c) Agent text is shown verbatim (brief rule 4): Studio renders `body` exactly as stored (the 00-shared §5 bodies). The type column ("Action", "Response", "Stopped") is product copy and stays. Studio's baseline text for these three cells must be regenerated. |
| S-5 | Links "Where" column "Forge" for references | `Reference.provider`, `url` | (a) `whereWord(ref) = hostname(ref.url) === forgeHost ? 'Forge' : hostname === 'github.com' ? 'GitHub' : hostname`, `forgeHost` from `getForgeHost()` (already in api.ts, cached in `app`). Phone small line uses `provider` lower case ("github"). |
| S-6 | "synced 13:51" | none | (a) new store field `app.syncedAt: Date \| null`, set when a snapshot load (`openBoard`/`refresh`) resolves and on every feed event; formatted `HH:mm`. |
| S-7 | "Asked by super-chotu, an agent allowed to dispatch the one working it. Unclaimed now." | `cardProvenance` gives `byAgent`, `queuedByName`, `grantSize`, `grantCoversDelegate` | (a) phrase table: byAgent → "an agent"; else "a person"; `grantCoversDelegate === true` → "allowed to dispatch the one working it"; `false` → "not allowed to dispatch the one working it"; `null` with no delegate → coverage of the last attempt's agent (`queuedGrant.includes(lastAttempt.agentId)`) — error-eric is covered → "allowed to dispatch the one working it"; `grantSize === null` → "with no recorded dispatch authority". Suffix " Unclaimed now." when `delegateAgentId` is null. |
| S-8 | States A gate summary "Ready for your review. Approve exactly the subject below." and D handoff "…portrait drafted. No posting…" — the Daylight states artboard shows "All done, ready for your review." and "…portrait drafted through this pipeline. No posting…" for the same records | one `gate.summary`, one `handoff.summary` | (c) One fixture value serves every vibe (agent text verbatim). Ruling: the merged fixture (§7) uses the **Daylight** strings (the longer handoff is the fuller record); Studio's A quote and D "Handed on" baselines are regenerated from the fixture. |
| S-9 | Archived reason "Its pending review was cancelled when the card was archived." | no archive reason field | (a) derive: if a gate on the card has `status === 'cancelled'` and `|resolvedAt − archivedAt| ≤ 60 s` → that sentence (copy constant `ARCHIVE_CANCELLED_REVIEW`); else `` `Archived by ${displayPrincipal(archivedBy)}.` `` when known, else "Archived." Banner right text "No decisions open" is copy shown on every archived card. |
| S-10 | Studio cell A subject shows Revision, Kind, Synthesis, Digest; Daylight's shows Kind, Synthesis, **Sources** | `approvalSubject.canonical` has all three keys | (c) The subject a person approves must be shown in full (it is what the seal covers). Studio renders every canonical key; its baseline gains a "Sources" row. |
| S-11 | Phone "2 days · Stopped for" while its own quote says stopped Thu 08 Oct 19:41 (2.74 days before 13:31 on 11 Oct); desktop "2 days" for 41.8 h | `stateSince` | (c) One rounding rule (`Math.round(h/24)`, which the desktop artboards need: 41.8 h → 2) applied to the phone gives **3 days**. The phone mockup is inconsistent with its own timestamp; the phone baseline is regenerated with "3". |
| S-12 | Phone has no "Copy session id" | — | (a) none needed: the session id is in the selectable quote text; Copy session id is new on desktop, not a parity item. Recorded so nobody adds it to the phone. |
| S-13 | Phone resume select lists all 7 stages | `CardResume` targets = this stage and earlier; the server refuses later targets | (c) Resuming into a later stage would skip work and the server refuses it. The phone shows "1 · Reported", "2 · Reproduce (where it stopped)" only; baseline regenerated. |
| S-14 | Phone "Unclaimed · Assign to me" next to "owner · Rakesh Gangwar" with Rakesh viewing | "assign to me" shows only when `owner ≠ viewer` | (c) "Assign to me" assigns the owner; showing it to the owner does nothing. Keep today's rule: hidden here; "Unclaimed" (the agent slot) stays. Baseline regenerated. |
| S-15 | "Queued on Rakesh Gangwar's grant", "… · 32 agents may be dispatched." | `queuedBy`, `queuedByAgentId`, `queuedGrant: string[]` | (b) API: add `queuedOnGrantOf: string \| null` (principal id whose dispatch grant authorised the queue, recorded at queue time) to `Card` in the snapshot contract. Count: (a) `queuedGrant.filter(p => p.startsWith('agt_')).length` → "32 agents"; when the grant also holds people, say `` `${n} principals may be dispatched` ``. |
| S-16 | Phone detail values clamped with "Show more" | full strings | (a) each `dd` value clamps to 3 lines (`display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden`), "Show more" rendered only when `scrollHeight > clientHeight` after layout; toggles to "Show less". Fixture uses the production values so the clamp falls where the artboard shows it. |
| S-17 | Phone Handoff "From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output." | `handoff` null; no card creation time | (a) derived sentence when `handoff` is null and the card is in its first worked stage after the queue stage: `` `From ${prevStageName}: queued by ${queuedByName} on ${dayMonth(createdAt)} with the brief above. No earlier stage output.` ``; (b) API: add `createdAt: string` to `Card` in the snapshot (the card row already stores it). Desktop Studio shows the stored handoff instead ("Handoff from Reported" + quote). |
| S-18 | Phone "Required evidence: 5 items, listed under Things to prove." | `spec.requiredEvidence` array equal to `acceptanceCriteria` | (a) `specGroups` renders an array value that deep-equals `acceptanceCriteria` as `` `${n} items, listed under ${criteriaHeading}.` `` (criteriaHeading = "Things to prove" on phone, "Acceptance criteria" on desktop). |
| S-19 | Studio desktop Details values are shortened versions of Daylight's ("Localise why Melissa and Anna do not answer Rakesh in Supermessage." vs "Reproduce and localise why the AgentPod bridge identities …"; "No blame without evidence." vs "Do not blame a component without evidence."; etc.) | one `spec` | (c) Spec values are data shown verbatim; the fixture keeps 00-shared §5 (Daylight) values; Studio's Details-table baseline text is regenerated. |
| S-20 | Run-table faces: newest run's agent face in "needs" mood, older runs "resting"; Asked-by face "working" | faces from name + mood | (a) mood = `lead.needsYou && run is newest ? 'needs' : 'resting'`; queuer face mood = `'working'` when that agent has any running station run, else `'resting'` (`app.agents[i].status === 'working'`; the fixture marks super-chotu working). Phone uses resting for the queuer (its fixture marks super-chotu resting at 13:31). |
| S-21 | Done figure "Oct 9 · Finished 19:26" | `stateSince` when state `completed` | (a) `doneAt = card.stateSince` for completed cards. |

### 30.6 Shared-contract notes (for the assembler; 00-shared not edited)

- N-1 (§2.2): Studio's drawer link reads **"Open"** with Kbd ⇧O and `aria-label="Open in new window, Shift O"` (`aria-keyshortcuts="Shift+O"`), not the visible text "Open in new window"; the phone link is icon-only with `aria-label`/`title` "Open as a page".
- N-2 (§5, G-5): the stop row must not be `type: 'error'` or the runs table's Errors column (and "0 errors" captions) becomes 1. Seed it as `type: 'response', signal: 'stop'`; G-5's verb rule already maps `signal === 'stop'` to "Stopped".
- N-3 (§1.2): Studio drawer width is 940px (`min(940px, 100%)`), from the artboard grid; the old 760px is gone.
- N-4 (§5): Studio's desktop artboards paraphrase agent text and spec values differently from Daylight (S-4, S-8, S-19); the shared fixture wins and the Studio baselines are regenerated for those strings. The merged §7 should state this once for all vibes.
- N-5 (§5): the phone artboard shows the production record of card 4605 (5 criteria, 10 different detail fields, project, 5 GitHub references, no links, stopped 8 Oct) — it needs its own seed (`seedPhoneCard4605`). Other vibes' phone artboards probably carry the same production data; the seed should be shared.
- N-6 (§6): new API fields from Studio: `Card.stageSince` (S-2), `Attempt.startedAt/endedAt` (S-3), `Card.queuedOnGrantOf` (S-15), `Card.createdAt` (S-17); new store field `app.syncedAt` (S-6).
- N-7 (§5 clock): the clock is per artboard (S-1), not a single 13:51.
- N-8 (§3): gallery cell E needs `holdDetail: true` on its model; otherwise the card's own fetch returns the gate as decided and the controls disappear before the test can click.
- N-9 (G-1): Studio's wording is "Not recorded. Already decided from Matrix by Rakesh Gangwar at 13:02." with a "Refresh" link; the gate in Studio's E cell has only Approve + Request changes (fixture options, not a hidden Reject).
- N-10 (§1.7): new vibekit names introduced by Studio: `Kbd`, `StageSwatch`, `Initials`, `NumberedList`, `CommandField`, `StatusBar`; and variants `FigureRow size sm/phone`, `StageStrip labels current/none`, `Banner ink`, `FactList who/inline/three/kv`, `LinkList rich`, `Alert neutral`.
- N-11 (§2.1): below 640px the card page route renders the vibe's phone layout with `surface: 'page'` (back → board, no Close); there is no phone card-page artboard.
- N-12 (§1.1 parity test): Studio's drawer and phone render one tab panel at a time, so `card-layouts.svelte.test.ts` must activate each tab and count `data-section` across the union.
- N-13 (§1.6): the old sticky Studio command bar (and `scroll-padding-bottom` measuring) is removed; decision controls are section 03 in the right column.
