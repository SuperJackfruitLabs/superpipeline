# Daylight — card drawer, card page, card states, phone card

Sources: `scratchpad/vibes-mockups/project/SP-{Card,CardPage,Card-States,Phone-Card}-Daylight.dc.html` (CSS and markup quoted below are verbatim from them). Shared contract: `00-shared.md` (§ references point there). Daylight = "a warm room": Figtree body, Bricolage Grotesque display, soft radii, the noon sky, faces prominent, the card read as a conversation.

## D.0 vibekit components used (Daylight)

All names from 00-shared §1.7. "Ref CSS" = the mockup rules quoted in this part that the vibekit Daylight sheet must reproduce for that component (not app `<style>`).

| Component | Props used here | Where | Ref CSS (Daylight sheet) |
|---|---|---|---|
| `vibekit:Drawer` | `{ open, labelledBy: 'drawer-title', width: 'min(680px, 100%)', align: 'end', onClose }` | SP-Card drawer frame | `.dl-drawer`, `.dl-scrim` |
| `vibekit:Sheet` | `{ labelledBy: 'drawer-title', onClose }` | SP-Phone-Card | `.r` (root) |
| `vibekit:Button` | `variant: 'primary'\|'secondary'\|'quiet'\|'frame'\|'link'`, `icon`, `href`, `type` | all text buttons | vibekit `.vk-button*` (existing) + `.ds-btns .vk-button`, phone `.sbtn`, `.go`, `.lnk`, `.atm` |
| `vibekit:IconButton` | `{ icon: 'close'\|'edit'\|'sun'\|'moon', label }` | Close (Esc), Edit card, Appearance | `.dl-icon`, `.dp-round`, phone `.ib` |
| `vibekit:Button variant="frame"` with icon `open-window` | `{ href: pageHref, target: '_blank', icon: 'open-window', text: 'Open in new window' }` | drawer head | `.dl-icon` + inline style (width:auto; padding:0 14px; gap:8px; border:1px solid line; 0.875rem/600) |
| `vibekit:CopyButton` | `{ value, label, text? }` | copy card id, Copy session id, Copy (raw JSON), Copy the full digest, Copy link to this card | `.dl-copy`, `.dp-copy`, `.dp-pill--ghost` |
| `vibekit:StageStrip` | `{ stages, current, status: 'needs'\|'active'\|'archived'\|'done', label, labels: 'numbers'\|'all', caption }` | drawer, page, states cells, phone | `.dl-track*`, `.dp-track*`, `.ds-track*`, phone `.bars*`/`.trk*` |
| `vibekit:StatePill` | `{ tone: 'needs'\|'archived', text }` | "Waiting on you · 2 days", phone "Archived" | vibekit `.vk-pill--needs` (existing), phone `.pill.nd`, `.pill.ar` |
| `vibekit:Chip` | `{ face?: {name, mood}, initials?, text, title? }` | Unclaimed / Owner / Asked by | `.dl-chip`, `.dl-chip--plain`, `.dl-initials`, `.ds-chip`, phone `.chip` |
| `vibekit:AgentFace` | `{ name, mood, size: 20\|24\|32\|36\|40\|48 }` | every face | vibekit `.vk-face`, `.vk-face--picture` |
| `vibekit:PersonRow` | `{ face?, initials?, name, role }` | page "People on this card" | `.dp-person`, `.dp-initials`, `.dp-muted` |
| `vibekit:AgentQuote` | `{ agent: {name, mood}, who, text, tone: 'needs'\|'plain'\|'done', at, tokens: true, actions? }` | stop reason (drawer/page/phone), cells A, B, D | `.dl-msg`, `.dl-bubble`, `.dl-who`, `.dl-say`, `.dl-id`, `.dl-time`; `.dp-*` same; `.ds-msg`, `.ds-bubble(--sig)`, `.ds-who`, `.ds-say`, `.ds-time`; phone `.msg`, `.bwrap`, `.blab`, `.bub`, `.btime` |
| `vibekit:FactList` | `{ facts }` | priority/due/labels/in-stage/attempt | `.dl-facts`, `.dp-facts`, phone `.fct` |
| `vibekit:Meter` | `{ value, max, label }` | plan progress, cost | `.dl-meter`, `.dp-meter` |
| `vibekit:Checklist` | `{ items, label: 'Agent plan' }` | agent plan | `.dl-plan`, `.dp-plan` |
| `vibekit:DefinitionGroups` | `{ groups, columns: 3 (drawer) \| 1 (page, phone) }` | brief details | `.dl-groups`, `.dl-group`, `.dl-dl`; `.dp-group`, `.dp-dl`; phone `.kvg`, `.gh`, `.kv` |
| `vibekit:Disclosure` | `{ summary, meta, open, level: 3 }` | drawer sections, "What … was asked", View raw JSON, phone sections | `.dl-sec`, `.dl-pinned`, `.dl-raw`, `.dp-raw`, `.ds-raw`, phone `.sec`, `.pin` |
| `vibekit:RunRow` | `{ title, status, tone, meta, open, events, more }` | runs | `.dl-run`, `.dl-ev`, `.dp-run`, `.dp-tl`, phone `.run`, `.ev`, `.rt`, `.rm`, `.evt`, `.tm` |
| `vibekit:LinkList` | `{ items: {href, text, meta?}[] }` | links, references | `.dl-ul`, `.dp-links`, phone `.refs`, `.rf` |
| `vibekit:Field` | `kind: 'select'\|'textarea'\|'text'\|'url'`, `label`, `hint`, `error`, `counter`, `options`, `placeholder`, `id` | resume, comment, gate note, answer, sub-task, reference | vibekit `.vk-field*` (existing) + `.dl textarea.vk-field__input`, `.dp textarea…`, `.ds textarea…`, `.ds-count`, phone `.fld`, `.sel`, `.ta`, `.inp`, `.lab` |
| `vibekit:Alert` | `{ tone: 'needs', role: 'alert' }` | cell E, `error` section | `.ds-alert` |
| `vibekit:Banner` | `{ icon: 'archive', title, text, actions }` | cell C, phone archived | `.ds-banner`, phone `.arch` |
| `vibekit:DoneBlock` | `{ title: 'Done', text }` | cell D | `.ds-done`, `.ds-check` |
| `vibekit:SubjectFrame` | `{ head, children, seal }` | cell A approval subject | `.ds-post`, `.ds-posthead`, `.ds-postbody`, `.ds-seal`, `.ds-mono`, `.ds-dl` |
| `vibekit:Skeleton` + `vibekit:LoadingNote` | `shape: 'bar'\|'line'\|'block'` | cell F | `.ds-sk`, `.ds-sk--blk`, `@keyframes ds-breathe`, `.ds-load .ds-sk` |
| `vibekit:EmptyState` | `{ text }` | "No comments yet…", "No project.", "No approved delivery on this card." | `.dl-small`, `.dp-small`, phone `.muted` |

