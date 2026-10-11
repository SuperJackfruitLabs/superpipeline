# Quiet — card drawer, card page, card states, phone card

Sources: `scratchpad/vibes-mockups/project/SP-Card-Quiet.dc.html`, `SP-CardPage-Quiet.dc.html`, `SP-Card-States-Quiet.dc.html`, `SP-Phone-Card-Quiet.dc.html` (read in full). Shared contract: `00-shared.md` (model, registry, routes, shared fixture §5, shared gaps G-1…G-8, vibekit table §1.7). Quiet's rule throughout: one column of plain text, underlined links, real headings, no decoration, faces small and calm (`filter: grayscale(0.6)` in the drawer, see Q-2), 17–18px body, every target ≥ 44px.

## Q.0 vibekit components used (Quiet sheets)

The CSS quoted below for these pieces is the **reference for the component's Quiet sheet** (`[data-vibe="quiet"]` in vibekit), not app CSS. App layout CSS (grids, columns, gaps, ordering, the drawer's grid column) stays in the app components and is labelled "app layout CSS".

| Component | Props used here | Where |
|---|---|---|
| `vibekit:Drawer` | `{ open: true, labelledBy: 'drawer-title', width: 'min(1120px, 100%)', align: 'end', onClose }` | SP-Card-Quiet frame (`.qt-drawer` + `.qt-scrim`) |
| `vibekit:Sheet` | `{ labelledBy: 'drawer-title', onClose }` | SP-Phone-Card-Quiet frame (`.r`) |
| `vibekit:Button` | `variant: 'primary'` ("Send back to work", "Send answer", "Approve", "Restore"), `'secondary'` ("Comment", "Archive card", "Delete card", "Request changes", "Reject"), `'frame'` (`.qt-x` Close / Open in new window), `'link'` (`.qp-link`, underlined text buttons) | all |
| `vibekit:IconButton` | not used — Quiet never uses icon-only buttons; every control has visible text | — |
| `vibekit:CopyButton` | `{ value: card.id, label: 'Copy card id 4605', text: 'Copy', copiedText: 'Copied' }` rendered as a link-button; `{ value: pageUrl, label: 'Copy link to this card', text: 'Copy link to this card', copiedText: 'Link copied' }`; raw JSON `{ value: JSON.stringify(spec,null,2), label: 'Copy the brief as JSON', text: 'Copy' }` | details row, page bar, brief |
| `vibekit:StageStrip` | `{ stages, current, status, label, labels: 'all', caption }` — Quiet sheet renders it as a plain ordered list of stage names (page "Stages" list, states cells' "Stage 5 of 6: Recommendation" text line) | page, states, phone |
| `vibekit:AgentFace` | `{ name, mood, size: 20 \| 24, variant: 'name' }` (FACE_VARIANT.quiet = 'name') | inline faces in sentences |
| `vibekit:AgentQuote` | `{ agent, who: '<name> stopped on Friday 9 October at 19:41 and wrote:', text, tone: 'needs', tokens: true }` — Quiet sheet: a bold "by" line with a 20px face, then the text as a plain paragraph | stop reason, gate summary, question, finisher's message |
| `vibekit:Field` | `kind: 'select'` (Resume at stage), `'textarea'` (note, comment, answer, gate note), `hint`, `error`, `counter` | resume, comments, gate, question |
| `vibekit:FactList` | `{ facts }` — Quiet sheet renders a two-column `<dl>` (`.qt-dl`) | Details |
| `vibekit:DefinitionGroups` | `{ groups: specGroups(spec), columns: 1 }` — Quiet sheet: `h4` + `.qt-dl` per group | Brief details |
| `vibekit:Checklist` | `{ items, label: 'Plan' }` — Quiet sheet: `<ol>` with "Done: " prefix on done items | Plan |
| `vibekit:LinkList` | `{ items }` — `<ul>` of underlined links | Links, References |
| `vibekit:Alert` | `{ tone: 'needs', title: 'Not recorded.', role: 'alert' }` | cell E |
| `vibekit:Banner` | `{ icon: 'archive', title, text, actions }` — Quiet sheet: bordered box, no icon drawn (icon prop ignored in Quiet) | cell C, phone archived |
| `vibekit:DoneBlock` | `{ title: 'Done', text }` | cell D |
| `vibekit:SubjectFrame` | `{ head, children, seal }` | cell A approval subject |
| `vibekit:Skeleton` + `vibekit:LoadingNote` | `{ shape: 'line' \| 'block' }`, `{ text }` | cell F |
| `vibekit:EmptyState` | `{ text: 'None yet.' \| 'No comments yet. The agent that works this card reads them.' \| … }` | empty sections |
| `vibekit:Disclosure` | `{ summary: 'View raw JSON', level: 4 }` — Quiet sheet: underlined summary, no chevron | brief raw JSON (the mockup draws it as a link; Q-6) |

`CARD_LAYOUTS.quiet = { drawer: CardQuiet, phone: CardPhoneQuiet, width: 'min(1120px, 100%)', align: 'end' }`.

---

## Q.1 SP-Card-Quiet

- Size 1440×2409 (manifest). Vibe quiet. Route `/b/brd_devx/c/card_05823a57e8224605`, drawer open over the Plan board (Quiet board group's `BoardQuiet` list), stopped card (`state: input-required`, `needsHuman.reason: 'blocked'`).

### Component tree

- `lib/components/CardDrawer.svelte` (shell, rewritten per 00-shared §1.6) → `vibekit:Drawer` (width `min(1120px, 100%)`, align end) → `card/layouts/CardQuiet.svelte` (rewritten).
- `CardQuiet.svelte` props: `CardLayoutProps` (00-shared §1.3). Children it renders:
  - `.qt-top` bar: back link `<a href="/b/{boardId}">← Developer Experience board</a>` (closes the drawer: `onclick` calls `onClose()` and lets the href navigate — same destination), `vibekit:Button variant="frame" href={pageHref} target="_blank"` "Open in new window", `vibekit:Button variant="frame"` "Close" (`aria-label="Close (Esc)"`, `onclick={onClose}`).
  - `<h2 id="drawer-title">` title.
  - `.qt-meta` sentence (Content map).
  - Lead region (by state): stopped → `<fieldset class="qt-form">` containing `vibekit:AgentQuote` + resume form (from `model.resume`); gate → `gate/GateQuiet.svelte` (rewritten, §Q.3); question → `question/QuestionQuiet.svelte` (rewritten); archived/done/loading → `card/state/CardStateQuiet.svelte` (§Q.3).
  - `.qt-cols` two-column flow (CSS `columns`) of 13 `.qt-sec` sections (placement table).
- Deleted from today's CardQuiet: the snippet renders, `LeadWords`, the shared `Tabs`.

### Section placement (order top → bottom; columns flow left then right)

| # | Key | Where | Heading / text |
|---|---|---|---|
| 1 | `error` | directly under `.qt-meta`, before the fieldset; `vibekit:Alert tone="needs"` | message verbatim (`model.localError`) |
| 2 | `resume` | `<fieldset class="qt-form">`, legend "Your decision is needed" | stage select, note, "Send back to work" |
| 3 | `status` | `.qt-meta` sentence + "State", "Agent", "Owner", "Asked by" rows of the Details `dl` | see Content map |
| 4 | `facts` | Details `dl` rows Priority, Due, Labels, Attempt, Card id | — |
| 5 | `editButton` | Details section, `.qt-row` under the `dl`: link-button "Edit card" | — |
| 6 | `editForm` | replaces the Details `dl` while `model.edit.editing` (same section, heading stays "Details") | today's fields |
| 7 | `description` | section h3 "Description" | — |
| 8 | `criteria` | section h3 "Acceptance criteria" | — |
| 9 | `plan` | section h3 "Plan (1 of 4 steps done)" | — |
| 10 | `details` | section h3 "Brief details (10)" with h4 groups + "View raw JSON" · "Copy" | — |
| 11 | `handoff` | first paragraph of section h3 "History (2 runs)" | "Handed on from Reported: “…”" |
| 12 | `activity` | list in "History (2 runs)" | one `li` per run |
| 13 | `decisions` | section h3 "Decisions" | "None yet." |
| 14 | `comments` | section h3 "Comments" | — |
| 15 | `links` | section h3 "Links (3)" + "Add link" | — |
| 16 | `subtasks` | `dl` row "Sub-tasks" in h3 "Sub-tasks, Project, Cost, Delivery" | "None. Add a sub-task" |
| 17 | `project` | `dl` row "Project" in the same section | "None. Assign to a project" |
| 18 | `cost` | `dl` row "Cost" | "$0.00, no estimate yet" |
| 19 | `attempts` | `dl` row "Attempts" | "1: error-eric, $0.00, stopped. 2: error-eric, $0.00, stopped." |
| 20 | `delivery` | `dl` row "Delivery" | "None approved" |
| 21 | `references` | section h3 "References and related prior work", first `li`s | — |
| 22 | `related` | same list, last `li` "Related, fixed: …" | — |
| 23 | `cardActions` | section h3 "Card actions" | "Archive card", "Delete card" |

Each `data-section` attribute sits on the smallest element holding that key (the `dl` row's `<div>` wrapper for 16–20 — the `dl` therefore uses `<div>` row wrappers with `display: contents` so the grid is unchanged; Q-7).

### Layout & CSS (verbatim from the source; canvas-only rules omitted)

App layout CSS — `CardQuiet.svelte` `<style>` (prefix `qt-` kept):

```css
.qt-cols { columns: 2 380px; column-gap: var(--vk-space-7); }
.qt-sec { break-inside: avoid; display: flex; flex-direction: column; gap: var(--vk-space-3); padding-bottom: var(--vk-space-5); }
.qt-form { max-width: 820px; }
.qt * { box-sizing: border-box; }
.qt a { color: var(--vk-color-text); text-decoration: underline; text-underline-offset: 3px; }
.qt-top { display: flex; justify-content: space-between; align-items: center; }
.qt-top a { min-height: 44px; display: inline-flex; align-items: center; }
.qt h2 { margin: 0; font: 700 1.75rem/1.25 var(--vk-font-display); text-wrap: pretty; }
.qt-meta { margin: 0; color: var(--vk-color-muted); }
.qt fieldset { margin: 0; border: 3px solid var(--vk-color-signal); border-radius: var(--vk-radius-sm); padding: var(--vk-space-4) var(--vk-space-5) var(--vk-space-5); display: flex; flex-direction: column; gap: var(--vk-space-4); min-width: 0; }
.qt legend { padding: 0 var(--vk-space-2); font: 700 1.25rem/1.2 var(--vk-font-body); }
.qt h3 { margin: 0; font: 700 1.25rem/1.3 var(--vk-font-body); padding-top: var(--vk-space-3); border-top: 1px solid var(--vk-color-line); }
.qt h4 { margin: 0; font: 700 1.0625rem/1.3 var(--vk-font-body); }
.qt p { margin: 0; }
.qt ul, .qt ol { margin: 0; padding-left: 1.4em; display: flex; flex-direction: column; gap: 4px; }
.qt-row { display: flex; gap: var(--vk-space-3); flex-wrap: wrap; align-items: center; }
.qt-select-narrow { max-width: 360px; }   /* was inline style on #qt-resume-at */
```

Write `.qt a`, `.qt h3` etc. as `:where(.qt) a` … so they never outrank vibekit components (common-2 correction 3): e.g. `:where(.qt) a { … }`, `:where(.qt) h3 { … }`, `:where(.qt) p { margin: 0 }`, `:where(.qt) ul, :where(.qt) ol { … }`.

Drawer frame — reference for `vibekit:Drawer` Quiet sheet (the shell provides the overlay; the 1440 artboard draws it as a two-column grid with the board on the left):

```css
.qt { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) min(1120px, 100%); min-height: 900px; }
.qt-board { position: relative; overflow: hidden; padding: var(--vk-space-6); display: flex; flex-direction: column; gap: var(--vk-space-3); }
.qt-scrim { position: absolute; inset: 0; background: color-mix(in oklch, var(--vk-color-text) 45%, transparent); }
.qt-drawer { background: var(--vk-color-surface); border-left: 2px solid var(--vk-color-text); padding: var(--vk-space-5) var(--vk-space-6) var(--vk-space-6); display: flex; flex-direction: column; gap: var(--vk-space-4); min-width: 0; font-size: 1.0625rem; line-height: 1.55; }
```

Mapping: `.qt-drawer` = the Drawer panel (`width: min(1120px,100%)`, so at 1440 the board keeps 320px on the left; the panel scrolls internally, `overflow-y: auto`); `.qt-scrim` = Drawer scrim, Quiet sheet sets `--card-scrim: color-mix(in oklch, var(--vk-color-text) 45%, transparent)`. `.qt-board` is NOT ported: the live `BoardQuiet` sits behind (board group). The mockup's board stub ("Developer Experience", "Superpipeline · 6 cards", "Needs your decision (3)" …) is the Board-Quiet group's content.

Frame button — reference for `vibekit:Button variant="frame"` Quiet sheet:

```css
.qt-x { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 var(--vk-space-3); border: 2px solid var(--vk-color-text); border-radius: var(--vk-radius-sm); background: var(--vk-color-surface); color: var(--vk-color-text); font: 700 1rem/1 var(--vk-font-body); cursor: pointer; }
```
The "Open in new window" instance adds (inline in mockup → app layout CSS) `text-decoration: none; margin-left: auto; margin-right: 8px; font-size: 1rem`.

`vibekit:AgentQuote` Quiet sheet:

```css
.qt-by { display: flex; align-items: center; gap: var(--vk-space-2); margin: 0; font-weight: 700; }
.qt-said { margin: 0; overflow-wrap: anywhere; }
.qt-id { font-family: var(--vk-font-mono); font-size: 0.85em; overflow-wrap: anywhere; }
.qt-face { display: inline-flex; vertical-align: -4px; filter: grayscale(0.6); }
```

`vibekit:Field` Quiet sheet (drawer sizes):

```css
.qt textarea.vk-field__input { min-height: 110px; padding: var(--vk-space-3) var(--vk-space-4); font-size: 1.0625rem; line-height: 1.5; resize: vertical; }
.qt .vk-field__label { font-size: 1rem; }
.qt .vk-field__hint { font-size: 1rem; }
```
(Comment textarea overrides `min-height: 80px` — app layout CSS `.qt-comment { min-height: 80px }`, passed via `class`.)

`vibekit:FactList` / `vibekit:DefinitionGroups` Quiet sheet:

```css
.qt-dl { margin: 0; display: grid; grid-template-columns: minmax(8.5em, max-content) minmax(0, 1fr); gap: 4px var(--vk-space-5); }
.qt-dl dt { font-weight: 700; }
.qt-dl dd { margin: 0; overflow-wrap: anywhere; }
```

Responsive: at viewport < 640px the phone layout (§Q.4) replaces this component. Between 640 and 1120 the panel is 100% wide; `.qt-cols` drops to one column below 2×380 + gap (CSS `columns: 2 380px` does it natively).

### Content map

| Visible | Source |
|---|---|
| "← Developer Experience board" | `'← ' + model.boardName + ' board'` (arrow is text, `aria-hidden` not needed — Quiet reads it) |
| "Open in new window" | copy constant; `aria-label="Open in new window"`; leading external-window stroke icon `aria-hidden` |
| "Close" | copy; `aria-label="Close (Esc)"`; leading × icon `aria-hidden` |
| Title | `card.title` |
| "Stage 2 of 7: Reproduce · Agent: none holding it (error-eric ran attempt 2) · Waiting on you for 2 days" | `` `Stage ${stageIndex+1} of ${stages.length}: ${stageName}` `` · agent clause: delegate → `` `Agent: ${delegate.name}` ``; no delegate + last attempt → `` `Agent: none holding it (${lastAttempt agent name} ran attempt ${attempts.length})` `` (G-2); neither → "Agent: none yet" · state clause: needs-you → `` `Waiting on you for ${ageWords(ageHours)}` ``, else `stateWord` |
| legend "Your decision is needed" | copy (shown for every needs-you lead: stopped, gate, question) |
| face + "error-eric stopped on Friday 9 October at 19:41 and wrote:" | `vibekit:AgentQuote.who` = `` `${name} stopped on ${longDate(lead.at)} and wrote:` `` with `longDate` = en-GB `"Friday 9 October at 19:41"` (weekday long, day, month long, " at ", HH:mm) — new helper `whenLong(iso)` in `lib/when.ts`. Agent name: the last attempt's agent when there is no delegate. Verb by lead kind: stopped → "stopped", failed → "failed", budget → "stopped at the budget" |
| Stop reason paragraph | `lead.sentence` verbatim; only `acps_…` token styled `.qt-id` in this vibe (the other tokens stay plain — Quiet styles only ids matching `/\b[a-z]+_[0-9a-f-]{8,}\b/`, Q-3) |
| "Resume at stage" + options "Stage 1: Reported", "Stage 2: Reproduce (this stage)" | `model.resume.targets` reversed back to stage order (Quiet lists earliest first); label `` `Stage ${n}: ${name}` `` + " (this stage)" on current |
| Note label "What changed, or what should the agent do differently? It reads this." | copy |
| Hint "You must write a note before sending. Up to 8000 characters." | copy; `maxlength=8000` |
| "Send back to work" | copy; empty-note error (Field `error`): "Add a note for error-eric first." (00-shared §4) |
| h3 "Details" | copy |
| State: "Waiting on you, for 2 days" | `` `${stateWord}, for ${ageWords}` `` when needs-you; otherwise `stateWord` |
| Agent: "None holding it. Last run: [face] error-eric" | no delegate → `"None holding it. Last run: "` + face + name; delegate → face + name |
| Owner: "Rakesh Gangwar" | `displayPrincipal(card.ownerUserId, app.members)`; when not you, a link-button "Assign to me" follows (`model.assignToMe()`) — not drawn because the owner is you |
| Asked by: "[face] super-chotu, an agent allowed to dispatch the one working it" | `provenance.queuedByName` + (byAgent ? ", an agent" : "") + (grantCoversDelegate ? " allowed to dispatch the one working it" : "") — from `grantSummary` facts |
| Priority "P3" / Due "No due date" / Labels "None" / Attempt "2" | `P${priority}` or "None"; due date `whenDate(dueAt)` ("Sat 17 Oct") else "No due date" (overdue: prefix "Overdue: ", signal-text); labels joined ", " else "None"; attempt `card.attemptCount` (row always shown in Quiet) |
| Card id "4605 · Copy" | `model.shortId` in `.qt-id`; `vibekit:CopyButton` text "Copy", label "Copy card id 4605" |
| "Edit card" | link-button → `model.edit.start()` |
| h3 "Description" + paragraph | `card.spec.description`; empty → `vibekit:EmptyState "None."` |
| h3 "Acceptance criteria" + `ul` | `model.acceptanceCriteria`; empty → "None." |
| h3 "Plan (1 of 4 steps done)" + `ol` with "Done: " prefix | `` `Plan (${done} of ${total} steps done)` ``; no plan → h3 "Plan" + "None yet." |
| h3 "Brief details (10)", h4 groups, dl rows | `specGroups(spec)`; count = rows; values verbatim (Quiet text here differs from Daylight's — fixture Q-F1) |
| "View raw JSON" · "Copy" | `vibekit:Disclosure` (summary styled as an underlined link) + `vibekit:CopyButton` |
| h3 "History (2 runs)" | `` `History (${activityGroups.length} run${s})` `` |
| "Handed on from Reported: “Melissa and Anna do not answer DMs in Supermessage.”" | `` `Handed on from ${prevStageName}: “${handoff.summary}”` `` — prev stage = the stage the handoff was produced in (`stageEntries` before current); `handoff.summary` string, other keys via StructuredValue below it |
| "Attempt 2, Reproduce, error-eric: stopped at 19:41 on 9 October. 14 events, no errors. Show tool calls" | per run, newest first: `` `Attempt ${n}, ${stageName}, ${agent}: ${outcomeWord} at ${HH:mm} on ${d MMMM}. ${events} events, ${errors ? errors + ' errors' : 'no errors'}.` ``; outcomeWord: blocked → "stopped", completed → "finished", failed → "failed", running → "working since"; "Show tool calls" link-button on the newest run only (toggles `model.showToolCalls`; expanded rows render as a nested `ul` of "19:22 Read AgentPod hub …" lines — `HH:mm verb body`) |
| h3 "Decisions" / "None yet." | `model.decidedGates`; rows "Approved by Rakesh Gangwar at 13:02 on 11 October: note" |
| h3 "Comments", "No comments yet. The agent that works this card reads them.", "Add a comment", "Comment" | copy + `model.comments` |
| h3 "Links (3)", "Relates to <a>…</a> (Agent Onboarding, advisory)", "Add link" | `` `Links (${counts.links})` ``; each row `${kindWord} ` + link; kindWord relates → "Relates to", blockedBy → "Blocked by", blocks → "Blocks", supersedes → "Replaces", resolved → "Was blocked by"; cross-board suffix `` ` (${boardName}, advisory)` `` |
| h3 "Sub-tasks, Project, Cost, Delivery" dl | Sub-tasks: "None. " + link-button "Add a sub-task" (opens inline `vibekit:Field` + "Add"), or `` `${open} open of ${n}` `` + child links; Project: "None. Assign to a project" or name + " · " + milestone + " Change"; Cost: `` `$${costUsd.toFixed(2)}, ${estimate ? 'estimate $'+est : 'no estimate yet'}` ``; Attempts: `` `${i}: ${agent}, $${cost}, ${outcomeWord}.` `` joined by space, oldest first; Delivery: "None approved" or the delivery block |
| h3 "References and related prior work" | refs: `` `${repo} PR #${n}, ${subState}` `` (comma, not middot, in Quiet); related: `` `Related, ${statusWord}: ${text}` `` |
| h3 "Card actions", "Archive card", "Delete card" | copy |

### Interactions & states

All from 00-shared §4, plus: back link closes the drawer (`onClose`) then navigates to `/b/{boardId}` (same page; effectively a close). Focus: visible focus ring from vk.css (`outline: 3px solid var(--vk-color-text)` Quiet token) on all links/buttons. Hover: links unchanged except `text-decoration-thickness: 2px` (vk.css base). Disabled "Send back to work" is never disabled — empty note shows the field error and focuses the textarea. Busy states: buttons show "Sending…", "Posting…", "Archiving…" text (copy constants) with `aria-busy`. Loading (detail not yet fetched): sections that depend on `cardDetail` (History, Decisions, Comments, References) show `vibekit:LoadingNote "Loading…"`; snapshot-backed sections render immediately.

### Fixture needs

00-shared §5 plus the Quiet text of the brief details (Q-F1 below).

---

## Q.2 SP-CardPage-Quiet

- Size 1440×3287. Vibe quiet. Route `/b/brd_devx/c/card_05823a57e8224605/page` (00-shared §2.1), shell slot `bare`. Same stopped card.

### Component tree

- `routes/b/[boardId]/c/[cardId]/page/+page@.svelte` → `CARD_PAGE_LAYOUTS.quiet` = `card/page/CardPageQuiet.svelte` (new), props `CardPageProps` (00-shared §1.3).
- `CardPageQuiet.svelte` renders, in order: skip link `<a class="qp-skip" href="#content">Skip to content</a>`; `<header class="qp-bar">` window bar (`nav aria-label="Card window"`); `<main class="qp-main" id="content">` with the meta row, `h1`, `.qp-meta`, Stages section (`vibekit:StageStrip` Quiet list form), People section (`vibekit:FactList` with faces), `.qp-cols` two columns, footer paragraph.
- Lead region: same switch as the drawer (stopped fieldset / `GateQuiet` / `QuestionQuiet` / `CardStateQuiet`), sized by the page CSS (`.qp` rules).

### Section placement

| # | Key | Where (page) | Heading |
|---|---|---|---|
| 1 | `error` | top of `<main>`, above the meta row, `vibekit:Alert` | — |
| 2 | `facts` | `.qp-meta` sentence (state · stage · attempt · priority · due · labels) + card id in the meta row | — |
| 3 | `editButton` | meta row link "Edit card" (and repeated in Card actions — the second instance is `data-section` free; Q-8) | — |
| 4 | `editForm` | replaces the left column's fieldset while editing; h2 "Edit card" | — |
| 5 | `status` | section h3 "People" (Agent, Owner, Asked by) | People |
| 6 | `resume` | left column, `<fieldset>` legend "Your decision is needed" | — |
| 7 | `description` | left, h2 "Description" | — |
| 8 | `criteria` | left, h2 "Acceptance criteria (3)" (`ol`) | — |
| 9 | `details` | left, h2 "Brief details (10)" | — |
| 10 | `plan` | left, h2 "Plan (1 of 4 steps done)" | — |
| 11 | `links` | left, h2 "Links (3)" | — |
| 12 | `references` | left, h2 "References and related prior work" (PR items) | — |
| 13 | `related` | same list, "Related, fixed: …" | — |
| 14 | `handoff` | right, first paragraph of h2 "History (2 runs)" | — |
| 15 | `activity` | right, h3 per attempt within History | — |
| 16 | `decisions` | right, h2 "Decisions" | — |
| 17 | `comments` | right, h2 "Comments" | — |
| 18 | `subtasks` | right, h2 "Sub-tasks, project, cost and delivery" row Sub-tasks | — |
| 19 | `project` | same, row Project | — |
| 20 | `cost` | same, row Cost | — |
| 21 | `attempts` | same, row Attempts | — |
| 22 | `delivery` | same, row Delivery | — |
| 23 | `cardActions` | right, h2 "Card actions" | — |

The Stages section is the page's rendering of the stage track (no section key; part of the head, like the drawer's `.qt-meta`).

### Layout & CSS (verbatim)

App layout CSS — `CardPageQuiet.svelte` (prefix `qp-` kept; descendant element rules wrapped in `:where(.qp)`):

```css
.qp { min-height: 900px; font-size: 1.125rem; line-height: 1.55; }
.qp * { box-sizing: border-box; }
.qp a { color: var(--vk-color-text); text-decoration: underline; text-underline-offset: 3px; }
.qp p { margin: 0; }
.qp-skip { position: absolute; left: var(--vk-space-3); top: -60px; padding: var(--vk-space-2) var(--vk-space-3); background: var(--vk-color-surface); border: 2px solid var(--vk-color-text); }
.qp-skip:focus { top: var(--vk-space-2); }
.qp-bar { border-bottom: 1px solid var(--vk-color-line); }
.qp-in { max-width: 1320px; margin: 0 auto; padding: 0 var(--vk-space-6); }
.qp-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--vk-space-2) var(--vk-space-5); min-height: 56px; }
.qp-row a, .qp-row .qp-link { min-height: 44px; display: inline-flex; align-items: center; }
.qp-name { font-weight: 700; }
.qp-main { padding: var(--vk-space-6) var(--vk-space-6) var(--vk-space-7); max-width: 1320px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--vk-space-5); }
.qp h1 { margin: 0; font: 700 2rem/1.25 var(--vk-font-display); text-wrap: pretty; max-width: 1000px; }
.qp-meta { color: var(--vk-color-muted); }
.qp-cols { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: var(--vk-space-7); align-items: start; }
.qp-col { display: flex; flex-direction: column; gap: var(--vk-space-5); min-width: 0; }
.qp fieldset { margin: 0; border: 3px solid var(--vk-color-signal); border-radius: var(--vk-radius-sm); padding: var(--vk-space-4) var(--vk-space-5) var(--vk-space-5); display: flex; flex-direction: column; gap: var(--vk-space-4); min-width: 0; }
.qp legend { padding: 0 var(--vk-space-2); font: 700 1.3rem/1.2 var(--vk-font-body); }
.qp h2 { margin: 0; font: 700 1.35rem/1.3 var(--vk-font-body); padding-top: var(--vk-space-3); border-top: 1px solid var(--vk-color-line); }
.qp h3 { margin: 0; font: 700 1.125rem/1.3 var(--vk-font-body); }
.qp-sec { display: flex; flex-direction: column; gap: var(--vk-space-3); }
.qp ul, .qp ol { margin: 0; padding-left: 1.4em; display: flex; flex-direction: column; gap: 6px; }
.qp-acts { display: flex; gap: var(--vk-space-4); flex-wrap: wrap; align-items: center; }
.qp-acts a { min-height: 44px; display: inline-flex; align-items: center; }
.qp-ini { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--vk-color-text); font: 700 10px/1 var(--vk-font-body); vertical-align: -5px; }
.qp-meta-row { min-height: 0; gap: var(--vk-space-2) var(--vk-space-5); }   /* was inline style on the first .qp-row in main */
.qp-foot { border-top: 1px solid var(--vk-color-line); padding-top: var(--vk-space-4); } /* was inline style on the footer <p> */
.qp-root { position: relative; }  /* inline on the root */
```
The root gets `background: var(--vk-color-bg); color: var(--vk-color-text); font-family: var(--vk-font-body)` (inline in mockup → `.qp` rule).

Reference for `vibekit:Button variant="link"` Quiet sheet: `.qp-link { border: 0; background: transparent; padding: 0; color: var(--vk-color-text); font: inherit; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }` plus `min-height: 44px` (inline on the in-fieldset instances).

Reference for `vibekit:StageStrip` Quiet sheet (list form, `labels: 'all'`):
```css
.qp-stages { margin: 0; padding-left: 1.6em; display: flex; flex-wrap: wrap; gap: 4px var(--vk-space-6); }
.qp-stages li { min-width: 0; }
.qp-stages li[aria-current] { font-weight: 700; }
```

Reference for `vibekit:AgentQuote` Quiet sheet at page size: `.qp-said { overflow-wrap: anywhere; }`, `.qp-id { font-family: var(--vk-font-mono); font-size: 0.85em; overflow-wrap: anywhere; }`, `.qp-by { display: flex; align-items: center; gap: var(--vk-space-2); font-weight: 700; flex-wrap: wrap; }`, `.qp-face { display: inline-flex; vertical-align: -5px; filter: grayscale(0.6); }`.

Reference for `vibekit:Field` at page size: `.qp textarea.vk-field__input { min-height: 120px; padding: var(--vk-space-3) var(--vk-space-4); font-size: 1.125rem; line-height: 1.5; resize: vertical; }`, `.qp .vk-field__label, .qp .vk-field__hint { font-size: 1rem; }`; comment textarea `min-height: 96px` (app class); stage select `max-width: 360px` (app class).

Reference for `vibekit:FactList`/`DefinitionGroups`: `.qp-dl { margin: 0; display: grid; grid-template-columns: minmax(8.5em, max-content) minmax(0, 1fr); gap: 6px var(--vk-space-5); } .qp-dl dt { font-weight: 700; } .qp-dl dd { margin: 0; overflow-wrap: anywhere; }`.

Responsive (not in the mockup; required by brief "no side scroll", derived): `@media (max-width: 899.98px) { .qp-cols { grid-template-columns: minmax(0, 1fr); } }` — below 900 the right column follows the left. Below 640 the page keeps this one-column form (the page is not swapped for the phone sheet; the phone sheet is a drawer replacement only).

### Content map

| Visible | Source |
|---|---|
| "Skip to content" | copy |
| "Superpipeline" | copy (product name, bold, not a link) |
| "Back to Developer Experience board" | `` `Back to ${boardName} board` ``, href `/b/{boardId}` |
| "Appearance" | link-button, `aria-haspopup="dialog"` → `appearance.pickerOpen = true` |
| "Rakesh Gangwar — Sign out" | `app.user.name` + " — " + link "Sign out" (`logout()`, then `location.assign('/')`) |
| "Opened from Developer Experience · Back to the board" | `` `Opened from ${boardName} · ` `` + link `/b/{boardId}` (also the footer paragraph, identical) |
| "Card id 4605 · Copy" | `model.shortId`; `vibekit:CopyButton` (`aria-label="Copy card id 4605"`, value full `card.id`) |
| "Copy link to this card" | `vibekit:CopyButton` (00-shared §2.3), copied text "Link copied" |
| "Edit card" | link-button (meta row and Card actions) → `model.edit.start()` |
| h1 | `card.title` |
| "Waiting on you for 2 days · Stage 2 of 7: Reproduce · Attempt 2 · Priority P3 · No due date · No labels" | `` `${stateClause} · Stage ${i} of ${n}: ${stageName} · Attempt ${attemptCount} · Priority ${P} · ${due} · ${labels}` `` with due "No due date" / `Due ${whenDate}`; labels "No labels" / `Labels: a, b` |
| h3 "Stages" + list "Reported (done)", "Reproduce (stopped here)", "Failing test (next)", "Fix" … | StageStrip list: before current → " (done)"; current → needs-you " (stopped here)", working " (working here)", archived " (archived here)", done " (finished)"; next → " (next)" |
| h3 "People": Agent "[face] None holding it. error-eric ran attempt 2 of Reproduce." | no delegate: `` `None holding it. ${agent} ran attempt ${n} of ${stageName}.` `` (G-2); delegate: `` `${name}, working on it` `` / `` `${name}` `` |
| Owner "[RG] Rakesh Gangwar" | `.qp-ini` initials from the display name (first letters of first and last word) + name |
| Asked by "[face] super-chotu, an agent allowed to dispatch the one working it" | as drawer |
| fieldset … "Copy session id" | `vibekit:CopyButton` link form, value = first `acps_<uuid>` in the sentence (G-4); hidden when none |
| Resume form | as drawer (options "Stage 1: Reported", "Stage 2: Reproduce (this stage)") |
| h2 "Acceptance criteria (3)" | `` `Acceptance criteria (${n})` `` (page uses `ol`; drawer `ul` and no count) |
| "Agents in scope" value "[face] message-melissa, [face] audience-anna" | array values whose items match an agent name in `app.agents` render as face (20px) + name; joined ", " (page only; drawer renders plain text — Q-9) |
| "View raw JSON" | `vibekit:Disclosure` styled as a link (Q-6) |
| Links "(this board)" suffix on same-board links | page only: same-board → " (this board)"; cross-board → " (Agent Onboarding, advisory)" |
| History: h3 "Attempt 2, Reproduce, error-eric", p "Stopped at 19:41 on 9 October. 14 events, no errors.", `ol` of narrative events "19:22 Read …", "Show tool calls (all 14 events)" | per run (newest first) h3 `` `Attempt ${n}, ${stage}, ${agent}` ``; p `` `${OutcomeWord} at ${HH:mm} on ${d MMMM}. ${events} events, no errors.` ``; newest run lists its narrative rows `` `${HH:mm} ${verb} ${body}` `` (G-5; see Q-4 for the mockup's rewording); toggle `` `Show tool calls (all ${events} events)` `` / "Hide tool calls" |
| Sub-tasks "None (0 open of 0). Add a sub-task" | page: `` `None (${open} open of ${n}).` `` when 0 children; drawer: "None." |
| Card actions "Edit card", "Archive card", "Delete card" | copy |

### Interactions & states

00-shared §2.3 and §4. Skip link: hidden above the viewport (`top: -60px`), revealed on focus. Gate decisions on the page do not navigate (surface rule). Not-found card: `<main>` shows `<p>This card is not on Developer Experience any more.</p><p><a href="/b/{boardId}">Back to the board</a></p>`. Loading before the snapshot arrives: `<main>` shows `vibekit:LoadingNote "Loading the card…"`.

### Fixture needs

00-shared §5 + Q-F1.

---

## Q.3 SP-Card-States-Quiet

- Size 1440×2272. Vibe quiet. Route `/dev/card-states` (00-shared §3, shell `bare`), test-only gallery of six card tops A–F. Quiet uses no motion: cell F has no skeleton at all, only words (Q-5).

### Component tree

- `routes/dev/card-states/+page@.svelte` → `CARD_STATES_LAYOUTS.quiet` = `card/states/CardStatesQuiet.svelte` (new), props `CardStatesProps`.
- Per cell: `.qs-label` caption (copy), `<section class="qs-panel">` containing, in this order, the state's top: notice (C, D) → `h2` title → `.qs-meta` sentence → lead component:
  - A `gate/GateQuiet.svelte` (rewritten: radio group form; `GateDecisionModel.selected` bound to the radios, `submit()` on "Submit decision"; `needPick` → "Pick a decision first." error; `needNote` → field error).
  - B `question/QuestionQuiet.svelte` (rewritten).
  - C `card/state/CardStateQuiet.svelte kind="archived"`.
  - D `card/state/CardStateQuiet.svelte kind="done"`.
  - E `gate/GateQuiet.svelte` with the G-1 error (no `h2` meta line in this cell; the gate is drawn compact: radios without descriptions — `GateQuiet` prop `compact: boolean`, true only when the gallery asks for it; in the drawer the full form A is always used).
  - F `card/state/CardStateQuiet.svelte kind="loading"`.
- The same `GateQuiet`, `QuestionQuiet`, `CardStateQuiet` render in `CardQuiet` (drawer), `CardPageQuiet` and `CardPhoneQuiet` lead regions. In the drawer the cell's `.qs-panel`, `h2` and `.qs-meta` are replaced by the drawer's own title and `.qt-meta`.

### Section placement

Only the lead region exists here; no section keys render except: C `cardActions` (Restore lives in the archived block; Archive/Delete are not drawn in the cell), D `handoff` ("Handed on" row) and `status` (Finished by/Owner/Asked by rows), A `delivery` none. The gallery is exempt from the 23-key parity test (it is not a card layout).

### Layout & CSS (verbatim)

Gallery app layout CSS (`CardStatesQuiet.svelte`):
```css
.qs { padding: var(--vk-space-6) var(--vk-space-6) var(--vk-space-7); display: flex; flex-direction: column; gap: var(--vk-space-5); font-size: 1.0625rem; line-height: 1.55; }
.qs * { box-sizing: border-box; }
.qs h1 { margin: 0; font: 700 1.75rem/1.2 var(--vk-font-display); }
.qs p { margin: 0; }
.qs a { color: var(--vk-color-text); text-decoration: underline; text-underline-offset: 3px; }
.qs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr)); gap: var(--vk-space-6) var(--vk-space-5); align-items: start; }
.qs-cell { display: flex; flex-direction: column; gap: var(--vk-space-2); min-width: 0; }
.qs-label { font-weight: 700; color: var(--vk-color-muted); }
.qs-panel { background: var(--vk-color-surface); border: 2px solid var(--vk-color-line); border-radius: var(--vk-radius-sm); padding: var(--vk-space-4) var(--vk-space-5) var(--vk-space-5); display: flex; flex-direction: column; gap: var(--vk-space-3); min-width: 0; }
.qs h2 { margin: 0; font: 700 1.3rem/1.3 var(--vk-font-display); text-wrap: pretty; }
.qs-meta { color: var(--vk-color-muted); }
.qs-intro { display: flex; flex-direction: column; gap: 4px; }   /* inline style on the heading wrapper */
.qs-row { display: flex; gap: var(--vk-space-3); flex-wrap: wrap; align-items: center; }
```
Root inline: `background: var(--vk-color-bg); color: var(--vk-color-text); font-family: var(--vk-font-body)`.

Lead components' CSS (app CSS of `GateQuiet`/`QuestionQuiet`/`CardStateQuiet`, scoped; same values at every surface — the drawer/page do not resize them):
```css
.qs fieldset { margin: 0; border: 3px solid var(--vk-color-signal); border-radius: var(--vk-radius-sm); padding: var(--vk-space-3) var(--vk-space-4) var(--vk-space-4); display: flex; flex-direction: column; gap: var(--vk-space-3); min-width: 0; }
.qs fieldset.plain { border-color: var(--vk-color-line); }
.qs legend { padding: 0 var(--vk-space-2); font-weight: 700; font-size: 1.125rem; }
.qs-radio { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: var(--vk-space-2); align-items: start; min-height: 44px; padding: 6px 0; cursor: pointer; }
.qs-radio input { width: 20px; height: 20px; margin: 3px 0 0; accent-color: var(--vk-color-text); }
.qs-subject-lead { font-weight: 700; }   /* inline on "What you are approving (revision 2)" */
.qs-row--top { align-items: flex-start; }  /* inline on E's button row */
.qs-alert-flex { flex: 1 1 220px; }       /* inline on E's alert */
```
`fieldset.plain` (line-coloured border) is used when the fieldset is not a needs-you decision — the drawer's done/archived states never render a fieldset, so `.plain` is used only by the edit form wrapper (Q-10).

Rename note: lead components use the `qs-` prefix in every surface (the drawer's `.qt fieldset` rule (3px signal, space-4/5 padding) applies to the drawer's stopped/resume fieldset only; gate/question fieldsets keep `.qs` sizing). Inside the drawer the component root carries class `qs` so these rules apply; the `.qs` padding/gap/font block above is the gallery root only and is renamed `.qs-gallery` to avoid applying it to the lead roots. So: gallery root `class="qs qs-gallery"`, lead roots `class="qs"`; the first rule's selector becomes `.qs-gallery`.

vibekit sheet references (Quiet):
- `vibekit:AgentQuote`: `.qs-by { display: flex; align-items: center; gap: var(--vk-space-2); font-weight: 700; }`, `.qs-face { display: inline-flex; filter: grayscale(0.6); }` (face 24px; `vertical-align: -4px` when inline in a sentence).
- `vibekit:SubjectFrame`: `.qs-subject { border: 2px solid var(--vk-color-line); border-radius: var(--vk-radius-sm); padding: var(--vk-space-3) var(--vk-space-4); display: flex; flex-direction: column; gap: var(--vk-space-2); }`, its rows `vibekit:DefinitionGroups` with `.qs-dl { margin: 0; display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 4px var(--vk-space-4); } .qs-dl dt { font-weight: 700; } .qs-dl dd { margin: 0; overflow-wrap: anywhere; }`, seal digest `.qs-mono { font-family: var(--vk-font-mono); font-size: 0.85em; overflow-wrap: anywhere; }`.
- `vibekit:Field`: `.qs textarea.vk-field__input { min-height: 88px; padding: var(--vk-space-3) var(--vk-space-4); font-size: 1.0625rem; line-height: 1.5; resize: vertical; }`, `.qs .vk-field__label, .qs .vk-field__hint, .qs .vk-field__error { font-size: 1rem; }`.
- `vibekit:Banner` (archived) and `vibekit:DoneBlock` (done): `.qs-notice { border: 2px solid var(--vk-color-text); border-radius: var(--vk-radius-sm); padding: var(--vk-space-3) var(--vk-space-4); display: flex; flex-direction: column; gap: 4px; }`, `.qs-notice--ok { border-color: var(--vk-color-success-text); background: var(--vk-color-success-wash); color: var(--vk-color-success-text); }` (Quiet Banner draws no icon).
- `vibekit:Alert tone="needs"`: `.qs-alert { border: 3px solid var(--vk-color-signal); border-radius: var(--vk-radius-sm); padding: var(--vk-space-3) var(--vk-space-4); } .qs-alert b { color: var(--vk-color-signal-text); }`.
- `vibekit:LoadingNote`: plain `<p role="status">` + `.qs-meta` line; no `vibekit:Skeleton` in Quiet.

Responsive: the grid is `auto-fit minmax(min(400px,100%),1fr)` — 3 columns at 1440 (content width 1440 − 2×space-6), one column on a phone.

### Content map (all cells)

| Cell / visible | Source |
|---|---|
| h1 "Card states, Quiet" | gallery copy constant |
| "Each panel is the top of the card. Orange appears only where your decision is needed now. No motion." | gallery copy constant |
| Captions "A. Approval gate", "B. Agent question", "C. Archived", "D. Done", "E. Decision error", "F. Loading" | gallery copy constants |
| A h2 "P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix)" | `card.title` (fixture card A) |
| A meta "Research & Intelligence · Stage 5 of 6: Recommendation · Agent: research-ray · Waiting for your review since 12:48" | `` `${boardName} · Stage ${i} of ${n}: ${stageName} · Agent: ${speaker.name} · Waiting for your review since ${HH:mm(gate.createdAt)}` `` (same day → time only; other day → `whenLabel`) |
| A legend "Your decision is needed" | copy |
| A "[face] research-ray: Waiting for your review." | `` `${speaker.name}: ` `` + gate summary verbatim (`gate.summary` = "Waiting for your review."; Q-11) |
| A "What you are approving (revision 2)" | `` `What you are approving (revision ${gate.approvalSubject.revision})` `` |
| A subject rows Kind, Synthesis | `gate.approvalSubject.canonical` fields via `specGroups`-style humanised keys (`kind`, `synthesis`), values verbatim |
| A "Sealed: 9f3a·c2e1. You approve exactly this version. Copy digest · View raw JSON" | `sealOf(gate.approvalSubject.digest)` (existing helper, first 4 + "·" + next 4 hex); "Copy digest" `vibekit:CopyButton` (full digest); "View raw JSON" disclosure of `canonical` |
| A radios: "Approve" / "File the recommendation as it is."; "Request changes" / "Needs a note. The agent reads it on its next attempt."; "Reject" / "Stop the card here." | option names from `GateDecisionModel.options` (`DEFAULT_GATE_OPTIONS` titles); descriptions: `option.description` when the gate option carries one, else copy per role: approve → "Move the card on as it is." , changes → "Needs a note. The agent reads it on its next attempt.", reject → "Stop the card here." — fixture gate A sets approve's description "File the recommendation as it is." (Q-12) |
| A "Note for research-ray (optional)", hint "0 of 8192 characters" | `` `Note for ${speaker.name} (optional)` ``; `` `${note.length} of ${GATE_NOTE_MAX} characters` `` |
| A "Submit decision" + "If nothing is picked: “Pick a decision first.”" | button copy; the meta line is a **gallery-only caption** documenting the error; the real error text "Pick a decision first." appears as a field error when `needPick` (Q-13) |
| B h2 "Superpipeline: manual-delivery completion and approval-subject hardening" | `card.title` |
| B meta "Developer Experience · Stage 4 of 7: Fix · Agent: coder-kai · Asked at 11:05" | `` `… · Agent: ${elicitation agent} · Asked at ${HH:mm(elicitation.createdAt)}` `` |
| B legend "Your answer is needed", "[face] coder-kai asked:", question paragraph | copy; `` `${name} asked:` ``; `elicitation.question` verbatim |
| B "Your answer (it goes straight to coder-kai)", hint "If empty: “Type an answer first.”", "Send answer" | `` `Your answer (it goes straight to ${name})` ``; the hint line is gallery documentation — in the drawer the hint is absent and the error "Type an answer first." shows on empty submit (Q-13) |
| C notice "Archived 9 Oct" / "Its pending review was cancelled when the card was archived. Nothing on this card waits for you." | `` `Archived ${d MMM(card.archivedAt)}` ``; second sentence: when the card has a gate with `status: 'cancelled'` and `decidedAt == archivedAt` → "Its pending review was cancelled when the card was archived." else omitted; "Nothing on this card waits for you." always |
| C h2 "Coordinator dispatch canary — Melissa" | `card.title` |
| C meta "Marketing & Community · Was at stage 3 of 8: Messaging approval · Last agent: [face] message-melissa · Owner: Rakesh Gangwar" | `` `${boardName} · Was at stage ${i} of ${n}: ${stageName} · Last agent: ${lastAttempt agent} · Owner: ${owner}` `` |
| C description paragraph | `card.spec.description` verbatim |
| C "Restore" + "Returns it to Messaging approval." | `model.restore()`; `` `Returns it to ${stageName}.` `` |
| D notice "Completed" / "On Friday 9 October at 19:26, after 5 attempts." | copy "Completed"; `` `On ${whenLong(card.stateSince)}, after ${attemptCount} attempts.` `` |
| D dl Finished by "[face] onboarding-olivia", Final stage "Resident, Agent Onboarding", Owner, Asked by "super-chotu", Handed on "…" | last attempt's agent; `` `${stageName}, ${boardName}` ``; owner; `provenance.queuedByName`; `handoff.summary` verbatim |
| E h2 "P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’" | `card.title` (fixture card E) |
| E radios Approve / Request changes (checked) / Reject; "Say what needs to change" field with error "Request changes needs a note." | compact GateQuiet; label when `selected === changes`: "Say what needs to change" (else "Note for … (optional)"); error copy when `needNote` |
| E alert "Not recorded. This gate was already decided from Matrix by Rakesh Gangwar at 13:02. Refresh to see it." | G-1; "Refresh to see it" is a link-button → `model.refresh()` |
| F h2 title, "Loading the card. This can take a few seconds.", "Still loading: the stage, what the agent said, and the history." | `card.title` from the snapshot; copy constants; shown while `!model.detailLoaded` |

### Interactions & states

A: choosing a radio sets `GateDecisionModel.selected`; "Submit decision" calls `submit()`: none picked → `needPick` → field error "Pick a decision first." under the radios (`role="alert"`); Request changes with empty note → `needNote` → "Request changes needs a note."; otherwise `resolveGate`. Busy: button text "Submitting…". B: "Send answer" → `QuestionAnswer.submit()`. C: "Restore" → "Restoring…" while busy. E: alert appears under/beside the button after a 409 (G-1). F: no animation (Quiet `prefers-reduced-motion` is irrelevant: there is nothing to animate).

### Fixture needs (states cells; literal)

| Cell | Board | Stages (key → name, in order) | Card |
|---|---|---|---|
| A | `brd_research` "Research & Intelligence" | `question` Question, `gather` Gather, `measure` Measure, `synthesise` Synthesise, `recommendation` Recommendation (gate), `filed` Filed | `card_states_gate`: title "P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix)", stage `recommendation`, state `input-required`, delegate `agt_research_ray`, owner `usr_rakesh`, queuedBy `usr_rakesh`. Gate `gat_states_a` pending, created 2026-10-11T12:48+05:30, producedBy `agt_research_ray`, summary "Waiting for your review.", options approve (description "File the recommendation as it is."), request_changes, reject; approvalSubject `{ revision: 2, digest: '9f3ac2e1…' (64 hex starting 9f3ac2e1), canonical: { kind: 'Recommendation, one paragraph', synthesis: 'The organization plane exists so that one issuer, Accounts, says who a person or an agent is in every product. Before it, each product kept its own users and tokens, so a grant made in one place meant nothing in the next. With one issuer, a workspace, its members and its agents are defined once, and every product checks the same token.', sources: 'Organization plane cutover record, 7 Oct' } }` (Quiet does not show `sources`: Q-14) |
| B | `brd_devx` | §5 | `card_states_question`: title "Superpipeline: manual-delivery completion and approval-subject hardening", stage `fix`, state `input-required`, delegate `agt_coder_kai`. Elicitation `eli_states_b` agent `agt_coder_kai`, createdAt 2026-10-11T11:05+05:30, question "The handoff to Failing test needs a commit, and the fix for the manual delivery reminder is still on an unmerged branch. Should I hand on the branch commit, or wait until it is merged?" |
| C | `brd_marketing` "Marketing & Community" | `requested` Requested, `messaging-brief` Messaging brief, `messaging-approval` Messaging approval (gate), `cleared-to-publish` Cleared to publish, `community-triage` Community triage, `reply-approval` Reply approval, `cleared-to-reply` Cleared to reply, `done` Done | `card_states_archived`: title "Coordinator dispatch canary — Melissa", stage `messaging-approval`, archivedAt 2026-10-09T10:00+05:30, owner `usr_rakesh`, one attempt by `agt_message_melissa`, spec.description "Verify Super Chotu can dispatch Message Melissa. Produce a DRAFT three-sentence messaging brief for workspace operators about registering an agent.", one gate status `cancelled` decidedAt = archivedAt |
| D | `brd_onboarding` "Agent Onboarding" | final stage `resident` Resident (stage list owned by the onboarding fixture of the board group; at minimum it ends in `resident`) | `card_states_done`: title "Onboard Message Melissa — marketing and messaging", stage `resident`, state `completed`, stateSince 2026-10-09T19:26+05:30, attemptCount 5, last attempt agent `agt_onboarding_olivia`, owner `usr_rakesh`, queuedBy `agt_super_chotu`, priority 2, handoff.summary "Melissa is resident. Identity, router description, safe profile and portrait are drafted; you credentialed her at the resident gate. No posting, DMs or scheduling without separate operator authorisation." (Quiet wording; differs from Daylight's split "finished it" + "Handed on" — Q-15) |
| E | `brd_research` | as A | `card_states_error`: title "P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’", stage `recommendation`, pending gate `gat_states_e` whose server record is already decided: decidedBy `usr_rakesh`, decidedAt 2026-10-11T13:02+05:30, via `matrix` (the snapshot is seeded stale so the panel still offers the controls; 00-shared §3) |
| F | `brd_devx` | §5 | the §5 card (`card_05823a57e8224605`) with `holdDetail: true` |

---

## Q.4 SP-Phone-Card-Quiet

- Size 390×4714 (manifest, `live` variant). Vibe quiet. Route `/b/brd_devx/c/card_05823a57e8224605` at a 390-wide viewport (`MediaQuery('max-width: 639.98px')` matches → `CARD_LAYOUTS.quiet.phone`). Tweak `archived` (default false): second baseline renders the same card with `archivedAt` set (fixture Q-F3). The artboard's CSS defines shell classes (`.bh .sw .nc .tb .vt .fb .nav`) that its markup never uses — they belong to the shell group and are not ported here.

### Component tree

- `CardDrawer.svelte` → `vibekit:Sheet` (full screen, `role="dialog" aria-modal="true" aria-labelledby="drawer-title"`) → `card/layouts/CardPhoneQuiet.svelte` (new), props `CardLayoutProps`.
- Children in order: `.top` (back button, "Open as a page" link, "Close"); `header.hd` (h2 + meta); lead (live: `fieldset.fs` resume form / `GateQuiet` / `QuestionQuiet`; archived: `section.fs.ar` = `CardStateQuiet kind="archived"` phone form); 16 `section.sx` sections; `footer.foot` Card actions.

### Section placement (order)

| # | Key | Where | Heading / text |
|---|---|---|---|
| 1 | `error` | between header and the lead fieldset, `vibekit:Alert` | — |
| 2 | `resume` | `fieldset.fs` legend "Your decision is needed" (live) | — |
| 3 | `status` | Details `dl`: State, Agent (+ "Assign to me"), Owner, Asked by | — |
| 4 | `facts` | Details `dl`: Priority, Due, Labels, In stage, Stages, Card id | — |
| 5 | `editButton` | under the Details `dl`: link-button "Edit card" (pencil icon) | — |
| 6 | `editForm` | replaces the Details `dl` while editing | — |
| 7 | `details` | in Details: disclosure "Show the 10 fields of the brief" | — |
| 8 | `description` | h3 "Description" | — |
| 9 | `criteria` | h3 "Acceptance criteria (5 things to prove)" + disclosure "Show the 5 things to prove" | — |
| 10 | `plan` | h3 "Plan" | "error-eric did not post a plan for this card." |
| 11 | `activity` | h3 "History (2 runs)" + provenance line + run disclosures + "Show tool calls" | — |
| 12 | `decisions` | h3 "Decisions" | "No decisions on this card yet." |
| 13 | `comments` | h3 "Comments" | — |
| 14 | `links` | h3 "Links" | "Nothing blocks this card and it blocks nothing." + "Add a link" |
| 15 | `subtasks` | h3 "Sub-tasks" | "0 of 0 open. No sub-tasks yet." + input + "Add" |
| 16 | `project` | h3 "Project" | "… · no milestone" + "Change project" |
| 17 | `handoff` | h3 "Handoff" | "From Reported: …" |
| 18 | `cost` | h3 "Cost" | "$0.00 spent · no estimate · no card cap set" |
| 19 | `attempts` | h3 "Attempts (2)" | — |
| 20 | `delivery` | h3 "Delivery" | "No approved delivery on this card." |
| 21 | `references` | h3 "References (5)" + disclosure "Show the 5 references" + attach input | — |
| 22 | `related` | h3 "Related prior work" | "No related prior work found in Superlibrary." |
| 23 | `cardActions` | `footer.foot` h3 "Card actions" | live "Archive card", "Delete card…"; archived "Archived — restore", "Delete card…" |

### Layout & CSS (verbatim; minified in the source, reformatted only by line breaks)

App layout CSS — `CardPhoneQuiet.svelte` (class names are unprefixed in the mockup; **renamed with prefix `qph-`** to avoid colliding with global names: `.r`→`.qph`, `.top`→`.qph-top`, `.hd`→`.qph-hd`, `.sx`→`.qph-sx`, `.foot`→`.qph-foot`, `.facts`→`.qph-facts`, `.addrow`→`.qph-addrow`, `.cact`→`.qph-cact`, `.rawrow`→`.qph-rawrow`, `.wrap`/`.mono`/`.muted`/`.small`/`.id` → `.qph-wrap`/`.qph-mono`/`.qph-muted`/`.qph-small`/`.qph-id`, `.sr` → vibekit `vk-visually-hidden`; the rest keep their names under `.qph`):

```css
.r{width:390px;box-sizing:border-box;background:var(--vk-color-bg);color:var(--vk-color-text);font-family:var(--vk-font-body);font-size:16px;line-height:1.45;display:flex;flex-direction:column}
/* app: width:100% instead of 390px; min-height:100dvh; overflow-y:auto (the sheet scrolls) */
.r *,.r *::before,.r *::after{box-sizing:border-box}
.r h1,.r h2,.r h3,.r h4,.r p,.r ul,.r ol,.r dl,.r dd,.r figure{margin:0}
.r ul,.r ol{padding:0;list-style:none}
:where(.r button,.r select,.r textarea,.r input){font:inherit;color:inherit}
.r a{color:var(--vk-color-text);text-underline-offset:3px}
.wrap{overflow-wrap:anywhere;min-width:0}
.mono{font-family:var(--vk-font-mono)}
.muted{color:var(--vk-color-muted)}
.ico{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.small{font-size:14px}
.id{font-size:12px;overflow-wrap:anywhere}
.r{font-size:17px;line-height:1.5}
.top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;padding:4px 6px 0 4px}
.hd{padding:6px 16px 16px;display:flex;flex-direction:column;gap:6px}
.hd h2{font-size:24px;line-height:1.3;font-weight:700;overflow-wrap:anywhere}
.meta{color:var(--vk-color-muted);font-size:16px;overflow-wrap:anywhere}
.fs{margin:0 16px;padding:12px 16px 18px;border:2px solid var(--vk-color-text);border-radius:var(--vk-radius-sm);display:flex;flex-direction:column;gap:12px;min-width:0}
.fs legend{padding:0 6px;font-size:19px;font-weight:700}
.fs .lead{overflow-wrap:anywhere}
.fs .why{font-weight:700}
.fs.ar{border-color:var(--vk-color-muted)}
.sx{padding:20px 16px 0;display:flex;flex-direction:column;gap:8px}
.sx > h3{font-size:20px;font-weight:700;padding-top:12px;border-top:1px solid var(--vk-color-line)}
.sx .nl li,.sx .kv dd{font-size:16px}
.facts{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 14px;font-size:16px}
.facts dt{color:var(--vk-color-muted)}
.facts dd{overflow-wrap:anywhere}
.facts .atm{min-height:44px;margin:-10px 0;border:0;background:transparent;padding:0;font-size:16px;text-decoration:underline;text-underline-offset:4px;cursor:pointer;color:var(--vk-color-text)}
.addrow{display:flex;gap:8px;align-items:center;margin-top:8px}
.addrow .muted{flex:1}
.rawrow{display:flex;gap:18px;margin-top:8px}
.cact{display:flex;gap:8px;flex-wrap:wrap}
.foot{padding:20px 16px 32px}
.foot h3{font-size:20px;font-weight:700;padding-top:12px;border-top:1px solid var(--vk-color-line);margin-bottom:8px}
.runs{display:flex;flex-direction:column;gap:8px;margin-top:8px}
.refs{display:flex;flex-direction:column;gap:8px}
.att li{display:grid;grid-template-columns:20px auto auto;gap:4px 10px;align-items:center;padding:8px 0;font-size:14px}
.att li + li{border-top:1px solid var(--vk-color-line)}
.att li > span:last-child{grid-column:2 / -1;color:var(--vk-color-muted);overflow-wrap:anywhere}
.att .who{display:inline-flex;align-items:center;gap:6px}
```
Inline styles: the "Open as a page" and "Close" `.ib` instances add `padding: 0 10px; font-size: 17px; text-decoration: underline; text-underline-offset: 4px` (+ `white-space: nowrap` on the link) → app class `.qph-textbtn`; their wrapper `display:inline-flex;align-items:center;gap:4px` → `.qph-topacts`; meta faces `vertical-align:-4px` → `.qph-face-inline`; archived h3 `font-size: 19px` → `.qph-arch-h`.

vibekit sheet references (Quiet, phone sizes — the components switch on container width, not a separate component):

- `vibekit:Button variant="link"` / `vibekit:IconButton` text form: `.ib{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;border:0;background:transparent;border-radius:var(--vk-radius-sm);cursor:pointer;color:var(--vk-color-text);padding:0}`, `.back{display:inline-flex;align-items:center;gap:4px;min-height:44px;padding:0 8px 0 4px;border:0;background:transparent;font-size:17px;text-decoration:underline;text-underline-offset:4px;cursor:pointer;color:var(--vk-color-text);text-align:left;white-space:nowrap}`, `.more,.lnk{display:inline-flex;align-items:center;gap:6px;min-height:44px;border:0;background:transparent;padding:0;font-size:15px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;color:var(--vk-color-text)} .more{min-height:32px}` (`.more` is below 44px: Q-16).
- `vibekit:Button variant="secondary"` phone: `.sbtn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 16px;border-radius:var(--vk-radius-sm);border:1.5px solid var(--vk-color-line);background:var(--vk-color-surface);color:var(--vk-color-text);font-size:15px;font-weight:600;cursor:pointer;flex:none} .sbtn.danger{border-color:var(--vk-color-muted)}` (`danger` = Button prop `tone: 'destructive'`).
- `vibekit:Button variant="primary" block`: `.go{min-height:52px;width:100%;border:0;border-radius:var(--vk-radius-sm);background:var(--vk-color-primary);color:var(--vk-color-primary-fg);font-weight:700;font-size:18px;cursor:pointer}`.
- `vibekit:Field`: `.fld{display:flex;flex-direction:column;gap:4px} .fld label{font-weight:700;font-size:17px} .fld .hint{font-size:15px;color:var(--vk-color-muted)} .sel{min-height:48px;width:100%;padding:0 12px;font-size:17px;border:2px solid var(--vk-color-text);border-radius:var(--vk-radius-sm);background:var(--vk-color-surface);color:var(--vk-color-text)} .ta{width:100%;min-height:72px;padding:10px 12px;font-size:16px;line-height:1.4;border:1.5px solid var(--vk-color-faint);border-radius:var(--vk-radius-sm);background:var(--vk-color-surface);color:var(--vk-color-text);resize:vertical} .r .ta{border:2px solid var(--vk-color-text);font-size:17px} .inp{flex:1;min-width:0;min-height:44px;padding:0 12px;font-size:16px;border:1.5px solid var(--vk-color-faint);border-radius:var(--vk-radius-sm);background:var(--vk-color-surface);color:var(--vk-color-text)} .lab{font-size:14px;font-weight:700;display:block;margin:8px 0 4px}`.
- `vibekit:Disclosure`: `.dsc summary{min-height:44px;display:flex;align-items:center;cursor:pointer;text-decoration:underline;text-underline-offset:4px} .dsc .in{display:flex;flex-direction:column;gap:10px;padding:4px 0 8px}`.
- `vibekit:DefinitionGroups` (stacked form): `.kvg{display:flex;flex-direction:column;gap:6px} .kvg + .kvg{margin-top:14px} .gh{font-size:13px;font-weight:700;letter-spacing:0.04em;color:var(--vk-color-muted)} .kv{display:flex;flex-direction:column;gap:10px} .kv dt{font-size:13px;font-weight:700} .kv dd{font-size:15px;line-height:1.45;overflow-wrap:anywhere}`; long values clamp with "Show more" (new prop `clampChars: 240`, Q-17).
- `vibekit:Checklist` / numbered list: `.nl{list-style:decimal;padding-left:22px;display:flex;flex-direction:column;gap:8px} .nl li{font-size:15px;line-height:1.45;overflow-wrap:anywhere;padding-left:2px}`.
- `vibekit:RunRow`: `.run{border:1px solid var(--vk-color-line);border-radius:var(--vk-radius-sm);background:var(--vk-color-surface)} .run summary{min-height:44px;padding:8px 12px;display:flex;flex-direction:column;justify-content:center;cursor:pointer} .rt{font-weight:700;font-size:15px} .rm{font-size:13px;color:var(--vk-color-muted)} .ev{border-top:1px solid var(--vk-color-line)} .ev li{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:8px;padding:8px 12px;font-size:14px;line-height:1.4;overflow-wrap:anywhere} .ev li + li{border-top:1px solid var(--vk-color-line)} .evt{font-weight:700} .tm{color:var(--vk-color-muted);font-size:13px;white-space:nowrap} .r .run{border:0;background:transparent;border-radius:0} .r .run{border-left:3px solid var(--vk-color-line);padding-left:4px}`.
- `vibekit:LinkList` (card form): `.rf{display:flex;flex-direction:column;gap:2px;padding:10px 12px;min-height:44px;border:1px solid var(--vk-color-line);border-radius:var(--vk-radius-sm);background:var(--vk-color-surface);text-decoration:none;color:var(--vk-color-text)} .rf b{font-size:15px;text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere} .rf span{font-size:14px;color:var(--vk-color-muted);overflow-wrap:anywhere} .rf small{font-size:11px;color:var(--vk-color-muted);overflow-wrap:anywhere} .r .rf{border:0;background:transparent;border-radius:0} .r .rf{padding:6px 0;border-bottom:1px solid var(--vk-color-line)}`.
- `vibekit:AgentFace` phone: `.face{flex:none;display:inline-flex;line-height:0} .face svg{border-radius:50%} .face svg{filter:saturate(0.4)}` (phone uses `saturate(0.4)`, desktop `grayscale(0.6)` — Q-2).

Responsive: the sheet is fluid (`width:100%`); every row wraps; nothing has a fixed width except the 20px icon and 72px event-time column.

### Content map

| Visible | Source |
|---|---|
| "← Developer Experience board" (button) | `onClose()`; text `` `${boardName} board` ``, arrow `aria-hidden` |
| "Open as a page" | `<a href={pageHref}>` same tab, `aria-label="Open as a page"` |
| "Close" | `onClose()`, `aria-label="Close (Esc)"` |
| h2 | `card.title` |
| meta live "Stage 2 of 7: Reproduce · Agent: [face] error-eric · Stopped 2 days ago" | `` `Stage ${i} of ${n}: ${stageName} · Agent: ` `` + face + (delegate ?? last attempt agent) + " · " + lead clause: stopped → `` `Stopped ${ageWords} ago` ``, gate → `` `Waiting for your review since ${time}` ``, question → `` `Asked at ${time}` ``, working → "Working", done → `` `Done ${whenLong}` `` |
| meta archived "… · Archived on 8 October" | `` `Archived on ${d MMMM(archivedAt)}` `` |
| legend "Your decision is needed" | copy |
| "Stopped. Waiting for you. 2 tries so far." | `` `${verb}. Waiting for you. ${attemptCount} ${attemptCount === 1 ? 'try' : 'tries'} so far.` `` verb: stopped → "Stopped", failed → "Failed", budget → "Over budget" |
| "error-eric wrote: Not reproduced end-to-end: …" | `` `${agent} wrote: ` `` + `lead.sentence` verbatim **with its first letter as written**; the mockup capitalises "Not" while the desktop artboards show "not" — the app shows the agent's text exactly (Q-18) |
| "Resume at stage" + options "1 · Reported" … "7 · Shipped", current "(where it stopped)" | phone lists **all** stages (later ones included); later targets are not offered by `ResumeModel.targets` today (this stage and earlier only) → Q-19 |
| "Note for error-eric" + hint "Say what changed, or what to do differently. error-eric reads this." | `` `Note for ${agent}` ``; `` `Say what changed, or what to do differently. ${agent} reads this.` `` |
| "Send back to work" | resume submit |
| Archived block h3 "This card is archived", "Archived on 8 October. It is not running, so there is nothing to decide. Restore puts it back in Reproduce.", "error-eric's last message: …", "Restore" | copy + `` `Archived on ${d MMMM}. It is not running, so there is nothing to decide. Restore puts it back in ${stageName}.` `` + `` `${agent}'s last message: ` `` + `lead.sentence` (archived keeps `needsHuman.detail`) + `model.restore()` |
| Details: State "Stopped, waiting on you" / archived "Archived (was stopped, waiting on you)" | live `stateWord` phone form: stopped → "Stopped, waiting on you"; archived → `` `Archived (was ${live form lower-cased})` `` |
| Agent "error-eric (last run). Unclaimed: Assign to me" | no delegate: `` `${lastAgent} (last run). Unclaimed: ` `` + link-button "Assign to me" → **`model.assignToMe()` sets the owner, not the delegate** — the mockup places it under "Agent"; ruling Q-20 |
| Owner "Rakesh Gangwar" | owner name |
| Asked by "super-chotu, on Rakesh Gangwar's grant" | `` `${queuedByName}, on ${grantOwnerName}'s grant` `` — grant owner is not in `cardProvenance` → Q-21 |
| Priority "3" | `card.priority` as a bare number on phone ("P3" elsewhere; Q-22) |
| Due "None" / Labels "None" | as drawer but "None" |
| In stage "Reproduce for 2 days, attempt 2" | `` `${stageName} for ${ageWords}, attempt ${attemptCount}` `` |
| Stages "1 Reported (done), 2 Reproduce (here), 3 Failing test, …" | StageStrip text form: `` `${n} ${name}` `` + " (done)" before current, " (here)" current; joined ", " |
| Card id "card_05823a57e8224605" | full `card.id` (phone shows the full id, no Copy button — Q-23) |
| "Edit card" | `model.edit.start()` |
| "Show the 10 fields of the brief" | `` `Show the ${rows} fields of the brief` `` |
| brief groups What to do / Who it is about / Background / Rules / Where work goes | `specGroups` with the phone fixture's keys (Q-F2) |
| "Show more" | per value longer than 240 chars: clamped to 240 then "Show more" (`aria-expanded`) |
| "View raw JSON" · "Copy" | as drawer |
| h3 "Description" | as drawer (phone fixture text) |
| h3 "Acceptance criteria (5 things to prove)", disclosure "Show the 5 things to prove", numbered list | `` `Acceptance criteria (${n} things to prove)` ``; `` `Show the ${n} things to prove` `` |
| h3 "Plan" + "error-eric did not post a plan for this card." | no plan: `` `${agent} did not post a plan for this card.` `` |
| h3 "History (2 runs)" + "Queued by super-chotu on Rakesh Gangwar's grant · 32 agents may be dispatched." | provenance: `` `Queued by ${queuedByName} on ${grantOwner}'s grant · ${grantSize} agents may be dispatched.` `` (grantSize counts principals; the mockup says "agents" — copy uses "agents" when every principal in the grant is an agent, else "principals") |
| Run summaries "Run 2 · Reproduce" / "error-eric · Stopped · attempt 2"; "Run 1 · Reproduce" / "error-eric · Sent back · attempt 1" | `` `Run ${n} · ${stageName}` ``; `` `${agent} · ${outcomeWord} · attempt ${n}` `` with outcome blocked → "Stopped", rejected-completion → "Sent back" |
| Event rows "Started / Rework run on this card session; read prior persisted evidence first. / Thu 8 Oct"; "Stopped / Blocked. Waiting on you; the reason is shown at the top of this card. / 19:41"; "Sent back / The board refused completion: repro and observed were missing. / Thu 8 Oct" | verb (G-5) / `body` verbatim / time: same day as the row before → HH:mm, else `EEE d MMM`. The "Stopped" row's body is product copy, not agent text: for the run's terminal stop row the app writes "Blocked. Waiting on you; the reason is shown at the top of this card." instead of repeating the reason (say it once) |
| "Show tool calls" | toggle (`aria-pressed`) |
| Decisions "No decisions on this card yet." | empty copy (phone) |
| Comments "No comments yet.", label "Comment", placeholder "Write a comment", "⌘ or Ctrl + Enter to post", "Comment" | copy; `model.comments` |
| Links "Nothing blocks this card and it blocks nothing." + "Add a link" | empty copy when `counts.links === 0` |
| Sub-tasks "0 of 0 open. No sub-tasks yet." + input "Add a sub-task" (label "New sub-task title", visually hidden) + "Add" | `` `${open} of ${n} open.` `` + (n === 0 ? " No sub-tasks yet." : ""); `model.subtasks` |
| Project "Marketing & Community — Melissa and Anna onboarding · no milestone" + "Change project" | `projectName` + " · " + (milestone ?? "no milestone"); button "Change project" / "Assign to a project" |
| Handoff "From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output." | no handoff object: `` `From ${firstStage}: queued by ${queuedByName} on ${d MMM(card.createdAt)} with the brief above. No earlier stage output.` `` (`card.createdAt` not in `Card` → Q-24) |
| Cost "$0.00 spent · no estimate · no card cap set" | `` `$${cost} spent · ${est ? 'estimate $'+est : 'no estimate'} · ${board.usage.cardUsdCap ? 'card cap $'+cap : 'no card cap set'}` `` |
| Attempts (2) rows "1 [face] error-eric $0.00 / Sent back: repro and observed missing", "2 … / Stopped: waiting on you" | per attempt: n, face+agent, `$cost`, `` `${outcomeWord}: ${attempt.failureReason ?? outcome detail}` `` — "repro and observed missing" = `failureReason` of run 1; "waiting on you" for the blocked current run (copy) |
| Delivery "No approved delivery on this card." | empty copy |
| References (5), "Show the 5 references", five link cards (title / description / "github · agentpod · inbound.ts lines 379–786") + attach input ("Paste a link to attach", label "Attach a link or Superlibrary item") + "Add" | `Reference.title`, `Reference.metadata.description`, source line derived from the URL: `` `github · ${repo} · ${file} lines ${a}–${b}` `` from `/blob/<sha>/<path>#L<a>-L<b>` (Q-25) |
| Related "No related prior work found in Superlibrary." | empty copy |
| Card actions live "Archive card", "Delete card…"; archived "Archived — restore", "Delete card…" | copy; archived button → `model.restore()` |

### Interactions & states

00-shared §4; plus "Show more" toggles one value (`aria-expanded`); sub-task input Enter = Add; reference input Enter = Add (`model.refsForm.add()`); "Assign to me" (Q-20). Archived variant: lead region swaps to the archived block; no fieldset; the stage select and note are absent; "Archive card" becomes "Archived — restore". Gate/question on phone: `GateQuiet`/`QuestionQuiet` render inside `.fs` sizing (border 2px text colour — the phone uses text-coloured, not signal, borders: Q-26).

### Fixture needs (phone; per-artboard seed)

Q-F2 below.

---

## Q.5 Fixtures not in 00-shared §5

- **Q-F1 (Quiet desktop Card + CardPage brief text).** The Quiet artboards show shorter values than Daylight for four of the ten brief fields: Objective "Find why Melissa and Anna do not answer Rakesh in Supermessage."; Deliverable "A diagnosis with evidence, and the repair proposal."; Attribution "No blame without evidence."; Issues "Only for an established defect."; Messages "Metadata only, never contents." (Evidence, Out of scope, Agents in scope, Surfaces, Fix goes to identical to Daylight). One card cannot hold both. Ruling: agent/spec text is verbatim, so one text must be the seed; the seed uses the Daylight values (00-shared §5) and the Quiet baselines are regenerated from the mockup with those values (Q-27, ruling c).
- **Q-F2 (phone, all vibes' phone artboards appear to share it).** Per-artboard seed `seedPhoneCard()` replacing §5's card fields:
  - spec.description "Reproduce and localize why the existing AgentPod bridge Matrix identities for Message Melissa and Audience Anna do not respond to Rakesh in Supermessage. Produce an evidence-backed diagnosis and exact repair proposal; do not attribute silence to missing grants without live evidence."
  - spec.acceptanceCriteria: the five items listed verbatim in the phone markup ("Trace user DM ingress, room routing/bridge identity, … for each agent.", "Check real current shared-profile servicing rather than stale local gateway_state.json; these profiles are not separately startable.", "Check credential availability by presence only; never print .env, tokens or secret files. Profiles were cloned without messaging tokens intentionally because identities are bridge-owned.", "Read current AgentPod, Hermes and Accounts contracts/code; do not use retired Fleet grant endpoints or guess API behavior.", "Report separately what was reproduced, what cannot be accessed and the exact bounded repair needed; link evidence and preserve tenant/principal boundaries.").
  - no `spec.plan`.
  - spec detail fields (10) with `SPEC_GROUP_OF`: `rework`, `requiredEvidence` → "What to do"; `messageMelissa`, `audienceAnna` → "Who it is about"; `context`, `latestConfirmedGrant` → "Background"; `scope`, `accountsIssues` → "Rules"; `repository`, `routingRule` → "Where work goes". Values: rework "Previous run ended with interim prose while child traces were pending; board rejected completion because repro and observed were missing. Do not spawn background delegate_task children on this rework: finish the bounded diagnosis in this card session." + the remainder hidden behind "Show more" (full text is the production value; the visible prefix must equal the mockup's text up to "Show more"); requiredEvidence = the acceptance-criteria array (rendered as "5 items, listed under Things to prove." — derivation: an array value equal to `acceptanceCriteria` renders that sentence); messageMelissa `{ id: '@agent_message-melissa:id.agentpod.dev', onboardingCard: 'card_onb_melissa' }` → "@agent_message-melissa:id.agentpod.dev · onboarding card" (link); audienceAnna likewise; context, latestConfirmedGrant, scope, accountsIssues, routingRule verbatim from the markup (prefixes before "Show more"); repository `{ name: 'SuperJackfruitLabs/atelier', visibility: 'private', policy: 'https://github.com/SuperJackfruitLabs/atelier/blob/main/AGENTS.md' }` → "SuperJackfruitLabs/atelier · private · policy". The mockup also shows a "Project" row in "Where work goes" ("Marketing & Community — Melissa and Anna onboarding") — that is the card's project, not a spec field; it makes the row count 11 against the "10 fields" label → Q-28.
  - projectId → project "Marketing & Community — Melissa and Anna onboarding", milestone none.
  - card.createdAt 2026-10-08 (queued by super-chotu); queuedGrant owned by `usr_rakesh`, 32 principals (all agents).
  - attempts: run 1 outcome rejected-completion, failureReason "repro and observed missing", activities [ { action 'Sent back', body 'The board refused completion: repro and observed were missing.', ts 2026-10-08 } ]; run 2 outcome blocked, activities [ { action 'Started', body 'Rework run on this card session; read prior persisted evidence first.', ts 2026-10-08 }, stop row at 2026-10-09T19:41 ].
  - links none; sub-tasks none; related none; comments none; decided gates none.
  - references: the five URLs, titles and descriptions verbatim from the markup (e.g. title "AgentPod v0.1.91 Matrix inbound bridge contract", description "DM ingress → room lookup → Accounts identity/grant → ACP dispatch", url `https://github.com/SuperJackfruitLabs/agentpod/blob/3f625b618d443aa8ef1dad7c04d3ddd14dcf6708/apps/hub/src/services/matrix-as/inbound.ts#L379-L786`).
  - live variant: archivedAt null; archived variant: archivedAt 2026-10-08 (same seed + `archiveCard`).
  - board usage cardUsdCap null.
- **Q-F3 (phone archived baseline):** Q-F2 + `archivedAt` 2026-10-08T…+05:30, state kept `input-required`, needsHuman kept.

## Q.6 Gaps (Quiet)

| # | Mockup shows | API / code today | Ruling |
|---|---|---|---|
| Q-1 | Drawer width 1120px at 1440 (board behind keeps 320px) | today quiet 640px | (a) layout value: `width: 'min(1120px, 100%)'` |
| Q-2 | Faces desaturated: desktop `grayscale(0.6)`, phone `saturate(0.4)` | Face renders full colour | (a) faithful port of both: `vibekit:AgentFace` prop `calm: 'grayscale' \| 'saturate'`, Quiet desktop layouts pass `grayscale`, the phone layout passes `saturate` |
| Q-3 | Only `acps_…` styled as id inside the stop reason | — | (a) Quiet token regex narrower than G-3: `/\b[a-z]+_[0-9a-f-]{8,}\b/` |
| Q-4 | Page history rewrites event text ("Read the AgentPod hub matrix-inbound log …", "a model reply was produced", "Stopped: no fresh DM event …; needs one per agent.") differently from the drawer | activity body is one string | (c) agent text is verbatim; the page renders `HH:mm verb body` from the same fixture as the drawer; page baseline regenerated with the fixture's text |
| Q-5 | Cell F has no skeleton, only sentences | — | (a) Quiet sheet of `vibekit:LoadingNote`; no `vibekit:Skeleton` in Quiet |
| Q-6 | "View raw JSON" drawn as a link (`<a href="#">`) | it opens content | (a) `vibekit:Disclosure` whose summary is styled as a link (`<summary>` with underline); not an anchor |
| Q-7 | dl rows for five different section keys in one `dl` | parity test needs one element per key | (a) wrap each dt/dd pair in `<div data-section="…" style="display:contents">` (valid in `dl`) |
| Q-8 | "Edit card" appears twice on the page | parity counts one per key | (a) only the meta-row instance carries `data-section="editButton"`; the Card actions instance is a second trigger of the same action |
| Q-9 | Page shows faces beside agent names inside brief values; drawer doesn't | — | (a) page `DefinitionGroups` prop `faceAgents: true`; matching by exact agent name in `app.agents` |
| Q-10 | `fieldset.plain` defined but unused | — | (a) used for the edit form wrapper (line border) so edit mode has a plain frame; no artboard |
| Q-11 | Gate cell A shows "research-ray: Waiting for your review." as the agent's words | `gate.summary` may be null | (a) `gate.summary` verbatim; when null, product copy "Waiting for your review." (not prefixed by the agent name) |
| Q-12 | Radio descriptions per option | `GateOption{name,title}` has no description | (b) API: add optional `description?: string` to `GateOption` (contract `GateOptionSchema`, stage gate config `options[].description`); fallback copy per role as in the content map |
| Q-13 | Cells A/B show "If nothing is picked: …"/"If empty: …" documentation lines | — | (c) gallery-only captions documenting the error copy; the gallery renders them as captions (copy constants); the drawer never shows them |
| Q-14 | Gate subject "Sources" row (Daylight) missing in Quiet | same subject | (c) Quiet drops a row of the subject: parity breach — Quiet renders all canonical rows (Kind, Synthesis, Sources); Quiet cell A baseline regenerated |
| Q-15 | Done cell: "Handed on" text differs from Daylight's split message + handoff | one handoff + one finisher message | (c) one fixture; Quiet renders `handoff.summary` verbatim and the finisher's last `response` activity is not shown in Quiet's cell (it is in History); baseline regenerated if text differs |
| Q-16 | "Show more" buttons 32px high | 44px rule | (a) keep 32px visual height with a 44px hit area (`::before` inset -6px) |
| Q-17 | Long brief values clamp at a word boundary + "Show more" | — | (a) `DefinitionGroups` `clampChars: 240` cut at the last space ≤ 240, phone only |
| Q-18 | Phone capitalises the agent's first word ("Not reproduced") | agent wrote "not reproduced" | (c) verbatim wins; phone baseline regenerated with lower-case "not" |
| Q-19 | Phone resume select offers later stages too | `resumeCard(toStageKey)` server accepts? today the UI offers current + earlier | (c) the mockup is wrong on substance (resuming forward skips work); phone offers this stage and earlier only, like desktop; baseline regenerated |
| Q-20 | "Unclaimed: Assign to me" under Agent | assign sets owner | (c) wording: the row reads "error-eric (last run). Unclaimed." and "Assign to me" moves to the Owner row when the owner is not you; here owner is you, so the button is absent; baseline regenerated |
| Q-21 | "on Rakesh Gangwar's grant" | `card.queuedGrant` has size, not owner | (b) API: `Card.queuedGrantOwner: string \| null` (principal id whose grant authorised the queue; set at queue time from the token's subject) |
| Q-22 | Priority "3" on phone vs "P3" desktop | — | (c) one word for one fact: "P3" everywhere; phone baseline regenerated |
| Q-23 | Phone shows the full card id and no Copy | — | (a) phone shows `card.id` in mono; add `vibekit:CopyButton` link "Copy" after it (parity with desktop copy affordance) — (c) small baseline change |
| Q-24 | "queued … on 8 Oct" | `Card` has no `createdAt` in the web type | (b) expose `createdAt: string` on `Card` in `api.ts` (column exists in the DO; add to snapshot serialisation) |
| Q-25 | Reference title + description + "github · agentpod · inbound.ts lines 379–786" | `Reference{url,title,metadata}` | (a) title/description from `title`/`metadata.description`; source line derived from the URL as specified |
| Q-26 | Phone fieldset border uses text colour, desktop uses signal for "decision needed" | — | (c) signal means "a person is needed now": phone live fieldset uses `--vk-color-signal` 2px like desktop's semantics; archived uses muted (as drawn); phone baseline regenerated |
| Q-27 | Quiet desktop brief values differ from Daylight's (Q-F1) | one spec | (c) seed Daylight's text; regenerate Quiet desktop baselines |
| Q-28 | "Show the 10 fields" but 11 rows (Project shown inside "Where work goes") | project is a card field | (c) drop the Project row from the brief (it has its own section) |

## Q.7 Shared-contract notes

1. 00-shared §0 says the phone tweak is `live`/`archived`; in this file the tweak prop is `archived` (boolean) and `live` is derived — same thing.
2. 00-shared §5's stopped-card fixture does not match the phone artboards (they show what looks like the real production record: 5 criteria, 10 different spec keys, project, 5 references, no plan, no links). Recommend the assembled spec adopt per-artboard seeds (`seedDesktopCard`, `seedPhoneCard`) as in Q-F2.
3. §1.4 `resume` options: Quiet desktop labels "Stage 1: Reported" / "(this stage)"; phone "1 · Reported" / "(where it stopped)" — consistent with §4 except desktop Quiet uses the "Stage n:" form; `ResumeModel` should expose `targets` with `{ key, n, name, current }` and let layouts format.
4. §1.7: Quiet needs `vibekit:Button variant="link"` (underlined text button) and `tone: 'destructive'`; `vibekit:DefinitionGroups` needs `clampChars` and `faceAgents`; `vibekit:AgentFace` needs a `calm` prop; `vibekit:Banner`'s icon is ignored in Quiet.
5. §3 gallery: Quiet's E cell is a compact gate (radios without descriptions) → `GateQuiet` gets a `compact` prop used only by the gallery.
6. §4 Copy session id: Quiet desktop drawer omits it (page has it). Parity: add it to the Quiet drawer fieldset too (link-button under the reason) — small baseline change.
