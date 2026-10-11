# Paper — the card as a letter with enclosures

Sources read in full: `vibes-mockups/project/SP-Card-Paper.dc.html`, `SP-CardPage-Paper.dc.html`, `SP-Card-States-Paper.dc.html`, `SP-Phone-Card-Paper.dc.html`. All shared contracts (CardModel, registry, routes, §1.7 vibekit names) are in `00-shared.md`; this part only adds what is Paper's.

**How to read the CSS blocks below.** Every quoted block is verbatim from the `.dc.html` (canvas-only rules dropped). Each block is labelled:
- **[app]** — layout/composition CSS. Port into the named Svelte component's `<style>` (selectors kept, scoped by Svelte; `:global()` only where noted).
- **[vibekit:Name · paper sheet]** — the Paper reference for a vibekit component's per-vibe sheet. The app does **not** ship this CSS; the vibekit Paper sheet must produce exactly these pixels. Class names in the app markup are then the vibekit component's, not the mockup's.

## P.0 vibekit components used (Paper)

| Component | Props used here | Where |
|---|---|---|
| `vibekit:Drawer` | `{ open: true, labelledBy: 'drawer-title', width: 'min(780px, calc(100% - 32px))', align: 'center', onClose }` + Paper variant `placement: 'sheet'` (sheet floats at top of a scrolling overlay, see P-2) | SP-Card-Paper |
| `vibekit:Sheet` | `{ labelledBy: 'drawer-title', onClose }` | SP-Phone-Card-Paper |
| `vibekit:Button` | `variant: 'primary' \| 'secondary' \| 'quiet' \| 'frame' \| 'link'`, `icon?` | every button; `frame` = `.pg-frame`/`.mh-btn`-style ruled frame; `link` = underlined text button (`.pp-link`, `.lnk`, `.ed`, `.more`) |
| `vibekit:IconButton` | `{ icon: 'close', label: 'Close (Esc)' }`; `{ icon: 'external', label: 'Open in new window', text: 'Open in new window', href, target: '_blank' }` (icon + visible text form) | drawer top row, phone top row |
| `vibekit:CopyButton` | `{ value: card.id, label: 'Copy card id 4605' }` (icon-only); `{ value: specJson, label: 'Copy', text: 'Copy' }`; `{ value: sessionId, label: 'Copy session id', text: 'Copy session id' }`; `{ value: pageUrl, label: 'Copy link to this card', text: 'Copy link to this card', copiedText: 'Link copied' }`; `{ value: approvalSubject.digest, label: 'Copy', text: 'Copy' }` (link look) | facts line, brief foot, signature, window bar, gate subject |
| `vibekit:StageStrip` | page: `{ stages, current, status: 'needs', label: 'Stages: stage 2 of 7, Reproduce, stopped', labels: 'all', numerals: 'roman' }` (P-3); phone: `{ …, labels: 'none', label: 'Stage 2 of 7, Reproduce, stopped here' }` (bars only, `role="img"`) | page head, phone head |
| `vibekit:FactList` | `{ facts, variant: 'smallcaps-line' }` — Paper renders facts as an uppercase run-on line (`.pp-line`, `.pg-line`, `.ps-line`, phone `.sc`) | status + facts lines |
| `vibekit:AgentFace` | `{ name, mood, size: 28 \| 32 \| 36 \| 40, variant: 'portrait' }` (`FACE_VARIANT.paper`) | signature, byline, states, attempts (20) |
| `vibekit:PersonRow` | `{ face \| initials, name, role, variant: 'byline' }` | page byline (`.pg-by`) |
| `vibekit:AgentQuote` | `{ agent, who, text, tone, at, tokens: true, variant: 'letter', salutation: 'Dear Rakesh,', signature: { name, role, at }, actions? }` — the letter: salutation, voice text verbatim, signed by the face + name + role line | drawer letter, page letter, states A/B/D, phone `.paper` |
| `vibekit:Disclosure` | `{ summary, meta, open, variant: 'enclosure', toggleText: true }` (Paper shows "Open"/"Close" words on the right) | enclosures, run rows, raw JSON, gate subject |
| `vibekit:DefinitionGroups` | `{ groups: specGroups(card.spec), columns: 3 }` (drawer), `columns: 1, layout: 'aside-labels'` (page `.pg-dl` 118px label column), `columns: 1, layout: 'stacked'` (phone) | details |
| `vibekit:Checklist` | `{ items, label: 'Agent plan', done: 'strike' }` (Paper strikes done steps with `<s>`) | plan |
| `vibekit:Meter` | `{ value, max, label, variant: 'hairline' }` (4px, ink fill) | plan, cost |
| `vibekit:RunRow` | `{ title, status, tone, meta, open, events }` | page "The record", phone runs, drawer What happened |
| `vibekit:LinkList` | `{ items: { href, text, meta? , prefix? }[] }` | links, references (phone: `variant: 'cards'` `.rf`) |
| `vibekit:Field` | `kind: 'select' \| 'textarea' \| 'text' \| 'url'`, `label`, `hint`, `error`, `counter` | resume, comment, gate note, answer, sub-task, reference |
| `vibekit:ChoiceList` | `{ legend: 'Your decision', name, options: { value, title, hint? }[], value (bindable) }` — radio list (`.ps-choices`) | gate A, E (new name; Paper decides gates by radio + "Send reply", P-5) |
| `vibekit:SubjectFrame` / `vibekit:Seal` | `{ head, children, seal: 'Approving exactly this version, sealed 9f3a·c2e1.' }` | gate A |
| `vibekit:Alert` | `{ tone: 'needs', title: 'Not recorded.', role: 'alert' }` | `error` section, gate E |
| `vibekit:Banner` | `{ icon: 'archive', title: 'Archived 9 Oct', text, variant: 'ruled' }` | state C, phone archived |
| `vibekit:DoneBlock` | `{ title: 'This is done.', text }` | state D |
| `vibekit:Skeleton` + `vibekit:LoadingNote` | `shape: 'line'`, widths 55% / 30%×18px / 100% / 100% / 70%; note `'Opening the letter…'` | state F |
| `vibekit:EmptyState` | `{ text }` | "No letters yet…", "No decisions on this card yet.", "Nothing blocks this card and it blocks nothing." |
| `vibekit:Footnote` | not used in Paper | — |

## P.1 Registry values

```ts
CARD_LAYOUTS.paper = { drawer: CardPaper, phone: CardPhonePaper, width: 'min(780px, calc(100% - 32px))', align: 'center' };
CARD_PAGE_LAYOUTS.paper = CardPagePaper;
CARD_STATES_LAYOUTS.paper = CardStatesPaper;
```

Today's value (`max-w-[680px] sm:mx-auto sm:border-r`) is replaced. Paper is the one vibe whose drawer is a centred **sheet** that does not fill the viewport height: it sits `margin: var(--vk-space-6) 0 var(--vk-space-7)` from the top of a scrolling overlay, and the overlay (not the sheet) scrolls (P-2).

## P.2 Paper copy helpers (new, `card/paper-words.ts`, unit-tested)

| Function | Rule | Example (fixture) |
|---|---|---|
| `paperLight(phase)` | `{ dawn: 'at first light', morning: 'in the morning light', noon: 'in full daylight', golden: 'in the golden hour', dusk: 'at dusk', night: 'after dark' }[phase]` (P-1; only `noon` is in a mockup) | "in full daylight" |
| `paperDateline(now, phase)` | `` `${weekdayLong} ${day} ${monthLong} · ${paperLight(phase)}` `` (en-GB) | "Sunday 11 October · in full daylight" |
| `paperDay(now, phase)` | `` `${weekdayLong}, ${paperLight(phase)}` `` (phone) | "Sunday, in full daylight" |
| `reTitle(title, kind)` | `'Re: ' + title`; for a pending gate `'Re: approval. ' + title` | "Re: Diagnose Melissa and Anna …" |
| `kicker(model)` | needs-you (stopped/question/review) → "A letter that needs a reply"; page adds `" · " + ageWords` and says "your reply": "A letter that needs your reply · 2 days"; archived → "Archived on {d monthLong}"; done → no kicker | |
| `paperWhen(iso)` | `` `${weekdayLong} ${day} ${monthLong}, ${HH:mm}` ``; today → "Today, HH:mm" | "Friday 9 October, 19:41" |
| `roman(n)` | 1→I … 12→XII | stage numerals on the page and its select |
| `numberWord(n)` | 1–10 → "one"…"ten", else digits | "two attempts" |
| `agentRole(agent, stage)` | agent's profile role (`AgentSummary.role`, P-4) + ", attempt N" | "Diagnostics, attempt 2" |
| `runsSummary(groups)` | `"{n} run(s)"` + (all same outcome & n=2 → ", both {word}"; n>2 → ", all {word}") | "2 runs, both stopped" |
| `linkedSummary(counts, groups)` | 0 → "no links"; all relates/advisory → "{n} related card(s)"; else "{n} linked card(s)" | "3 related cards" |

Outcome words (`OUTCOME_WORD`): `blocked`/stopped → "stopped", `completed` → "done", `rejected_completion` → "sent back", `failed` → "failed", running → "running".

---

## P.3 SP-Card-Paper — the drawer (1440×2457, paper)

**Represents:** `/b/brd_devx/c/card_05823a57e8224605`, Plan board (Paper front page) dimmed behind, the stopped card open as a centred letter-sheet.

### Component tree

- `lib/components/CardDrawer.svelte` (shared shell, §1.6) → `vibekit:Drawer` with `CARD_LAYOUTS.paper`.
- `lib/components/card/layouts/CardPaper.svelte` — **rewritten**. Props `CardLayoutProps` (§1.3). Root element `<article class="pp-sheet">` is the sheet's content; the Drawer frame supplies `role="dialog"`, `aria-modal`, `aria-labelledby="drawer-title"`.
  - children (in order): `.pp-top` (back link, Open in new window, Close) → head block (kicker, `h2#drawer-title`, two `vibekit:FactList` lines) → `hr.pp-rule` → `[data-section=error]` → letter (`vibekit:AgentQuote variant=letter`) **or** the gate/question/state block → `[data-section=resume]` reply form → Enclosed (5 `vibekit:Disclosure variant=enclosure`) → `.pp-foot` actions.
  - Gate: `card/gate/GatePaper.svelte` (rewritten from cell A/E). Question: `card/question/QuestionPaper.svelte` (rewritten from cell B). Archived/done/loading: `card/state/CardStatePaper.svelte`.
- Deleted from use here: `LeadBubble.svelte`, `CardResume.svelte` markup, `CardComments.svelte` markup, `SpecDetails/PlanChecklist/HandoffView/RelatedWork` components (helpers kept), today's `CardPaper.svelte` body.
- Behind the sheet: Paper shell masthead (`SHELL_LAYOUTS.paper`, shell group) + `BoardPaper.svelte` (board group). The mockup draws a simplified front page there (`.pp-cols`); see P-6.

### Section placement

| Key | Place | Visible text / summary |
|---|---|---|
| `error` | between `hr.pp-rule` and the letter; `vibekit:Alert tone=needs` | hidden when `localError` null (`<div data-section="error" hidden>`) |
| `status` | head, `.pp-line` #1 first span + line #2 spans 1–3 | "Waiting on you · 2 days" · "Owner **Rakesh Gangwar**" · "Asked by **super-chotu**, an agent" · "**Unclaimed**" |
| `facts` | head, `.pp-line` #1 spans 2–4 + line #2 spans 4–7 | "Stage **2 of 7, Reproduce**" · "Next: Failing test" · "Attempt **2**" · "Priority **P3**" · "No due date" · "No labels" · "card 4605" + copy |
| `editButton` | `.pp-foot` first button | "Edit card" (secondary, pencil icon) |
| `editForm` | replaces head-lines + letter + reply while `model.edit.editing` (title stays, `sr-only`) | today's fields, `vibekit:Field`s |
| `description` | Enclosure "The brief", first paragraph (Newsreader 1.1rem) | description verbatim |
| `delivery` | Enclosure "Attached", last item (body); empty → summary word "no delivery" and a hidden element | — |
| `resume` | `form.pp-reply` "Your reply" under the letter | see content map |
| `plan` | Enclosure "The brief", right column | "Plan · 1 of 4 steps · 25%" |
| `criteria` | Enclosure "The brief", left column | "Things to prove" |
| `details` | Enclosure "The brief", `.pp-groups` (3 columns) + "View raw JSON" + Copy | 3 groups |
| `project` | Enclosure "The brief", foot left | "Project: none · Assign to a project" |
| `links` | Enclosure "Who is waiting" | summary "3 related cards" |
| `subtasks` | Enclosure "Who is waiting" | summary "no sub-tasks"; body line + composer |
| `activity` | Enclosure "What happened" | summary "2 runs, both stopped" |
| `decisions` | Enclosure "What happened" | summary "no decisions" |
| `comments` | Enclosure "Correspondence" (open) | summary "No letters yet" |
| `handoff` | Enclosure "What happened", first paragraph | "Handed on from Reported: “…”" |
| `cost` | Enclosure "What happened" summary "$0.00" + body last line | "Cost $0.00, no estimate yet." |
| `attempts` | Enclosure "What happened" body lines | "**Attempt 2** · error-eric · 14 events · stopped at 19:41 Fri 9 Oct" |
| `related` | Enclosure "Attached" | "Prior work, fixed: …" |
| `references` | Enclosure "Attached" | "agentpod PR #642 · merged" |
| `cardActions` | `.pp-foot` buttons 2–3 | "Archive card", "Delete card" |

### Layout & CSS