App-local (screen composition, stays in the app components' `<style>`): `.dl` root grid, `.dl-head`, `.dl-row`, `.dl-eyebrow`, `.dl-title`, `.dl-body`, `.dl-reply` (form composition), `.dl-grid2`, `.dl-actions`, `.dl-secbody`, `.dl-p`, `.dl-small`, `.dl-foot`; the page's `.dp`, `.dp-sky`, `.dp-bar`, `.dp-mark`, `.dp-pill`, `.dp-idchip`, `.dp-acct`, `.dp-head`, `.dp-from`, `.dp-title`, `.dp-people`, `.dp-main`, `.dp-col`, `.dp-h`, `.dp-card`, `.dp-reply`, `.dp-grid2`, `.dp-actions`, `.dp-crit`, `.dp-inscope`, `.dp-row`, `.dp-big`, `.dp-foot`; the gallery's `.ds`, `.ds-h1`, `.ds-grid`, `.ds-cell`, `.ds-label`, `.ds-card`, `.ds-eyebrow`, `.ds-title`, `.ds-flag`, `.ds-hand`, `.ds-row`, `.ds-quiet`, `.ds-btns`; the phone's `.sh`, `.sh1`, `.eb`, `.tl`, `.st`, `.body`, `.dock`, `.secs`, `.foot`, `.cact`, `.addrow`, `.rawrow`, `.nl`, `.att`, `.small`, `.id`, `.wrap`, `.mono`, `.muted`.

## D.1 Registry values

```ts
CARD_LAYOUTS.daylight = { drawer: CardDaylight, phone: CardPhoneDaylight, width: 'min(680px, 100%)', align: 'end' };
CARD_PAGE_LAYOUTS.daylight = CardPageDaylight;
CARD_STATES_LAYOUTS.daylight = CardStatesDaylight;
```

`width` is the mockup's `.dl { grid-template-columns: minmax(0, 1fr) min(680px, 100%) }` second track.

---

## D.2 SP-Card-Daylight — the drawer

- **Artboard**: SP-Card-Daylight, 1440×2342, vibe daylight, theme light (dark via tweak).
- **Route/state**: `/b/brd_devx/c/card_05823a57e8224605`, desktop (≥640px), Plan board view, drawer open on the stopped card (00-shared §5). The board behind is dimmed by the scrim.
- **Viewport for the pixel test**: 1440×2342 so the drawer is full height and its body does not scroll internally (`.dl-drawer` content = 2342px).

### D.2.1 Component tree

```
routes/b/[boardId]/+layout.svelte (unchanged; renders BoardHeader + PlanView + CardDrawer)
└─ lib/components/CardDrawer.svelte  (rewritten shell, 00-shared §1.6)
   └─ vibekit:Drawer { open, labelledBy:'drawer-title', width: CARD_LAYOUTS.daylight.width, align:'end', onClose }
      └─ card/layouts/CardDaylight.svelte  (rewritten)  props: CardLayoutProps (00-shared §1.3)
         ├─ header.dl-head
         │   ├─ row 1: span.dl-eyebrow + [vibekit:Button frame "Open in new window"] + [vibekit:IconButton close "Close (Esc)"]
         │   ├─ row 2: h2#drawer-title.dl-title + vibekit:IconButton edit "Edit card"         [editButton]
         │   │         (editing → h2 gets `sr-only`, the edit form replaces the head rows 2–5)  [editForm]
         │   ├─ vibekit:StageStrip + span.dl-small caption
         │   ├─ row 4: vibekit:StatePill + 3× vibekit:Chip                                   [status]
         │   └─ vibekit:FactList + small id + vibekit:CopyButton                             [facts]
         └─ div.dl-body
             ├─ [error] vibekit:Alert (only when model.localError)
             ├─ vibekit:Disclosure.dl-pinned "What error-eric was asked"                      [description, criteria]
             ├─ lead: one of
             │    ├─ stopped/failed/budget → vibekit:AgentQuote (needs) + form.dl-reply       [resume]
             │    ├─ review   → gate/GateDaylight.svelte (States cell A/E markup)             (gate)
             │    ├─ question → question/QuestionDaylight.svelte (cell B markup)              (question)
             │    ├─ archived → card/state/CardStateDaylight.svelte kind="archived" (cell C)
             │    ├─ done     → CardStateDaylight kind="done" (cell D)
             │    ├─ !model.detailLoaded → CardStateDaylight kind="loading" (cell F)
             │    └─ working/idle → vibekit:AgentQuote tone="plain" with lead.sentence (or fallback copy)
             ├─ div (sections)
             │    ├─ vibekit:Disclosure.dl-sec "The brief" (open)                             [details, plan, project]
             │    ├─ vibekit:Disclosure.dl-sec "What happened"                                [activity, decisions, handoff, attempts]
             │    ├─ vibekit:Disclosure.dl-sec "Links and references"                         [links, subtasks, references, related]
             │    ├─ vibekit:Disclosure.dl-sec "Talk"                                         [comments]
             │    └─ vibekit:Disclosure.dl-sec "Cost and delivery"                            [cost, delivery]
             └─ div.dl-foot  Archive card / Delete card                                       [cardActions]
```

Deleted for Daylight: `card/LeadBubble.svelte` (replaced by `vibekit:AgentQuote`), the pinned-brief `📌` emoji button, the `GateDaylight` / `QuestionDaylight` current markup (rewritten from cells A/B/E). `CardResume.svelte` is no longer mounted (its logic is `model.resume`).

### D.2.2 Section placement (23 keys)

| Key | Where in SP-Card-Daylight | Visible text / summary |
|---|---|---|
| `error` | top of `.dl-body`, above the pinned brief; `hidden` element when no error | `model.localError` verbatim |
| `status` | head row 4 | "Waiting on you · 2 days" pill; chips "Unclaimed · error-eric ran attempt 2", "Owner · Rakesh Gangwar", "Asked by super-chotu" |
| `facts` | head row 5 | "Priority P3 · Due none · Labels none · In Reproduce for 2 days · Attempt 2 · card 4605 [copy]" |
| `editButton` | head row 2, right of the title | icon button "Edit card" |
| `editForm` | replaces head rows 2–5 while `model.edit.editing` (not drawn in the artboard) | today's fields (00-shared §1.4) |
| `description` | inside `.dl-pinned` disclosure "What error-eric was asked" | first paragraph |
| `criteria` | same disclosure, under bold "Acceptance criteria" | bullet list of 3 |
| `resume` | `form.dl-reply` under the agent's message | "Send it back to work" |
| `details` | "The brief" disclosure → `.dl-groups` (3 columns) + "View raw JSON" + Copy | summary "Details · 10 fields, plan, project" |
| `plan` | "The brief" → left half of the 2-col grid | "Agent plan" + "1 / 4 steps · 25%" |
| `project` | "The brief" → right half of the 2-col grid | "Project" / "No project." / "Assign to a project" |
| `activity` | "What happened" → provenance line + "Show tool calls" + run rows | summary "2 runs · no decisions yet" |
| `decisions` | "What happened" summary part "no decisions yet" (no separate block when 0); when ≥1, a `.dl-small` line "Decisions: …" after the runs | — |
| `handoff` | "What happened" → final `.dl-small` line, first clause "Handoff from Reported: “…”" | — |
| `attempts` | same `.dl-small` line, second clause "Attempts: 1 · error-eric · $0.00 · stopped; 2 · error-eric · $0.00 · stopped" | — |
| `links` | "Links and references" → "Relates to" list + "Add link" | summary "3 links · no sub-tasks · 2 references · 1 related" |
| `subtasks` | same → "Sub-tasks 0 open of 0" | — |
| `references` | same → "References" list | — |
| `related` | same → "Related prior work" | — |
| `comments` | "Talk" disclosure | summary "No comments yet" |
| `cost` | "Cost and delivery" → "$0.00 · no estimate yet" + meter | summary "$0.00 · no estimate · no delivery" |
| `delivery` | same → "No approved delivery on this card." | — |
| `cardActions` | `.dl-foot` | "Archive card", "Delete card" |

Rendering rule for parity: `handoff`, `attempts`, `decisions` render as `<span data-section="…">` clauses inside the one `.dl-small` line, joined by " · " (handoff · attempts), so the line reads exactly as the mockup.

### D.2.3 Layout & CSS

**App layout CSS** (`CardDaylight.svelte` `<style>`, class names kept; `.dl` becomes the layout root inside the vibekit Drawer panel, so the grid/board-column rules become the Drawer's job):

The mockup's root `.dl { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) min(680px, 100%); min-height: 900px; }` is the artboard composition "board column + drawer column". In the app this is realised by the board layout reserving the drawer width (Gap D-1) and `vibekit:Drawer` occupying the right `min(680px, 100%)`. Kept verbatim for the drawer itself:

```css
.dl * { box-sizing: border-box; }
.dl-head { padding: var(--vk-space-5) var(--vk-space-6) var(--vk-space-4); border-bottom: 1px solid var(--vk-color-line); display: flex; flex-direction: column; gap: var(--vk-space-3); }
.dl-row { display: flex; align-items: center; gap: var(--vk-space-3); flex-wrap: wrap; }
.dl-eyebrow { font: 700 var(--vk-text-sm)/1.2 var(--vk-font-body); color: var(--vk-color-muted); letter-spacing: 0.02em; }
.dl-title { margin: 0; font: 700 1.6rem/1.2 var(--vk-font-display); letter-spacing: -0.01em; text-wrap: pretty; flex: 1 1 0; min-width: 0; }
.dl-body { padding: var(--vk-space-5) var(--vk-space-6) var(--vk-space-6); display: flex; flex-direction: column; gap: var(--vk-space-5); }
.dl-reply { margin-left: 52px; border: 2px solid var(--vk-color-line); border-radius: var(--vk-radius-lg); padding: var(--vk-space-4) var(--vk-space-5) var(--vk-space-5); display: flex; flex-direction: column; gap: var(--vk-space-4); }
.dl-reply h3 { margin: 0; font: 700 var(--vk-text-lg)/1.2 var(--vk-font-display); }
.dl-sub { margin: 0; font-size: var(--vk-text-sm); color: var(--vk-color-muted); }
.dl-grid2 { display: grid; grid-template-columns: minmax(0, 270px) minmax(0, 1fr); gap: var(--vk-space-4); align-items: start; }
.dl select.vk-field__input { padding-right: var(--vk-space-6); }
.dl textarea.vk-field__input { min-height: 96px; padding: var(--vk-space-3) var(--vk-space-4); resize: vertical; font-size: 16px; line-height: 1.45; }
.dl-actions { display: flex; align-items: center; gap: var(--vk-space-4); flex-wrap: wrap; }
.dl-secbody { padding: 0 0 var(--vk-space-5); display: flex; flex-direction: column; gap: var(--vk-space-4); }
.dl-p { margin: 0; line-height: 1.55; text-wrap: pretty; }
.dl-ul { margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 6px; line-height: 1.45; }
.dl-small { font-size: var(--vk-text-sm); color: var(--vk-color-muted); }
.dl-foot { display: flex; gap: var(--vk-space-3); flex-wrap: wrap; border-top: 1px solid var(--vk-color-line); padding-top: var(--vk-space-4); }
.dl-chip a, .dl-link { color: var(--vk-color-text); text-underline-offset: 3px; }
```

(The two `.dl select/textarea` rules are scoped overrides of `vibekit:Field` and must be written as `.dl :global(select.vk-field__input)` etc. in Svelte; or, preferred, moved into the Daylight Field sheet as the `textarea` default — the page uses 120px and the gallery 84px, so they stay app-local overrides.)

Inline styles in the markup that matter (port as-is into the component markup or as modifier classes):
- head row 1: `justify-content: space-between`; the button group `display: inline-flex; align-items: center; gap: 4px`; Close button `margin: -10px -10px -10px 0`.
- head row 2: `align-items: flex-start; flex-wrap: nowrap`; Edit button `margin-top: -6px`.
- stage block wrapper: `display: flex; flex-direction: column; gap: 6px`.
- head row 4: `gap: var(--vk-space-2)`.
- pinned disclosure body: `padding: 0 var(--vk-space-4) var(--vk-space-4); display: flex; flex-direction: column; gap: var(--vk-space-3)`.
- reply heading wrapper: `display: flex; flex-direction: column; gap: 2px`.
- "Copy session id" quiet button: `min-height: 44px; font-size: var(--vk-text-sm); margin: -10px 0`.
- "The brief": raw-JSON row `gap: var(--vk-space-5)`; quiet Copy `font-size: var(--vk-text-sm)`; plan/project grid `display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--vk-space-5)`; each half `display: flex; flex-direction: column; gap: var(--vk-space-2)`; plan header row `justify-content: space-between`; "Assign to a project" `align-self: flex-start`.
- "What happened": first row `justify-content: space-between`; "Show tool calls" `font-size: var(--vk-text-sm)`.
- "Links and references": "Add link" `align-self: flex-start`.
- "Talk": empty sentence `margin: 0`; "Comment" `align-self: flex-start`.
- "Cost and delivery": figure `font: 700 2rem/1 var(--vk-font-display)` (→ `vibekit:Figure` hero size "lg", Gap D-9); delivery sentence `margin: 0`.

**Reference CSS for vibekit sheets (Daylight)** — verbatim:

```css
/* vibekit:Drawer (Daylight) */
.dl-drawer { position: relative; background: var(--vk-color-surface); box-shadow: 0 0 0 1px var(--vk-color-line), -24px 0 64px color-mix(in oklch, var(--vk-color-text) 22%, transparent); display: flex; flex-direction: column; min-width: 0; }
.dl-scrim { position: absolute; inset: 0; background: color-mix(in oklch, var(--vk-color-text) 42%, transparent); }
/* vibekit:IconButton / frame Button (Daylight) */
.dl-icon { display: inline-grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: var(--vk-radius-pill); background: transparent; color: var(--vk-color-text); cursor: pointer; }
.dl-icon:hover { background: var(--vk-color-raised); }
/* vibekit:StageStrip (Daylight, labels:'numbers', status:'needs') */
.dl-track { list-style: none; margin: 0; padding: 0; display: flex; gap: var(--vk-space-1); }
.dl-track li { flex: 1 1 0; display: flex; flex-direction: column; gap: 6px; font: 600 var(--vk-text-sm)/1.2 var(--vk-font-body); color: var(--vk-color-muted); min-width: 0; }
.dl-track li.cur { flex: 2.6 1 0; color: var(--vk-color-signal-text); font-weight: 800; }
.dl-track .bar { height: 8px; border-radius: var(--vk-radius-pill); background: var(--vk-color-line); }
.dl-track li.done .bar { background: var(--vk-color-success); }
.dl-track li.cur .bar { background: var(--vk-color-signal); outline: 2px solid var(--vk-color-signal-text); outline-offset: 1px; }
.dl-track .lab { display: flex; align-items: center; gap: 4px; }
/* vibekit:Chip (Daylight) */
.dl-chip { display: inline-flex; align-items: center; gap: var(--vk-space-2); min-height: 32px; padding: 2px var(--vk-space-3) 2px 4px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); font-size: var(--vk-text-sm); }
.dl-chip--plain { padding-left: var(--vk-space-3); }
.dl-initials { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--vk-color-primary); color: var(--vk-color-primary-fg); font: 700 11px/1 var(--vk-font-body); }
/* vibekit:FactList (Daylight) */
.dl-facts { display: flex; flex-wrap: wrap; gap: var(--vk-space-2) var(--vk-space-4); font-size: var(--vk-text-sm); color: var(--vk-color-muted); }
.dl-facts b { color: var(--vk-color-text); font-weight: 600; }
/* small copyable id + vibekit:CopyButton (Daylight) */
.dl-meta { display: inline-flex; align-items: center; gap: 4px; font: 400 12px/1 var(--vk-font-mono); color: var(--vk-color-faint); }
.dl-copy { display: inline-grid; place-items: center; min-width: 44px; min-height: 44px; margin: -12px 0; border: 0; background: transparent; color: var(--vk-color-muted); cursor: pointer; border-radius: var(--vk-radius-sm); }
/* vibekit:Disclosure (Daylight) — "pinned" variant and "section" variant */
.dl-pinned { background: var(--vk-color-raised); border-radius: var(--vk-radius-md); }
.dl-pinned > summary { list-style: none; display: flex; align-items: center; gap: var(--vk-space-3); min-height: 52px; padding: 0 var(--vk-space-4); cursor: pointer; font-weight: 700; }
.dl-pinned > summary::-webkit-details-marker { display: none; }
.dl-pinned > summary .more { margin-left: auto; font-weight: 600; font-size: var(--vk-text-sm); color: var(--vk-color-muted); }
.dl-sec { border-top: 1px solid var(--vk-color-line); }
.dl-sec > summary { list-style: none; display: flex; align-items: center; gap: var(--vk-space-3); min-height: 56px; cursor: pointer; }
.dl-sec > summary::-webkit-details-marker { display: none; }
.dl-sec > summary h3 { margin: 0; font: 700 var(--vk-text-lg)/1.2 var(--vk-font-display); }
.dl-sec > summary .sum { color: var(--vk-color-muted); font-size: var(--vk-text-sm); }
.dl-sec > summary .tw { margin-left: auto; color: var(--vk-color-muted); transition: transform var(--vk-motion-fast) var(--vk-motion-easing); }
.dl-sec[open] > summary .tw { transform: rotate(90deg); }
.dl-raw { font-size: var(--vk-text-sm); }
.dl-raw > summary { min-height: 44px; display: inline-flex; align-items: center; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
/* vibekit:AgentQuote (Daylight, tone 'needs', 40px face) */
.dl-msg { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: var(--vk-space-3); align-items: start; }
.dl-bubble { background: var(--vk-color-signal-wash); border-radius: 6px var(--vk-radius-lg) var(--vk-radius-lg) var(--vk-radius-lg); padding: var(--vk-space-4) var(--vk-space-5); display: flex; flex-direction: column; gap: var(--vk-space-2); }
.dl-who { font: 700 var(--vk-text-sm)/1.2 var(--vk-font-body); color: var(--vk-color-signal-text); }
.dl-say { margin: 0; font-size: 1.125rem; line-height: 1.55; overflow-wrap: anywhere; text-wrap: pretty; }
.dl-id { font: 400 0.82em/1.4 var(--vk-font-mono); background: var(--vk-color-surface); padding: 0 4px; border-radius: 6px; overflow-wrap: anywhere; }
.dl-time { font-size: var(--vk-text-sm); color: var(--vk-color-muted); display: flex; gap: var(--vk-space-3); align-items: center; flex-wrap: wrap; }
/* vibekit:DefinitionGroups (Daylight, columns 3) */
.dl-groups { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--vk-space-3); }
.dl-group { background: var(--vk-color-raised); border-radius: var(--vk-radius-md); padding: var(--vk-space-4); display: flex; flex-direction: column; gap: var(--vk-space-3); min-width: 0; }
.dl-group h4 { margin: 0; font: 700 var(--vk-text-sm)/1.2 var(--vk-font-body); color: var(--vk-color-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.dl-dl { margin: 0; display: flex; flex-direction: column; gap: var(--vk-space-3); }
.dl-dl dt { font: 700 var(--vk-text-sm)/1.3 var(--vk-font-body); }
.dl-dl dd { margin: 2px 0 0; font-size: var(--vk-text-sm); line-height: 1.45; color: var(--vk-color-text); overflow-wrap: anywhere; }
/* vibekit:Checklist (Daylight) */
.dl-plan { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: var(--vk-text-sm); }
.dl-plan li { display: flex; gap: var(--vk-space-2); align-items: flex-start; }
.dl-plan li.done span { text-decoration: line-through; color: var(--vk-color-muted); }
/* vibekit:Meter (Daylight) */
.dl-meter { height: 8px; border-radius: var(--vk-radius-pill); background: var(--vk-color-line); overflow: hidden; }
.dl-meter i { display: block; height: 100%; background: var(--vk-color-success); }
/* vibekit:RunRow (Daylight) */
.dl-run { background: var(--vk-color-raised); border-radius: var(--vk-radius-md); }
.dl-run > summary { list-style: none; display: flex; align-items: center; gap: var(--vk-space-3); flex-wrap: wrap; min-height: 52px; padding: var(--vk-space-2) var(--vk-space-4); cursor: pointer; font-size: var(--vk-text-sm); }
.dl-run > summary::-webkit-details-marker { display: none; }
.dl-ev { list-style: none; margin: 0; padding: 0 var(--vk-space-4) var(--vk-space-4); display: flex; flex-direction: column; gap: var(--vk-space-3); }
.dl-ev li { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; gap: var(--vk-space-3); font-size: var(--vk-text-sm); line-height: 1.45; }
.dl-ev .t { color: var(--vk-color-muted); font: 400 11px/1.6 var(--vk-font-mono); }
.dl-ev .k { font-weight: 700; }
.dl-ev .stop { color: var(--vk-color-signal-text); }
```

Board/shell behind the scrim (`.dl-board`, `.dl-greet`, `.dl-lanes`, `.dl-lane`, `.dl-tile`, `.dl-tile--open`, `.dy-*`): owned by the **board** group (BoardDaylight) and the **shell** group (Daylight shell). This group requires only: the open card's tile carries the open ring `.dl-tile--open { box-shadow: 0 0 0 3px var(--vk-color-signal); }` while `app.openCardId === tile.id` — the board group must expose `data-open` on the tile for it; and the board area reflows to `calc(100% - min(680px, 100%))` (Gap D-1).

**Responsive**: at < 640px the phone layout replaces this component (D.5). Between 640 and 1279px the drawer keeps `min(680px, 100%)` as an overlay (no board reflow, Gap D-1). Inside the drawer at narrow widths (< 680px panel): `.dl-groups` → `grid-template-columns: minmax(0, 1fr)` and `.dl-grid2` and the plan/project grid → one column, via `@container card (max-width: 620px)` on `.dl` (`container: card / inline-size`) — the mockup has no rule for this; the values are the phone's single-column structure (Gap D-10).

### D.2.4 Content map

| Visible | Source |
|---|---|
| "Developer Experience · Reproduce" | `${model.boardName} · ${model.stageName}` |
| "Open in new window" (+ icon, `aria-label="Open in new window"`) | copy; `href={pageHref}` `target="_blank" rel="noopener"` |
| Close icon, `aria-label="Close (Esc)"` | copy; `onClose` |
| Title | `card.title` (`h2#drawer-title`) |
| Edit icon, `aria-label="Edit card"` | copy |
| Stage strip: 7 segments, segment 1 done with check icon and "1" (sr: " Reported, done"), segment 2 current "2 · Reproduce", segments 3–7 "3".."7" (sr: stage names), `title="Stage n · Name"` on non-current | `model.stages`, `model.stageIndex`; `status = lead.needsYou ? 'needs' : 'active'`; `label = "Stages: stage ${i+1} of ${n}, ${stageName}, stopped"` (word "stopped" when `lead.kind ∈ {stopped, failed, budget}`; "awaiting review" for review; "question pending" for question; omitted otherwise) |
| "Stopped in stage 2 of 7. Next: Failing test." | `${verb} in stage ${i+1} of ${n}.` + (next ? ` Next: ${next.name}.` : '') — verb "Stopped" for stopped/failed/budget, "Waiting for review" for review, "Asked a question" for question, "Working" for working, "Queued" otherwise (G-8) |
| Pill "Waiting on you · 2 days" (`vibekit:StatePill tone="needs"`) | `waitingWord(card, lead, now)` (§1.5) |
| Chip face (error-eric, resting, 24px) + "Unclaimed · error-eric ran attempt 2" | G-2: `Unclaimed · ${lastAttempt.agentName} ran attempt ${attempts.length}`; when delegated: face (delegate, `model.delegate.mood`) + `${delegate.name} · working it` |
| Chip "RG" initials + "Owner · Rakesh Gangwar" | `initials(displayPrincipal(card.ownerUserId))`, `Owner · ${name}` |
| Chip (agent icon) "Asked by super-chotu", `title="super-chotu, an agent, with dispatch authority on this board"` | `provenance.queuedByName`; title = `${name}, an agent, with dispatch authority on this board` when `provenance.byAgent && grantCoversDelegate !== false`; person: `${name}` and no icon |
| "Priority P3", "Due none", "Labels none", "In Reproduce for 2 days", "Attempt 2" | `P${priority}`/"none"; due date or "none"; label names or "none"; `In ${stageName} for ${ageWords(ageHours)}`; `Attempt ${attemptCount}` (shown when >1) |
| "card 4605" + copy icon `aria-label="Copy card id 4605"` | `card ${model.shortId}`; `vibekit:CopyButton value={card.id}` |
| Pinned disclosure summary: pin icon, "What error-eric was asked", right "Description and 3 criteria · Show" (`aria-label="What error-eric was asked"`) | `What ${agent.name \|\| 'the agent'} was asked`; meta = `[description ? 'Description' : null, criteria ? `${n} criteria` : null].join(' and ')` + ` · ${open ? 'Hide' : 'Show'}` |
| Description paragraph | `card.spec.description` verbatim |
| "Acceptance criteria" + 3 bullets | copy + `acceptanceCriteria` |
| Agent face 40px (error-eric, needs) | `vibekit:AgentFace name={agent.name} mood={agent.mood}` |
| "error-eric · needs you" | `${agent.name} · needs you` (`say('agent.needsYou')`) |
| Stop reason with 4 inline id tokens | `lead.sentence` verbatim, `tokens: true` (G-3) |
| "Fri 9 Oct, 19:41" | `whenLabel(lead.at)` |
| "Copy session id" (copy icon) | G-4 |
| "Send it back to work" (h3#reply-h) | copy |
| "Stopped after 2 attempts. Tell error-eric what to do differently." | `Stopped after ${card.attemptCount} attempt${s}. Tell ${agent.name} what to do differently.`; for `needsHuman.reason === 'repeated-failure'`: `Failed ${failureCount} times; the board stopped retrying. Tell ${agent} what to do differently.`; `not-authorised`: `Not dispatched: nobody with permission asked for it. Say who should pick it up.` |
| Select label "Resume at stage", options "1 · Reported", "2 · Reproduce (this stage)" (selected) | `model.resume.targets` reversed to stage order, current suffixed " (this stage)" |
| Textarea label "What changed, or what should the agent do differently? It reads this." | copy (drawer and page say "the agent"; phone says the agent's name — D-7) |
| Placeholder "For example: I sent a fresh DM to Melissa and Anna at 14:05; trace those two event IDs." | copy constant `RESUME_PLACEHOLDER_DAYLIGHT` (Gap D-6) |
| Hint "Needed before you send. 0 / 8000" | `Needed before you send. ${note.length} / 8000`; `maxlength=8000` |
| Primary "Send back to work" (send icon) | copy |
| "Pressing it with no note says “Add a note for error-eric first.”" | copy `Pressing it with no note says “Add a note for ${agent.name} first.”` |
| "The brief" / "Details · 10 fields, plan, project" | copy; `Details · ${rows} fields` + (plan ? ', plan' : '') + ', project' |
| Group headings "What to do", "Where it goes", "Rules" + 10 dt/dd | `specGroups(card.spec)` (§1.5); values verbatim (fixture §5 + D.6) |
| "View raw JSON" / "Copy" | `vibekit:Disclosure` + `RawJson`; `vibekit:CopyButton` |
| "Agent plan" / "1 / 4 steps · 25%" / meter 25% / 4 items (1 struck through with check icon, 3 with empty circle icon) | `normalisePlan`; `${done} / ${n} steps · ${round(100*done/n)}%` |
| "Project" / "No project." / "Assign to a project" | copy; when assigned: `${projectName}` (+ ` · ${milestoneName}`) and button "Change project" |
| "What happened" / "2 runs · no decisions yet" | `${runs} run${s} · ${decisions ? `${decisions} decision${s}` : 'no decisions yet'}` |
| "Asked by super-chotu (an agent, allowed to dispatch the one working it). Unclaimed now." | `Asked by ${name} (${byAgent ? 'an agent' : 'a person'}${grantCoversDelegate ? ', allowed to dispatch the one working it' : ''}).` + (no delegate ? ' Unclaimed now.' : ` ${delegate} is working it.`) |
| "Show tool calls" | toggles; "Hide tool calls" when on |
| Run 2 summary: chevron icon, **"Reproduce · error-eric"**, "stopped" (signal-text, `.dl-who`), "attempt 2", "14 events · 0 errors" | `${stageName(run.stageKey)} · ${agentName}`; status word from `attempt.outcome` (`blocked`→"stopped", `completed`→"done", `failed`→"failed", `sent_back`→"sent back"); tone needs only for the latest run when `lead.needsYou`; `attempt ${i}`; `${events} events · ${errors} errors` |
| Run 2 events (icon, verb + text, time) | G-5; `fmt HH:mm` |
| Run 1 summary "Reproduce · error-eric", "stopped", "attempt 1", "9 events · 0 errors" (closed) | same |
| "Handoff from Reported: “Melissa and Anna do not answer DMs in Supermessage.” · Attempts: 1 · error-eric · $0.00 · stopped; 2 · error-eric · $0.00 · stopped" | `Handoff from ${prevStage}: “${handoff.summary}”` (summary key, else the first string value — Gap D-8) + ` · Attempts: ` + attempts.map(`${i} · ${agent} · ${usd} · ${statusWord}`).join('; ') |
| "Links and references" / "3 links · no sub-tasks · 2 references · 1 related" | counts; "no sub-tasks" when 0 else `${open} of ${n} sub-tasks open` |
| "Relates to" + 3 links; 2nd/3rd suffixed "· Agent Onboarding, advisory" | `linkGroups.relates` + `linkGroups.advisory`; label from link kind (`blockedBy` "Blocked by", `blocks` "Blocks", `relates` "Relates to", `supersedes` "Supersedes"); advisory suffix `· ${boardName}, advisory` |
| "Add link" (plus icon) | `model.links.openAdd()` |
| "Sub-tasks" "0 open of 0" | `${openChildCount} open of ${children.length}` |
| "References" + "agentpod PR #642 · merged", "agentpod PR #648 · merged" | G-6 |
| "Related prior work" / "Fixed · Hermes agent stuck on an E2EE device with 0 olm sessions; a fresh device fixed it." | `model.related[i]`: `${statusWord} · ${text}` |
| "Talk" / "No comments yet" | copy; `${n} comment${s}` |
| "No comments yet. The agent that works this card reads them." | copy (empty); otherwise comment list (author face/initials, name, whenLabel, body verbatim) |
| "Add a comment" label, placeholder "⌘ or Ctrl + Enter posts it", `maxlength=8192` | copy |
| "Comment" | copy |
| "Cost and delivery" / "$0.00 · no estimate · no delivery" | `${usd(costUsd)} · ${estimate ? `est. ${usd}` : 'no estimate'} · ${deliveryGate ? deliveryMode : 'no delivery'}` |
| "$0.00" + "· no estimate yet" + meter 0% | `usd(costUsd)`; `costPct` |
| "No approved delivery on this card." | copy (empty `delivery`) |
| "Archive card" (archive icon, secondary), "Delete card" (trash icon, quiet) | copy |

### D.2.5 Interactions & states (Daylight extras)

- Pinned disclosure: closed by default when `lead.needsYou`, open otherwise; re-decided only when `card.id` or `lead.needsYou` changes (today's `briefFor` rule, kept in CardDaylight).
- "The brief" disclosure `open` by default; the other four closed; remembered per card in `sessionStorage['sp:card-open:'+card.id]` (try/catch; ignore failures).
- Focus: on open, focus goes to the panel (`vibekit:Drawer`); the first Tab lands on "Open in new window".
- Hover: `.dl-icon:hover` raised background; summary rows show pointer; links underline offset 3px.
- Disabled: "Send back to work" stays enabled; empty note → `vibekit:Field error="Add a note for error-eric first."` and focus moves to the textarea; while `model.resume.busy` the button reads "Sending…" and is disabled.
- Error: refused resume → the Field's error shows the server's sentence (`refusalOf`).
- Empty: each section's empty sentence as listed; nothing hidden.
- Lead variants inside the drawer use the States cells (D.4) markup and Daylight Drawer head above them.

---
## D.3 SP-CardPage-Daylight — the standalone card page

- **Artboard**: SP-CardPage-Daylight, 1440×3014, vibe daylight.
- **Route/state**: `/b/brd_devx/c/card_05823a57e8224605/page` (00-shared §2), shell slot `bare`; same stopped card. Sky phase noon (the page uses `appearance.phase`; the pixel test pins noon via the fixture clock 13:51).

### D.3.1 Component tree

```
routes/b/[boardId]/c/[cardId]/page/+page@.svelte  (00-shared §2.1) → CARD_PAGE_LAYOUTS.daylight
└─ card/page/CardPageDaylight.svelte   props: CardPageProps
   └─ div.dp
      ├─ div.vk-sky.dp-sky[data-phase={appearance.phase}]  (vibekit Sky)
      │   ├─ span.vk-sky__sun (inline top: 92px)
      │   └─ div.vk-sky__content
      │       ├─ nav.dp-bar "Card window": mark link, board pill, id chip + vibekit:CopyButton, spacer,
      │       │     vibekit:CopyButton "Copy link to this card" (pill ghost), vibekit:IconButton Appearance, account button
      │       └─ header.dp-head
      │           ├─ left: .dp-from ("Opened from … · Back to the board"), title row (h1 + vibekit:IconButton edit) [editButton],
      │           │        vibekit:StageStrip labels:'all' + caption
      │           ├─ aside.dp-people "People on this card": StatePill + "Attempt 2", 3× vibekit:PersonRow       [status]
      │           └─ vibekit:FactList .dp-facts (grid-column 1/-1)                                            [facts]
      ├─ main.dp-main#content (3 columns)
      │   ├─ section.dp-col "The conversation": [error], vibekit:AgentQuote (48px), form.dp-reply [resume] (or gate/question/state block),
      │   │                                        section.dp-card "Talk" [comments]
      │   ├─ section.dp-col: dp-card "What error-eric was asked" [description, criteria];
      │   │                  dp-card "The brief" [details, plan, project]; dp-card "Links and references" [links, subtasks, references, related]
      │   └─ aside.dp-col: dp-card "What happened" [activity, handoff, decisions]; dp-card "Cost and delivery" [cost, attempts, delivery]
      └─ footer.dp-foot: hr, Edit card, Archive card, Delete card, spacer, "Opened from … · Back to the board"       [cardActions]
```

`editForm`: while editing, the title row and stage block in `.dp-head` left column are replaced by the edit form (h1 kept `sr-only`). Lead variants (gate/question/archived/done/loading) replace the AgentQuote + reply in column one with the same components as the drawer (D.4).

### D.3.2 Section placement

| Key | Where | Visible text |
|---|---|---|
| `error` | column 1, first child (`hidden` when none) | `model.localError` |
| `status` | `aside.dp-people` | pill "Waiting on you · 2 days", "Attempt 2", rows error-eric / Rakesh Gangwar / super-chotu |
| `facts` | `.dp-facts` under head | "Priority P3 · Due none · Labels none · In Reproduce for 2 days · Attempt 2 · Project none" |
| `editButton` | title row round button + footer "Edit card" (both call `model.edit.start()`; only the round one carries `data-section`) | — |
| `editForm` | replaces title row + strip | — |
| `description` | col 2 card 1 "What error-eric was asked" | paragraph |
| `criteria` | same card, "Done when · 3 acceptance criteria" numbered list | — |
| `resume` | col 1 `form.dp-reply` | "Send it back to work" |
| `details` | col 2 card 2 "The brief · 10 details" groups + raw JSON + Copy | — |
| `plan` | col 2 card 2 "Agent plan 1 / 4 steps · 25%" | — |
| `project` | col 2 card 2 last row "Project · none" + "Assign to a project" | — |
| `links` | col 2 card 3 "Relates to" list + "Add link" | — |
| `subtasks` | col 2 card 3 "Sub-tasks · 0 open of 0" | — |
| `references` | col 2 card 3 "References" | — |
| `related` | col 2 card 3 "Related prior work" | — |
| `activity` | col 3 card 1 "What happened · 2 runs · no decisions yet" provenance + runs | — |
| `handoff` | col 3 card 1 "Handoff from Reported" block | — |
| `decisions` | col 3 card 1 "Decisions / None yet." | — |
| `comments` | col 1 `section.dp-card` "Talk" | — |
| `cost` | col 3 card 2 "$0.00 · no estimate yet" + meter | — |
| `attempts` | col 3 card 2 `dl` rows "Attempt 1 / Attempt 2" | — |
| `delivery` | col 3 card 2 `dl` row "Delivery / None approved on this card." | — |
| `cardActions` | footer Archive card / Delete card | — |

### D.3.3 Layout & CSS

**App layout CSS** (`CardPageDaylight.svelte` `<style>`, verbatim):

```css
.dp { min-height: 900px; }
.dp * { box-sizing: border-box; }
.dp a { color: inherit; text-underline-offset: 3px; }
.dp-sky { padding: 12px 12px 0; }
.dp-sky .vk-sky__content { padding: 0; }
.dp-bar { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; gap: var(--vk-space-3); flex-wrap: wrap; padding: 8px 10px; border-radius: var(--vk-radius-lg); background: color-mix(in oklch, var(--vk-color-surface) 82%, transparent); box-shadow: 0 6px 24px color-mix(in oklch, var(--vk-color-ground) 70%, transparent); }
.dp-mark { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: var(--vk-radius-md); background: var(--vk-product-superpipeline-bg); color: var(--vk-product-superpipeline-fg); }
.dp-pill { display: inline-flex; align-items: center; gap: var(--vk-space-2); min-height: 44px; padding: 0 var(--vk-space-4); border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); color: var(--vk-color-text); font: 600 var(--vk-text-sm)/1 var(--vk-font-body); text-decoration: none; border: 0; cursor: pointer; }
.dp-pill:hover { box-shadow: inset 0 0 0 2px var(--vk-color-line); }
.dp-pill--ghost { background: transparent; }
.dp-idchip { display: inline-flex; align-items: center; gap: 2px; padding-left: var(--vk-space-3); min-height: 44px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); font: 400 12px/1 var(--vk-font-mono); color: var(--vk-color-muted); }
.dp-acct { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--vk-mood-resting); color: var(--vk-color-text); font: 700 14px/1 var(--vk-font-body); cursor: pointer; }
.dp-head { max-width: 1400px; margin: 0 auto; padding: var(--vk-space-6) var(--vk-space-5) var(--vk-space-6); display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 380px); gap: var(--vk-space-4) var(--vk-space-7); align-items: end; }
.dp-from { font: 600 var(--vk-text-sm)/1.3 var(--vk-font-body); display: flex; gap: var(--vk-space-2); align-items: center; flex-wrap: wrap; }
.dp-from a { min-height: 44px; display: inline-flex; align-items: center; }
.dp-title { margin: 0; font: 700 clamp(2rem, 1.4rem + 1.4vw, 2.6rem)/1.12 var(--vk-font-display); letter-spacing: -0.015em; text-wrap: balance; }
.dp-people { background: var(--vk-color-surface); color: var(--vk-color-text); border-radius: var(--vk-radius-lg); padding: var(--vk-space-4); display: flex; flex-direction: column; gap: var(--vk-space-3); box-shadow: 0 10px 30px color-mix(in oklch, var(--vk-color-ground) 60%, transparent); }
.dp-muted { color: var(--vk-color-muted); }
.dp-facts { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: var(--vk-space-2) var(--vk-space-5); font-size: var(--vk-text-sm); }
.dp-facts b { font-weight: 700; }
.dp-main { max-width: 1400px; margin: 0 auto; padding: var(--vk-space-6) var(--vk-space-5) var(--vk-space-7); display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 0.9fr); gap: var(--vk-space-6); align-items: start; }
.dp-col { display: flex; flex-direction: column; gap: var(--vk-space-5); min-width: 0; }
.dp-h { margin: 0; font: 700 var(--vk-text-lg)/1.2 var(--vk-font-display); display: flex; align-items: baseline; gap: var(--vk-space-3); flex-wrap: wrap; }
.dp-h small { font: 600 var(--vk-text-sm)/1.2 var(--vk-font-body); color: var(--vk-color-muted); }
.dp-card { background: var(--vk-color-surface); border-radius: var(--vk-radius-lg); padding: var(--vk-space-5); display: flex; flex-direction: column; gap: var(--vk-space-4); box-shadow: 0 0 0 1px var(--vk-color-line); min-width: 0; }
.dp-reply { margin-left: 60px; border: 2px solid var(--vk-color-line); border-radius: var(--vk-radius-lg); padding: var(--vk-space-5); display: flex; flex-direction: column; gap: var(--vk-space-4); background: var(--vk-color-surface); }
.dp-reply h3 { margin: 0; font: 700 var(--vk-text-lg)/1.2 var(--vk-font-display); }
.dp-sub { margin: 0; font-size: var(--vk-text-sm); color: var(--vk-color-muted); }
.dp-grid2 { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--vk-space-4); align-items: start; }
.dp select.vk-field__input { padding-right: var(--vk-space-6); }
.dp textarea.vk-field__input { min-height: 120px; padding: var(--vk-space-3) var(--vk-space-4); resize: vertical; font-size: 16px; line-height: 1.45; }
.dp-actions { display: flex; align-items: center; gap: var(--vk-space-4); flex-wrap: wrap; }
.dp-p { margin: 0; line-height: 1.55; text-wrap: pretty; }
.dp-ul { margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 6px; line-height: 1.45; }
.dp-crit { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--vk-space-2); }
.dp-crit li { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: var(--vk-space-2); align-items: start; line-height: 1.45; }
.dp-crit .n { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--vk-color-raised); font: 700 12px/1 var(--vk-font-body); }
.dp-inscope { display: inline-flex; align-items: center; gap: 6px; margin-right: var(--vk-space-2); }
.dp-row { display: flex; align-items: center; gap: var(--vk-space-3); flex-wrap: wrap; }
.dp-small { font-size: var(--vk-text-sm); color: var(--vk-color-muted); }
.dp-big { font: 700 2.2rem/1 var(--vk-font-display); }
.dp-foot { max-width: 1400px; margin: 0 auto; padding: 0 var(--vk-space-5) var(--vk-space-7); display: flex; gap: var(--vk-space-3); flex-wrap: wrap; align-items: center; }
.dp-foot hr { flex: 1 0 100%; border: 0; border-top: 1px solid var(--vk-color-line); margin: 0 0 var(--vk-space-4); }
```

(`.dp-crit` is a numbered criteria list unique to this page → stays app-local; `.dp-big` is the cost hero → `vibekit:Figure size="lg"` if the library has it, else app-local; Gap D-9.)

**Reference CSS for vibekit Daylight sheets** (verbatim):

```css
/* vibekit:CopyButton (round icon form) */
.dp-copy { display: inline-grid; place-items: center; min-width: 44px; min-height: 44px; border: 0; background: transparent; color: var(--vk-color-muted); cursor: pointer; border-radius: var(--vk-radius-pill); }
/* vibekit:IconButton (Daylight round) */
.dp-round { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--vk-color-raised); color: var(--vk-color-text); cursor: pointer; }
/* vibekit:StageStrip (Daylight, labels:'all', on sky) */
.dp-track { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.dp-track li { display: flex; flex-direction: column; gap: 6px; font: 600 var(--vk-text-sm)/1.2 var(--vk-font-body); min-width: 0; opacity: 0.78; }
.dp-track li.done, .dp-track li.cur { opacity: 1; }
.dp-track li.cur { font-weight: 800; }
.dp-track .bar { height: 10px; border-radius: var(--vk-radius-pill); background: color-mix(in oklch, var(--vk-color-surface) 70%, transparent); }
.dp-track li.done .bar { background: var(--vk-color-success); }
.dp-track li.cur .bar { background: var(--vk-color-signal); outline: 2px solid var(--vk-color-signal-text); outline-offset: 1px; }
.dp-track .lab { display: flex; gap: 4px; align-items: center; overflow-wrap: anywhere; }
/* vibekit:PersonRow (Daylight) */
.dp-person { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: var(--vk-space-3); align-items: center; font-size: var(--vk-text-sm); line-height: 1.3; }
.dp-person b { display: block; font-size: var(--vk-text-md); }
.dp-initials { display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: var(--vk-color-primary); color: var(--vk-color-primary-fg); font: 700 12px/1 var(--vk-font-body); }
/* vibekit:AgentQuote (Daylight, size 'lg', 48px face) */
.dp-msg { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: var(--vk-space-3); align-items: start; }
.dp-bubble { background: var(--vk-color-signal-wash); border-radius: 6px var(--vk-radius-lg) var(--vk-radius-lg) var(--vk-radius-lg); padding: var(--vk-space-4) var(--vk-space-5); display: flex; flex-direction: column; gap: var(--vk-space-2); }
.dp-who { font: 700 var(--vk-text-sm)/1.2 var(--vk-font-body); color: var(--vk-color-signal-text); }
.dp-say { margin: 0; font-size: 1.1875rem; line-height: 1.55; overflow-wrap: anywhere; text-wrap: pretty; }
.dp-id { font: 400 0.8em/1.4 var(--vk-font-mono); background: var(--vk-color-surface); padding: 0 4px; border-radius: 6px; overflow-wrap: anywhere; }
.dp-time { font-size: var(--vk-text-sm); color: var(--vk-color-muted); display: flex; gap: var(--vk-space-3); align-items: center; flex-wrap: wrap; }
/* vibekit:DefinitionGroups (Daylight, columns 1, inline dl) */
.dp-group { background: var(--vk-color-raised); border-radius: var(--vk-radius-md); padding: var(--vk-space-4); display: flex; flex-direction: column; gap: var(--vk-space-3); min-width: 0; }
.dp-group h4 { margin: 0; font: 700 12px/1.2 var(--vk-font-body); color: var(--vk-color-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.dp-dl { margin: 0; display: grid; grid-template-columns: minmax(0, 120px) minmax(0, 1fr); gap: var(--vk-space-2) var(--vk-space-3); font-size: var(--vk-text-sm); line-height: 1.45; }
.dp-dl dt { font-weight: 700; }
.dp-dl dd { margin: 0; overflow-wrap: anywhere; }
/* vibekit:Checklist, vibekit:Meter (Daylight) — identical to .dl-plan/.dl-meter */
.dp-plan { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: var(--vk-text-sm); }
.dp-plan li { display: flex; gap: var(--vk-space-2); align-items: flex-start; }
.dp-plan li.done span { text-decoration: line-through; color: var(--vk-color-muted); }
.dp-meter { height: 8px; border-radius: var(--vk-radius-pill); background: var(--vk-color-line); overflow: hidden; }
.dp-meter i { display: block; height: 100%; background: var(--vk-color-success); }
/* vibekit:LinkList (Daylight, "cards" variant with meta) */
.dp-links { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--vk-space-2); }
.dp-links li { display: flex; flex-direction: column; gap: 2px; padding: var(--vk-space-3) var(--vk-space-4); background: var(--vk-color-raised); border-radius: var(--vk-radius-md); line-height: 1.4; }
.dp-links a { font-weight: 600; }
/* vibekit:RunRow (Daylight, timeline variant) */
.dp-tl { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.dp-tl > li { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: var(--vk-space-3); padding-bottom: var(--vk-space-4); position: relative; font-size: var(--vk-text-sm); line-height: 1.45; }
.dp-tl > li::before { content: ""; position: absolute; left: 11px; top: 28px; bottom: 2px; width: 2px; background: var(--vk-color-line); border-radius: 2px; }
.dp-tl > li:last-child::before { display: none; }
.dp-tl .t { font: 400 11px/1.6 var(--vk-font-mono); color: var(--vk-color-muted); }
.dp-tl .k { font-weight: 700; }
.dp-tl .stop { color: var(--vk-color-signal-text); }
.dp-run { background: var(--vk-color-raised); border-radius: var(--vk-radius-md); }
.dp-run > summary { list-style: none; display: flex; align-items: center; gap: var(--vk-space-2); flex-wrap: wrap; min-height: 52px; padding: var(--vk-space-2) var(--vk-space-4); cursor: pointer; font-size: var(--vk-text-sm); }
.dp-run > summary::-webkit-details-marker { display: none; }
/* vibekit:Disclosure raw-JSON (Daylight) */
.dp-raw > summary { min-height: 44px; display: inline-flex; align-items: center; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; font-size: var(--vk-text-sm); }
```

Inline styles that matter: `.vk-sky__sun` `top: 92px`; the bar spacer `flex: 1 1 auto`; head-left column `display: flex; flex-direction: column; gap: var(--vk-space-4); min-width: 0`; title row `align-items: flex-start; flex-wrap: nowrap`, h1 `flex: 1 1 0; min-width: 0`, edit button `flex: none; margin-top: 4px`; strip wrapper `gap: var(--vk-space-2)`; caption `font: 600 var(--vk-text-sm)/1.3 var(--vk-font-body)`; people top row `justify-content: space-between`; Copy session id `min-height: 44px; font-size: var(--vk-text-sm); margin: -10px 0`; Talk empty sentence `margin: 0`; comment textarea `min-height: 88px`; Comment `align-self: flex-start`; "Done when" h3 `font-size: var(--vk-text-md)`; raw row `gap: var(--vk-space-4)`; Copy `font-size: var(--vk-text-sm)`; plan block `display: flex; flex-direction: column; gap: var(--vk-space-2)`; project row `justify-content: space-between`; Add link `align-self: flex-start`; References `ul` `margin-top: 6px`; related `p` `margin-top: 4px`; What-happened provenance `margin: 0`; run events list `padding: var(--vk-space-2) var(--vk-space-4) 0`; "Show tool calls" wrapper `padding: 0 var(--vk-space-4) var(--vk-space-3)`; handoff/decisions headings `b` `color: var(--vk-color-text)`; footer spacer `flex: 1 1 auto`.

**Responsive** (the artboard is 1440; these keep phone-width honest — the page at < 640 renders the same component; no phone page artboard exists): `@media (max-width: 1100px) { .dp-main { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .dp-main > :last-child { grid-column: 1 / -1; } }`, `@media (max-width: 760px) { .dp-head, .dp-main { grid-template-columns: minmax(0, 1fr); } .dp-reply { margin-left: 0; } .dp-dl { grid-template-columns: minmax(0, 1fr); } }` (Gap D-11: not in the mockup; columns collapse in source order).

### D.3.4 Content map (differences from D.2.4; everything else identical wording)

| Visible | Source |
|---|---|
| Mark link `aria-label="Superpipeline home"` | `href="/"` |
| Pill link (board icon) "Developer Experience board" | `${boardName} board`, `href={boardHref}` |
| "card 4605" + copy `aria-label="Copy card id 4605"` | `model.shortId`, `vibekit:CopyButton value={card.id}` |
| Ghost pill (link icon) "Copy link to this card" | §2.3 |
| Round appearance button `aria-label="Appearance: Daylight, noon sky"` | `Appearance: Daylight, ${appearance.phase} sky`; icon sun (day phases) / moon (night) |
| Account "RG" `aria-label="Account, Rakesh Gangwar. Menu has Sign out"` | initials of `personName`; opens menu with "Sign out" |
| "Opened from Developer Experience · Back to the board" | `Opened from ${boardName}` + link (Gap D-12: "opened from" is always the card's own board) |
| h1 title | `card.title`; `<h1 class="dp-title" id="card-title">` (the mockup gives it no id; `card-title` is added so `main` can be `aria-labelledby` it) |
| Strip labels: "✓ Reported", "Reproduce · stopped", "Failing test", "Fix", "Integrate", "Signed off", "Shipped" | `labels:'all'`; current suffix ` · stopped` / ` · awaiting review` / ` · question` per lead |
| "Stopped in stage 2 of 7. Next: Failing test." | as D.2.4 |
| People aside: pill + "Attempt 2" | `waitingWord`, `Attempt ${attemptCount}` |
| Row: face error-eric (resting, 32) **error-eric** "Agent for Reproduce · ran attempt 2 · Unclaimed now" | last-attempt agent; `Agent for ${stageName(lastAttempt.stageKey)} · ran attempt ${n} · ${delegate ? 'working it now' : 'Unclaimed now'}` |
| Row: "RG" **Rakesh Gangwar** "Owner · you" | owner; `Owner · you` when `ownerUserId === app.user.userId`, else `Owner` |
| Row: face super-chotu (working, 32) **super-chotu** "Asked for this · an agent allowed to dispatch", `title="super-chotu, an agent, with dispatch authority on this board"` | provenance; person: `Asked for this` |
| Facts add "Project none" | `projectName ?? 'none'` |
| "The conversation" h2 + small "error-eric is waiting for your reply" | copy; small = `${agent} is waiting for your reply` when needsYou, `${agent} is working` / `Finished by ${agent}` otherwise (G-7) |
| Talk h2 "Talk" small "No comments yet"; "The agent that works this card reads every comment." | copy |
| "What error-eric was asked" (pin icon) | as drawer |
| "Done when" small "3 acceptance criteria"; numbered circles 1–3 | copy; `${n} acceptance criteri${n===1?'on':'a'}` |
| "The brief" small "10 details" | `${rows} details` |
| Agents in scope dd: two inline faces (20px) + "message-melissa", "audience-anna" | value array whose items resolve to agent names (`app.agents` by name) render `vibekit:AgentFace size=20 withName`; unresolved items plain text |
| Project row "Project · none" + secondary "Assign to a project" | — |
| "Links and references" small "3 links · 2 references · 1 related" | counts (sub-tasks omitted in the small line when 0) |
| Link rows with meta "This board · Reported · Waiting on you" / "Agent Onboarding · advisory" | same-board: `This board · ${stageName} · ${stateWord}`; cross-board: `${boardName} · advisory` |
| "Sub-tasks · 0 open of 0" | — |
| "What happened" small "2 runs · no decisions yet" | as drawer |
| Run 2 summary: **"Attempt 2 · Reproduce"**, "stopped", "14 events · 0 errors" (open) | `Attempt ${i} · ${stageName}` |
| Timeline rows with time on its own line "19:22", "19:30", "19:41 Fri 9 Oct" (last row adds the date) | last event: `${HH:mm} ${whenDate}` |
| "Show tool calls · 11 more events" | `Show tool calls · ${hiddenCount} more events` |
| Run 1 summary "Attempt 1 · Reproduce", "stopped", "9 events · 0 errors · 11:12" (closed; closed runs show end time) | `· ${HH:mm(endedAt)}` |
| **"Handoff from Reported"** / "“Melissa and Anna do not answer DMs in Supermessage.”" | as D.2 |
| **"Decisions"** / "None yet." | empty copy |
| "Cost and delivery"; "$0.00" (dp-big) "· no estimate yet"; meter | — |
| dl: "Attempt 1 — error-eric · $0.00 · stopped", "Attempt 2 — …", "Delivery — None approved on this card." | attempts; delivery empty copy |
| Footer: "Edit card" (pencil), "Archive card" (archive), "Delete card" (trash, quiet), "Opened from Developer Experience · Back to the board" | — |
| `<title>` | `${card.title} · ${boardName}` |

### D.3.5 Interactions & states

All of 00-shared §2.3 and §4. Page-specific: no Close; after a decision the page stays and refreshes (`surface: 'page'`). Run disclosures as drawer. Not-found: inside `.dp-main` col 1 a `.dp-card` with `.dp-p` "This card is not on Developer Experience any more." + link "Back to the board". Loading before the snapshot: the window bar renders, the head shows `vibekit:Skeleton` bars (cell F CSS) and `vibekit:LoadingNote` "Loading the card…".

---
## D.4 SP-Card-States-Daylight — the six drawer tops

- **Artboard**: SP-Card-States-Daylight, 1440×1791, vibe daylight.
- **Route/state**: `/dev/card-states` (00-shared §3), shell `bare`, appearance cookie `daylight.light…`. Cells A–F, each "the top of the card drawer" in one state.

### D.4.1 Component tree

```
routes/dev/card-states/+page@.svelte → CARD_STATES_LAYOUTS.daylight
└─ card/states/CardStatesDaylight.svelte   props: CardStatesProps
   └─ div.ds
      ├─ h1.ds-h1 "Card states · Daylight" + p.ds-quiet explainer
      └─ div.ds-grid
         ├─ cell A: span.ds-label + section.ds-card → [head] + gate/GateDaylight.svelte (gate, no error)
         ├─ cell B: … → [head] + question/QuestionDaylight.svelte
         ├─ cell C: … → card/state/CardStateDaylight.svelte kind="archived" (banner first, then head, chips, description, Restore)
         ├─ cell D: … → [head without strip] + CardStateDaylight kind="done"
         ├─ cell E: … → [head without strip] + GateDaylight (error state; note field invalid, alert under buttons)
         └─ cell F: section.ds-card.ds-load[aria-busy=true] → CardStateDaylight kind="loading"
```

`[head]` = gallery-local composition: `span.ds-eyebrow`, `h2.ds-title` (`id` a-t … f-t), `vibekit:StageStrip` (cell sizing). The gate/question/state components are the **same** files the drawer, page and phone mount for those states; the drawer wraps them with its own head (D.2), the gallery with `[head]`.

Component props:
- `GateDaylight.svelte`: `{ boardId: string; gate: Gate; error: string | null; onResponse: GateBinding['onResponse']; agent: CardAgent; lead: CardLead; vibe: Vibe }` (unchanged signature). Renders: AgentQuote (tone needs, 36px, who `${agent} · needs you`, text = gate summary verbatim, at), flag, SubjectFrame (when `gate.approvalSubject`), note Field, buttons, and `error` → `vibekit:Alert` **under** the buttons.
- `QuestionDaylight.svelte`: `{ model: QuestionAnswer; elicitation: Elicitation; agent: CardAgent; vibe: Vibe }` (unchanged).
- `CardStateDaylight.svelte`: `{ kind: 'archived' | 'done' | 'loading'; model: CardModel; vibe: Vibe }`.

### D.4.2 Section placement

Cells are lead blocks, not full cards; the 23-key parity test does not run on the gallery. In the drawer the blocks sit where the stopped lead sits in D.2 (after the pinned brief); for **archived** the banner moves to the very top of `.dl-body` (cell C shows it above the eyebrow) and `resume`/gate controls are not rendered; for **done** the `resume` section renders its empty `hidden` element.

### D.4.3 Layout & CSS

**App layout CSS (gallery only, `CardStatesDaylight.svelte`)**, verbatim:

```css
.ds { padding: var(--vk-space-6) var(--vk-space-6) var(--vk-space-7); display: flex; flex-direction: column; gap: var(--vk-space-5); }
.ds * { box-sizing: border-box; }
.ds-h1 { margin: 0; font: 700 2rem/1.1 var(--vk-font-display); }
.ds-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr)); gap: var(--vk-space-5); align-items: start; }
.ds-cell { display: flex; flex-direction: column; gap: var(--vk-space-2); min-width: 0; }
.ds-label { font: 700 var(--vk-text-sm)/1.3 var(--vk-font-body); color: var(--vk-color-muted); }
.ds-label b { color: var(--vk-color-text); }
.ds-card { background: var(--vk-color-surface); border-radius: var(--vk-radius-lg); box-shadow: 0 0 0 1px var(--vk-color-line), 0 12px 32px color-mix(in oklch, var(--vk-color-text) 10%, transparent); padding: var(--vk-space-5); display: flex; flex-direction: column; gap: var(--vk-space-4); min-width: 0; }
.ds-eyebrow { font: 700 12px/1.2 var(--vk-font-body); color: var(--vk-color-muted); letter-spacing: 0.02em; }
.ds-title { margin: 0; font: 700 1.2rem/1.25 var(--vk-font-display); text-wrap: pretty; }
```

The outer heading wrapper inline style: `display: flex; flex-direction: column; gap: 4px`.

**App CSS of the lead components** (GateDaylight / QuestionDaylight / CardStateDaylight `<style>`, verbatim, rename none):

```css
.ds-flag { display: inline-flex; align-items: center; gap: 6px; font: 700 var(--vk-text-sm)/1 var(--vk-font-body); color: var(--vk-color-signal-text); }
.ds textarea.vk-field__input { min-height: 84px; padding: var(--vk-space-3) var(--vk-space-4); font-size: 16px; line-height: 1.45; resize: vertical; }
.ds-count { font-size: 12px; color: var(--vk-color-muted); text-align: right; }
.ds-btns { display: flex; flex-wrap: wrap; gap: var(--vk-space-2); align-items: center; }
.ds-btns .vk-button { padding: 0 var(--vk-space-4); }
.ds-quiet { font-size: var(--vk-text-sm); color: var(--vk-color-muted); margin: 0; }
.ds-hand { border-left: 3px solid var(--vk-color-success); padding: var(--vk-space-1) 0 var(--vk-space-1) var(--vk-space-4); display: flex; flex-direction: column; gap: 4px; }
.ds-row { display: flex; gap: var(--vk-space-2); flex-wrap: wrap; align-items: center; }
```

(`.ds textarea` becomes `:global(.vk-field__input)` scoped to the component root; the root of each lead component carries class `ds-lead` and these rules are written against `.ds-lead`. In the drawer the textarea therefore has 84px min-height for gate/question notes and the drawer's 96px for the resume note — as the artboards show.) Inline: cell B form `display: flex; flex-direction: column; gap: var(--vk-space-3); margin-left: 48px`; cell C chip 2 `padding-left: 10px`; cell D chips `padding-left: 10px` (plain chips); cell D done text `font-size: var(--vk-text-sm)`; handed-on bold `font-size: var(--vk-text-sm)`; cell E Refresh button `min-height: 44px; margin: -12px 0; font-size: var(--vk-text-sm)`; cell A digest copy `min-height: 32px; padding: 0 4px`, digest span `margin-left: auto`; cell F skeleton bars row `gap: 3px`, bars `flex: 1|2.8|1|1|1; height: 7px`, line `width: 40%`, column `display: flex; flex-direction: column; gap: var(--vk-space-2)`.

**Reference CSS for vibekit Daylight sheets** (verbatim):

```css
/* vibekit:StageStrip (Daylight, compact; status needs → .sig, active → .cur only, done → .fin) */
.ds-track { list-style: none; margin: 0; padding: 0; display: flex; gap: 3px; }
.ds-track li { flex: 1 1 0; display: flex; flex-direction: column; gap: 4px; font: 600 12px/1.2 var(--vk-font-body); color: var(--vk-color-muted); min-width: 0; }
.ds-track li.cur { flex: 2.8 1 0; color: var(--vk-color-text); font-weight: 800; }
.ds-track li.sig { color: var(--vk-color-signal-text); }
.ds-track .bar { height: 7px; border-radius: var(--vk-radius-pill); background: var(--vk-color-line); }
.ds-track li.done .bar { background: var(--vk-color-success); }
.ds-track li.cur .bar { background: var(--vk-color-primary); }
.ds-track li.sig .bar { background: var(--vk-color-signal); }
.ds-track li.fin .bar { background: var(--vk-color-success); }
/* vibekit:AgentQuote (Daylight, compact 36px) */
.ds-msg { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: var(--vk-space-3); align-items: start; }
.ds-bubble { border-radius: 6px var(--vk-radius-md) var(--vk-radius-md) var(--vk-radius-md); padding: var(--vk-space-3) var(--vk-space-4); background: var(--vk-color-raised); display: flex; flex-direction: column; gap: 4px; }
.ds-bubble--sig { background: var(--vk-color-signal-wash); }
.ds-who { font: 700 12px/1.2 var(--vk-font-body); color: var(--vk-color-muted); }
.ds-bubble--sig .ds-who { color: var(--vk-color-signal-text); }
.ds-say { margin: 0; font-size: 1.05rem; line-height: 1.5; overflow-wrap: anywhere; }
.ds-time { font-size: 12px; color: var(--vk-color-muted); }
/* vibekit:SubjectFrame (Daylight) */
.ds-post { border: 2px solid var(--vk-color-line); border-radius: var(--vk-radius-md); overflow: hidden; }
.ds-posthead { display: flex; align-items: center; gap: var(--vk-space-2); flex-wrap: wrap; padding: var(--vk-space-3) var(--vk-space-4); background: var(--vk-color-raised); font-size: 12px; }
.ds-postbody { padding: var(--vk-space-4); display: flex; flex-direction: column; gap: var(--vk-space-3); max-height: 24rem; overflow: auto; }
.ds-mono { font: 400 11.5px/1.4 var(--vk-font-mono); color: var(--vk-color-muted); overflow-wrap: anywhere; }
.ds-dl { margin: 0; display: flex; flex-direction: column; gap: var(--vk-space-2); font-size: var(--vk-text-sm); }
.ds-dl dt { font-weight: 700; }
.ds-dl dd { margin: 2px 0 0; line-height: 1.5; }
.ds-seal { display: flex; align-items: center; gap: var(--vk-space-2); font-size: 12px; color: var(--vk-color-muted); padding: var(--vk-space-2) var(--vk-space-4); border-top: 1px solid var(--vk-color-line); flex-wrap: wrap; }
/* vibekit:Disclosure raw-JSON (Daylight compact) */
.ds-raw > summary { display: inline-flex; min-height: 44px; align-items: center; cursor: pointer; font-size: var(--vk-text-sm); text-decoration: underline; text-underline-offset: 3px; }
/* vibekit:Banner (Daylight) */
.ds-banner { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: var(--vk-space-3); padding: var(--vk-space-4); border-radius: var(--vk-radius-md); background: var(--vk-color-ground); }
.ds-banner b { display: block; }
/* vibekit:DoneBlock (Daylight) */
.ds-done { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: var(--vk-space-3); align-items: center; padding: var(--vk-space-4); border-radius: var(--vk-radius-md); background: var(--vk-color-success-wash); color: var(--vk-color-success-text); }
.ds-check { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: var(--vk-color-success); color: var(--vk-color-success-text); }
.ds-done b { font: 700 1.3rem/1.1 var(--vk-font-display); display: block; }
/* vibekit:Alert (Daylight, tone needs) */
.ds-alert { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: var(--vk-space-2); padding: var(--vk-space-3) var(--vk-space-4); border-radius: var(--vk-radius-sm); background: var(--vk-color-signal-wash); color: var(--vk-color-text); box-shadow: inset 0 0 0 2px var(--vk-color-signal); font-size: var(--vk-text-sm); line-height: 1.45; }
.ds-alert b { color: var(--vk-color-signal-text); }
/* vibekit:Skeleton (Daylight) */
.ds-sk { border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); height: 14px; }
.ds-sk--blk { border-radius: var(--vk-radius-md); height: 88px; }
@keyframes ds-breathe { 50% { opacity: 0.55; } }
.ds-load .ds-sk { animation: ds-breathe 1.6s ease-in-out infinite; }
/* vibekit:Chip (Daylight compact) */
.ds-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 28px; padding: 2px 10px 2px 3px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); font-size: 12px; }
```

`prefers-reduced-motion: reduce` → `vibekit:Skeleton` drops `ds-breathe` (library rule). Pixel test runs with `reducedMotion: 'reduce'` so the skeleton is static.

**Responsive**: `.ds-grid` auto-fit at `minmax(min(400px, 100%), 1fr)` — at 1440 with 48px side padding this yields 3 columns (A B C / D E F), as the artboard.

### D.4.4 Content map

Fixed copy (gallery-only constants in `CardStatesDaylight.svelte`):
- h1 "Card states · Daylight"; explainer "Each panel is the top of the card drawer. Coral appears only where a person is needed now."
- Captions: "**A · Approval gate**: the subject is shown before the buttons"; "**B · Agent question**: asked once, then the answer box"; "**C · Archived**: no live controls, no coral"; "**D · Done**: who finished it, when, and what it handed on"; "**E · Decision error**: shown beside the buttons, not at the top"; "**F · Loading**: the shape of the card, and words for screen readers".

Cell A (gate):
| Visible | Source |
|---|---|
| "Research & Intelligence · Recommendation" | `${boardName} · ${stageName}` |
| Title "P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix)" | `card.title` |
| Strip 6 segments: 1–4 done "1".."4" (`title` "1 · Question" …), 5 current+signal "5 · Recommendation", 6 "6"; `aria-label="Stage 5 of 6, Recommendation, awaiting review"` | StageStrip `status:'needs'`, `label = Stage ${i} of ${n}, ${name}, awaiting review` |
| Face research-ray (needs, 36), "research-ray · needs you", "All done, ready for your review.", "Today, 12:48" | gate producer agent; `gate.summary` verbatim; `whenLabel(gate.createdAt)` |
| Flag (eye icon) "Awaiting your review" | copy (review lead) |
| Subject head **"Approval subject"** "· revision 2" ... "digest 9f3a·c2e1" + copy icon `aria-label="Copy the full digest"` | copy; `· revision ${approvalSubject.revision}`; `digest ${sealOf(approvalSubject.digest)}`; CopyButton value full digest |
| dl rows Kind / Synthesis / Sources | `approvalSubject.canonical` rendered via `specGroups`-like flat rows: keys `kind`, `synthesis`, `sources` → humanized labels; values verbatim |
| "View raw JSON" | Disclosure + RawJson(canonical) |
| Seal (lock icon) "Approving exactly this version · sealed 9f3a·c2e1" | `Approving exactly this version · sealed ${sealOf(digest)}` |
| Label "Add a note (optional)", placeholder "Recorded with your decision. Request changes needs one: it threads into the agent’s next attempt.", counter "0 / 8192" | copy; `GATE_NOTE_MAX` = 8192 |
| "Approve" (check icon, primary), "Request changes" (secondary), "Reject" (quiet) | `GateDecisionModel.options` titles; roles map to variants approve→primary, changes→secondary, reject→quiet |

Cell B (question):
| Visible | Source |
|---|---|
| "Developer Experience · Fix" / "Superpipeline: manual-delivery completion and approval-subject hardening" | board/stage/title |
| Strip 7, 1–3 done, 4 current+signal "4 · Fix", `aria-label="Stage 4 of 7, Fix, question pending"` | — |
| Face coder-kai (needs), "coder-kai · has a question", question text verbatim, "Today, 11:05" | `elicitation.agentId`, `elicitation.question`, `whenLabel(elicitation.createdAt)`; who = `${agent} · has a question` |
| Label "Your answer", placeholder "It goes straight back to coder-kai.", hint "With no answer: “Type an answer first.”" | copy with agent name |
| "Send answer" (send icon, primary, submit) | copy |

Cell C (archived):
| Visible | Source |
|---|---|
| Banner (archive icon) **"Archived 9 Oct"** "Its pending review was cancelled when the card was archived." | `Archived ${dayMonth(card.archivedAt)}`; second line: when the card had a gate cancelled by archive → that sentence; else "It is off the board. Restore puts it back." (Gap D-13) |
| "Marketing & Community · Messaging approval" / "Coordinator dispatch canary — Melissa" | — |
| Strip 8, 1–2 done, 3 current (primary, not signal) "3 · Messaging approval", `aria-label="Stopped at stage 3 of 8, Messaging approval, archived"` | `status:'archived'` |
| Chip face message-melissa + "message-melissa · last worked it"; chip "Owner · Rakesh Gangwar" | last attempt agent: `${name} · last worked it` |
| "Verify Super Chotu can dispatch Message Melissa. Produce a DRAFT three-sentence messaging brief for workspace operators about registering an agent." | `card.spec.description` verbatim (`.ds-quiet`) |
| "Restore" (restore icon, primary) + "Puts it back on the board at Messaging approval." | copy; `Puts it back on the board at ${stageName}.` |

Cell D (done):
| Visible | Source |
|---|---|
| "Agent Onboarding · Resident" / "Onboard Message Melissa — marketing and messaging" | — |
| DoneBlock (check) **"Done"** "Reached Resident on Fri 9 Oct, 19:26 · 5 attempts" | `Reached ${lastStage.name} on ${whenLabel(card.stateSince)} · ${attemptCount} attempts` |
| Face onboarding-olivia (done), "onboarding-olivia · finished it", message, "Fri 9 Oct, 19:26" | last attempt agent; message = latest `response` activity body of the last run (`lead.sentence` with kind done) verbatim |
| Handed on: **"Handed on"** + text | last attempt `handoff.summary` verbatim (Gap D-8) |
| Chips "Owner · Rakesh Gangwar", face super-chotu "Asked by super-chotu", "P2" | owner, provenance, `P${priority}` |

Cell E (decision error):
| Visible | Source |
|---|---|
| "Research & Intelligence · Recommendation" / "P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’" | — (no strip, no message: the cell crops to the controls) |
| Field (invalid) label "Say what needs to change", error "Request changes needs a note: it threads into the agent’s next attempt." | `GateDecisionModel.needNote` → label switches from "Add a note (optional)" to "Say what needs to change"; error copy constant |
| Buttons Approve / Request changes / Reject | as A |
| Alert (alert icon) **"Not recorded."** "This gate was already decided from Matrix by Rakesh Gangwar at 13:02." + quiet "Refresh to see it" | G-1; button → `model.refresh()` |

Cell F (loading):
| Visible | Source |
|---|---|
| "Developer Experience" / title | board name only (stage not yet known — Gap D-14) / `card.title` from snapshot |
| 5 skeleton bars (flex 1, 2.8, 1, 1, 1) | `vibekit:Skeleton shape:'bar'` × min(stages.length, 5) — the artboard shows 5 for a 7-stage board (Gap D-14) |
| Face error-eric (thinking, 36) + skeleton line 40% + block 88px | `agent` from snapshot delegate/last attempt; mood thinking while loading |
| "Loading what error-eric said and the card’s history…" (`role="status"`) | `Loading what ${agent} said and the card’s history…` |

In the drawer, F is shown while `!model.detailLoaded`, replacing the lead block only (head renders from the snapshot).

### D.4.5 Interactions & states

- A/E: Approve → `decide('approve')`; Request changes with empty note → `needNote` (cell E field state), focus to textarea; Reject → `decide('reject')`. Busy: all three disabled, pressed one reads "Recording…". Server refusal → `vibekit:Alert` under the buttons with G-1 copy and "Refresh to see it".
- B: empty answer → hint becomes the Field error "Type an answer first."; submit → `question.submit()`.
- C: Restore → `model.restore()`; busy "Restoring…"; no other controls (no gate, no resume, no coral).
- D: no controls.
- F: `aria-busy="true"` on the section; no controls.

---
## D.5 SP-Phone-Card-Daylight — the phone card sheet

- **Artboard**: SP-Phone-Card-Daylight, 390×3068 (live variant; `$preview` says 1980 but the manifest's measured height is 3068 — all disclosures closed except "Session activity" and its Run 2). Archived variant: same file with `{"archived": true}`; second baseline `SP-Phone-Card-Daylight--archived` rendered by the reference exporter with that prop (Gap D-15).
- **Route/state**: `/b/brd_devx/c/card_05823a57e8224605` at viewport < 640px → `CARD_LAYOUTS.daylight.phone` inside `vibekit:Sheet`. The sheet covers the shell (no bottom nav visible; the mockup's `.bh/.sw/.nc/.tb/.vt/.fb/.nav` rules are the phone shell's and unused in this artboard's markup — shell group).
- **Data**: the phone artboard shows a **different, fuller snapshot of card 4605** than the desktop artboards (D.6.2). It is seeded separately.

### D.5.1 Component tree

```
CardDrawer.svelte (phone.current === true) → vibekit:Sheet { labelledBy:'drawer-title', onClose }
└─ card/layouts/CardPhoneDaylight.svelte   props: CardLayoutProps
   └─ div.r
      ├─ header.sh (sticky top)
      │   ├─ div.sh1: span.eb + [vibekit:Button frame "Open as a page" href=pageHref] + vibekit:IconButton "Close (Esc)"
      │   ├─ div.tl: h2#drawer-title + vibekit:IconButton "Edit card"                          [editButton] (edit → [editForm] replaces .tl..fct)
      │   ├─ div.trk: vibekit:StageStrip (bars) + caption p
      │   ├─ div.st: StatePill + "Unclaimed ·" + "Assign to me" + owner + Chip                   [status]
      │   └─ p.fct  vibekit:FactList                                                             [facts]
      ├─ div.body
      │   ├─ [error] Alert (hidden when none)
      │   ├─ (archived) section.arch  vibekit:Banner + Restore
      │   ├─ details.pin "What error-eric was asked" → description + "Things to prove · 5"       [description, criteria]
      │   ├─ div.msg  vibekit:AgentQuote
      │   ├─ (live) section.dock (sticky bottom) resume form                                     [resume]
      │   └─ div.secs: 13× vibekit:Disclosure.sec
      │        Plan [plan] · Details [details] · Project [project] · Links [links] · Sub-tasks [subtasks] ·
      │        Session activity [activity] · Decisions [decisions] · Comments [comments] · Handoff [handoff] ·
      │        Cost [cost] · Attempts [attempts] · Related prior work [related] · References [references]
      └─ footer.foot "Card actions"                                                               [cardActions]
```

`delivery` has no disclosure in the phone artboard: render it as a `.sec` "Delivery" disclosure after "Cost" **only when** `counts.deliveryActive`; otherwise a `hidden` `[data-section=delivery]` element (parity; nothing is visible today without an approved delivery).

### D.5.2 Section placement

| Key | Where | Summary text |
|---|---|---|
| `error` | top of `.body` | — |
| `status` | `.st` | "Waiting on you" / "Archived"; "Unclaimed · Assign to me"; "owner · Rakesh Gangwar"; "asked by super-chotu" |
| `facts` | `.fct` | "Priority P3 · Due none · Labels none · In Reproduce for 2 days · Attempt 2" |
| `editButton` / `editForm` | `.tl` | — |
| `description`, `criteria` | `.pin` | "What error-eric was asked · Show"; "Things to prove · 5" |
| `resume` | `.dock` (live only; archived → hidden) | "Stopped, waiting on you · 2 tries so far" |
| `plan` | `.sec` "Plan" | "none yet" |
| `details` | `.sec` "Details" | "10 fields" |
| `project` | `.sec` "Project" | "Melissa and Anna onboarding" |
| `links` | `.sec` "Links" | "0" |
| `subtasks` | `.sec` "Sub-tasks" | "0/0" |
| `activity` | `.sec` "Session activity" (open) | "2 runs" |
| `decisions` | `.sec` "Decisions" | "0" |
| `comments` | `.sec` "Comments" | "0" |
| `handoff` | `.sec` "Handoff" | "from Reported" |
| `cost` | `.sec` "Cost" | "$0.00" |
| `delivery` | conditional `.sec` "Delivery" (see above) | — |
| `attempts` | `.sec` "Attempts" | "2" |
| `related` | `.sec` "Related prior work" | "none" |
| `references` | `.sec` "References" | "5" |
| `cardActions` | `footer.foot` | "Archive card", "Delete card…" / archived: "Archived — restore", "Delete card…" |

### D.5.3 Layout & CSS

**App layout CSS** (`CardPhoneDaylight.svelte`, verbatim; `.r` is the Sheet's content root — its `width:390px` becomes `width:100%` (Gap D-16); `body{margin:0}` is dropped):

```css
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
.sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.small{font-size:14px}
.id{font-size:12px;overflow-wrap:anywhere}
.more,.lnk{display:inline-flex;align-items:center;gap:6px;min-height:44px;border:0;background:transparent;padding:0;font-size:15px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;color:var(--vk-color-text)}
.more{min-height:32px}
.rawrow{display:flex;gap:18px;margin-top:8px}
.nl{list-style:decimal;padding-left:22px;display:flex;flex-direction:column;gap:8px}
.nl li{font-size:15px;line-height:1.45;overflow-wrap:anywhere;padding-left:2px}
.addrow{display:flex;gap:8px;align-items:center;margin-top:8px}
.addrow .muted{flex:1}
.att li{display:grid;grid-template-columns:20px auto auto;gap:4px 10px;align-items:center;padding:8px 0;font-size:14px}
.att li + li{border-top:1px solid var(--vk-color-line)}
.att li > span:last-child{grid-column:2 / -1;color:var(--vk-color-muted);overflow-wrap:anywhere}
.att .who{display:inline-flex;align-items:center;gap:6px}
.cact{display:flex;gap:8px;flex-wrap:wrap}
.sh{position:sticky;top:0;z-index:2;background:var(--vk-color-surface);border-bottom:1px solid var(--vk-color-line);padding:6px 12px 14px 16px;display:flex;flex-direction:column;gap:10px}
.sh1{display:flex;align-items:center;justify-content:space-between;gap:8px}
.eb{font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--vk-color-muted);overflow-wrap:anywhere;min-width:0}
.tl{display:flex;gap:4px;align-items:flex-start}
.tl h2{flex:1;min-width:0;font-family:var(--vk-font-display);font-size:23px;line-height:1.2;font-weight:700;overflow-wrap:anywhere;text-wrap:pretty}
.tl .ib{margin-top:-6px}
.st{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;font-size:14px}
.body{display:flex;flex-direction:column;gap:14px;padding:14px 16px 0}
.dock{position:sticky;bottom:0;z-index:2;margin:0 -16px;padding:14px 16px 18px;background:var(--vk-color-surface);border-top:2px solid var(--vk-color-signal);border-radius:var(--vk-radius-lg) var(--vk-radius-lg) 0 0;box-shadow:0 -6px 18px color-mix(in oklch,var(--vk-color-text) 10%,transparent);display:flex;flex-direction:column;gap:10px}
.dock h3{font-family:var(--vk-font-display);font-size:18px;font-weight:700;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.dock h3 small{font-family:var(--vk-font-body);font-size:13px;font-weight:600;color:var(--vk-color-muted)}
.secs{display:flex;flex-direction:column;margin-top:4px}
.foot{padding:16px 16px 28px;border-top:1px solid var(--vk-color-line)}
```

**Reference CSS for vibekit Daylight sheets (phone density)**, verbatim:

```css
/* vibekit:IconButton (phone) */
.ib{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;border:0;background:transparent;border-radius:var(--vk-radius-sm);cursor:pointer;color:var(--vk-color-text);padding:0}
/* vibekit:AgentFace wrapper */
.face{flex:none;display:inline-flex;line-height:0}
.face svg{border-radius:50%}
/* vibekit:DefinitionGroups (phone) */
.kvg{display:flex;flex-direction:column;gap:6px}
.kvg + .kvg{margin-top:14px}
.gh{font-size:13px;font-weight:700;letter-spacing:0.04em;color:var(--vk-color-muted)}
.kv{display:flex;flex-direction:column;gap:10px}
.kv dt{font-size:13px;font-weight:700}
.kv dd{font-size:15px;line-height:1.45;overflow-wrap:anywhere}
/* vibekit:Field (phone) */
.inp{flex:1;min-width:0;min-height:44px;padding:0 12px;font-size:16px;border:1.5px solid var(--vk-color-faint);border-radius:var(--vk-radius-sm);background:var(--vk-color-surface);color:var(--vk-color-text)}
.ta{width:100%;min-height:72px;padding:10px 12px;font-size:16px;line-height:1.4;border:1.5px solid var(--vk-color-faint);border-radius:var(--vk-radius-sm);background:var(--vk-color-surface);color:var(--vk-color-text);resize:vertical}
.lab{font-size:14px;font-weight:700;display:block;margin:8px 0 4px}
.fld{display:flex;flex-direction:column;gap:4px}
.fld label{font-size:14px;font-weight:700}
.sel{min-height:48px;width:100%;padding:0 12px;font-size:16px;border:1.5px solid var(--vk-color-faint);border-radius:var(--vk-radius-sm);background:var(--vk-color-surface);color:var(--vk-color-text)}
.hint{font-size:13px;color:var(--vk-color-muted)}
/* vibekit:Button (phone: secondary .sbtn, danger outline, primary full-width .go) */
.sbtn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 16px;border-radius:var(--vk-radius-sm);border:1.5px solid var(--vk-color-line);background:var(--vk-color-surface);color:var(--vk-color-text);font-size:15px;font-weight:600;cursor:pointer;flex:none}
.sbtn.danger{border-color:var(--vk-color-muted)}
.go{display:flex;align-items:center;justify-content:center;gap:8px;min-height:52px;width:100%;border:0;border-radius:var(--vk-radius-md);background:var(--vk-color-primary);color:var(--vk-color-primary-fg);font-weight:700;font-size:17px;cursor:pointer;box-shadow:0 var(--vk-lift) 0 var(--vk-color-ground)}
.atm{min-height:44px;margin:-8px 0;border:0;background:transparent;padding:0 4px;text-decoration:underline;text-underline-offset:3px;font-size:14px;font-weight:700;cursor:pointer;color:var(--vk-color-text)}
/* vibekit:RunRow (phone) */
.runs{display:flex;flex-direction:column;gap:8px;margin-top:8px}
.run{border:1px solid var(--vk-color-line);border-radius:var(--vk-radius-sm);background:var(--vk-color-surface)}
.run summary{min-height:44px;padding:8px 12px;display:flex;flex-direction:column;justify-content:center;cursor:pointer}
.rt{font-weight:700;font-size:15px}
.rm{font-size:13px;color:var(--vk-color-muted)}
.ev{border-top:1px solid var(--vk-color-line)}
.ev li{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:8px;padding:8px 12px;font-size:14px;line-height:1.4;overflow-wrap:anywhere}
.ev li + li{border-top:1px solid var(--vk-color-line)}
.evt{font-weight:700}
.tm{color:var(--vk-color-muted);font-size:13px;white-space:nowrap}
/* vibekit:LinkList (phone, reference cards) */
.refs{display:flex;flex-direction:column;gap:8px}
.rf{display:flex;flex-direction:column;gap:2px;padding:10px 12px;min-height:44px;border:1px solid var(--vk-color-line);border-radius:var(--vk-radius-sm);background:var(--vk-color-surface);text-decoration:none;color:var(--vk-color-text)}
.rf b{font-size:15px;text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere}
.rf span{font-size:14px;color:var(--vk-color-muted);overflow-wrap:anywhere}
.rf small{font-size:11px;color:var(--vk-color-muted);overflow-wrap:anywhere}
/* vibekit:StageStrip (phone bars) */
.trk{display:flex;flex-direction:column;gap:6px}
.bars{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
.bars i{height:8px;border-radius:var(--vk-radius-pill);background:var(--vk-color-line)}
.bars i.d{background:var(--vk-color-success)}
.bars i.s{background:var(--vk-color-signal);outline:2px solid var(--vk-color-signal-text);outline-offset:1px}
.trk p{font-size:14px;color:var(--vk-color-muted);overflow-wrap:anywhere}
.trk p b{color:var(--vk-color-signal-text)}
/* vibekit:StatePill (phone) */
.pill{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:2px 10px;border-radius:var(--vk-radius-pill);font-weight:700;font-size:13px}
.pill.nd{background:var(--vk-mood-needs);color:var(--vk-face-ink);box-shadow:inset 0 0 0 2px var(--vk-color-signal)}
.pill.ar{background:var(--vk-color-raised);color:var(--vk-color-text);box-shadow:inset 0 0 0 1.5px var(--vk-color-muted)}
/* vibekit:Chip (phone) */
.chip{display:inline-flex;align-items:center;gap:5px;min-height:28px;padding:2px 10px;border-radius:var(--vk-radius-pill);background:var(--vk-color-raised);border:1px solid var(--vk-color-line);font-size:13px}
/* vibekit:FactList (phone) */
.fct{font-size:13px;color:var(--vk-color-muted);display:flex;flex-wrap:wrap;gap:2px 12px}
.fct b{color:var(--vk-color-text);font-weight:600}
/* vibekit:Disclosure (phone: pinned .pin and section .sec) */
.pin{border-radius:var(--vk-radius-md);background:var(--vk-color-raised);border:1px solid var(--vk-color-line)}
.pin > summary{min-height:52px;display:flex;align-items:center;gap:10px;padding:0 14px;cursor:pointer;font-weight:700;list-style:none}
.pin > summary::-webkit-details-marker{display:none}
.pin > summary .s{margin-left:auto;font-weight:600;font-size:14px;text-decoration:underline;text-underline-offset:3px}
.pin .in{padding:0 14px 14px;display:flex;flex-direction:column;gap:10px;font-size:15px}
.pin h4{font-size:14px;font-weight:700}
.sec{border-top:1px solid var(--vk-color-line)}
.sec > summary{min-height:52px;display:flex;align-items:center;gap:8px;cursor:pointer;font-family:var(--vk-font-display);font-size:17px;font-weight:700}
.sec > summary .c{font-family:var(--vk-font-body);font-weight:500;font-size:14px;color:var(--vk-color-muted)}
.sec .in{padding:0 0 16px;display:flex;flex-direction:column;gap:8px;font-size:15px}
/* vibekit:AgentQuote (phone, mood-needs bubble) */
.msg{display:flex;gap:10px;align-items:flex-start}
.msg .face{margin-top:20px}
.bwrap{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.blab{font-size:13px;font-weight:700;color:var(--vk-color-signal-text);letter-spacing:0.03em}
.bub{background:var(--vk-mood-needs);color:var(--vk-face-ink);border-radius:4px var(--vk-radius-lg) var(--vk-radius-lg) var(--vk-radius-lg);padding:14px 16px;font-size:16px;line-height:1.5;overflow-wrap:anywhere}
.btime{font-size:13px;color:var(--vk-color-muted)}
/* vibekit:Banner (phone archived) */
.arch{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:var(--vk-radius-md);background:var(--vk-color-raised);border:1.5px solid var(--vk-color-muted)}
.arch h3{font-size:17px;font-weight:700;display:flex;gap:8px;align-items:center}
.arch .sbtn{align-self:flex-start}
```

Note the phone bubble uses `--vk-mood-needs` with `--vk-face-ink` text, and the phone needs-pill likewise, unlike desktop's `--vk-color-signal-wash` (Gap D-17: two looks of one component → the Daylight AgentQuote/StatePill sheet has a `density: 'phone'` variant). Inline styles: "Open as a page" `width: auto; padding: 0 12px; gap: 6px; border: 1px solid var(--vk-color-line); font-size: 14px; font-weight: 600; text-decoration: none; white-space: nowrap`; the group `display: inline-flex; align-items: center; gap: 4px`; archived paragraph `font-size: 15px`; archived "who" label `color: var(--vk-color-muted)`.

### D.5.4 Content map

| Visible | Source |
|---|---|
| "DEVELOPER EXPERIENCE · REPRODUCE" (uppercase by CSS) | `${boardName} · ${stageName}` |
| "Open as a page" (icon) | §2.2, same tab |
| Close `aria-label="Close (Esc)"`; Edit `aria-label="Edit card"` | copy |
| Title (23px) | `card.title` |
| Bars `role="img" aria-label="Stage 2 of 7, Reproduce, stopped here"` | `Stage ${i} of ${n}, ${name}, stopped here` (needs) / `…, archived` |
| "Stage 2 of 7 · **Reproduce, stopped here** · next: Failing test, Fix, Integrate, Signed off, Shipped" | `Stage ${i} of ${n} · ${name}, stopped here · next: ${later.join(', ')}` (bold part signal-text only when needsYou; archived: `${name}, where it stopped`) |
| Pill "Waiting on you" (live) / archive icon "Archived" | `waitingWord` without age on phone / "Archived" |
| "Unclaimed ·" + link-button "Assign to me" | "Unclaimed ·" when no delegate; "Assign to me" → `model.assignToMe()`, shown only when `ownerUserId !== me` (Gap D-18) |
| "owner · Rakesh Gangwar" (muted) | `owner · ${name}` |
| Chip face super-chotu (resting) "asked by super-chotu", `title="Queued on Rakesh Gangwar's grant"` | `asked by ${queuedByName}`; title `Queued on ${grantOwnerName}'s grant` (Gap D-19) |
| "Priority P3 · Due none · Labels none · In Reproduce for 2 days · **Attempt 2**" | facts; Attempt always bold, value inline |
| Archived banner (archive icon) "Archived on 8 October" / "This card is not running, so there is nothing to resume. Restore it to put it back on the board in Reproduce." / "Restore" | `Archived on ${day} ${monthLong}`; copy with `${stageName}` |
| Pinned "What error-eric was asked" · "Show" | as drawer; right text "Show"/"Hide" |
| Description (phone fixture) | verbatim |
| "Things to prove · 5" + ordered list of 5 | copy `Things to prove · ${n}`; `acceptanceCriteria` |
| Face error-eric (needs, 32); "error-eric · needs you" / archived: "error-eric, before the card was archived" (muted) | who per state |
| Bubble text (starts "Not reproduced…") | `lead.sentence` verbatim (phone shows no id-token styling; `tokens:false` in phone density — Gap D-17) |
| "Thursday 8 October, 19:41" | `whenLabelLong(lead.at)` = weekday long, day, month long, `HH:mm` (phone uses the long form; `lib/when.ts` adds `whenLabelLong`) |
| Dock h3 "Stopped, waiting on you" small "2 tries so far" | `Stopped, waiting on you`; `${attemptCount} tr${n===1?'y':'ies'} so far` |
| Select "Resume at stage" with **all 7** options, current "2 · Reproduce (where it stopped)" | phone lists every stage (Gap D-20: the server refuses later stages; ruling (c): later stages are listed but `disabled`) |
| Textarea label "What changed, or what should error-eric do differently? It reads this.", placeholder "For example: event ids for one fresh DM to each agent are attached" | copy with `${agent}` |
| "Send back to work" (full-width primary) | — |
| Plan "none yet" / "error-eric did not post a plan for this card." | empty: `${agent} did not post a plan for this card.` |
| Details "10 fields"; groups "What to do", "Who it is about", "Background", "Rules", "Where work goes"; dt/dd; "Show more" buttons on long values; "View raw JSON", "Copy" | `specGroups` with the phone fixture's `spec.groups` (D.6.2); values > 180 chars are clamped to 3 lines with a "Show more" toggle (`aria-expanded`) — Gap D-21 |
| "Who it is about" dd: mono id "@agent_message-melissa:id.agentpod.dev" · link "onboarding card" | value objects `{ matrixId, card }` → mono id + `<a href="/b/{board}/c/{card}">onboarding card</a>` (`StructuredValue` rendering rule for `{matrixId, card}`; Gap D-22) |
| "Where work goes" Repository "SuperJackfruitLabs/atelier · private · policy" | value `{ repo, visibility, policyUrl }` → `${repo} · ${visibility} · ` + link "policy" |
| Project "Melissa and Anna onboarding" / "Marketing & Community — Melissa and Anna onboarding · no milestone" / "Change project" | summary = project name; body `${projectName}` + ` · ${milestoneName ?? 'no milestone'}` |
| Links "0" / "Nothing blocks this card and it blocks nothing." / "Add a link" | empty copy |
| Sub-tasks "0/0" / "0 of 0 open. No sub-tasks yet." / input (sr label "New sub-task title", placeholder "Add a sub-task") + "Add" | `${open}/${n}`; copy |
| Session activity "2 runs" (open); "Queued by super-chotu on Rakesh Gangwar's grant · 32 agents may be dispatched." | `Queued by ${queuedBy} on ${grantOwner}'s grant · ${grantSize} agents may be dispatched.` (D-19) |
| Run 2 "Run 2 · Reproduce" / "error-eric · Stopped · attempt 2" (open), events "Started — Rework run on this card session; read prior persisted evidence first. — Thu 8 Oct", "Stopped — Blocked. Waiting on you; the reason is shown at the top of this card. — 19:41" | `Run ${i} · ${stage}`; `${agent} · ${statusWord} · attempt ${i}`; events G-5 (first event shows the date, later ones the time) |
| Run 1 "Run 1 · Reproduce" / "error-eric · Sent back · attempt 1"; event "Sent back — The board refused completion: repro and observed were missing. — Thu 8 Oct" | outcome `sent_back` → "Sent back" |
| "Show tool calls" (`aria-pressed`) | toggle |
| Decisions "0" / "No decisions on this card yet." | — |
| Comments "0" / "No comments yet." / label "Comment" / placeholder "Write a comment" / "⌘ or Ctrl + Enter to post" / "Comment" | copy (phone wording differs from desktop — Gap D-23) |
| Handoff "from Reported" / "From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output." | no handoff payload → `From ${prevStage}: queued by ${queuedBy} on ${dayMonth(createdAt)} with the brief above. No earlier stage output.` |
| Cost "$0.00" / "**$0.00** spent · no estimate · no card cap set" | `${usd} spent · ${est} · ${board.usage.cardUsdCap ? `card cap ${usd(cap)}` : 'no card cap set'}` |
| Attempts "2": rows "1 · face error-eric (resting) error-eric · $0.00 · Sent back: repro and observed missing", "2 · face (needs) · $0.00 · Stopped: waiting on you" | `attempt.failureReason ?? statusWord` (D.6.2) |
| Related prior work "none" / "No related prior work found in Superlibrary." | empty copy |
| References "5": 5 cards (title bold underlined, description, mono source line "github · agentpod · inbound.ts lines 379–786") + input (sr "Attach a link or Superlibrary item", placeholder "Paste a link to attach") + "Add" | `ref.title`, `ref.metadata.description`, source line `${host short} · ${repo short} · ${file} lines ${a}–${b}` derived from the GitHub blob URL `#L379-L786` (Gap D-24) |
| Footer `aria-label="Card actions"`: live "Archive card" (archive icon), "Delete card…" (danger outline); archived "Archived — restore" (restore icon), "Delete card…" | copy |

### D.5.5 Interactions & states

- Header sticky at top; dock sticky at bottom (live). The body scroll container is the Sheet; `scroll-padding-bottom` = dock height (measured via `bind:clientHeight`) so focused fields are never under the dock.
- `live` / `archived` are model states, not tweaks: archived = `model.archived`; then the banner shows, the dock is not rendered, the pill reads "Archived", the who-label changes, the footer shows "Archived — restore".
- Every `.sec` closed by default except "Session activity" (open) and its newest run (open).
- "Show more": toggles clamp per value, `aria-expanded`.
- "Delete card…" keeps the confirm dialog.

---
## D.6 Fixture needs (beyond 00-shared §5)

### D.6.1 Desktop stopped card (SP-Card-Daylight, SP-CardPage-Daylight) — values §5 leaves to this section

`card_05823a57e8224605.spec` detail fields (key → value, verbatim from the artboards; `SPEC_GROUP_OF` as §5):

| Key | Label (humanized) | Value |
|---|---|---|
| `objective` | Objective | Reproduce and localise why the AgentPod bridge identities for Message Melissa and Audience Anna do not respond to Rakesh in Supermessage. |
| `deliverable` | Deliverable | An evidence-backed diagnosis and the exact repair proposal. |
| `evidence` | Evidence | One fresh DM per agent, traced hop by hop. |
| `outOfScope` | Out of scope | Applying the fix. |
| `agentsInScope` | Agents in scope | `["message-melissa", "audience-anna"]` (drawer: joined ", "; page: faces + names) |
| `surfaces` | Surfaces | `["Supermessage", "AgentPod hub", "Accounts"]` (joined ", ") |
| `fixGoesTo` | Fix goes to | Failing test, on this board |
| `attribution` | Attribution | Do not blame a component without evidence. |
| `issues` | Issues | File one only for an established defect. |
| `messages` | Messages | Read metadata only, never message contents. |

Faces: drawer chip error-eric `resting`; drawer message error-eric `needs` (40px); page people rows error-eric `resting`, super-chotu `working`; page message error-eric `needs` (48px); page "Agents in scope" message-melissa, audience-anna (20px, `resting`).

Run 2 activities (14 total: the 3 below are narrative, 11 tool calls with `type: 'action'` and a `parameter`, hidden by default): seq 1 `{type:'action', action:'Read', body:'AgentPod hub matrix-inbound log for Melissa’s station', ts:'2026-10-09T19:22:00+05:30'}`; seq 2 `{type:'response', action:'Found', body:'session acps_8f86d4e4… reached Hermes; model reply produced', ts:'…19:30'}`; seq 3 `{type:'error', signal:'stop', action:null, body:'No fresh DM event to trace. Needs one per agent.', ts:'…19:41'}`. Narrative-vs-tool-call split uses `isNarrative` (unchanged): the 11 hidden ones are `type:'action'` with a tool `action` such as `read_file` and no body. Run 1: 9 activities, all tool calls, ended 2026-10-09T11:12.

Board snapshot behind the drawer: the four tiles listed in §5 (owned by the board group's fixture).

### D.6.2 Phone stopped card (SP-Phone-Card-Daylight) — separate seed

The phone artboard shows card 4605 with materially different content from the desktop artboards (description tail, 5 criteria, project, plan none, spec fields, runs, references, dates). Both cannot be one record. **Ruling: per-artboard seeds.** `e2e/support/seed.ts` gains `seedCard4605Desktop(request)` (§5 + D.6.1) and `seedCard4605Phone(request)` (this table); a pixel test seeds exactly one. Both use the same ids. Where they conflict, the phone values are the closer copy of production (they quote the real spec verbatim), so production-data screenshots will match the phone; the desktop mockups' brief is an editorial summary of it (Gap D-25).

| Field | Phone value |
|---|---|
| `spec.description` | Reproduce and localize why the existing AgentPod bridge Matrix identities for Message Melissa and Audience Anna do not respond to Rakesh in Supermessage. Produce an evidence-backed diagnosis and exact repair proposal; do not attribute silence to missing grants without live evidence. |
| `spec.acceptanceCriteria` (5) | 1 "Trace user DM ingress, room routing/bridge identity, control-pair authorization, station dispatch, ACP transport/model request and reply delivery; identify the first failing hop for each agent." 2 "Check real current shared-profile servicing rather than stale local gateway_state.json; these profiles are not separately startable." 3 "Check credential availability by presence only; never print .env, tokens or secret files. Profiles were cloned without messaging tokens intentionally because identities are bridge-owned." 4 "Read current AgentPod, Hermes and Accounts contracts/code; do not use retired Fleet grant endpoints or guess API behavior." 5 "Report separately what was reproduced, what cannot be accessed and the exact bounded repair needed; link evidence and preserve tenant/principal boundaries." |
| `spec.plan` | absent |
| `spec.groups` | `{"What to do":["rework","requiredEvidence"],"Who it is about":["messageMelissa","audienceAnna"],"Background":["context","latestConfirmedGrant"],"Rules":["scope","accountsIssues"],"Where work goes":["repository","routingRule","project"]}` |
| `spec.rework` | Previous run ended with interim prose while child traces were pending; board rejected completion because repro and observed were missing. Do not spawn background delegate_task children on this rework: finish the bounded diagnosis in this card session. (visible text ends there with "Show more"; the seed value is this sentence followed by any further sentences — the clamp shows 3 lines) |
| `spec.requiredEvidence` | rendered "5 items, listed under Things to prove." — value is the array of the 5 criteria; rendering rule: an array value equal to `acceptanceCriteria` renders `${n} items, listed under Things to prove.` (Gap D-26) |
| `spec.messageMelissa` | `{"matrixId":"@agent_message-melissa:id.agentpod.dev","card":"card_onboard_melissa"}` (label "Message Melissa") |
| `spec.audienceAnna` | `{"matrixId":"@agent_audience-anna:id.agentpod.dev","card":"card_onboard_anna"}` |
| `spec.context` | Rakesh states his own mayDispatch grant already includes both agents and has now added them to Super Chotu's grant. The coordinator station JWT observed immediately after this still contained the original 30-principal list; distinguish token propagation from configured grants. (+ more; clamped) |
| `spec.latestConfirmedGrant` | Super Chotu fresh station JWT now contains both Melissa and Anna principals in mayDispatch (32 total). Token propagation is confirmed; do not continue treating the grant as missing. |
| `spec.scope` | Diagnosis and repair proposal only. No gate decisions, credentials, principal links, grants, board policy, membership, service lifecycle changes or bypasses. No public posts or third-party messages. (+ more; clamped) |
| `spec.accountsIssues` | If the investigation identifies an Accounts implementation defect, raise a GitHub issue in SuperJackfruitLabs/accounts. No confirmed Accounts defect means no speculative issue. (+ more; clamped) |
| `spec.repository` | `{"repo":"SuperJackfruitLabs/atelier","visibility":"private","policyUrl":"https://github.com/SuperJackfruitLabs/atelier/blob/main/AGENTS.md"}` |
| `spec.routingRule` | Internal artifacts and all Guild work default to Atelier. Verify destination visibility and classification before any push, PR, issue, comment or attachment; never use public fallback. (+ more; clamped) |
| `spec.project` | Marketing & Community — Melissa and Anna onboarding |
| `projectId` | `prj_melissa_anna` "Marketing & Community — Melissa and Anna onboarding" (summary shows the part after " — ": Gap D-27), no milestone |
| `stateSince` | 2026-10-08T19:41:00+05:30 (still "2 days" at 2026-10-11 13:51 by `ageWords` floor) |
| lead `at` | 2026-10-08T19:41 → "Thursday 8 October, 19:41" |
| `needsHuman.detail` | same text as §5 but starting with a capital "Not reproduced end-to-end:" (Gap D-25) |
| `queuedBy` / grant | super-chotu on Rakesh Gangwar's grant, `grantSize` 32 |
| attempts | run 1: error-eric, outcome `sent_back`, `failureReason` "Sent back: repro and observed missing", cost 0; run 2: error-eric, outcome `blocked`, cost 0, `failureReason` null → "Stopped: waiting on you" |
| run 2 activities (narrative) | `{action:'Started', body:'Rework run on this card session; read prior persisted evidence first.', ts:'2026-10-08T…'}`, `{type:'error', signal:'stop', body:'Blocked. Waiting on you; the reason is shown at the top of this card.', ts:'2026-10-08T19:41'}` |
| run 1 activities (narrative) | `{action:'Sent back', body:'The board refused completion: repro and observed were missing.', ts:'2026-10-08T…'}` |
| handoff | none (null) |
| links / children / comments / decisions / related | none |
| references (5) | `github` blob URLs exactly as in the artboard (`…/agentpod/blob/3f625b618d443aa8ef1dad7c04d3ddd14dcf6708/apps/hub/src/services/matrix-as/inbound.ts#L379-L786`, `…/outbound.ts#L373-L486`, `…/acp-transport.ts#L90-L248`, `…/accounts/blob/77ca37e43cd6f98d0799ecbdd230b857404d77ec/src/issuer/claims.ts#L17-L43`, `https://github.com/NousResearch/hermes-agent/blob/0b70608a58ac4a8d4505cff15302695350ff6ccc/acp_adapter/server.py#L818-L883`), titles "AgentPod v0.1.91 Matrix inbound bridge contract", "AgentPod v0.1.91 Matrix reply delivery contract", "AgentPod v0.1.91 ACP transport contract", "Accounts current claims/grant contract", "Hermes ACP adapter at the reproduced build"; `metadata.description` "DM ingress → room lookup → Accounts identity/grant → ACP dispatch", "ACP chunks buffered and flushed via bridge-owned Matrix identity", "acp.open/attach and bidirectional broker framing", "Fresh tokens read the stored grant; bridge authorization reads Accounts principal view directly", "Hermes streams agent_message_chunk and returns end_turn over ACP stdio" |
| board usage | `cardUsdCap` null |
| archived variant | `archivedAt` 2026-10-08 (→ "Archived on 8 October"); everything else equal |

### D.6.3 States gallery (SP-Card-States-Daylight)

Boards (stages in order, key → name):
- `brd_research` "Research & Intelligence": `question` Question, `gather` Gather, `measure` Measure, `synthesise` Synthesise, `recommendation` Recommendation (gate: approval), `filed` Filed.
- `brd_devx` "Developer Experience": §5.
- `brd_marketing` "Marketing & Community": `requested` Requested, `messaging-brief` Messaging brief, `messaging-approval` Messaging approval (gate), `cleared-to-publish` Cleared to publish, `community-triage` Community triage, `reply-approval` Reply approval (gate), `cleared-to-reply` Cleared to reply, `done` Done.
- `brd_onboarding` "Agent Onboarding": `requested` Requested, `drafted` Drafted, `provisioned` Provisioned, `portrait` Portrait, `credentialed` Credentialed (gate), `proving` Proving, `resident` Resident.

Cards (ids fixed so the gallery can find them):

| Cell | Card id | Board · stage | Title | State & extra |
|---|---|---|---|---|
| A | `card_states_gate` | research · recommendation | P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix) | state `input-required`; pending gate `gat_states_a`: `producedBy` `agt_research_ray`, `summary` "All done, ready for your review.", `createdAt` 2026-10-11T12:48+05:30, default options (Approve / Request changes / Reject), `approvalSubject` `{ revision: 2, digest: 'sha256:9f3ac2e1' + 'd4b7'.repeat(14), canonical: { kind: 'Recommendation, one paragraph', synthesis: 'The organization plane exists so that one issuer, Accounts, says who a person or an agent is in every product. Before it, each product kept its own users and tokens, so a grant made in one place meant nothing in the next. With one issuer, a workspace, its members and its agents are defined once, and every product checks the same token.', sources: 'Organization plane cutover record, 7 Oct' } }`; delegate research-ray |
| B | `card_states_question` | devx · fix | Superpipeline: manual-delivery completion and approval-subject hardening | state `input-required`; elicitation `eli_states_b`: agent `agt_coder_kai`, question "The handoff to Failing test needs a commit, and the fix for the manual delivery reminder is still on an unmerged branch. Should I hand on the branch commit, or wait until it is merged?", createdAt 2026-10-11T11:05+05:30 |
| C | `card_states_archived` | marketing · messaging-approval | Coordinator dispatch canary — Melissa | `archivedAt` 2026-10-09; owner usr_rakesh; delegate null; attempts: 1 by `agt_message_melissa`; `spec.description` "Verify Super Chotu can dispatch Message Melissa. Produce a DRAFT three-sentence messaging brief for workspace operators about registering an agent."; a gate on it with `status: 'cancelled'`, `cancelReason: 'archived'` (Gap D-13) |
| D | `card_states_done` | onboarding · resident | Onboard Message Melissa — marketing and messaging | state `completed`; `stateSince` 2026-10-09T19:26+05:30; `attemptCount` 5; priority 2; owner usr_rakesh; queuedBy agt_super_chotu; last attempt by `agt_onboarding_olivia` with a `response` activity "Melissa is resident. Her identity, router description and portrait are in place, and you credentialed her at the resident gate." at 19:26 and `handoff` `{ summary: 'Profile, router description, safe profile and portrait drafted through this pipeline. No posting, DMs or scheduling without separate operator authorisation.' }` |
| E | `card_states_error` | research · recommendation | P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ | state `input-required`; gate `gat_states_e` present in the snapshot as `pending` but already decided server-side: `decision: 'approve'`, `decidedBy: 'usr_rakesh'`, `decidedAt: '2026-10-11T13:02+05:30'`, `via: 'matrix'` (seed writes the snapshot row stale — Gap G-1 needs a seed hook `staleSnapshotGate`) |
| F | `card_states_loading` | devx · reproduce | Diagnose Melissa and Anna Supermessage silence — trace actual failing hop | same card content as §5 (a copy under a new id) — the gallery holds its detail fetch (`holdDetail: true`); last attempt agent error-eric |

Faces: research-ray needs; coder-kai needs; message-melissa (chip, resting); onboarding-olivia done; super-chotu (chip, resting); error-eric thinking.

## D.7 Gaps (Daylight)

| # | Mockup shows | API / app today | Ruling |
|---|---|---|---|
| D-1 | Board reflows into the column left of the 680px drawer (lanes 3-up in ~740px), scrim only over the board | drawer is a fixed overlay over the full-width board | (a) client: at ≥ 1280px viewport Daylight's drawer is side-by-side: the drawer shell sets `--card-drawer-reserve: min(680px, 100%)` on `.app-shell` while open and the board group's `BoardDaylight` main area uses `padding-inline-end: var(--card-drawer-reserve, 0)`; the scrim covers only the board area. Below 1280 it stays an overlay. (Shared-contract note 1.) |
| D-2 | Open tile ringed in signal (`.dl-tile--open`) | tiles have `data-card-open` | (a) board group adds `data-open="true"` when `app.openCardId === id`; ring CSS in BoardDaylight. |
| D-3 | "Unclaimed · error-eric ran attempt 2" chip face | — | G-2 |
| D-4 | Chip title "…, an agent, with dispatch authority on this board" | `provenance` | (a) derive from `provenance.byAgent` + `grantSize > 0`. |
| D-5 | Stage label words "stopped / awaiting review / question pending / archived / stopped here" | `lead.kind` | (a) `STRIP_WORD: Record<LeadKind \| 'archived', string>` in `state-words.ts`: stopped/failed/budget → "stopped", review → "awaiting review", question → "question pending", archived → "archived"; phone appends " here". |
| D-6 | Resume placeholders name this card's specifics ("…Melissa and Anna at 14:05…", "event ids for one fresh DM to each agent are attached") | — | (c) product copy must not mention one card's details on every card. Shipped placeholder (all Daylight surfaces): "For example: what you checked, and what the agent should look at next." The pixel test sets the textarea's `placeholder` attribute to the artboard string before the screenshot (`locator.evaluate((el, v) => el.placeholder = v, MOCK)`), so only the placeholder differs from the mockup. |
| D-7 | Drawer/page textarea label says "the agent"; phone says "error-eric" | — | (a) phone uses `${agent.name}`; desktop keeps "the agent" (both mockup-literal). |
| D-8 | "Handoff from Reported: “…”" — one sentence | `handoff: Record<string, unknown>` | (a) render `handoff.summary` when a string, else the first string value; other keys go under a "View raw JSON" disclosure in the run row (page) / nothing extra in drawer line (the full handoff stays reachable in the page's "What happened" via RawJson — parity). |
| D-9 | Cost hero "$0.00" at 2rem / 2.2rem display | — | (a) `vibekit:Figure { label: 'Spent', value: '$0.00', size: 'lg' }` (label visually hidden in Daylight); the two sizes are drawer vs page density. |
| D-10 | Drawer < 680px wide (640–679 viewport) | mockup has no rule | (a) container query single-column (D.2.3). |
| D-11 | Page below 1440 | no mockup | (a) breakpoints in D.3.3. |
| D-12 | "Opened from Developer Experience" | the page cannot know the opener | (a) always the card's own board name (a card belongs to one board). |
| D-13 | Archived banner "Its pending review was cancelled when the card was archived." | archive today leaves gates as they are (the review flagged live controls on archived cards) | (b) API: `archiveCard` cancels pending gates and records `gates.status = 'cancelled'`, `cancel_reason = 'archived'`; `Gate.cancelReason?: 'archived' \| null` in the contract. Banner line = that sentence when any gate has `cancelReason === 'archived'`, else "It is off the board. Restore puts it back." |
| D-14 | Loading cell shows board name only and 5 skeleton bars | snapshot already has the stage | (a) loading shows `${boardName}` only (stage word comes with the detail in Daylight's copy rule) and `min(stages.length, 5)` bars with the current one wide (flex 2.8) at index `min(stageIndex, 1)`; masked-free because deterministic. |
| D-15 | Phone archived variant | one reference per artboard | (a) the reference exporter renders `SP-Phone-Card-Daylight` twice (`archived:false` → `SP-Phone-Card-Daylight.html`, `archived:true` → `SP-Phone-Card-Daylight--archived.html`); seed archived variant per D.6.2. |
| D-16 | `.r{width:390px}` | sheet is fluid | (a) `width:100%` in the app; the 390 pixel test is unaffected. |
| D-17 | Phone bubble/pill use `--vk-mood-needs` + face ink; desktop uses signal-wash; phone shows ids unstyled | one AgentQuote | (a) `vibekit:AgentQuote`/`StatePill` take `density: 'comfortable' \| 'phone'`; phone density = mood-needs fill, `tokens:false`. |
| D-18 | Phone shows "Assign to me" although the viewer already owns the card | button hidden when `ownerUserId === me` | (c) mockup is wrong: keep the rule (no button when you own it). The phone baseline masks the `.atm` box (`mask: [page.locator('.st .atm')]`) until the artboard is re-exported without it. |
| D-19 | "Queued on Rakesh Gangwar's grant · 32 agents may be dispatched." | `cardProvenance` has `grantSize`, not the grant owner | (b) API: card field `queuedGrantOwner: string \| null` (principal whose grant the queuing agent used) on `Card` in the snapshot; client `displayPrincipal`. |
| D-20 | Phone lists all 7 resume stages | server refuses resume to a later stage | (a) list all stages; later ones `disabled` (visible, not selectable); desktop lists only current and earlier (mockup-literal). |
| D-21 | "Show more" on long spec values | — | (a) clamp `-webkit-line-clamp: 3` when `value.length > 180`; toggle `aria-expanded`. |
| D-22 | Structured spec values (matrix id + onboarding card link; repo + visibility + policy) | `StructuredValue` renders nested rows | (a) `StructuredValue` recognises `{matrixId, card}` and `{repo, visibility, policyUrl}` shapes; any other object renders as today. |
| D-23 | Phone comment copy ("Comment" label, "Write a comment", "⌘ or Ctrl + Enter to post") differs from desktop ("Add a comment", "⌘ or Ctrl + Enter posts it") | — | (a) per-surface copy constants, both literal. |
| D-24 | Reference source line "github · agentpod · inbound.ts lines 379–786" | reference has `url`, `title`, `metadata` | (a) derive from GitHub blob URLs: host word "github", repo short name, file basename, `#L(a)-L(b)` → `lines a–b`; non-GitHub: hostname. Description from `metadata.description` (seeded); absent → omitted. |
| D-25 | Desktop and phone show different contents and dates for the same card | one record | (a) per-artboard seeds (D.6.2); recommend the design team re-export the desktop artboards from the phone data (noted, not blocking). |
| D-26 | "5 items, listed under Things to prove." | spec field is an array | (a) array deep-equal to `acceptanceCriteria` → that sentence; else bullet list. |
| D-27 | Project summary "Melissa and Anna onboarding" vs full "Marketing & Community — Melissa and Anna onboarding" | project name | (a) summary shows the text after the last " — " when present. |

## D.8 Shared-contract notes (for the coordinator; 00-shared not edited)

1. §1.6/§1.7 `vibekit:Drawer` is an overlay; Daylight needs a side-by-side mode at ≥ 1280px (D-1): add `reserve?: boolean` to Drawer props and a `--card-drawer-reserve` contract with the board group.
2. §1.3 `CardLayoutProps` has no way to know the viewer's page vs drawer copy differences; Daylight uses `model.surface` (already in the context) — expose `readonly surface: CardSurface` on `CardModel`.
3. §1.5 `whenLabel` needs a long form for phone ("Thursday 8 October, 19:41"): add `whenLabelLong`.
4. §5 fixture covers only the desktop data; the phone artboards need a second seed of the same ids (D.6.2) — likely true for every vibe; recommend §5 name both seeds.
5. §1.4 `resume` options: Daylight phone lists all stages with later ones disabled (D-20) — a model field `model.resume.allStages` is needed.
6. §1.7 add `vibekit:Figure` `size: 'lg'`, `vibekit:AgentQuote`/`StatePill` `density`, and `vibekit:PersonRow` is used only on the page.
7. G-1 cell E needs a seed hook that leaves a decided gate pending in the snapshot (`staleSnapshotGate`), or the gallery's E model injects the gate.