**[app] `CardDrawer` overlay for Paper** (the mockup's `.pp` grid stacks board, scrim and sheet in one cell; in the app the board is the page and the overlay is fixed):

```css
.pp { display: grid; min-height: 900px; }
.pp * { box-sizing: border-box; }
.pp > * { grid-area: 1 / 1; }
```
→ app translation (P-2): the overlay is `position: fixed; inset: 0; overflow-y: auto; display: grid; justify-items: center; align-items: start;` with the scrim `position: fixed; inset: 0` underneath. Pixel tests take a full-page screenshot of the overlay's scroll height.

**[vibekit:Drawer · paper sheet]** scrim and sheet frame:

```css
.pp-scrim { position: absolute; inset: 0; background: color-mix(in oklch, var(--vk-color-text) 45%, transparent); }
.pp-sheet { position: relative; justify-self: center; align-self: start; width: min(780px, calc(100% - 32px)); margin: var(--vk-space-6) 0 var(--vk-space-7); background: var(--vk-color-surface); border-radius: var(--vk-radius-sm); box-shadow: 0 0 0 1px var(--vk-color-line), 0 30px 80px color-mix(in oklch, var(--vk-color-text) 30%, transparent); padding: var(--vk-space-5) var(--vk-space-7) var(--vk-space-6); display: flex; flex-direction: column; gap: var(--vk-space-5); }
```
(`--card-scrim` for Paper = `color-mix(in oklch, var(--vk-color-text) 45%, transparent)`.)

**[app] `CardPaper.svelte`** — head, letter wrapper, reply grid, enclosure bodies:

```css
.pp-top { display: flex; justify-content: space-between; align-items: center; }
.pp-back { display: inline-flex; align-items: center; gap: 4px; min-height: 44px; color: var(--vk-color-muted); text-decoration: none; font-size: var(--vk-text-sm); }
.pp-back:hover { text-decoration: underline; }
.pp-eyebrow { display: inline-flex; align-items: center; gap: var(--vk-space-2); font: 600 12px/1 var(--vk-font-body); letter-spacing: 0.12em; text-transform: uppercase; color: var(--vk-color-signal-text); }
.pp-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--vk-color-signal); }
.pp-title { margin: 0; font: 500 2.1rem/1.15 var(--vk-font-display); text-wrap: pretty; }
.pp-rule { border: 0; border-top: 1px solid var(--vk-color-line); margin: 0; }
.pp-h { margin: 0; font: italic 500 1.5rem/1.2 var(--vk-font-display); }
.pp-reply { display: flex; flex-direction: column; gap: var(--vk-space-4); padding: var(--vk-space-5); border: 1px solid var(--vk-color-line); border-radius: var(--vk-radius-sm); background: var(--vk-color-raised); }
.pp-grid { display: grid; grid-template-columns: minmax(0, 270px) minmax(0, 1fr); gap: var(--vk-space-4); align-items: start; }
.pp textarea.vk-field__input { min-height: 100px; padding: var(--vk-space-3) var(--vk-space-4); font-size: 16px; line-height: 1.45; resize: vertical; }
.pp-small { font-size: var(--vk-text-sm); color: var(--vk-color-muted); }
.pp-encbody { padding: 0 0 var(--vk-space-5); display: flex; flex-direction: column; gap: var(--vk-space-4); }
.pp-p { margin: 0; line-height: 1.6; text-wrap: pretty; }
.pp-ul { margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 6px; line-height: 1.5; }
.pp-sc { margin: 0; font: 600 11.5px/1.2 var(--vk-font-body); letter-spacing: 0.12em; text-transform: uppercase; color: var(--vk-color-muted); }
.pp-groups { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--vk-space-5); border-top: 1px solid var(--vk-color-line); padding-top: var(--vk-space-4); }
.pp-groups > div { display: flex; flex-direction: column; gap: var(--vk-space-3); min-width: 0; }
.pp-link { color: var(--vk-color-text); text-underline-offset: 3px; }
.pp-foot { display: flex; gap: var(--vk-space-3); flex-wrap: wrap; align-items: center; }
```
The `.pp textarea.vk-field__input` rule becomes `:global([data-vibe="paper"] .pp-sheet textarea)`-free: it is the **[vibekit:Field · paper sheet]** drawer-density textarea (`min-height: 100px`) — pass `rows`/`minHeight="100px"` prop rather than override.

Inline styles that matter (keep as written, as scoped classes): head wrapper `display:flex; flex-direction:column; gap: var(--vk-space-3)`; reply heading wrapper `gap: 2px`; reply sub `margin: 0`; Enclosed label `.pp-sc` with `margin-bottom: var(--vk-space-2)`; description paragraph `font: 400 1.1rem/1.6 var(--vk-font-display)`; criteria+plan grid `display:grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: var(--vk-space-5)`, each column `display:flex; flex-direction:column; gap: var(--vk-space-2)`; plan list `list-style: none; padding: 0`; brief foot `.pp-foot` `justify-content: space-between`, its right group `display:flex; align-items:center; gap: var(--vk-space-4)`; What happened first/last `.pp-small` `margin: 0`; Add link / Comment buttons `align-self: flex-start`; brief foot Copy `font-size: var(--vk-text-sm)`; "Open in new window" anchor: `width: auto; padding: 0 12px; gap: 6px; border: 1px solid var(--vk-color-line); font-size: 0.9375rem; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; white-space: nowrap` (that is the IconButton's text form in Paper's sheet; the right group is `display:inline-flex; align-items:center; gap:4px`).

**[vibekit:IconButton · paper sheet]**
```css
.pp-icon { display: inline-grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: var(--vk-radius-sm); background: transparent; color: var(--vk-color-text); cursor: pointer; }
```

**[vibekit:FactList · paper sheet, variant smallcaps-line]** and **[vibekit:CopyButton]** inside it:
```css
.pp-line { margin: 0; font: 500 12.5px/1.9 var(--vk-font-body); letter-spacing: 0.08em; text-transform: uppercase; color: var(--vk-color-muted); display: flex; flex-wrap: wrap; column-gap: var(--vk-space-3); }
.pp-line b { color: var(--vk-color-text); font-weight: 600; }
.pp-line .sig { color: var(--vk-color-signal-text); }
.pp-meta { display: inline-flex; align-items: center; font: 400 11.5px/1 var(--vk-font-mono); letter-spacing: 0; text-transform: none; color: var(--vk-color-faint); }
.pp-copy { display: inline-grid; place-items: center; min-width: 44px; min-height: 44px; margin: -14px 0; border: 0; background: transparent; color: var(--vk-color-muted); cursor: pointer; }
```
The `.sig` fact gets `tone: 'needs'` (signal only because a person is needed now).

**[vibekit:AgentQuote · paper sheet, variant letter]**
```css
.pp-letter { display: flex; flex-direction: column; gap: var(--vk-space-4); }
.pp-dear { margin: 0; font: italic 400 1.35rem/1.3 var(--vk-font-display); }
.pp-voice { margin: 0; font: 400 1.22rem/1.6 var(--vk-font-display); overflow-wrap: anywhere; text-wrap: pretty; }
.pp-id { font: 400 0.78em/1.4 var(--vk-font-mono); overflow-wrap: anywhere; }
.pp-sign { display: flex; align-items: center; gap: var(--vk-space-3); }
.pp-sign .n { font: italic 500 1.15rem/1.2 var(--vk-font-display); }
.pp-sign .r { font-size: var(--vk-text-sm); color: var(--vk-color-muted); }
```
Signature text column inline style: `display:flex; flex-direction:column; gap:2px`. Face 36px.

**[vibekit:Disclosure · paper sheet, variant enclosure]**
```css
.pp-enc { border-top: 1px solid var(--vk-color-line); }
.pp-enc:last-of-type { border-bottom: 1px solid var(--vk-color-line); }
.pp-enc > summary { list-style: none; display: flex; align-items: baseline; gap: var(--vk-space-3); min-height: 56px; padding: var(--vk-space-3) 0; cursor: pointer; }
.pp-enc > summary::-webkit-details-marker { display: none; }
.pp-enc > summary .t { font: 500 1.2rem/1.3 var(--vk-font-display); }
.pp-enc > summary .c { font-size: var(--vk-text-sm); color: var(--vk-color-muted); }
.pp-enc > summary .o { margin-left: auto; font-size: var(--vk-text-sm); color: var(--vk-color-muted); text-decoration: underline; text-underline-offset: 3px; }
```

**[vibekit:DefinitionGroups · paper sheet, columns 3]**
```css
.pp-dl { margin: 0; display: flex; flex-direction: column; gap: var(--vk-space-3); }
.pp-dl dt { font-weight: 600; font-size: var(--vk-text-sm); }
.pp-dl dd { margin: 2px 0 0; font: 400 1rem/1.45 var(--vk-font-display); overflow-wrap: anywhere; }
```
Group heading = `.pp-sc` (small caps label), the grid = `.pp-groups` [app].

**[vibekit:Meter · paper sheet, hairline]**
```css
.pp-meter { height: 4px; background: var(--vk-color-line); }
.pp-meter i { display: block; height: 100%; background: var(--vk-color-text); }
```

Buttons use `vk-button vk-button--primary|secondary|quiet` (= `vibekit:Button`); fields use `vk-field`, `vk-field__label`, `vk-field__input`, `vk-field__hint` (= `vibekit:Field`) — no app CSS.

Responsive: the mockup has no media queries. ≥640px: the sheet is `min(780px, calc(100% - 32px))`; `.pp-grid` (270px + 1fr) and `.pp-groups` (3 columns) stay as written (all `minmax(0, …)`, so they shrink without overflow). <640px: `CardPhonePaper` is used instead (P.6).

### Content map

| Visible | Source |
|---|---|
| "Developer Experience · in full daylight" (back link, left-arrow icon) | `` `${model.boardName} · ${paperLight(phase)}` ``; `<a class="pp-back" href="/b/{boardId}">` → `onClose()` (preventDefault, closes the drawer) |
| "Open in new window" (external icon), `aria-label="Open in new window"` | copy; `href={pageHref}` `target="_blank" rel="noopener"` |
| Close icon, `aria-label="Close (Esc)"` | copy; `onClose` |
| "A letter that needs a reply" + signal dot | `kicker(model)`; rendered only when `model.lead.needsYou` |
| "Re: Diagnose Melissa and Anna Supermessage silence — trace actual failing hop" (`h2#drawer-title`) | `reTitle(card.title, lead.kind)` |
| "Waiting on you · 2 days" (signal-text) | `waitingWord(card, lead, now)` |
| "Stage 2 of 7, Reproduce" | `` `${stageIndex+1} of ${stages.length}, ${stageName}` `` (bold part = "2 of 7, Reproduce") |
| "Next: Failing test" | G-8 |
| "Attempt 2" | `card.attemptCount` (shown when > 1) |
| "Owner Rakesh Gangwar" | `displayPrincipal(card.ownerUserId, app.members)` |
| "Asked by super-chotu, an agent" | `provenance.queuedByName` + (`provenance.byAgent` ? ", an agent" : "") |
| "Unclaimed" | `!card.delegateAgentId` (G-2; Paper shows only the word, the attempt agent is in the signature) |
| "Priority P3" / "No due date" / "No labels" | `card.priority > 0 ? 'Priority P'+n : 'No priority'`; `card.dueAt ? 'Due ' + paperDate(dueAt) : 'No due date'` (overdue → signal-text "Overdue since …"); labels → "Labels " + names joined ", " or "No labels" |
| "card 4605" + copy icon `aria-label="Copy card id 4605"` | `model.shortId`; `CopyButton value=card.id` |
| "Dear Rakesh," | `` `Dear ${firstName(personName)},` `` (first word of `app.user.name`) |
| letter text | `model.lead.sentence` verbatim (here `needsHuman.detail`), tokens styled per G-3 |
| signature face (error-eric, mood needs, 36px, `aria-label="error-eric, needs you"`) | `model.agent` (speaker; falls back to last attempt's agent when unclaimed — G-2) |
| "error-eric" | agent name |
| "Diagnostics, attempt 2 · Friday 9 October, 19:41" | `agentRole(agent)` + " · " + `paperWhen(lead.at)` (P-4) |
| "Your reply" (`h3#reply-h`) | copy |
| "I stopped after two attempts. Send me back with what changed." | `` `I stopped after ${numberWord(card.attemptCount)} attempt${s}. Send me back with what changed.` `` (agent's voice, product copy) |
| "Resume at stage" select: "1 · Reported", "2 · Reproduce (this stage)" | `model.resume.targets` reversed to stage order, labelled `` `${n} · ${name}` `` + " (this stage)" |
| note label "What changed, or what should the agent do differently? It reads this." | copy |
| placeholder "For example: I sent a fresh DM to each of them at 14:05; trace those." | copy |
| hint "Needed before you send. 0 / 8000" | copy + `note.length` / 8000 |
| "Send back to work" (primary, no icon in Paper) | copy |
| "With no note: “Add a note for error-eric first.”" | `` `With no note: “Add a note for ${agent.name} first.”` `` |
| "Enclosed" | copy (`.pp-sc`) |
| Enclosure "The brief" · "3 things to prove · 10 details · plan 1 of 4" · "Close" | counts: `${criteria} things to prove` · `${specFields} details` · `plan ${done} of ${steps}`; toggle word "Close" when open, "Open" when closed |
| "Things to prove" + 3 bullets | `model.acceptanceCriteria` |
| "Plan · 1 of 4 steps · 25%" + meter 25% + 4 items, first struck | `normalisePlan(spec.plan)`; pct = round(done/steps·100) |
| group headings "What to do", "Where it goes", "Rules" + rows | `specGroups(card.spec)` (P-7 for the shorter values) |
| "Project: none · Assign to a project" | `model.projectName ?? 'none'`; link-button → `model.project.start()` (when a project: "Project: {name}{ · milestone} · Change project") |
| "View raw JSON" (link look) + "Copy" (copy icon) | `vibekit:Disclosure` (body `RawJson`) + `CopyButton value=JSON.stringify(card.spec,null,2)` |
| Enclosure "What happened" · "2 runs, both stopped · no decisions · $0.00" · "Open" | `runsSummary` · `decisions ? n + ' decision(s)' : 'no decisions'` · `fmtUsd(card.costUsd)` |
| body: "Asked by super-chotu (an agent, allowed to dispatch the one working it). Handed on from Reported: “Melissa and Anna do not answer DMs in Supermessage.”" | provenance sentence (`grantSummary` → "allowed to dispatch the one working it" when `grantCoversDelegate`) + handoff (`model.handoff.summary`, stage = previous stage name) |
| "**Attempt 2** · error-eric · 14 events · stopped at 19:41 Fri 9 Oct" / "**Attempt 1** · error-eric · 9 events · stopped" | per attempt (newest first): agent name, events count of its run group, outcome word, + " at HH:mm ddd d Mon" for the newest only |
| "Cost $0.00, no estimate yet." | `fmtUsd(costUsd)` + (estimate ? `, estimate ${fmtUsd}` : ', no estimate yet') |
| run disclosures + "Show tool calls" | body below the attempt lines (not visible closed): `vibekit:RunRow` per group, `Button variant=quiet` "Show tool calls"/"Hide tool calls"; decided gates "Decisions: none yet." |
| Enclosure "Who is waiting" · "3 related cards · no sub-tasks" | `linkedSummary`, `children ? `${open} of ${n} sub-tasks open` : 'no sub-tasks'` |
| 3 links; cross-board suffix " · Agent Onboarding" | `model.linkGroups` (relates + advisory); suffix = other board's name; `href="/b/{board}/c/{card}"` |
| "Add link" (secondary) | `model.links.openAdd()` |
| (closed body) "Sub-tasks: 0 open of 0" + field "New sub-task title" + "Add" | `model.children`, `model.subtasks` |
| Enclosure "Attached" · "2 references · 1 related piece of prior work · no delivery" | `refs.length` · `related.length` ("piece"/"pieces") · delivery ? "delivery {mode}" : "no delivery" |
| "agentpod PR #642 · merged" ×2 | G-6 + `subStateLabel` |
| "Prior work, fixed: Hermes agent stuck on an E2EE device; a fresh device fixed it." | `model.related[0]`: `` `Prior work, ${status}: ${text}` `` (P-7: text shortened vs fixture) |
| (closed body) field "Attach a link" + "Add" | `model.refsForm` |
| Enclosure "Correspondence" · "No letters yet" · "Close" (open by default) | comments 0 → "No letters yet", else "{n} letter(s)" |
| field label "Write to whoever works this card. The agent reads it." | copy |
| placeholder "⌘ or Ctrl + Enter posts it" | copy |
| "Comment" (secondary) | `model.comments.post()` |
| foot: "Edit card" (pencil), "Archive card" (archive icon), "Delete card" (quiet) | `model.edit.start()`, `model.archive()`, `model.remove()` |

### Interactions & states

All of 00-shared §4, plus:
- Back link closes the drawer (it is an `<a href="/b/{boardId}">` so a middle-click opens the board; plain click → `preventDefault(); onClose()`).
- Enclosures default: "The brief" **open**, "What happened" closed, "Who is waiting" closed, "Attached" closed, "Correspondence" **open**. When `lead.needsYou` is false (working/idle) the same defaults apply. State is per drawer-open, not persisted.
- Toggle word in each summary: "Close" when open / "Open" when closed (`aria-hidden="true"`; the summary's accessible name is the title + count).
- Hover: `.pp-back:hover` underline; buttons per vibekit sheet.
- Focus: vibekit focus ring on every control; the sheet receives focus on open (Drawer).
- Gate pending → letter = `GatePaper` (cell A markup, P.5) in place of `pp-letter`, and no resume form. Question pending → `QuestionPaper` (cell B). Archived → `CardStatePaper kind=archived` above the head lines; reply form and decision controls are not rendered. Done → `kind=done`. Detail not loaded → `kind=loading` replaces letter + reply + enclosures.
- Errors: `localError` in `[data-section=error]`; gate decision errors under the Send reply button (cell E).

### Fixture needs

None beyond 00-shared §5, except: `AgentSummary.role = 'Diagnostics'` for `agt_error_eric` (P-4), and the Paper spec values (P-7).

---

## P.4 SP-CardPage-Paper — the standalone card page (1440×2538, paper)

**Represents:** `/b/brd_devx/c/card_05823a57e8224605/page`, shell slot `bare`.

### Component tree

- `routes/b/[boardId]/c/[cardId]/page/+page@.svelte` + `+page.ts` (00-shared §2.1) → `CARD_PAGE_LAYOUTS.paper`.
- `lib/components/card/page/CardPagePaper.svelte` (new). Props `CardPageProps`. Structure: `div.pg-wrap` → `header.pg-mast` (reduced masthead) → `nav.pg-sec` "Card window" → `section.pg-head` (headline) → `div.pg-spread` three columns: `article.pg-col` "The letter" / `section.pg-col` "Enclosed" / `aside.pg-col` "The record" → `footer.pg-colophon`.
- Reuses `GatePaper`, `QuestionPaper`, `CardStatePaper` exactly as the drawer does (in column one, in place of the letter + reply).

### Section placement

| Key | Place | Visible text |
|---|---|---|
| `error` | top of column one, above "The letter" heading (`vibekit:Alert`) | hidden when none |
| `status` | `.pg-byline` (3 `vibekit:PersonRow`s) + `.pg-line` first span | "error-eric · agent for Reproduce, ran attempt 2 · Unclaimed now" · "Rakesh Gangwar · owner" · "super-chotu · asked for it, an agent" · "Waiting on you · 2 days" |
| `facts` | `.pg-line` spans 2–7 + window bar "card 4605" | "Stage 2 of 7, Reproduce" · "Attempt 2" · "Priority P3" · "No due date" · "No labels" · "No project" |
| `editButton` | window bar `pg-frame` "Edit card" | |
| `editForm` | replaces `.pg-spread` columns one–two while editing (title stays visible as the form's context) | |
| `description` | Enclosure I "The brief", first paragraph | |
| `delivery` | "Accounts · Cost and delivery", last line | "No approved delivery on this card." |
| `resume` | column one `form.pg-reply` "Your reply" | |
| `plan` | Enclosure II, below criteria | "Agent plan · 1 of 4 steps · 25%" |
| `criteria` | Enclosure II "Things to prove" (ordered list) | |
| `details` | Enclosure I, three `.pg-group`s + raw JSON + Copy | |
| `project` | Enclosure I foot "Project: none · Assign to a project" (and "No project" in `.pg-line`) | |
| `links` | Enclosure III list ("Relates to …") + "Add link" | |
| `subtasks` | Enclosure III summary line "no sub-tasks (0 open of 0)" | composer: P-8 |
| `activity` | Enclosure IV "What happened": Attempt 2 log + "Show tool calls · all 14 events" + Attempt 1 line | |
| `decisions` | Enclosure IV last line | "Decisions: none yet." |
| `comments` | column one Enclosure V "Correspondence" | |
| `handoff` | Enclosure IV first paragraph | "Handed on from Reported: “…”" |
| `cost` | "Accounts · Cost and delivery" figure + line + meter | "$0.00" |
| `attempts` | Enclosure IV ("Attempt 2 · …", "Attempt 1 · …") + cost line "attempt 1, $0.00 · attempt 2, $0.00" | |
| `related` | Enclosure III last item | "Prior work, fixed: …" |
| `references` | Enclosure III "Reference: …" items | composer: P-8 |
| `cardActions` | `footer.pg-colophon` | "Archive card", "Delete card" |

### Layout & CSS — all **[app]** (`CardPagePaper.svelte`) unless labelled

```css
.pg { min-height: 900px; }
.pg * { box-sizing: border-box; }
.pg a { color: var(--vk-color-text); text-underline-offset: 3px; }
.pg-wrap { max-width: 1360px; margin: 0 auto; padding: 0 var(--vk-space-6); }
.pg-mast { border-top: 1px solid var(--vk-color-text); margin-top: var(--vk-space-4); display: flex; align-items: center; gap: var(--vk-space-4); flex-wrap: wrap; min-height: 56px; border-bottom: 1px solid var(--vk-color-line); }
.pg-name { font: 600 1.25rem/1 var(--vk-font-display); font-variant-caps: small-caps; letter-spacing: 0.06em; text-decoration: none; display: inline-flex; align-items: center; min-height: 44px; }
.pg-date { font: italic 400 1rem/1.2 var(--vk-font-display); color: var(--vk-color-muted); }
.pg-quiet { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 var(--vk-space-2); border: 0; background: transparent; color: var(--vk-color-text); font: 400 var(--vk-text-sm)/1 var(--vk-font-body); cursor: pointer; }
.pg-quiet:hover { text-decoration: underline; text-underline-offset: 3px; }
.pg-sec { display: flex; align-items: center; gap: var(--vk-space-3); flex-wrap: wrap; min-height: 48px; border-bottom: 1px solid var(--vk-color-line); font-size: var(--vk-text-sm); }
.pg-sec a, .pg-sec button { min-height: 44px; display: inline-flex; align-items: center; gap: 6px; }
.pg-sep { width: 1px; height: 18px; background: var(--vk-color-line); }
.pg-mono { font: 400 12px/1 var(--vk-font-mono); color: var(--vk-color-faint); display: inline-flex; align-items: center; }
.pg-head { padding: var(--vk-space-6) 0 var(--vk-space-5); display: flex; flex-direction: column; gap: var(--vk-space-4); border-bottom: 3px double var(--vk-color-text); }
.pg-kicker { display: inline-flex; align-items: center; gap: var(--vk-space-2); font: 600 12px/1 var(--vk-font-body); letter-spacing: 0.14em; text-transform: uppercase; color: var(--vk-color-signal-text); }
.pg-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--vk-color-signal); }
.pg-title { margin: 0; font: 500 clamp(2.4rem, 1.6rem + 2vw, 3.4rem)/1.06 var(--vk-font-display); letter-spacing: -0.01em; text-wrap: balance; max-width: 1100px; }
.pg-deck { margin: 0; font: italic 400 1.3rem/1.45 var(--vk-font-display); color: var(--vk-color-muted); max-width: 900px; }
.pg-byline { display: flex; flex-wrap: wrap; gap: var(--vk-space-3) var(--vk-space-6); align-items: center; }
.pg-spread { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 4fr) minmax(0, 3fr); padding: var(--vk-space-5) 0 var(--vk-space-6); }
.pg-col { padding: 0 var(--vk-space-5); border-left: 1px solid var(--vk-color-line); display: flex; flex-direction: column; gap: var(--vk-space-5); min-width: 0; }
.pg-col:first-child { padding-left: 0; border-left: 0; }
.pg-col:last-child { padding-right: 0; }
.pg-sc { margin: 0; font: 600 11.5px/1.2 var(--vk-font-body); letter-spacing: 0.14em; text-transform: uppercase; color: var(--vk-color-muted); padding-bottom: var(--vk-space-2); border-bottom: 1px solid var(--vk-color-text); }
.pg-small { font-size: var(--vk-text-sm); color: var(--vk-color-muted); }
.pg-h { margin: 0; font: italic 500 1.55rem/1.2 var(--vk-font-display); }
.pg-reply { display: flex; flex-direction: column; gap: var(--vk-space-4); padding: var(--vk-space-5); border: 1px solid var(--vk-color-text); border-radius: var(--vk-radius-sm); background: var(--vk-color-raised); }
.pg-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--vk-space-4); align-items: start; }
.pg textarea.vk-field__input { min-height: 120px; padding: var(--vk-space-3) var(--vk-space-4); font-size: 16px; line-height: 1.45; resize: vertical; }
.pg-foot { display: flex; gap: var(--vk-space-3); flex-wrap: wrap; align-items: center; }
.pg-enc { display: flex; flex-direction: column; gap: var(--vk-space-3); }
.pg-enc h3 { margin: 0; font: 500 1.3rem/1.25 var(--vk-font-display); display: flex; align-items: baseline; gap: var(--vk-space-3); flex-wrap: wrap; }
.pg-enc h3 .no { font: 600 11px/1 var(--vk-font-body); letter-spacing: 0.14em; text-transform: uppercase; color: var(--vk-color-muted); }
.pg-p { margin: 0; line-height: 1.6; text-wrap: pretty; }
.pg-serif { font: 400 1.1rem/1.6 var(--vk-font-display); }
.pg-ol { margin: 0; padding-left: 1.4em; display: flex; flex-direction: column; gap: 6px; font: 400 1.05rem/1.5 var(--vk-font-display); }
.pg-ul { margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 6px; line-height: 1.5; }
.pg-group { border-top: 1px solid var(--vk-color-line); padding-top: var(--vk-space-3); display: flex; flex-direction: column; gap: var(--vk-space-2); }
.pg-group h4 { margin: 0; font: italic 500 1.05rem/1.2 var(--vk-font-display); }
.pg-face { display: inline-flex; vertical-align: -5px; margin-right: 4px; }
.pg-colophon { border-top: 1px solid var(--vk-color-text); padding: var(--vk-space-4) 0 var(--vk-space-7); display: flex; gap: var(--vk-space-3); flex-wrap: wrap; align-items: center; }
```

**[vibekit:CopyButton · paper sheet, icon]** `.pg-copy { display: inline-grid; place-items: center; min-width: 44px; min-height: 44px; border: 0; background: transparent; color: var(--vk-color-muted); cursor: pointer; }`

**[vibekit:Button · paper sheet, frame]** `.pg-frame { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 var(--vk-space-3); border: 1px solid var(--vk-color-line); border-radius: var(--vk-radius-sm); background: transparent; color: var(--vk-color-text); font: 500 var(--vk-text-sm)/1 var(--vk-font-body); cursor: pointer; }`

**[vibekit:StageStrip · paper sheet, labels all, roman]**
```css
.pg-track { list-style: none; margin: 0; padding: var(--vk-space-3) 0 0; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); border-top: 1px solid var(--vk-color-line); }
.pg-track li { padding: 0 var(--vk-space-3); border-left: 1px solid var(--vk-color-line); display: flex; flex-direction: column; gap: 4px; min-width: 0; color: var(--vk-color-muted); }
.pg-track li:first-child { border-left: 0; padding-left: 0; }
.pg-track .no { font: 600 11px/1 var(--vk-font-body); letter-spacing: 0.12em; text-transform: uppercase; }
.pg-track .nm { font: 400 1.05rem/1.25 var(--vk-font-display); color: var(--vk-color-text); overflow-wrap: anywhere; }
.pg-track li.done .nm { color: var(--vk-color-muted); }
.pg-track li.cur .no { color: var(--vk-color-signal-text); }
.pg-track li.cur .nm { font-style: italic; font-weight: 600; text-decoration: underline; text-decoration-color: var(--vk-color-signal); text-decoration-thickness: 2px; text-underline-offset: 5px; }
```
(`repeat(7, …)` = `repeat(stages.length, …)`; the signal on `.cur` only while `status === 'needs'`.)

**[vibekit:PersonRow · paper sheet, byline]**
```css
.pg-by { display: inline-flex; align-items: center; gap: var(--vk-space-2); font-size: var(--vk-text-sm); }
.pg-by b { font: italic 500 1.05rem/1.2 var(--vk-font-display); }
.pg-initials { display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--vk-color-text); font: 600 12px/1 var(--vk-font-body); }
```

**[vibekit:FactList · paper sheet, smallcaps-line (page size)]**
```css
.pg-line { margin: 0; font: 500 12px/1.9 var(--vk-font-body); letter-spacing: 0.08em; text-transform: uppercase; color: var(--vk-color-muted); display: flex; flex-wrap: wrap; column-gap: var(--vk-space-4); }
.pg-line b { color: var(--vk-color-text); font-weight: 600; }
.pg-line .sig { color: var(--vk-color-signal-text); }
```

**[vibekit:AgentQuote · paper sheet, letter (page size)]**
```css
.pg-dear { margin: 0; font: italic 400 1.4rem/1.3 var(--vk-font-display); }
.pg-voice { margin: 0; font: 400 1.25rem/1.6 var(--vk-font-display); overflow-wrap: anywhere; text-wrap: pretty; }
.pg-id { font: 400 0.76em/1.4 var(--vk-font-mono); overflow-wrap: anywhere; }
.pg-sign { display: flex; align-items: center; gap: var(--vk-space-3); flex-wrap: wrap; }
.pg-sign .n { font: italic 500 1.2rem/1.2 var(--vk-font-display); }
```
Face 40px; the Copy session id button is the quote's `actions` slot, inline style `font-size: var(--vk-text-sm); margin-left: auto`. AgentQuote needs a `size: 'sheet' | 'page' | 'cell' | 'phone'` prop to select the four Paper sizes (`.pp-*` / `.pg-*` / `.ps-*` / phone) — P-9.

**[vibekit:DefinitionGroups · paper sheet, aside-labels]**
```css
.pg-dl { margin: 0; display: grid; grid-template-columns: minmax(0, 118px) minmax(0, 1fr); gap: var(--vk-space-2) var(--vk-space-3); }
.pg-dl dt { font: 600 12px/1.5 var(--vk-font-body); letter-spacing: 0.06em; text-transform: uppercase; color: var(--vk-color-muted); }
.pg-dl dd { margin: 0; font: 400 1rem/1.45 var(--vk-font-display); overflow-wrap: anywhere; }
```
Agents-in-scope values that are agent names render a 20px face (`.pg-face`, P-10) before the name.

**[vibekit:Meter · paper sheet]** `.pg-meter { height: 4px; background: var(--vk-color-line); } .pg-meter i { display: block; height: 100%; background: var(--vk-color-text); }`

**[vibekit:RunRow · paper sheet, log (page)]**
```css
.pg-log { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.pg-log li { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: var(--vk-space-3); padding: var(--vk-space-3) 0; border-top: 1px solid var(--vk-color-line); font-size: var(--vk-text-sm); line-height: 1.45; }
.pg-log .t { font: 400 11px/1.6 var(--vk-font-mono); color: var(--vk-color-muted); display: block; }
.pg-log .stop { color: var(--vk-color-signal-text); }
```
(RunRow `variant: 'flat'` — no summary chrome; the row title is the `.pg-p` "**Attempt 2** · error-eric · 14 events, no errors · stopped" line.)

**[vibekit:Figure · paper sheet]** `.pg-fig { font: 500 2.6rem/1 var(--vk-font-display); }`

**[vibekit:Disclosure · paper sheet, raw link]** `.pg-raw > summary { min-height: 44px; display: inline-flex; align-items: center; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; font-size: var(--vk-text-sm); }`

Inline styles that matter: masthead spacer `flex: 1 1 auto` (also in `.pg-sec`); account button contains a chevron icon and `<span class="vk-visually-hidden">, account menu with Sign out</span>`; signature text column `display:flex; flex-direction:column; gap:2px`; reply heading wrapper `gap: 2px`, its sub `margin:0`; correspondence textarea `min-height: 88px` (Field `minHeight` prop); Comment / Add link / Show tool calls `align-self: flex-start` (Show tool calls also `font-size: var(--vk-text-sm)`); enclosure I foot `justify-content: space-between`, its right group `display:flex; gap: var(--vk-space-3); align-items:center`; plan label `.pg-sc` override `border: 0; padding: 0; margin-top: var(--vk-space-2)` (add class `.pg-sc--bare`); plan list `list-style:none; padding:0`; Attempt 1 line `border-top: 1px solid var(--vk-color-line); padding-top: var(--vk-space-3)`; "Decisions" and first-paragraph `.pg-small` `margin:0`.

Responsive: only `clamp()` on the title is in the mockup. Between 640px and 1100px the 5fr/4fr/3fr spread is too narrow; ruling P-11 adds one breakpoint. Below 640px the page uses the same component with that single-column rule (the page has no separate phone mockup).

### Content map

| Visible | Source |
|---|---|
| "Superpipeline" (`a.pg-name` → `/`) | copy |
| "Sunday 11 October · in full daylight" | `paperDateline(now, phase)` |
| "Appearance" (`aria-haspopup="dialog"`) | `appearance.pickerOpen = true` |
| "Rakesh Gangwar" + chevron, hidden ", account menu with Sign out" | `personName`; menu "Signed in as Rakesh Gangwar" / "Sign out" (same as Paper shell `mh-menu`, 00-shared §2.3) |
| nav `aria-label="Card window"`: left-arrow "Developer Experience board" | `` `${boardName} board` ``, `href="/b/{boardId}"` |
| "Opened from Developer Experience · Back to the board" | `` `Opened from ${boardName} · ` `` + link (P-12: always the card's own board) |
| "card 4605" + copy `aria-label="Copy card id 4605"` | `shortId`, `copyId()` |
| "Copy link to this card" (link icon), "Edit card" (pencil) | §2.3, `edit.start()` |
| kicker "A letter that needs your reply · 2 days" | `kicker(model, 'page')` |
| `h1#pg-title` "Re: Diagnose Melissa and Anna …" | `reTitle` |
| deck "error-eric stopped in Reproduce after two attempts and has written to you. The brief, the record and the correspondence are enclosed below." | `` `${agent.name} stopped in ${stageName} after ${numberWord(attempts)} attempts and has written to you. The brief, the record and the correspondence are enclosed below.` `` for `lead.kind==='stopped'`; question → "`{agent}` has a question for you in `{stage}`. …"; review → "`{agent}` is waiting for your review in `{stage}`. …"; working → "`{agent}` is working on this in `{stage}`." ; done → "Done in `{stage}`." (deck copy table `PAPER_DECK`) |
| track "I · done / Reported", "II · stopped here / Reproduce", "III · next / Failing test", "IV / Fix" … "VII / Shipped" | `roman(i+1)` + suffix: done stages " · done", current " · stopped here" (needs) / " · here" (otherwise), next " · next"; name |
| byline 1: face error-eric (resting, 32) "**error-eric** · agent for Reproduce, ran attempt 2 · Unclaimed now" | last attempt's agent; `` `agent for ${stageName}, ran attempt ${n}` `` + (unclaimed ? " · Unclaimed now" : "") — when claimed: "**{delegate}** · working it" |
| byline 2: initials "RG" "**Rakesh Gangwar** · owner" | owner initials from name |
| byline 3: face super-chotu (working, 32) "**super-chotu** · asked for it, an agent", `title="An agent with dispatch authority on this board"` | provenance (person: "· asked for it") |
| line: "Waiting on you · 2 days" · "Stage **2 of 7, Reproduce**" · "Attempt **2**" · "Priority **P3**" · "No due date" · "No labels" · "No project" | as drawer, plus `projectName ? 'Project ' + name : 'No project'` |
| "The letter" (`h2.pg-sc`) | copy |
| "Dear Rakesh," + letter + signature (face needs 40) "error-eric" / "Diagnostics, attempt 2 · Friday 9 October, 19:41" + "Copy session id" | as drawer; G-4 |
| reply: "Your reply", "I stopped after two attempts. Send me back with what changed.", select "I · Reported" / "II · Reproduce (this stage)" (roman on the page), note label/placeholder/hint as drawer, "Send back to work", "With no note: “Add a note for error-eric first.”" | as drawer (`pg-grid` is one column) |
| "Enclosure V Correspondence"; "No letters yet. The agent that works this card reads them."; label "Write to whoever works this card"; placeholder "⌘ or Ctrl + Enter posts it"; "Comment" | comments model |
| "Enclosed" | copy |
| "Enclosure I The brief" + description + groups (with faces for message-melissa and audience-anna) + "Project: none · Assign to a project" + "View raw JSON" + "Copy" | as drawer |
| "Enclosure II Things to prove" ordered 1–3; "Agent plan · 1 of 4 steps · 25%"; meter; struck first step | criteria, plan |
| "Enclosure III Who is waiting, and what is attached"; "3 related cards · no sub-tasks (0 open of 0) · 2 references · 1 related piece of prior work" | counts |
| "Relates to Fix the highest-severity blocker found in the clean-room journey · this board"; "Relates to Onboard Message Melissa — marketing and messaging · Agent Onboarding, advisory"; "… Audience Anna … · Agent Onboarding, advisory"; "Reference: agentpod PR #642 · merged"; "Reference: agentpod PR #648 · merged"; "Prior work, fixed: Hermes agent stuck on an E2EE device with 0 olm sessions; a fresh device fixed it." | link kind word (`Relates to`/`Blocked by`/`Blocks`/`Supersedes`) + title + (same board ? " · this board" : ` · ${board}` + (advisory ? ", advisory" : "")); refs; related |
| "Add link" (plus icon) | `links.openAdd()` |
| "The record" | copy |
| "Enclosure IV What happened"; "Asked by super-chotu, an agent allowed to dispatch the one working it. Handed on from Reported: “Melissa and Anna do not answer DMs in Supermessage.”" | provenance + handoff |
| "**Attempt 2** · error-eric · 14 events, no errors · stopped" | newest attempt; errors count from group (`0` → "no errors", else "N error(s)") |
| log rows: "Read the AgentPod hub matrix-inbound log for Melissa’s station" 19:22; "Found session acps_8f86d4e4… reached Hermes; a model reply was produced" 19:30; stop row (signal-text) "Stopped. No fresh DM event to trace; needs one per agent." "19:41 · Fri 9 Oct" | narrative activities of the newest run, each row = verb + " " + body (P-7: the page's verb is part of the sentence, not bold); stop row tone needs only while the card waits; last row time adds " · ddd d Mon" |
| "Show tool calls · all 14 events" | `showToolCalls` toggle; label `` `Show tool calls · all ${events} events` `` / "Hide tool calls" |
| "**Attempt 1** · error-eric · 9 events, no errors · stopped at 11:12" | older attempts, ` at HH:mm` of its end |
| "Decisions: none yet." | decided gates |
| "Accounts Cost and delivery"; "$0.00"; "No estimate yet · attempt 1, $0.00 · attempt 2, $0.00"; meter 0%; "No approved delivery on this card." | cost/estimate/attempts/delivery |
| colophon: "Archive card", "Delete card", "Opened from Developer Experience · Back to the board · card 4605" | actions + copy |

### Interactions & states

00-shared §2.3 + §4. Page-specific: `Copy session id` sits in the signature; no disclosures except raw JSON (the page shows everything open). Gate/question/archived/done/loading states replace "The letter" heading's content in column one exactly as in the drawer; the kicker follows `kicker(model,'page')`; the deck uses `PAPER_DECK`. A missing card shows `.pg-head` with `h1` "This card is not on Developer Experience any more." and "Back to the board".

### Fixture needs

00-shared §5 plus: `AgentSummary.role = 'Diagnostics'` (error-eric); faces for message-melissa / audience-anna (by name). No other records.

---
## P.5 SP-Card-States-Paper — card states gallery (1440×2189, paper)

**Represents:** `/dev/card-states` (00-shared §3) with Paper on. Six cells, each "the top of the letter".

### Component tree

- `lib/components/card/states/CardStatesPaper.svelte` (new). Props `CardStatesProps`. Renders `div.ps` → heading block → `div.ps-grid` with six `div.ps-cell` (caption `span.ps-label` + `article.ps-sheet`). Each sheet = gallery-local compact head (eyebrow, `h2.ps-title`, `p.ps-line`) + the real state component:

| Cell | Caption (verbatim) | Head (gallery-local) | Real component |
|---|---|---|---|
| A | "A · Approval gate" | eyebrow (signal) "A letter that needs a reply", title, line | `GatePaper` `{ boardId, gate, error, onResponse, agent, lead, vibe, size: 'cell' }` — letter + subject + reply |
| B | "B · Agent question" | eyebrow (signal), title, line | `QuestionPaper` `{ model, elicitation, agent, vibe, size: 'cell' }` |
| C | "C · Archived" | banner first, then title, line | `CardStatePaper kind="archived"` (banner, description, last agent, Restore) |
| D | "D · Done" | title, line | `CardStatePaper kind="done"` (done block, letter, Handed on) |
| E | "E · Decision error" | title only | `GatePaper` `{ …, size: 'cell', part: 'reply' }` (P-14) |
| F | "F · Loading" | title only | `CardStatePaper kind="loading"` |

- `card/gate/GatePaper.svelte` (rewrite) props: `{ boardId: string; gate: Gate; error: string | null; onResponse; agent: CardAgent; lead: CardLead; vibe: Vibe; size: 'sheet' | 'page' | 'cell' | 'phone'; part?: 'all' | 'reply' }`. `part='all'`: letter (`vibekit:AgentQuote`) → subject (`vibekit:Disclosure` open + `vibekit:DefinitionGroups` + digest line) → seal → reply (`vibekit:ChoiceList` + `vibekit:Field` note + Send reply). `part='reply'`: the reply form only, options without hints and without the note field (cell E as drawn). Uses `GateDecisionModel` unchanged; "Send reply" calls `model.submit()` (which needs a selection → "Pick a decision first.").
- `card/question/QuestionPaper.svelte` (rewrite) props `{ model: QuestionAnswer; elicitation; agent; vibe; size }`: letter + reply (Field + Send answer).
- `card/state/CardStatePaper.svelte` (new) props `{ kind: 'archived' | 'done' | 'loading'; model: CardModel; vibe: Vibe; size: 'sheet' | 'page' | 'cell' }`.
- Deleted: `gate/GatePaper.svelte.test.ts` assertions on "⚑ awaiting your review" / "Immutable approval subject" (rewritten for the new copy); `LeadWords` use inside GatePaper.

### Layout & CSS

**[app] `CardStatesPaper.svelte`** (gallery frame + compact heads):
```css
.ps { padding: var(--vk-space-6) var(--vk-space-6) var(--vk-space-7); display: flex; flex-direction: column; gap: var(--vk-space-5); }
.ps * { box-sizing: border-box; }
.ps-h1 { margin: 0; font: 500 2.4rem/1.1 var(--vk-font-display); }
.ps-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr)); gap: var(--vk-space-6) var(--vk-space-5); align-items: start; border-top: 2px solid var(--vk-color-text); padding-top: var(--vk-space-5); }
.ps-cell { display: flex; flex-direction: column; gap: var(--vk-space-2); min-width: 0; }
.ps-label { font: 600 11.5px/1.3 var(--vk-font-body); letter-spacing: 0.12em; text-transform: uppercase; color: var(--vk-color-muted); }
.ps-sheet { background: var(--vk-color-surface); border-radius: var(--vk-radius-sm); box-shadow: 0 0 0 1px var(--vk-color-line), 0 10px 30px color-mix(in oklch, var(--vk-color-text) 8%, transparent); padding: var(--vk-space-5); display: flex; flex-direction: column; gap: var(--vk-space-4); min-width: 0; }
.ps-eyebrow { display: inline-flex; align-items: center; gap: var(--vk-space-2); font: 600 11px/1 var(--vk-font-body); letter-spacing: 0.12em; text-transform: uppercase; color: var(--vk-color-muted); }
.ps-eyebrow--sig { color: var(--vk-color-signal-text); }
.ps-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--vk-color-signal); }
.ps-title { margin: 0; font: 500 1.4rem/1.2 var(--vk-font-display); text-wrap: pretty; }
.ps-line { margin: 0; font: 500 11.5px/1.8 var(--vk-font-body); letter-spacing: 0.08em; text-transform: uppercase; color: var(--vk-color-muted); }
.ps-small { font-size: var(--vk-text-sm); color: var(--vk-color-muted); margin: 0; }
.ps-row { display: flex; gap: var(--vk-space-3); flex-wrap: wrap; align-items: center; }
.ps-link { color: var(--vk-color-text); text-underline-offset: 3px; }
```
Heading block inline style `display:flex; flex-direction:column; gap:4px`.

**[app] `GatePaper.svelte` / `QuestionPaper.svelte` / `CardStatePaper.svelte`** (cell size; `.ps-` prefix kept for the `size: 'cell'` variant, `.pp-`/`.pg-` sizes reuse the drawer/page letter CSS above):
```css
.ps-h { margin: 0; font: italic 500 1.2rem/1.2 var(--vk-font-display); }
.ps-reply { display: flex; flex-direction: column; gap: var(--vk-space-3); padding: var(--vk-space-4); background: var(--vk-color-raised); border-radius: var(--vk-radius-sm); border: 1px solid var(--vk-color-line); }
.ps textarea.vk-field__input { min-height: 80px; padding: var(--vk-space-3) var(--vk-space-4); font-size: 16px; line-height: 1.45; resize: vertical; }
.ps .vk-field__input { border-width: 1px; }
.ps .vk-button { border-radius: var(--vk-radius-sm); }
.ps-count { font-size: 12px; color: var(--vk-color-muted); }
.ps-mono { font: 400 11px/1.4 var(--vk-font-mono); color: var(--vk-color-muted); overflow-wrap: anywhere; }
```
The three `.ps textarea` / `.ps .vk-field__input` / `.ps .vk-button` overrides are not app CSS: they are the **[vibekit:Field · paper sheet, cell]** and **[vibekit:Button · paper sheet]** values (P-15 — Paper's sheet must already give `vk-button` `--vk-radius-sm` and 1px field borders; if it does, drop these).

**[vibekit:AgentQuote · paper sheet, letter (cell)]**
```css
.ps-dear { margin: 0; font: italic 400 1.15rem/1.3 var(--vk-font-display); }
.ps-voice { margin: 0; font: 400 1.1rem/1.55 var(--vk-font-display); overflow-wrap: anywhere; }
.ps-sign { display: flex; align-items: center; gap: var(--vk-space-3); }
.ps-sign .n { font: italic 500 1.05rem/1.2 var(--vk-font-display); }
```
Faces 32px (A, B, D), 28px (C).

**[vibekit:Disclosure · paper sheet, boxed (cell)]**
```css
.ps-enc { border: 1px solid var(--vk-color-line); border-radius: var(--vk-radius-sm); }
.ps-enc > summary { list-style: none; display: flex; align-items: baseline; gap: var(--vk-space-2); flex-wrap: wrap; min-height: 48px; padding: var(--vk-space-3) var(--vk-space-4); cursor: pointer; }
.ps-enc > summary::-webkit-details-marker { display: none; }
.ps-enc > summary .t { font: 500 1.05rem/1.3 var(--vk-font-display); }
.ps-encbody { padding: 0 var(--vk-space-4) var(--vk-space-4); display: flex; flex-direction: column; gap: var(--vk-space-3); max-height: 19rem; overflow: auto; }
```
(The scrolling `.ps-encbody` must be keyboard reachable: `tabindex="0" role="region" aria-label="The approval subject"`.)

**[vibekit:DefinitionGroups · paper sheet, stacked small-caps labels]**
```css
.ps-dl { margin: 0; display: flex; flex-direction: column; gap: var(--vk-space-2); }
.ps-dl dt { font: 600 11px/1.3 var(--vk-font-body); letter-spacing: 0.1em; text-transform: uppercase; color: var(--vk-color-muted); }
.ps-dl dd { margin: 2px 0 0; font: 400 1rem/1.5 var(--vk-font-display); }
```

**[vibekit:Seal · paper sheet]** `.ps-seal { display: flex; align-items: center; gap: var(--vk-space-2); font: italic 400 0.95rem/1.3 var(--vk-font-display); color: var(--vk-color-muted); }` (seal icon first).

**[vibekit:ChoiceList · paper sheet]**
```css
.ps-choices { margin: 0; padding: 0; border: 0; display: flex; flex-direction: column; gap: 2px; }
.ps-choices legend { padding: 0; margin-bottom: var(--vk-space-2); font-weight: 600; font-size: var(--vk-text-sm); }
.ps-choice { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: var(--vk-space-2); align-items: start; min-height: 44px; padding: var(--vk-space-2) 0; border-bottom: 1px solid var(--vk-color-line); cursor: pointer; }
.ps-choice input { width: 18px; height: 18px; margin: 3px 0 0; accent-color: var(--vk-color-text); }
.ps-choice b { font: 500 1rem/1.3 var(--vk-font-display); display: block; }
```
(Option hint = `.ps-small` block under the title.)

**[vibekit:Banner · paper sheet, ruled]**
```css
.ps-banner { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: var(--vk-space-3); padding: var(--vk-space-3) 0; border-top: 2px solid var(--vk-color-text); border-bottom: 1px solid var(--vk-color-line); }
.ps-banner b { font: 500 1.1rem/1.3 var(--vk-font-display); display: block; }
```

**[vibekit:DoneBlock · paper sheet]**
```css
.ps-done { display: flex; align-items: baseline; gap: var(--vk-space-3); padding: var(--vk-space-3) 0; border-top: 2px solid var(--vk-color-success); border-bottom: 1px solid var(--vk-color-line); color: var(--vk-color-success-text); }
.ps-done b { font: italic 500 1.6rem/1 var(--vk-font-display); }
```

**[vibekit:Alert · paper sheet, needs]**
```css
.ps-alert { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: var(--vk-space-2); padding: var(--vk-space-3); border-left: 3px solid var(--vk-color-signal); background: var(--vk-color-signal-wash); font-size: var(--vk-text-sm); line-height: 1.45; }
.ps-alert b { color: var(--vk-color-signal-text); }
```
In cell E the row holding Send reply + alert has inline style `align-items: flex-start; flex-wrap: nowrap`, and the button `flex: none`.

**[vibekit:Skeleton · paper sheet]**
```css
.ps-sk { height: 12px; background: var(--vk-color-raised); border-radius: 2px; }
@keyframes ps-fade { 50% { opacity: 0.5; } }
.ps-load .ps-sk { animation: ps-fade 2.4s ease-in-out infinite; }
```
Skeleton bars (in order): `width: 55%`; `width: 30%; height: 18px`; full; full; `width: 70%`. `vibekit:LoadingNote` inline font `italic 400 1rem/1.3 var(--vk-font-display)`. Pixel tests run with `prefers-reduced-motion: reduce` so the fade is frozen at opacity 1 (vibekit Skeleton must honour it).

Responsive: `.ps-grid` auto-fit 400px columns (three per row at 1440, as the artboard). No other rules.

### Content map

| Cell | Visible | Source |
|---|---|---|
| frame | "Card states, in Paper" (`h1.ps-h1`) | copy constant `STATES_TITLE.paper` |
| frame | "Each panel is the top of the letter. Vermilion appears only where a reply is needed now." | copy constant |
| A | eyebrow "A letter that needs a reply" | `kicker(model)` |
| A | "Re: approval. P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix)" | `reTitle(card.title, 'review')` |
| A | "Research & Intelligence · Stage 5 of 6, Recommendation · Awaiting your review" | `` `${boardName} · Stage ${i} of ${n}, ${stageName} · ${stateLine}` `` with `stateLine` review → "Awaiting your review", question → "A question" |
| A | "Dear Rakesh," + "It’s ready for you to review. The exact version you would approve is enclosed." | salutation; `gate.summary` verbatim (P-13) |
| A | face research-ray (needs, 32, `aria-label="research-ray, needs you"`), "research-ray", "Today, 12:48" | gate producer (`speakerOf`); `paperWhen(gate createdAt)` |
| A | "Enclosed: the approval subject" · "· revision 2" (open) | copy + `approvalSubject.revision` |
| A | "Kind" / "Recommendation, one paragraph"; "Synthesis" / "The organization plane exists …" (verbatim) | `approvalSubject.canonical` rows via `subjectRows(canonical)` (= `specGroups` without grouping; `humanizeKey`) |
| A | "digest sha256:9f3ac2e1… · Copy · View raw JSON" | `` `digest ${digest.slice(0, 15)}…` `` (`sha256:` + 8 hex); `CopyButton` link look → full digest; `vibekit:Disclosure` "View raw JSON" → `RawJson canonical` |
| A | seal icon "Approving exactly this version, sealed 9f3a·c2e1." | `` `Approving exactly this version, sealed ${sealOf(digest)}.` `` |
| A | "Your reply" / legend "Your decision" / "Approve" + "File the recommendation as it is." / "Request changes" + "Needs a note; it threads into the next attempt." / "Reject" + "Stop here." | copy; `gate.options` titles; hints = `GateOption.description` (P-5) |
| A | "Add a note (optional)", placeholder "Recorded with your decision.", "0 / 8192" | copy; label becomes "Say what needs to change" when `needNote` (as today) |
| A | "Send reply" + "With nothing picked: “Pick a decision first.”" | copy; `model.needPick` shows "Pick a decision first." as the Field error |
| B | eyebrow, "Re: Superpipeline: manual-delivery completion and approval-subject hardening", "Developer Experience · Stage 4 of 7, Fix · A question" | as A |
| B | "Dear Rakesh," + question verbatim, face coder-kai (needs, 32), "coder-kai", "Today, 11:05" | `elicitation.question`, `elicitation.agentId`, `createdAt` |
| B | "Your reply"; label "Your answer goes straight back to coder-kai"; hint "With no answer: “Type an answer first.”"; "Send answer" | copy with agent name |
| C | archive icon, "Archived 9 Oct", "Its pending review was cancelled when the card was archived." | `` `Archived ${d} ${Mon}` `` from `card.archivedAt`; sentence when a gate on the card has `status==='cancelled'` and `resolvedAt` within 1 minute of `archivedAt` (P-16), else omitted |
| C | "Re: Coordinator dispatch canary — Melissa" | `reTitle` |
| C | "Marketing & Community · Was at stage 3 of 8, Messaging approval · Owner Rakesh Gangwar" | `` `${board} · Was at stage ${i} of ${n}, ${stage} · Owner ${owner}` `` |
| C | description (muted, voice size) "Verify Super Chotu can dispatch Message Melissa. Produce a DRAFT three-sentence messaging brief for workspace operators about registering an agent." | `card.spec.description` verbatim |
| C | face message-melissa (resting, 28), "message-melissa", "Last worked it" | last attempt's agent |
| C | Restore (primary, restore icon) + "Back to the board at Messaging approval." | `model.restore()`; `` `Back to the board at ${stageName}.` `` |
| D | "Re: Onboard Message Melissa — marketing and messaging" | `reTitle` |
| D | "Agent Onboarding · Stage Resident · Priority P2 · Owner Rakesh Gangwar" | done line: `` `${board} · Stage ${stageName} · Priority P${p} · Owner ${owner}` `` |
| D | "This is done." + "Friday 9 October, 19:26 · after 5 attempts" (`role="status"`) | `paperWhen(card.stateSince)` + `` ` · after ${attemptCount} attempts` `` |
| D | "Dear Rakesh," + "Melissa is resident. Her identity, router description and portrait are in place, and you credentialed her at the resident gate." | `lead.sentence` (latest response, `source: 'narrative'`) verbatim |
| D | face onboarding-olivia (done, 32), "onboarding-olivia", "Finished it · asked by super-chotu" | last attempt's agent; "Finished it" + (provenance ? ` · asked by ${queuedByName}` : '') |
| D | "Handed on" (open) + "Profile, router description, safe profile and portrait drafted through this pipeline. No posting, DMs or scheduling without separate operator authorisation." | `model.handoff.summary` verbatim |
| E | "Re: approval. P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’" | `reTitle` of the E card |
| E | "Your reply" / "Your decision" / "Approve" (checked) / "Request changes" / "Reject" / "Send reply" | `GatePaper part='reply'` |
| E | alert icon, "**Not recorded.** This gate was already decided from Matrix by Rakesh Gangwar at 13:02." + link-button "Refresh to see it" | G-1; "Refresh to see it" → `model.refresh()` then `app.refresh()` |
| F | "Re: Diagnose Melissa and Anna Supermessage silence — trace actual failing hop" | title from the snapshot (known before detail) |
| F | skeleton + "Opening the letter…" (`role="status"`, article `aria-busy="true"`) | copy; shown while `!model.detailLoaded` |

### Interactions & states

- A: radio selection (`bind:group={gateModel.selected}`), note typing (counter updates), Send reply → `gateModel.submit()` → `decide(selected)`; with none selected "Pick a decision first."; Request changes with empty note → `needNote` → label "Say what needs to change" + Field error "Request changes needs a note: it threads into the agent’s next attempt."; busy → Send reply `disabled`. Subject disclosure toggles; Copy digest; View raw JSON.
- B: Send answer → `QuestionAnswer.submit()`; empty → hint text turns into the Field error "Type an answer first.".
- C: Restore → `model.restore()`; no decision controls (the archived card's gate is cancelled).
- E: test procedure (00-shared §3): select Approve (already checked in the drawn state: the e2e test clicks it), click Send reply → 409 → alert. "Refresh to see it" refetches.
- F: no interaction; `aria-busy` until detail arrives.

### Fixture needs (gallery cards; literal)

| Cell | Board | Card | Extra records |
|---|---|---|---|
| A | `brd_research` "Research & Intelligence", stages `question` Question, `gather` Gather, `measure` Measure, `synthesise` Synthesise, `recommendation` Recommendation, `filed` Filed | `card_states_gate` "P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix)", stage `recommendation`, state `input-required`, owner `usr_rakesh` | pending gate `gat_states_a` producedBy `agt_research_ray`, created 2026-10-11T12:48+05:30, summary (P-13), options approve/request_changes/reject with descriptions "File the recommendation as it is." / "Needs a note; it threads into the next attempt." / "Stop here.", approvalSubject `{ revision: 2, digest: 'sha256:9f3ac2e17b5d4a0e6c2f9b183d4e5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f', canonical: { kind: 'Recommendation, one paragraph', synthesis: 'The organization plane exists so that one issuer, Accounts, says who a person or an agent is in every product. Before it, each product kept its own users and tokens, so a grant made in one place meant nothing in the next. With one issuer, a workspace, its members and its agents are defined once, and every product checks the same token.', sources: 'Organization plane cutover record, 7 Oct' } }` (P-17) |
| B | `brd_devx` | `card_states_question` "Superpipeline: manual-delivery completion and approval-subject hardening", stage `fix`, `input-required` | elicitation `eli_states_b` agent `agt_coder_kai`, createdAt 2026-10-11T11:05+05:30, question "The handoff to Failing test needs a commit, and the fix for the manual delivery reminder is still on an unmerged branch. Should I hand on the branch commit, or wait until it is merged?", options [] |
| C | `brd_marketing` "Marketing & Community", stages `requested` Requested, `messaging-brief` Messaging brief, `messaging-approval` Messaging approval, `cleared-to-publish` Cleared to publish, `community-triage` Community triage, `reply-approval` Reply approval, `cleared-to-reply` Cleared to reply, `done` Done | `card_states_archived` "Coordinator dispatch canary — Melissa", stage `messaging-approval`, archivedAt 2026-10-09T16:00+05:30, owner `usr_rakesh`, spec.description "Verify Super Chotu can dispatch Message Melissa. Produce a DRAFT three-sentence messaging brief for workspace operators about registering an agent." | attempt by `agt_message_melissa`; gate on `messaging-approval` status `cancelled`, resolvedAt = archivedAt |
| D | `brd_onboarding` "Agent Onboarding", 7 stages ending `resident` Resident (order 7); the six earlier stages are not visible here — seed the board group's Agent Onboarding stage list | `card_states_done` "Onboard Message Melissa — marketing and messaging", stage `resident`, state `completed`, priority 2, attemptCount 5, stateSince 2026-10-09T19:26+05:30, owner `usr_rakesh`, queuedBy `agt_super_chotu` | last attempt agent `agt_onboarding_olivia`; response activity at 19:26 body "Melissa is resident. Her identity, router description and portrait are in place, and you credentialed her at the resident gate."; handoff `{ summary: 'Profile, router description, safe profile and portrait drafted through this pipeline. No posting, DMs or scheduling without separate operator authorisation.' }` |
| E | `brd_research` | `card_states_error` "P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’", stage `recommendation` | gate `gat_states_e` that the snapshot reports pending but the resolve endpoint answers 409 `GATE_ALREADY_DECIDED { decidedBy: 'usr_rakesh', decidedAt: '2026-10-11T13:02+05:30', via: 'matrix' }` (seed: create the gate pending, open the gallery so the snapshot holds it pending, then resolve it through the Matrix-path test endpoint as `usr_rakesh` at 13:02 before the test clicks Send reply) |
| F | `brd_devx` | `card_05823a57e8224605` (00-shared §5) with `holdDetail: true` | — |

---

## P.6 SP-Phone-Card-Paper — the phone letter (390×3902, paper; variants live / archived)

**Represents:** `/b/brd_devx/c/card_05823a57e8224605` at 390px wide (<640px → `CARD_LAYOUTS.paper.phone`). Default baseline = `live`; second baseline = `archived` (tweak `archived: true`).

### Component tree

- `CardDrawer.svelte` → `vibekit:Sheet` (full screen, no scrim) → `lib/components/card/layouts/CardPhonePaper.svelte` (new), props `CardLayoutProps`.
- Order: sticky top bar `.sh` → `header.head` → (archived) `section.arch` → `article.paper` (letter + facts) → (live) sticky `section.reply` → `section.encl` "Enclosed" (5 enclosures) → `footer.foot` "Card actions".
- Gate/question/done/loading on phone: `GatePaper size='phone'`, `QuestionPaper size='phone'`, `CardStatePaper size='phone'` occupy the `article.paper` + `section.reply` positions (no phone mockup draws them; they reuse the cell CSS at phone size, P-18).

### Section placement

| Key | Place | Summary / text |
|---|---|---|
| `error` | above `article.paper` (Alert) | — |
| `status` | `.sc` line in the letter: "Waiting on you", "owner Rakesh Gangwar", "asked by super-chotu", "unclaimed" (+ Assign to me, P-19) | |
| `facts` | `.sc` line: "P3", "no due date", "no labels", "in Reproduce 2 days", "attempt 2" | |
| `editButton` | `footer.foot` "Edit card" (link look, pencil) | |
| `editForm` | replaces `article.paper` + reply while editing | |
| `description` | Enclosure "The brief" → h4 "What was asked" | |
| `delivery` | Enclosure "What happened" → no delivery row drawn; renders `<div data-section="delivery" hidden>` unless a delivery exists, then h4 "Delivery" after "Cost" (P-20) | |
| `resume` | sticky `section.reply` "Your reply · stopped · 2 tries" (live only) | |
| `plan` | "The brief" → h4 "Plan" | "error-eric did not post a plan for this card." |
| `criteria` | "The brief" → h4 "Things to prove" (ordered 1–5) | summary "5 things to prove" |
| `details` | "The brief" → h4 "Details" (5 groups, Show more, raw JSON, Copy) | summary "10 details" |
| `project` | "The brief" → h4 "Project" + "Change project" | summary "project" |
| `links` | "Who is waiting" → h4 "Links" + "Add a link" | summary "no links" |
| `subtasks` | "Who is waiting" → h4 "Sub-tasks" + add row | summary "no sub-tasks" |
| `activity` | "What happened" → h4 "Session activity" (runs) + "Show tool calls" | summary "2 runs" |
| `decisions` | "What happened" → h4 "Decisions" | summary "no decisions" |
| `comments` | "Correspondence" (open) | summary "no comments yet" |
| `handoff` | "What happened" → h4 "Handoff" | |
| `cost` | "What happened" → h4 "Cost" | summary "$0.00" |
| `attempts` | "What happened" → h4 "Attempts" | summary "2 attempts" |
| `related` | "Attached" → h4 "Related prior work" | summary "no related prior work" |
| `references` | "Attached" → h4 "References" + attach row | summary "5 references" |
| `cardActions` | `footer.foot` `.cact` | live: "Archive card", "Delete card…"; archived: "Archived — restore", "Delete card…" |

### Layout & CSS — all **[app]** in `CardPhonePaper.svelte` unless labelled

The root `.r` is `width: 390px` in the artboard; in the app it is `width: 100%` (the Sheet is the viewport). Everything else verbatim:

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
.face{flex:none;display:inline-flex;line-height:0}
.face svg{border-radius:50%}
.sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.small{font-size:14px}
.id{font-size:12px;overflow-wrap:anywhere}
.serif{font-family:var(--vk-font-display)}
.sh{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 16px;padding:4px 0;border-top:1px solid var(--vk-color-text);border-bottom:3px double var(--vk-color-text);position:sticky;top:0;z-index:2;background:var(--vk-color-bg)}
.sh .ib{width:auto;padding:0 12px;border:1px solid var(--vk-color-line);font-size:15px;font-weight:600;gap:6px}
.back{display:inline-flex;align-items:center;gap:2px;min-width:0;min-height:44px;padding:0 6px 0 0;border:0;background:transparent;font-family:var(--vk-font-display);font-style:italic;font-size:17px;cursor:pointer;color:var(--vk-color-text);white-space:nowrap;text-align:left}
.back > span{overflow:hidden;text-overflow:ellipsis}
.head{padding:18px 16px 14px;display:flex;flex-direction:column;gap:8px}
.light{font-family:var(--vk-font-display);font-style:italic;color:var(--vk-color-muted);font-size:16px}
.eye{display:inline-flex;align-items:center;gap:8px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:var(--vk-color-signal-text)}
.eye::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--vk-color-signal)}
.eye.ar{color:var(--vk-color-muted)}
.eye.ar::before{background:var(--vk-color-muted)}
.head h2{font-family:var(--vk-font-display);font-size:28px;line-height:1.18;font-weight:500;overflow-wrap:anywhere;text-wrap:pretty}
.trk{display:flex;flex-direction:column;gap:6px}
.trk p{font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:var(--vk-color-muted);overflow-wrap:anywhere}
.paper{margin:0 16px;padding:20px 18px;background:var(--vk-color-surface);border:1px solid var(--vk-color-line);border-radius:var(--vk-radius-sm);display:flex;flex-direction:column;gap:14px}
.reply{position:sticky;bottom:0;z-index:2;margin:18px 0 0;padding:16px 16px 20px;background:var(--vk-color-raised);border-top:1px solid var(--vk-color-text);display:flex;flex-direction:column;gap:10px}
.reply h3{font-family:var(--vk-font-display);font-size:22px;font-weight:500;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.reply h3 small{font-family:var(--vk-font-body);font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:var(--vk-color-muted)}
.arch{margin:16px 16px 0;padding:14px 16px;border:1px solid var(--vk-color-text);border-radius:var(--vk-radius-sm);display:flex;flex-direction:column;gap:8px;background:var(--vk-color-surface)}
.arch h3{font-family:var(--vk-font-display);font-size:20px;font-weight:500}
.arch .sbtn{align-self:flex-start}
.encl{padding:22px 16px 0;display:flex;flex-direction:column}
.encl > h3{font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;padding-bottom:8px;border-bottom:2px solid var(--vk-color-text)}
.en .in{padding:4px 0 18px;display:flex;flex-direction:column;gap:10px;font-size:15px}
.en h4{font-family:var(--vk-font-display);font-size:17px;font-weight:600;font-style:italic;margin-top:6px}
.nl{list-style:decimal;padding-left:22px;display:flex;flex-direction:column;gap:8px}
.nl li{font-size:15px;line-height:1.45;overflow-wrap:anywhere;padding-left:2px}
.rawrow{display:flex;gap:18px;margin-top:8px}
.addrow{display:flex;gap:8px;align-items:center;margin-top:8px}
.addrow .muted{flex:1}
.cact{display:flex;gap:8px;flex-wrap:wrap}
.foot{padding:20px 16px 28px;display:flex;flex-direction:column;gap:8px}
.foot .ed{text-decoration:underline}
```
`body{margin:0}` is canvas-only (dropped). The `.sh` sticky top and `.reply` sticky bottom stick inside the Sheet's scroller; the Sheet scroller sets `scroll-padding-top` / `scroll-padding-bottom` to the bars' measured heights (as CardStudio does today) so a focused field is never under them.

**[vibekit:IconButton · paper sheet, phone]** `.ib{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;border:0;background:transparent;border-radius:var(--vk-radius-sm);cursor:pointer;color:var(--vk-color-text);padding:0}` — "Open as a page" anchor inline `width:auto; padding:0 12px; gap:6px; border:1px solid var(--vk-color-line); font-size:15px; font-weight:600; text-decoration:none; white-space:nowrap`; right group `display:inline-flex; flex:none; align-items:center; gap:4px`. Close shows icon + `<span aria-hidden="true">Close</span>`.

**[vibekit:Button · paper sheet, link / ruled / primary-full]**
```css
.more,.lnk{display:inline-flex;align-items:center;gap:6px;min-height:44px;border:0;background:transparent;padding:0;font-size:15px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;color:var(--vk-color-text)}
.more{min-height:32px}
.ed{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;min-height:44px;border:0;background:transparent;padding:0;font-size:15px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;color:var(--vk-color-text)}
.sbtn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 16px;border-radius:var(--vk-radius-sm);border:1.5px solid var(--vk-color-line);background:var(--vk-color-surface);color:var(--vk-color-text);font-size:15px;font-weight:600;cursor:pointer;flex:none}
.sbtn.danger{border-color:var(--vk-color-muted)}
.send{display:flex;align-items:center;justify-content:center;gap:8px;min-height:52px;width:100%;border:0;border-radius:var(--vk-radius-sm);background:var(--vk-color-primary);color:var(--vk-color-primary-fg);font-size:17px;font-weight:600;cursor:pointer}
```
(`.more`/`.lnk`/`.ed` = `variant: 'link'` — `.more` is `size: 'sm'`; `.sbtn` = `variant: 'secondary'` phone size; `.sbtn.danger` = `variant: 'secondary', tone: 'danger-outline'`; `.send` = `variant: 'primary', block: true, size: 'lg'`.)

**[vibekit:StageStrip · paper sheet, bars only]**
```css
.bars{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}
.bars i{height:3px;background:var(--vk-color-line)}
.bars i.d{background:var(--vk-color-text)}
.bars i.s{height:5px;background:var(--vk-color-signal)}
```
(`repeat(stages.length, …)`; current bar `.s` is signal only while needs-you; archived → current bar uses `--vk-color-muted` at 5px, P-21.) The caption `.trk p` is app copy.

**[vibekit:AgentQuote · paper sheet, letter (phone)]**
```css
.dear{font-family:var(--vk-font-display);font-size:20px}
.voice{font-family:var(--vk-font-display);font-size:19px;line-height:1.5;overflow-wrap:anywhere;text-wrap:pretty}
.sigb{display:flex;align-items:center;gap:10px;padding-top:12px;border-top:1px solid var(--vk-color-line)}
.sigb .portrait{display:inline-flex;line-height:0;border-radius:50%;box-shadow:0 0 0 1px var(--vk-color-line)}
.sigb p{display:flex;flex-direction:column;line-height:1.3}
.sigb em{font-family:var(--vk-font-display);font-size:18px}
.sigb small{font-size:13px;color:var(--vk-color-muted)}
```
(Phone does not style ids inside the voice: `tokens: false` — P-22.)

**[vibekit:FactList · paper sheet, smallcaps-line (phone)]**
```css
.sc{display:flex;flex-wrap:wrap;gap:2px 12px;font-size:12px;letter-spacing:0.07em;text-transform:uppercase;color:var(--vk-color-muted);align-items:center}
.sc span{overflow-wrap:anywhere;min-width:0}
.sc .atm{min-height:44px;margin:-14px 0;border:0;background:transparent;padding:0;font-size:12px;letter-spacing:0.07em;text-transform:uppercase;text-decoration:underline;text-underline-offset:3px;cursor:pointer;color:var(--vk-color-text);font-weight:600}
```

**[vibekit:Disclosure · paper sheet, enclosure (phone)]**
```css
.en{border-bottom:1px solid var(--vk-color-line)}
.en > summary{min-height:56px;display:flex;flex-direction:column;justify-content:center;cursor:pointer;padding:8px 0}
.en > summary b{font-family:var(--vk-font-display);font-size:19px;font-weight:500}
.en > summary span{font-size:13px;color:var(--vk-color-muted)}
```
(No Open/Close word on phone: `toggleText: false`.)

**[vibekit:DefinitionGroups · paper sheet, stacked (phone)]**
```css
.kvg{display:flex;flex-direction:column;gap:6px}
.kvg + .kvg{margin-top:14px}
.gh{font-size:13px;font-weight:700;letter-spacing:0.04em;color:var(--vk-color-muted)}
.kv{display:flex;flex-direction:column;gap:10px}
.kv dt{font-size:13px;font-weight:700}
.kv dd{font-size:15px;line-height:1.45;overflow-wrap:anywhere}
```
Long values truncate with an inline "Show more" (`.more`, `aria-expanded`) — P-23.

**[vibekit:Field · paper sheet, phone]**
```css
.inp{flex:1;min-width:0;min-height:44px;padding:0 12px;font-size:16px;border:1.5px solid var(--vk-color-faint);border-radius:var(--vk-radius-sm);background:var(--vk-color-surface);color:var(--vk-color-text)}
.ta{width:100%;min-height:72px;padding:10px 12px;font-size:16px;line-height:1.4;border:1.5px solid var(--vk-color-faint);border-radius:var(--vk-radius-sm);background:var(--vk-color-surface);color:var(--vk-color-text);resize:vertical}
.lab{font-size:14px;font-weight:700;display:block;margin:8px 0 4px}
.fld{display:flex;flex-direction:column;gap:4px}
.fld label{font-size:14px;font-weight:600}
.sel{min-height:48px;width:100%;padding:0 12px;font-size:16px;border:1px solid var(--vk-color-text);border-radius:var(--vk-radius-sm);background:var(--vk-color-surface);color:var(--vk-color-text)}
.reply .ta{border-color:var(--vk-color-text)}
```
(`.reply .ta` → Field `emphasis: 'strong'` inside the reply.)

**[vibekit:RunRow · paper sheet, boxed (phone)]**
```css
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
```

**[vibekit:DataTable · paper sheet, attempts list]** (`vibekit:AttemptList` if the inventory prefers a dedicated name)
```css
.att li{display:grid;grid-template-columns:20px auto auto;gap:4px 10px;align-items:center;padding:8px 0;font-size:14px}
.att li + li{border-top:1px solid var(--vk-color-line)}
.att li > span:last-child{grid-column:2 / -1;color:var(--vk-color-muted);overflow-wrap:anywhere}
.att .who{display:inline-flex;align-items:center;gap:6px}
```

**[vibekit:LinkList · paper sheet, cards (phone)]**
```css
.refs{display:flex;flex-direction:column;gap:8px}
.rf{display:flex;flex-direction:column;gap:2px;padding:10px 12px;min-height:44px;border:1px solid var(--vk-color-line);border-radius:var(--vk-radius-sm);background:var(--vk-color-surface);text-decoration:none;color:var(--vk-color-text)}
.rf b{font-size:15px;text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere}
.rf span{font-size:14px;color:var(--vk-color-muted);overflow-wrap:anywhere}
.rf small{font-size:11px;color:var(--vk-color-muted);overflow-wrap:anywhere}
```

Responsive: this component is used below 640px only; the artboard is 390. At 320–639px every rule above is fluid except `.r` (now 100%) and `.ev li` 72px time column (kept).

### Content map (live; archived differences after)

| Visible | Source |
|---|---|
| back (left chevron) "Developer Experience" | `boardName`; `onClose` |
| "Open as a page" (external icon), `aria-label="Open as a page"` | `href={pageHref}` same tab |
| Close icon + "Close", `aria-label="Close (Esc)"` | `onClose` |
| "Sunday, in full daylight" | `paperDay(now, phase)` |
| eye "A letter that needs a reply" | `kicker(model)` |
| `h2#drawer-title` "Re: Diagnose Melissa and Anna Supermessage silence — trace actual failing hop" | `reTitle` |
| bars `role="img" aria-label="Stage 2 of 7, Reproduce, stopped here"` | `` `Stage ${i} of ${n}, ${stage}, ${needs ? 'stopped here' : 'here'}` `` |
| "Stage 2 of 7 · Reproduce, where it stopped · then Failing test" | `` `Stage ${i} of ${n} · ${stage}, where it stopped · then ${next}` `` (not needs: ", now"; last stage: no "then") |
| article `aria-label="Letter from error-eric"` | `` `Letter from ${agent.name}` `` |
| "Dear Rakesh," + voice (phone fixture text) | lead sentence verbatim |
| portrait error-eric (needs, 36), "error-eric", "diagnostics, on Reproduce · Thursday 8 October, 19:41" | `` `${role.toLowerCase()}, on ${stageName} · ${paperWhen(lead.at)}` `` (P-4) |
| `.sc`: "Waiting on you" · "P3" · "no due date" · "no labels" · "in Reproduce 2 days" · "attempt 2" · "owner Rakesh Gangwar" · "asked by super-chotu" · "unclaimed" · "Assign to me" | lower-case fact words; `ageWords`; Assign to me per P-19 |
| reply `h3#reply-h` "Your reply" + small "stopped · 2 tries" | copy + `` `${outcomeWord} · ${attemptCount} tries` `` |
| "Resume at stage" select, selected "2 · Reproduce (where it stopped)" | `resume.targets` (P-24) |
| "Note: what changed, or what should error-eric do differently? It reads this." | copy with agent name |
| "Send back to work" (send icon, full width) | `resume.submit()` |
| "Enclosed" (`h3#encl-h`) | copy |
| "The brief" · "5 things to prove · 10 details · project" | counts; "project" when `projectName` (else "no project") |
| body: "What was asked" + description; "Things to prove" 1–5; "Plan" + "error-eric did not post a plan for this card."; "Details" 5 groups; "View raw JSON" / "Copy"; "Project" + "Marketing & Community — Melissa and Anna onboarding · no milestone" + "Change project" | spec fields; empty plan → `` `${agent} did not post a plan for this card.` ``; project name `` `${projectName}` `` + (milestone ? ` · ${m}` : ' · no milestone') |
| "What happened" · "2 runs · 2 attempts · no decisions · $0.00" | counts |
| body: "Session activity"; "Queued by super-chotu on Rakesh Gangwar's grant · 32 agents may be dispatched."; runs "Run 2 · Reproduce" / "error-eric · Stopped · attempt 2" (open) with rows "Started — Rework run on this card session; read prior persisted evidence first. — Thu 8 Oct", "Stopped — Blocked. Waiting on you; the reason is shown at the top of this card. — 19:41"; "Run 1 · Reproduce" / "error-eric · Sent back · attempt 1" with "Sent back — The board refused completion: repro and observed were missing. — Thu 8 Oct"; "Show tool calls"; "Decisions" "No decisions on this card yet."; "Handoff" "From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output."; "Attempts" rows "1 · error-eric · $0.00 · Sent back: repro and observed missing", "2 · error-eric · $0.00 · Stopped: waiting on you"; "Cost" "$0.00 spent · no estimate · no card cap set" | `grantSummary` phone wording (P-25); RunRow per group, verb per G-5, stop row text P-26, row time P-27; empty handoff sentence P-28; attempt line `` `${outcomeWord}: ${failureReason ?? 'waiting on you'}` ``; cost + `BoardUsage.cardUsdCap` |
| "Who is waiting" · "no links · no sub-tasks" | |
| body: "Links" "Nothing blocks this card and it blocks nothing." "Add a link"; "Sub-tasks" "0 of 0 open. No sub-tasks yet." + input placeholder "Add a sub-task" (sr label "New sub-task title") + "Add" | empty copies; `subtasks.add()` |
| "Attached" · "5 references · no related prior work" | |
| body: 5 reference cards (title / subtitle / meta) ; attach input placeholder "Paste a link to attach" (sr label "Attach a link or Superlibrary item") + "Add"; "Related prior work" "No related prior work found in Superlibrary." | `ref.title`, `ref.subtitle`, meta `refMeta(ref)` (P-29); `refsForm.add()` |
| "Correspondence" · "no comments yet" (open) | |
| body: "No comments yet."; label "Comment"; placeholder "Write a comment"; "⌘ or Ctrl + Enter to post"; "Comment" | comments model |
| foot `aria-label="Card actions"`: "Edit card"; "Archive card" (archive icon); "Delete card…" | actions (`remove()` confirms) |

Archived variant (`card.archivedAt` set): eye `.eye.ar` "Archived on 8 October" (no signal); `section.arch` `aria-labelledby="arch-h"`: "This card was archived on 8 October." / "Nothing is running, so there is no reply to send. Restore it to put it back in Reproduce." / Restore (`.sbtn`, restore icon) → `model.restore()`; `section.reply` not rendered; foot: "Archived — restore" (restore icon) + "Delete card…". `.sc` first fact reads "Archived" (P-30); bars current bar muted (P-21).

### Interactions & states

00-shared §4, plus: back = close; enclosures all closed except Correspondence; "Show more" in a detail row expands it in place (`aria-expanded`); sticky top bar and sticky reply; ⌘/Ctrl+Enter posts the comment; `Delete card…` keeps the confirm. Focus moves to the Sheet on open; Escape closes.

### Fixture needs — per-artboard seed (P-31)

The phone artboards show a **different record** of card 4605 than the desktop artboards (the desktop briefs were paraphrased). Seed helper `seedPhoneCard4605(request, { archived })` replaces the card's spec/attempts/activities/refs before the phone pixel test:

| Field | Value |
|---|---|
| stop reason | "Not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs. No Accounts defect established; no issue filed." |
| stateSince / lead.at | 2026-10-08T19:41:00+05:30 |
| archivedAt | null (live) / 2026-10-08T21:00:00+05:30 (archived) |
| projectId | `prj_mc_onboarding` "Marketing & Community — Melissa and Anna onboarding", no milestone |
| spec.description | "Reproduce and localize why the existing AgentPod bridge Matrix identities for Message Melissa and Audience Anna do not respond to Rakesh in Supermessage. Produce an evidence-backed diagnosis and exact repair proposal; do not attribute silence to missing grants without live evidence." |
| spec.acceptanceCriteria | the 5 strings in the mockup's "Things to prove", verbatim (Trace user DM ingress…; Check real current shared-profile servicing…; Check credential availability by presence only…; Read current AgentPod, Hermes and Accounts contracts/code…; Report separately what was reproduced…) |
| spec.plan | absent |
| spec detail fields + `spec.groups` | `{ "What to do": ["rework","requiredEvidence"], "Who it is about": ["messageMelissa","audienceAnna"], "Background": ["context","latestConfirmedGrant"], "Rules": ["scope","accountsIssues"], "Where work goes": ["repository","routingRule"] }`; values: rework / context / scope / accountsIssues / routingRule = the full texts (the mockup shows each up to "Show more"; the seed carries the shown text + a continuation sentence), `requiredEvidence` = the 5 criteria array (rendered "5 items, listed under Things to prove.", P-32), `messageMelissa` = `{ matrixId: '@agent_message-melissa:id.agentpod.dev', onboardingCard: '<card id of Onboard Message Melissa>' }`, `audienceAnna` likewise, `latestConfirmedGrant` = "Super Chotu fresh station JWT now contains both Melissa and Anna principals in mayDispatch (32 total). Token propagation is confirmed; do not continue treating the grant as missing.", `repository` = `{ repo: 'SuperJackfruitLabs/atelier', visibility: 'private', policy: 'https://github.com/SuperJackfruitLabs/atelier/blob/main/AGENTS.md' }` |
| grant | queuedGrant: 32 principals incl. error-eric, granted by `usr_rakesh` |
| attempts | 1: `agt_error_eric`, outcome `rejected_completion`, failureReason "repro and observed missing", $0; 2: outcome `blocked`, $0 |
| activities | run 1: `rejected_completion` row, action "Sent back", body "The board refused completion: repro and observed were missing.", ts 2026-10-08T15:10; run 2: action "Started", body "Rework run on this card session; read prior persisted evidence first.", ts 2026-10-08T18:55; stop row ts 19:41 (body = the stop reason) |
| handoff | null |
| links / children / related / comments / gates | none |
| references (5) | the five `href`s in the mockup, with `title` / `subtitle` verbatim ("AgentPod v0.1.91 Matrix inbound bridge contract" / "DM ingress → room lookup → Accounts identity/grant → ACP dispatch"; "AgentPod v0.1.91 Matrix reply delivery contract" / "ACP chunks buffered and flushed via bridge-owned Matrix identity"; "AgentPod v0.1.91 ACP transport contract" / "acp.open/attach and bidirectional broker framing"; "Accounts current claims/grant contract" / "Fresh tokens read the stored grant; bridge authorization reads Accounts principal view directly"; "Hermes ACP adapter at the reproduced build" / "Hermes streams agent_message_chunk and returns end_turn over ACP stdio"), provider `github`, sourceType `file` |
| BoardUsage.cardUsdCap | null |

---

## P.7 Gaps (Paper)

| # | Mockup shows | API / code today | Ruling |
|---|---|---|---|
| P-1 | "in full daylight" (dateline, back link, phone) | vibekit `greeting()` has Paper greetings only | (a) `paperLight(phase)` table in `card/paper-words.ts` (P.2); offered to vibekit as `say('phase.light', 'paper')` — shell group's masthead dateline must use the same function |
| P-2 | Paper drawer is a centred sheet floating in a scrolling overlay, not a full-height panel | shell panel is `h-full` | (a) `vibekit:Drawer` `placement: 'sheet'` for Paper: overlay scrolls, sheet `align-self: start` with the mockup margins; `CARD_LAYOUTS.paper.width` as P.1 |
| P-3 | Roman stage numerals with "· done / · stopped here / · next" | StageTrack draws numbers | (a) `vibekit:StageStrip numerals: 'roman'` + suffix words from the app |
| P-4 | "Diagnostics, attempt 2" / "diagnostics, on Reproduce" | `AgentSummary` has no role | (b) add `role: string \| null` to `AgentSummary` (`GET /v1/agents`, from the agent profile's display role); fallback when null: "agent" |
| P-5 | gate option hints ("File the recommendation as it is.") | `GateOption {name,title}` | (b) add `description?: string` to `GateOption` (pipeline template stage gate options; contract `GateOptionSchema`); hint omitted when absent |
| P-6 | the dimmed front page behind the drawer is a simplified 3-column list (`.pp-cols`) | the real Paper board renders behind | (c) the mockup's background is a stand-in; the pixel test masks everything outside `.pp-sheet` (Playwright `mask: [page.locator('[data-board-root]')]`), the scrim colour is still compared in unmasked margins |
| P-7 | Paper desktop spec values, criteria wording and log sentences are shorter paraphrases of the Daylight ones ("Localise why Melissa and Anna do not answer Rakesh in Supermessage.", "No blame without evidence.", "Read the AgentPod hub …", "Prior work, fixed: Hermes agent stuck on an E2EE device; a fresh device fixed it.") | one record per card | (c) data must be identical across vibes: the shared §5 fixture (Daylight's wording) is authoritative; the Paper Card/CardPage baselines are regenerated from the mockup with §5's strings substituted (layout unchanged) |
| P-8 | page Enclosure III shows no sub-task or reference composer | parity needs both | (c) add two link-buttons after "Add link": "Add a sub-task" and "Attach a link", each revealing the phone's `.addrow` field + "Add" inline (closed by default, so the baseline is unchanged except two 44px link-buttons — regenerate the reference) |
| P-9 | four letter sizes (sheet/page/cell/phone) | — | (a) `vibekit:AgentQuote size` prop; Paper sheet defines all four from the CSS above |
| P-10 | faces beside agent names inside a detail value | values are strings | (a) a detail value that equals an agent name (`app.agents` name match), or a comma list of them, renders each with a 20px face |
| P-11 | 5fr/4fr/3fr page spread has no breakpoint | — | (c) add `@media (max-width: 1099.98px) { .pg-spread { grid-template-columns: minmax(0, 1fr); row-gap: var(--vk-space-6); } .pg-col { padding: 0; border-left: 0; } }` (design addition; 1440 baseline unaffected) |
| P-12 | "Opened from Developer Experience" | the page cannot know the opener | (a) always the card's own board name (the drawer only opens cards of the current board) |
| P-13 | gate summary reads "It’s ready for you to review. The exact version you would approve is enclosed." (Paper) vs "All done, ready for your review." (Daylight) | one `gate.summary` | (c) agent text is verbatim and identical across vibes; fixture `gate.summary` = "All done, ready for your review." (Daylight); Paper cell A baseline regenerated with it |
| P-14 | cell E shows the reply without option hints and without the note field | — | (a) `GatePaper part='reply'` renders exactly that; used only by the gallery cell E (the drawer always uses `part='all'`, where the alert sits under Send reply) |
| P-15 | `.ps .vk-button { border-radius: sm }`, 1px field borders | vibekit Paper sheet values unknown | (a) vibekit Paper sheet must define these; the app keeps no override |
| P-16 | "Its pending review was cancelled when the card was archived." | gate `status`/`resolvedAt` exist | (a) derive as in the content map |
| P-17 | Paper subject lists Kind + Synthesis; Daylight also lists Sources | one canonical subject | (c) render every canonical field; Paper cell A baseline regenerated with the "Sources" row (inside the scrolling 19rem body) |
| P-18 | no phone artboard for gate/question/done/loading | — | (a) phone uses the cell-size components at 100% width inside `.paper`'s position |
| P-19 | phone "Assign to me" while the owner is the viewer | today shown only when owner ≠ viewer | (c) keep today's rule: hidden for this fixture (owner is Rakesh) — phone baseline regenerated without it |
| P-20 | phone has no delivery row | parity | (a) "Delivery" h4 in What happened only when a delivery exists; empty → hidden section element |
| P-21 | archived variant still draws the current bar in signal | signal = person needed now | (c) archived: current bar `--vk-color-muted`, 5px; regenerate archived baseline |
| P-22 | phone voice shows ids unstyled; desktop styles them | — | (a) `tokens: false` on phone (as drawn) |
| P-23 | "Show more" after long detail values | — | (a) values longer than 200 characters show up to the last sentence end at or before 200 chars, then "Show more" (`aria-expanded`), expanding in place |
| P-24 | phone resume select lists all 7 stages, current suffixed "(where it stopped)" | resume allows this stage or earlier | (c) list this stage and earlier only (matches `CardResume`); suffix "(where it stopped)" on phone; the closed select's pixels are unchanged |
| P-25 | "Queued by super-chotu on Rakesh Gangwar's grant · 32 agents may be dispatched." | `provenance` has grant size, not grantor | (b) add `queuedGrant.grantedBy: principalId` to the card read shape (`Card.queuedGrantBy`); sentence `` `Queued by ${q} on ${displayPrincipal(grantedBy)}'s grant · ${n} agents may be dispatched.` `` |
| P-26 | run 2 stop row "Blocked. Waiting on you; the reason is shown at the top of this card." | the stop row's body is the full reason | (a) when a row's body equals `lead.sentence`, render this copy instead (say it once) |
| P-27 | first row shows "Thu 8 Oct", later same-day rows "19:41" | — | (a) per run, the first row shows `ddd d Mon` unless today; a row on the same day as the previous row shows `HH:mm` |
| P-28 | "From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output." | handoff null | (a) derived sentence when `handoff` is null and the card is in its first worked stage |
| P-29 | reference meta "github · agentpod · inbound.ts lines 379–786" | `Reference.provider`, `url` | (a) `refMeta(ref)`: provider · repo name · file basename · `lines A–B` parsed from `#L379-L786` |
| P-30 | archived variant's fact line still says "Waiting on you" | — | (c) first fact = `waitingWord` → "Archived" for archived cards |
| P-31 | phone shows a different record of card 4605 (8 Oct, 5 criteria, project, 5 references, no plan, other spec) | one card | (a) per-artboard seed `seedPhoneCard4605` (P.6 fixture); desktop artboards keep §5 |
| P-32 | "Required evidence: 5 items, listed under Things to prove." | value is an array | (a) a detail value deep-equal to `acceptanceCriteria` renders `` `${n} items, listed under Things to prove.` `` |

## P.8 Shared-contract notes

1. §1.2 `CardLayout.width` alone cannot express Paper's sheet placement: needs `placement: 'panel' | 'sheet'` (P-2).
2. §1.4 `status` row: Paper drawer shows only "Unclaimed" (no "error-eric ran attempt 2" chip); the attempt agent appears in the letter's signature and the page byline. G-2's derivation still applies to the signature face.
3. §1.7 needs one more component, `vibekit:ChoiceList` (Paper decides a gate by radio + "Send reply", not three buttons), and size/variant props on `AgentQuote` (`size`, `salutation`, `signature`), `FactList` (`variant`), `Disclosure` (`variant: 'enclosure' | 'boxed'`, `toggleText`), `StageStrip` (`numerals`).
4. §5 fixture values differ from the Paper desktop mockup's paraphrases and from the phone mockups' fuller record — rulings P-7 and P-31; the assembler should apply the same per-artboard-seed rule to every vibe's phone artboard.
5. §3 gallery: cell E uses `GatePaper part='reply'` (P-14) and the 409 path; Paper's E has no field error, so the test only clicks Approve → Send reply.
6. G-1 copy matches Paper exactly; Paper renders "Refresh to see it" as a link-look button.
