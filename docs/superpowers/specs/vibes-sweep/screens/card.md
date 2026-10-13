# Screen spec — group `card` (drawer, standalone card page, card states, phone card)

Binding brief: `scratchpad/screen-spec-brief.md`. Code baseline: `origin/main` 1a4dc22. Every path below is under `apps/web/src/` unless it starts with `apps/` or `e2e/`.

## 0. Artboards in this group

| Artboard | Size (w×h) | Vibe | Route / state it represents |
|---|---|---|---|
| SP-Card-Daylight | 1440×2342 | daylight | `/b/{devx}/c/{card4605}` — Plan board dimmed behind, drawer open on the stopped card |
| SP-Card-Paper | 1440×2457 | paper | same |
| SP-Card-Studio | 1440×2322 | studio | same |
| SP-Card-Quiet | 1440×2409 | quiet | same |
| SP-CardPage-Daylight | 1440×3014 | daylight | `/b/{devx}/c/{card4605}/page` — the standalone card page (new) |
| SP-CardPage-Paper | 1440×2538 | paper | same |
| SP-CardPage-Studio | 1440×2383 | studio | same |
| SP-CardPage-Quiet | 1440×3287 | quiet | same |
| SP-Card-States-Daylight | 1440×1791 | daylight | `/dev/card-states` fixture gallery (new, test-only): six drawer tops A–F |
| SP-Card-States-Paper | 1440×2189 | paper | same |
| SP-Card-States-Studio | 1440×2107 | studio | same |
| SP-Card-States-Quiet | 1440×2272 | quiet | same |
| SP-Phone-Card-Daylight | 390×3068 | daylight | `/b/{devx}/c/{card4605}` at 390 wide — full-screen card sheet; tweak `live` (default) / `archived` |
| SP-Phone-Card-Paper | 390×3902 | paper | same |
| SP-Phone-Card-Studio | 390×2571 | studio | same |
| SP-Phone-Card-Quiet | 390×4714 | quiet | same |

The heights are the manifest's (true rendered content height at that width). The phone artboards render the `live` variant by default; the `archived` variant is a second pixel baseline (render the `.dc.html` with `{"archived":true,"live":false}` props, or the matching `SP-Phone-Card-*` reference if a second one is exported; see each vibe's section).

## 1. Architecture (shared by all four vibes)

### 1.1 One model, many layouts — what happens to `CardDrawer.svelte`

Today `lib/components/CardDrawer.svelte` (2003 lines) is three things: the dialog shell, all card data/actions, and 23 section snippets whose markup is shared by every vibe and only *placed* by `card/layouts/Card{Vibe}.svelte`. The mockups give every vibe its own markup for every section (Daylight's three-group brief grid, Studio's tabbed tables, Quiet's plain `h3` list, Paper's "enclosures"), so shared snippet markup cannot match them. Ruling:

1. **Data and actions move out** into a new class `CardModel` in `lib/components/card/card-model.svelte.ts` (runes class, like `GateDecisionModel`). Everything in CardDrawer's `<script>` except focus management and the `L.component` render moves there verbatim, with the renames listed in §1.3. The model is surface-agnostic: the drawer, the page and the states gallery construct one each.
2. **The 23 section snippets are deleted.** Their *markup* moves into each vibe's layout components (drawer, phone, page), ported from the mockup. Their *logic* is already in the model. `CARD_SECTION_KEYS` (in `card/layouts/types.ts`) stays as the parity contract: every layout renders exactly one element carrying `data-section="<key>"` for each of the 23 keys (an empty section renders its empty sentence or an empty `hidden` element, never nothing). `card-layouts.svelte.test.ts` changes from counting `SECTION-<key>` snippet output to counting `[data-section="<key>"]`, and runs over the drawer, phone and page component of every vibe (12 components).
3. **Shared presentational components whose markup the mockups replace** become logic-only or are removed (see §1.4 table): `CardComments.svelte` → `card/comments-model.svelte.ts`; `CardResume.svelte` → `card/resume-model.svelte.ts`; `LeadBubble.svelte` deleted; `SpecDetails.svelte`, `PlanChecklist.svelte`, `HandoffView.svelte`, `RelatedWork.svelte` keep their pure helpers (`spec-details.ts`, `plan.ts`) and are deleted as components once all four vibes render from the helpers. `RawJson.svelte` (the "View raw JSON" disclosure body), `StructuredValue.svelte` (nested values inside a detail row) and `LibraryArtifact.svelte` (embedded Superlibrary viewer, not shown in any mockup but must remain reachable from References) are kept and styled per vibe through a `class` prop.
4. **Gate and question panels** keep their models (`gate/gate-decision.svelte.ts` `GateDecisionModel`, `question/question-answer.svelte.ts` `QuestionAnswer`) and their per-vibe components (`gate/Gate{Daylight,Paper,Quiet}.svelte`, `gate/GateStudioFrame.svelte` + `GateStudioBar.svelte`, `question/Question{Vibe}.svelte`, `question/QuestionStudio{Frame,Bar}.svelte`), whose markup and CSS are rewritten from the States artboard cells A (gate), B (question) and E (decision error). The decision error moves from the top of the drawer to directly under the gate buttons (cell E), carried by `GateBinding.error` as today.
5. **New per-vibe state blocks** `card/state/CardState{Daylight,Paper,Studio,Quiet}.svelte` render cells C (archived banner + Restore), D (done block + finisher's message + handoff) and F (loading skeleton). Props: `{ kind: 'archived' | 'done' | 'loading'; model: CardModel; vibe: Vibe }`.

### 1.2 Registry (`lib/layouts.ts`)

```ts
export interface CardLayout {
  /** Desktop/tablet drawer, ≥ 640px viewport. */
  drawer: Component<CardLayoutProps>;
  /** Full-screen card sheet, < 640px viewport. */
  phone: Component<CardLayoutProps>;
  /** Width of the drawer panel at ≥ 640px, as CSS (ported from the mockup's grid column). */
  width: string;
  /** Where the panel sits. */
  align: 'end' | 'center';
}
export const CARD_LAYOUTS: Readonly<Record<Vibe, CardLayout>>;            // values: see each vibe's section
export const CARD_PAGE_LAYOUTS: Readonly<Record<Vibe, Component<CardPageProps>>>;
export const CARD_STATES_LAYOUTS: Readonly<Record<Vibe, Component<CardStatesProps>>>;
```

`panel` (Tailwind class string) is replaced by `width` (e.g. `'min(680px, 100%)'`); the drawer shell sets `style="width:{L.width}"` on the panel. The phone/drawer switch is made in the drawer shell with `const phone = new MediaQuery('max-width: 639.98px')` (`svelte/reactivity`), rendering `L.phone` when it matches.

Component files (all new unless noted; the old `card/layouts/Card{Vibe}.svelte` files are rewritten in place as the drawer layouts so their tests' import paths survive):

| Vibe | Drawer (rewrite) | Phone (new) | Page (new) | States gallery (new) | State blocks (new) |
|---|---|---|---|---|---|
| daylight | `card/layouts/CardDaylight.svelte` | `card/layouts/CardPhoneDaylight.svelte` | `card/page/CardPageDaylight.svelte` | `card/states/CardStatesDaylight.svelte` | `card/state/CardStateDaylight.svelte` |
| paper | `card/layouts/CardPaper.svelte` | `card/layouts/CardPhonePaper.svelte` | `card/page/CardPagePaper.svelte` | `card/states/CardStatesPaper.svelte` | `card/state/CardStatePaper.svelte` |
| studio | `card/layouts/CardStudio.svelte` | `card/layouts/CardPhoneStudio.svelte` | `card/page/CardPageStudio.svelte` | `card/states/CardStatesStudio.svelte` | `card/state/CardStateStudio.svelte` |
| quiet | `card/layouts/CardQuiet.svelte` | `card/layouts/CardPhoneQuiet.svelte` | `card/page/CardPageQuiet.svelte` | `card/states/CardStatesQuiet.svelte` | `card/state/CardStateQuiet.svelte` |

### 1.3 `CardModel` (new: `lib/components/card/card-model.svelte.ts`)

```ts
export type CardSurface = 'drawer' | 'page' | 'gallery';
export interface CardModelContext { boardId: string | null; cardId: string | null; surface: CardSurface }
export class CardModel {
  constructor(ctx: () => CardModelContext, opts?: { holdDetail?: boolean });   // holdDetail: gallery cell F only — never resolves the detail fetch
  // ---- identity / snapshot (from CardDrawer lines 60–100) ----
  readonly card: Card | undefined;            // app.cardById(cardId)
  readonly boardId: string | null;
  readonly boardName: string;                 // app.board?.name ?? ''  (page: from its own snapshot, see §2)
  readonly stages: Stage[];                   // orderedStages
  readonly stageIndex: number;                // max(0, index of card.currentStageKey)
  readonly stageName: string;
  readonly shortId: string;                   // card.id.slice(-4) — "4605"
  readonly detailLoaded: boolean;             // cardDetail !== null (drives state F)
  readonly gate: Gate | undefined;            // pending gate, card's own fetch first (unchanged logic)
  readonly decidedGates: Gate[];
  readonly elicitation: Elicitation | undefined;
  readonly refs: Reference[]; readonly libraryRefs; readonly otherRefs;
  readonly children: Card[];                  // sub-tasks
  readonly attempts: Attempt[];               // was drawerAttempts
  readonly activityGroups: ActivityGroup[];   // groupActivities(...)
  readonly stageEntries; readonly stageByRun;
  readonly estimate: Estimate | null;         // was cardEstimate
  readonly costPct: number;
  readonly linkGroups; readonly hasAnyLink: boolean;
  readonly projectName: string | null; readonly milestoneName: string | null;   // was currentProjectName/currentMilestoneName
  readonly acceptanceCriteria: string[] | null;
  readonly overdue: boolean; readonly labels: {id;name;colour}[]; readonly ageHours: number | null;
  readonly lead: CardLead | null; readonly agent: CardAgent;    // drawerAgent
  readonly delegate: { id: string | null; name: string; iconUrl: string | null; mood: Mood };
  readonly provenance; readonly grantSummary: string;
  readonly counts: CardCounts;
  readonly deliveryGate: Gate | undefined; readonly manualItems;
  readonly handoff: Record<string, unknown> | null;            // cardDetail.handoff
  readonly archived: boolean;                                    // !!card.archivedAt
  // ---- local UI state ----
  showToolCalls: boolean; localError: string | null; gateError: string | null;
  readonly edit: EditForm;        // editing, title, priority, desc, labels, labelsBlind, ac, due, saving; start(), save(), cancel()
  readonly project: ProjectPicker;// editing, projectId, milestoneId, milestones, saving, error; start(), onProjectChange(), save(), cancel()
  readonly links: LinkEditor;     // open, boardId, cardId, kind, boardCards, adding, error, removing: Set<string>, crossBoardNotice; openAdd(), onBoardChange(), add(), remove(args), cancel()
  readonly subtasks: SubtaskComposer; // title, adding, error; add()
  readonly refsForm: ReferenceComposer; // url; add()
  readonly delivery: DeliveryControls; // liveUrl, saving, copied: number|null; change(update), copy(index, text)
  readonly comments: CommentsModel;    // from comments-model.svelte.ts
  readonly resume: ResumeModel;        // from resume-model.svelte.ts
  readonly question: QuestionAnswer;   // unchanged class
  // ---- actions (bodies moved verbatim from CardDrawer) ----
  assignToMe(): Promise<void>; assigning: boolean;
  archive(): Promise<void>; restore(): Promise<void>; archiving: boolean;   // onArchiveCard / onUnarchiveCard
  remove(): Promise<void>;                                                  // onDeleteCard (confirm() kept)
  onGateResponse(d: GateDecision, r: Response): Promise<boolean>;           // see surface rule below
  refresh(): Promise<void>;                                                  // refreshDrawer(cardId, boardId)
  copyId(): Promise<void>; copyLink(): Promise<void>; copied: 'id' | 'link' | null;  // new, §2.3
  dispose(): void;                                                           // stops the feed subscription
}
```

Surface rule (the only behaviour that differs): after a successful decision or delete, `surface === 'drawer'` calls `app.closeCard()` exactly as today; `surface === 'page'` stays on the page and calls `refresh()` (delete navigates to `/b/{boardId}`); `surface === 'gallery'` does nothing.

`CardLayoutProps` (`card/layouts/types.ts`) becomes:

```ts
export interface CardLayoutProps {
  model: CardModel;            // replaces card, stages, stageIndex, stageName, ageHours, lead, agent, sections, counts, editing
  vibe: Vibe;
  phase: Phase;
  personName: string;          // app.user?.name ?? app.user?.login ?? 'there'
  gate: GateBinding | null;    // unchanged shape
  question: QuestionBinding | null; // unchanged shape
  pageHref: string;            // `/b/${boardId}/c/${cardId}/page`
  onClose: () => void;         // app.closeCard()
}
export interface CardPageProps extends Omit<CardLayoutProps, 'onClose'> { boardHref: string }
export interface CardStatesProps { cells: Record<'gate' | 'question' | 'archived' | 'done' | 'error' | 'loading', { model: CardModel; gate: GateBinding | null; question: QuestionBinding | null }>; vibe: Vibe; phase: Phase }
```

`CardSections`/`CardSectionKey` type for snippets is removed; `CARD_SECTION_KEYS` stays.

### 1.4 The 23 section keys → new home (all vibes)

"Moves to layout" = the snippet's markup is deleted from CardDrawer and re-authored per vibe from the mockup, reading the listed model fields. Per-vibe placement (which tab/disclosure/column) is in each vibe section's "Section placement" table.

| Key | Today (snippet in CardDrawer) | Data / actions now | Change |
|---|---|---|---|
| `error` | `localError` alert at top of body | `model.localError` | Moves to layout. Still at the top of the body; gate errors no longer go here (they render under the gate buttons, cell E). |
| `status` | state pill (raw `input-required`/`completed`), delegate face, owner, asked-by chip, assign to me, live dot | `model.lead`, `model.delegate`, `model.provenance`, `model.assignToMe()` | Moves to layout. **Words change**: the pill uses the human state word (`waitingWord(model)` §1.6: "Waiting on you · 2 days", "Working", "Done", "Queued", "Archived"). "Unclaimed" + "error-eric ran attempt 2" replaces "· delegate" when the card has no delegate but its last attempt had an agent. |
| `facts` | priority, due, labels, in-stage-for, attempt | same fields + `model.shortId`, `copyId()` | Moves to layout. Adds the small copyable id ("card 4605" + Copy). Values: `P3`/`none`, due `none` or date, labels `none` or pills, "In Reproduce for 2 days" (`ageLabel` words), "Attempt 2" (shown when `attemptCount > 1`). |
| `editButton` | pencil icon button | `model.edit.start()` | Moves to layout (icon button "Edit card", 44×44). Page layouts also show a text "Edit card" button in the footer/action row. |
| `editForm` | inline form | `model.edit.*` | Moves to layout; fields, labels, validation copy unchanged; styled with `vk-field` per vibe. Not drawn in any artboard (edit mode is not mocked) — keep today's field set and order, port the vibe's `vk-field` CSS. |
| `description` | "description" section | `card.spec.description` | Moves to layout. Daylight/Paper fold it into "What {agent} was asked"; Studio "Description"; Quiet "Description". |
| `delivery` | Approved-delivery panel | `model.deliveryGate`, `model.manualItems`, `model.delivery.*` | Moves to layout. Empty sentence "No approved delivery on this card." (Daylight drawer) / "None approved on this card." (Daylight page) — per-vibe copy in each section. |
| `resume` | `<CardResume>` | `model.resume` (ResumeModel) | **Changes most**: becomes the reply form directly under the agent's stop message ("Send it back to work"), stage select + required note + primary button. The stop reason is shown once, in the agent's message, not repeated in the resume box (today CardResume repeats `needsHuman.detail`). |
| `plan` | `<PlanChecklist>` | `normalisePlan(card.spec.plan)` | Moves to layout: "Agent plan · 1 / 4 steps · 25%" + meter + checklist. |
| `criteria` | acceptance criteria list | `model.acceptanceCriteria` | Moves to layout ("3 criteria", "Done when", "Things to prove" per vibe). |
| `details` | `<SpecDetails>` (every other spec field) | `specGroups(card.spec)` (new, §1.5) + `RawJson` | Moves to layout: fields grouped under headings, "View raw JSON" disclosure + Copy. |
| `project` | project/milestone with change/assign | `model.projectName`, `model.project.*` | Moves to layout: "No project." + "Assign to a project" button (opens the same two selects inline). |
| `links` | five link groups + Add link form | `model.linkGroups`, `model.links.*` | Moves to layout: grouped link lists ("Relates to", "Blocked by", …) as real `<a href="/b/{board}/c/{card}">`, "· Agent Onboarding, advisory" suffix for cross-board; "Add link" opens the same form. |
| `subtasks` | children list + new sub-task input | `model.children`, `model.subtasks.*` | Moves to layout: "Sub-tasks · 0 open of 0"; the composer is behind "Add a sub-task" where a vibe shows it, else inline. |
| `activity` | session activity per run, tool-call toggle | `model.activityGroups`, `model.showToolCalls` | Moves to layout: one disclosure per run ("Reproduce · error-eric · stopped · attempt 2 · 14 events · 0 errors"), latest open; "Show tool calls" toggles `showToolCalls`. |
| `decisions` | decided gates | `model.decidedGates` | Moves to layout; empty: "no decisions yet" / "None yet." |
| `comments` | `<CardComments>` | `model.comments` | Moves to layout: empty sentence, labelled textarea "Add a comment", "Comment" button; ⌘/Ctrl+Enter posts. |
| `handoff` | `<HandoffView>` | `model.handoff`, `model.stageEntries` | Moves to layout: "Handoff from Reported: “…”" (quoted, verbatim). |
| `cost` | cost + estimate meter | `card.costUsd`, `model.estimate`, `model.costPct` | Moves to layout: "$0.00 · no estimate yet" + meter. |
| `attempts` | attempts list | `model.attempts` | Moves to layout: "Attempt 2 · error-eric · $0.00 · stopped". |
| `related` | `<RelatedWork>` | same fetch (moved into model as `model.related`) | Moves to layout: "Related prior work" + "Fixed · …" sentence. |
| `references` | references list + attach input | `model.refs`, `model.refsForm` | Moves to layout: "agentpod PR #642 · merged" link list (`refLabel` + `subStateLabel`, both moved to `card/references.ts`). |
| `cardActions` | Archive/Restore/Delete text buttons | `model.archive/restore/remove` | Moves to layout: "Archive card" (secondary) + "Delete card" (quiet) at the foot; archived cards show "Restore" in the banner instead (cell C). |

### 1.5 New pure helpers (with unit tests)

- `card/spec-groups.ts` — `specGroups(spec): { heading: string; rows: { key: string; label: string; value: unknown }[] }[]`. Excludes `description`, `acceptanceCriteria`, `labels`, `due`, `plan`. Label = `humanizeKey(key)` (`outOfScope` → "Out of scope", `agentsInScope` → "Agents in scope"; first word capitalised, rest lower case). Grouping: if the spec carries `spec.groups: Record<heading, key[]>` that wins; otherwise the fixed table `SPEC_GROUP_OF: Record<string, string>` in the same file (keys listed in each vibe's fixture section) maps a key to its heading; unmapped keys go to a last group "Other details". Count used in summaries ("10 fields", "10 details") = number of rows.
- `card/state-words.ts` — `stateWord(card, lead): string` and `waitingWord(card, lead, now): string`: `input-required`/gate/question → "Waiting on you" (+ " · " + `ageLabel` long form, e.g. "2 days"); `working` → "Working"; `completed` → "Done"; `submitted`/`queued` → "Queued"; `rejected` → "Rejected"; `failed` → "Failed"; archived wins over all → "Archived". Never prints the raw state.
- `card/references.ts` — `refLabel`, `subStateLabel`, `SUB_STATE_LABELS` moved verbatim from CardDrawer.
- `lib/age.ts` — add `ageWords(hours): string` ("2 days", "5 hours", "under an hour"); `ageLabel` stays for Studio's compact "2d".
- `lib/when.ts` (new) — `whenLabel(iso, now): string`: same day → "Today, 12:48"; else `"Fri 9 Oct, 19:41"` (en-GB weekday short, day, month short, 24h). Times use the viewer's local zone; the fixture clock is 2026-10-11T13:51 local (Asia/Kolkata in the mockup; e2e sets `timezoneId: 'Asia/Kolkata'` and fakes `Date` to 2026-10-11T13:51:00+05:30).

### 1.6 Drawer shell (`lib/components/CardDrawer.svelte`, rewritten, ~200 lines)

Keeps: the fixed overlay, scrim button ("Close drawer", `tabindex=-1`), `role="dialog" aria-modal="true" aria-labelledby="drawer-title"`, focus-on-open, `trapTab`, focus restore in `onDestroy`, Escape (root layout `closeCardOnEscape`). Removes: all data, the 23 snippets, the absolute close button (each vibe layout now draws its own Close as part of its header, ported from the mockup — the mockups put it in the head row). Constructs `const model = new CardModel(() => ({ boardId: app.boardId, cardId: app.openCardId, surface: 'drawer' }))` and renders `phone.current ? L.phone : L.drawer` with `CardLayoutProps`. Panel background/shadow/width come from the vibe layout's root element (ported CSS), so the shell's panel div carries no visual classes beyond `h-full` and `style="width:{L.width}"` (phone: `width:100%`).

On desktop the board behind stays the live Plan view; its dimming is the scrim. The scrim colour per vibe is the mockup's (`.dl-scrim` etc.) and is set by the shell from `--card-scrim`, a variable each vibe layout's CSS defines on `:global([data-vibe=x])`.

### 1.7 vibekit components (shared UI comes from the vibekit library)

Reusable patterns are **not** app-local markup: they come from the vibekit Svelte 5 component library (`/Users/rakeshgangwar/SuperJackfruit/vibekit`, per-vibe reference sheets), each rendering the vibe's look from `data-vibe` + tokens. In this spec they are written `vibekit:<Name>`; names are descriptive and will be reconciled with the library inventory. The app's layout components own composition, layout CSS (grids, columns, gaps, order) and data mapping only; the CSS quoted in the vibe sections for a piece marked `vibekit:` is the **reference for that component's per-vibe sheet**, not for an app `<style>` block. Every component forwards `class` and `...rest` (aria-*, data-section).

| Component | Props (TS) | Used for in this group |
|---|---|---|
| `vibekit:Drawer` | `{ open: boolean; labelledBy: string; width: string; align: 'end' \| 'center'; onClose: () => void; children: Snippet }` — owns scrim, `role=dialog`, `aria-modal`, focus trap, focus restore, Esc | drawer frame (§1.6 shell keeps only model + layout choice) |
| `vibekit:Sheet` | `{ labelledBy: string; onClose: () => void; children: Snippet }` — full-screen phone sheet, same a11y as Drawer | phone card |
| `vibekit:Button` | `{ variant: 'primary' \| 'secondary' \| 'quiet' \| 'frame' \| 'link'; size?: 'md' \| 'sm'; icon?: IconName; kbd?: string; href?: string; target?: string; disabled?: boolean; type?: 'button' \| 'submit'; onclick? }` | every text button and link-button |
| `vibekit:IconButton` | `{ icon: IconName; label: string; href?: string; target?: string; pressed?: boolean; onclick? }` (44×44) | Close, Edit card, Open in new window (icon forms), Appearance |
| `vibekit:CopyButton` | `{ value: string; label: string; text?: string; copiedText?: string }` — clipboard + 2 s copied state + refusal callback `onrefused?: () => void` | copy card id, Copy session id, Copy link to this card, raw-JSON Copy, digest copy |
| `vibekit:Tabs` | `{ label: string; tabs: { id: string; label: string; count?: number \| string }[]; active: string (bindable); panel: Snippet<[id: string]> }` — roving tabindex, ←/→/Home/End | Studio Spec/Log/Links/Talk/Cost |
| `vibekit:StageStrip` | `{ stages: string[]; current: number; status: 'needs' \| 'active' \| 'archived' \| 'done'; label: string; labels?: 'all' \| 'current' \| 'numbers'; caption?: string }` (replaces vibekit `StageTrack` use) | stage track in every head, states cells, phone |
| `vibekit:StatePill` | `{ tone: 'needs' \| 'working' \| 'done' \| 'neutral' \| 'archived'; text: string }` | "Waiting on you · 2 days", "Archived", "Done" |
| `vibekit:Chip` | `{ face?: { name: string; mood?: Mood }; initials?: string; text: string; title?: string }` | Unclaimed/Owner/Asked-by chips |
| `vibekit:AgentFace` | `{ name: string; mood: Mood; size: 20 \| 24 \| 32 \| 36 \| 40 \| 48; withName?: boolean; variant?: FaceVariant }` | every face (replaces app `AgentFace.svelte` internals) |
| `vibekit:PersonRow` | `{ face?: { name; mood }; initials?: string; name: string; role: string }` | page "People on this card" rows |
| `vibekit:AgentQuote` | `{ agent: { name: string; mood: Mood }; who: string; text: string; tone: 'needs' \| 'plain' \| 'done'; at?: string; tokens?: boolean; actions?: Snippet }` — text verbatim, `tokens` styles ids (G-3) | the stop reason, gate summary, question, finisher's message |
| `vibekit:FactList` | `{ facts: { label: string; value: string; tone?: 'needs' }[] }` | priority/due/labels/in-stage/attempt row |
| `vibekit:Figure` / `vibekit:FigureRow` | `{ label: string; value: string; unit?: string; tone?: 'needs' \| 'zero' }` / `{ figures: FigureProps[] }` | Studio numbers, cost "$0.00" hero |
| `vibekit:Meter` | `{ value: number; max: number; label: string }` | plan progress, cost vs estimate |
| `vibekit:Checklist` | `{ items: { text: string; done: boolean }[]; label: string }` | agent plan |
| `vibekit:DefinitionGroups` | `{ groups: { heading: string; rows: { label: string; value: unknown }[] }[]; columns?: 1 \| 2 \| 3 }` | spec details (`specGroups`) |
| `vibekit:Disclosure` | `{ summary: string; meta?: string; open?: boolean (bindable); level?: 2 \| 3 \| 4; children: Snippet }` | Daylight/Paper sections, run rows, View raw JSON, phone sections |
| `vibekit:RunRow` | `{ title: string; status: string; tone: 'needs' \| 'plain'; meta: string; open?: boolean; events: { verb: string; text: string; at: string; tone?: 'needs' }[]; more?: Snippet }` | activity runs |
| `vibekit:LinkList` | `{ items: { href: string; text: string; meta?: string }[] }` | links, references |
| `vibekit:Field` | `{ kind: 'text' \| 'textarea' \| 'select' \| 'url' \| 'date' \| 'number'; label: string; value (bindable); hint?: string; error?: string; counter?: { max: number }; options?: { value: string; label: string }[]; placeholder?: string; id: string }` | resume note/stage, comment, gate note, answer, edit form, project/link pickers |
| `vibekit:Alert` | `{ tone: 'needs' \| 'neutral'; title?: string; children: Snippet; role?: 'alert' \| 'status' }` | `error` section, gate decision error (cell E) |
| `vibekit:Banner` | `{ icon: IconName; title: string; text?: string; actions?: Snippet }` | archived banner (cell C) |
| `vibekit:DoneBlock` | `{ title: string; text: string }` | done (cell D) |
| `vibekit:Seal` / `vibekit:SubjectFrame` | `{ head: Snippet; children: Snippet; seal: string }` | gate approval subject (cell A) |
| `vibekit:Footnote` | `{ n: number; children: Snippet }` + `vibekit:FootnoteRef { n: number }` | Studio/Paper footnotes (raw ids, provenance) |
| `vibekit:Skeleton` | `{ shape: 'line' \| 'block' \| 'bar'; width?: string; height?: string }` + `vibekit:LoadingNote { text: string }` (role=status) | cell F |
| `vibekit:EmptyState` | `{ text: string }` | "No comments yet…", "None.", "No project." |

Consequences: `lib/components/AgentFace.svelte` becomes a thin adapter onto `vibekit:AgentFace`; `lib/components/Tabs.svelte` is replaced by `vibekit:Tabs`; the drawer shell (§1.6) renders `vibekit:Drawer` / `vibekit:Sheet` and loses its own trap/restore code (moved into the library, behaviour unchanged).

## 2. The standalone card page (new)

### 2.1 Route

- File: `routes/b/[boardId]/c/[cardId]/page/+page@.svelte` (the `@` resets to the root layout, so `b/[boardId]/+layout.svelte` — BoardHeader, Plan, drawer, `replaceState` — does not run).
- File: `routes/b/[boardId]/c/[cardId]/page/+page.ts`: `export const load = () => ({ shell: 'bare' as const });`
- URL: `/b/{boardId}/c/{cardId}/page`, e.g. `/b/brd_devx/c/card_05823a57e8224605/page`.
- Shell slot: **`bare`** — the root layout renders no Rail/top bar/BottomNav for `page.data.shell === 'bare'` (the shell group's SHELL_LAYOUTS contract); it still mounts `CommandPalette` and `AppearanceDialog`. Each vibe's page component draws its own compact "card window" bar (ported from the mockup; it is part of this group, not the shell).
- The page opens the board itself: `$effect(() => { if (app.authState === 'ready' && app.boardId !== boardId) void app.openBoard(boardId); })` (same call the board layout makes), then `const model = new CardModel(() => ({ boardId, cardId, surface: 'page' }))`. A card id the snapshot lacks renders the vibe's not-found sentence: "This card is not on Developer Experience any more." + "Back to the board" link (copy shared; styling per vibe uses the page's body text class).
- `<svelte:head><title>{card.title} · {boardName}</title></svelte:head>`.

### 2.2 How the drawer links to it

Every drawer layout has, in its head row, `<a href={pageHref} target="_blank" rel="noopener">` with visible text "Open in new window" (Daylight/Paper/Quiet) or the vibe's icon form (see each section), plus `aria-label="Open in new window"`. Phone layouts use the same href **without** `target` (same tab) and the label "Open as a page". The page's "Back to the board" and the board pill link to `/b/{boardId}` (same tab). Middle-click / ⌘-click on a board tile is unchanged (tiles stay buttons opening the drawer).

### 2.3 Page-only controls

| Control | Behaviour |
|---|---|
| "Copy link to this card" | `navigator.clipboard.writeText(location.origin + pageHref)`; label becomes "Link copied" for 2 s (`model.copied = 'link'`); on refusal sets `model.localError = 'Clipboard access was refused. Select the address bar and copy it.'` |
| Copy card id (icon, `aria-label="Copy card id 4605"`) | copies the full `card.id` (`card_05823a57e8224605`); `model.copied = 'id'` → icon swaps to a check for 2 s |
| "Back to the board" / board pill | `<a href="/b/{boardId}">` |
| Appearance | `appearance.pickerOpen = true` |
| Account | the vibe's account menu with "Sign out" → `logout()` then `location.assign('/')` (same as shell) |

## 3. Card states gallery (new, test-only route)

- Files: `routes/dev/card-states/+page@.svelte`, `routes/dev/card-states/+page.ts`:
  ```ts
  import { error } from '@sveltejs/kit'; import { dev } from '$app/environment'; import { env } from '$env/dynamic/public';
  export const load = () => { if (!dev && env.PUBLIC_FIXTURE_ROUTES !== '1') error(404); return { shell: 'bare' as const }; };
  ```
  CI e2e sets `PUBLIC_FIXTURE_ROUTES=1` for the preview build; production never does.
- The page opens the two fixture boards (`brd_research`, `brd_devx`, plus `brd_marketing`, `brd_onboarding` for C/D — ids in §5), builds six `CardModel`s with `surface: 'gallery'` (cell F with `holdDetail: true`), and renders `CARD_STATES_LAYOUTS[vibe]`.
- Each `CardStates{Vibe}.svelte` ports the States artboard verbatim: its page heading ("Card states · Daylight"), its explainer line, the grid, each cell's caption, and in each cell a compact card top (eyebrow, title, track — gallery-local CSS from the artboard) followed by the **real** lead component the drawer uses for that state: `Gate{Vibe}` (A), `Question{Vibe}` (B), `CardState{Vibe} kind="archived"` (C), `kind="done"` (D), `Gate{Vibe}` with an error (E), `kind="loading"` (F).
- Cell E's error is produced for real: the gallery's E model is bound to a pending gate the fixture marks `decidedElsewhere` (see §5 / Gap G-1), and the e2e test clicks "Request changes" with an empty note (field error appears) then "Approve" (server answers 409 with the decided-by payload; the alert appears) before the screenshot. Captions are copy constants in the component.

## 4. Shared interactions (all vibes; per-vibe extras are in each section)

| Interaction | Call |
|---|---|
| Open card (tile) | `app.openCard(id)` (unchanged) |
| Close (X / Esc / scrim) | `app.closeCard()` |
| Open in new window / Open as a page | `<a href={pageHref}>` (§2.2) |
| Edit card | `model.edit.start()`; Save `model.edit.save()` → `updateCard(boardId, cardId, {...})`; Cancel `model.edit.cancel()` |
| Assign to me | `model.assignToMe()` → `updateCard(..., { ownerUserId })` |
| Copy session id (in the stop message) | copies the first `acps_…` token found in the lead sentence (`/\bacps_[0-9a-f-]{36}\b/`); hidden when none (Gap G-4) |
| Send back to work (resume) | `model.resume.submit()` → `resumeCard(boardId, cardId, note, toStageKey?)`; empty note → field error "Add a note for error-eric first." (`Add a note for ${agent.name} first.`), no request |
| Resume at stage select | `model.resume.target`; options = this stage then each earlier one, labelled "`{n} · {name}`", the current suffixed " (this stage)" (Daylight/Paper/Studio) or " (where it stopped)" (Quiet, phone) |
| Approve / Request changes / Reject | `GateDecisionModel.decide(name)` → `resolveGate(...)` → `model.onGateResponse` |
| Send answer (question) | `QuestionAnswer.submit()` → `answerElicitation(...)`; empty → "Type an answer first." |
| Restore (archived) | `model.restore()` → `unarchiveCard` |
| Archive card / Delete card | `model.archive()` / `model.remove()` (keeps `confirm('Delete this card? This cannot be undone.')`) |
| Show tool calls | `model.showToolCalls = !model.showToolCalls`; label flips to "Hide tool calls" |
| Run disclosure | native `<details>`; the newest run is `open` by default |
| View raw JSON | native `<details>` whose body is `<RawJson value={card.spec} />`; Copy → clipboard `JSON.stringify(card.spec, null, 2)` |
| Add link | `model.links.openAdd()` → same board/card/kind selects → `model.links.add()` (`submitAddBlocker`) |
| Assign to a project | `model.project.start()` → selects → `model.project.save()` |
| Comment | `model.comments.post()` → `postComment`; ⌘/Ctrl+Enter in the textarea posts |
| Copy card id | `model.copyId()` |

## 5. Shared fixture: the stopped card (desktop Card + CardPage artboards, all vibes)

Clock: 2026-10-11 13:51 (+05:30). Person: user `usr_rakesh`, name "Rakesh Gangwar", login `rakesh`.

Board `brd_devx` "Developer Experience", stages in order (key → name): `reported` Reported, `reproduce` Reproduce, `failing-test` Failing test, `fix` Fix, `integrate` Integrate, `signed-off` Signed off, `shipped` Shipped.

Agents (`AgentSummary`): `agt_error_eric` error-eric, `agt_super_chotu` super-chotu, `agt_tester_tim` tester-tim, `agt_coder_kai` coder-kai, `agt_research_ray` research-ray, `agt_message_melissa` message-melissa, `agt_onboarding_olivia` onboarding-olivia, `agt_audience_anna` audience-anna. Faces are generated from the agent *name* by vibekit's `Face` (deterministic), so no icon URLs.

Card `card_05823a57e8224605`:

| Field | Value |
|---|---|
| title | Diagnose Melissa and Anna Supermessage silence — trace actual failing hop |
| currentStageKey | `reproduce` |
| state | `input-required` |
| priority | 3 |
| dueAt / labels | null / [] |
| ownerUserId | `usr_rakesh` |
| delegateAgentId | null (unclaimed) |
| queuedBy | `agt_super_chotu` (grant covers error-eric) |
| attemptCount | 2 |
| costUsd / overBudget | 0 / false |
| stateSince | 2026-10-09T19:41:00+05:30 (→ "2 days") |
| needsHuman | `{ reason: 'blocked', detail: <stop reason below>, failureCount: 0 }` |
| projectId / milestoneId | null / null |
| parentCardId / openChildCount | null / 0 |
| archivedAt | null |
| spec.description | Reproduce and localize why the existing AgentPod bridge Matrix identities for Message Melissa and Audience Anna do not respond to Rakesh in Supermessage. Produce an evidence-backed diagnosis and exact repair proposal; do not attribute without evidence. |
| spec.acceptanceCriteria | ["The first failing hop is named, for each agent.", "Each hop cites its evidence: a log line or metadata row with its time.", "A repair proposal names the owning repository."] |
| spec.plan | [{"step":"Check Melissa’s live ACP session","done":true},{"step":"Trace one fresh DM per agent","done":false},{"step":"Name the first failing hop","done":false},{"step":"Write the repair proposal","done":false}] |
| spec (10 detail fields) | objective, deliverable, evidence, outOfScope, agentsInScope, surfaces, fixGoesTo, attribution, issues, messages — values verbatim in the Daylight section; `SPEC_GROUP_OF`: objective/deliverable/evidence/outOfScope → "What to do"; agentsInScope/surfaces/fixGoesTo → "Where it goes"; attribution/issues/messages → "Rules" |

Stop reason (`needsHuman.detail`, verbatim, rendered with each `` `code` ``-like token in the vibe's id style — the API text contains these tokens bare; Gap G-3):

> not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs. No Accounts defect established; no issue filed.

Attempts (`getAttempts`): `run_eric_2` agent `agt_error_eric`, stage `reproduce`, status `completed`, outcome `blocked`, costUsd 0, 14 activities, 0 errors, ended 2026-10-09T19:41; `run_eric_1` same agent/stage, outcome `blocked`, 9 activities, 0 errors, ended 2026-10-09T11:12.

Activities of run 2 shown when expanded (narrative rows; the remaining 11 are tool calls hidden by default): 19:22 action "Read" — "AgentPod hub matrix-inbound log for Melissa’s station"; 19:30 response "Found" — "session acps_8f86d4e4… reached Hermes; model reply produced"; 19:41 error/stop "Stopped" — "No fresh DM event to trace. Needs one per agent." (Gap G-5: the bold verb.)

Handoff (`cardDetail.handoff`, from stage Reported): `{ "summary": "Melissa and Anna do not answer DMs in Supermessage." }`.

Links (`listLinks`): relates → `card_…blocker` "Fix the highest-severity blocker found in the clean-room journey" (this board, stage Reported, state input-required); advisory cross-board relates → "Onboard Message Melissa — marketing and messaging" and "Onboard Audience Anna — community and engagement" on board `brd_onboarding` "Agent Onboarding".

References: `pull_request` `SuperJackfruitLabs/agentpod#642` subState `merged`; `pull_request` `…/agentpod#648` subState `merged` (label "agentpod PR #642 · merged": Gap G-6 — repo short name prefix).

Related prior work: one item, status fixed, text "Hermes agent stuck on an E2EE device with 0 olm sessions; a fresh device fixed it."

Comments: none. Decided gates: none. Estimate: null. Delivery: none.

Other board cards visible behind the drawer (Daylight board): "Fix the highest-severity blocker found in the clean-room journey" (Reported, P1, input-required), this card (Reproduce, P3), "AgentPod: connector interface and generic effects ledger, state machine and executor" and "Integrate editorial workflows and prove no-write publishing acceptance" (Failing test, blocked) — the board group owns that view; this group only needs them seeded.

States, phone and per-vibe extra records are listed in each vibe section; they are merged in §7.

## 6. Shared gaps (rulings)

| # | Mockup shows | API today | Ruling |
|---|---|---|---|
| G-1 | Cell E: "Not recorded. This gate was already decided from Matrix by Rakesh Gangwar at 13:02." | `resolveGate` 409 body has only `error.message` | (b) API: on `POST /boards/:b/gates/:g/resolve` for a non-pending gate return 409 `{ error: { code: 'GATE_ALREADY_DECIDED', message, decidedBy: principalId, decidedAt: iso, via: 'matrix' | 'web' | 'api' } }`; client words it `Not recorded. This gate was already decided from ${viaWord} by ${displayPrincipal(decidedBy)} at ${hh:mm}.` with viaWord Matrix/the web app/the API. Contract change in `@superpipeline/contract` `GateResolveError`. |
| G-2 | "Unclaimed · error-eric ran attempt 2" | no delegate; attempts carry agentId | (a) derive: `lastAttempt = attempts.at(-1)`; show when `!card.delegateAgentId && lastAttempt`. |
| G-3 | ids inside the stop reason styled as inline code | plain text | (a) derive client-side, display only: `splitTokens(text)` wraps tokens matching `/\b(?:acps|evt|run|card|brd|agt)_[\w-]+|\b[a-z]+(?:_[a-z]+)+\b|\b[\w-]+(?:\/[\w-]+){1,}\b/` in the vibe's id span; text is never altered. |
| G-4 | "Copy session id" button | — | (a) derive: first `acps_<uuid>` match in the lead sentence; button hidden when none. |
| G-5 | Run events with bold verbs ("Read", "Found", "Stopped") then a short sentence | `Activity{type, action, body, signal}` | (a) derive: `verb = (a.type === 'error' \|\| a.signal === 'stop') ? 'Stopped' : (a.action ?? TYPE_WORD[a.type])` with `TYPE_WORD = { action: 'Did', response: 'Said', thought: 'Thought', prompt: 'You said', elicitation: 'Asked' }`; the sentence is `a.body` verbatim. Fixture rows set `action` to the mockup's verb and `body` to the text after it. |
| G-6 | "agentpod PR #642 · merged" | `refLabel` → "PR #642" | (a) derive: prefix the repo short name (`externalId.split('#')[0].split('/').at(-1)`). |
| G-7 | "error-eric is waiting for your reply" / "2 runs · no decisions yet" summaries | — | (a) derived from model counts; copy constants per vibe. |
| G-8 | "Next: Failing test." | stages | (a) `stages[stageIndex+1]?.name`; omitted on the last stage. |

(Per-vibe gaps continue in each vibe section and are merged in §7.)

## 7. Contract amendments (binding; they supersede §1–§6 and any vibe section where they conflict)

The four vibe sections were written against §1–§6 and raised the notes below. Each is settled here once, for every vibe.

### 7.1 Fixtures are seeded per artboard (supersedes "one fixture" in §5)
The mockups do not agree on one record. Card 4605 differs between desktop and phone in every vibe (8 vs 9 Oct, 5 vs 3 criteria, a project, 5 references, no plan, different spec keys), and Paper, Studio and Quiet paraphrase Daylight's spec values, criteria, log sentences and gate summary. A single seed would force those baselines to be regenerated. Ruling: **every artboard has its own seed function** in `e2e/support/seed-card.ts`, named `seed<Artboard>` (e.g. `seedSPCardPaper`, `seedSPPhoneCardStudio`). Each one creates the records with the **literal text of that artboard**, using the same ids (`brd_devx`, `card_05823a57e8224605`, …) so URLs match. §5 is the base record that each per-artboard seed starts from and overrides. Every vibe section's fixture section lists the overrides for its artboards. This replaces the "(c) regenerate the baseline" rulings that exist only because of differing text: **D-25, P-7, P-13, P-17, S-4, S-8, S-10, S-19, Q-4, Q-14, Q-15, Q-18, Q-27**. They become "(a) per-artboard seed". The gaps that rule a *behaviour* wrong stay (c) (see §8).
- The phone seeds are the vibes' `seedCard4605Phone` / `seedPhoneCard4605` (one name: `seedSPPhoneCard<Vibe>`). The archived variant adds `archivedAt` = 2026-10-08 19:41 (+05:30) and cancels the pending gate when the variant has one.

### 7.2 Clock per artboard (supersedes the single 13:51 in §1.5)
The e2e test fakes `Date` per artboard to the time the artboard shows: Studio drawer 13:27, Studio phone 13:31, everything else 13:51, all on 2026-10-11 in `Asia/Kolkata` (S-1). Where an artboard's own numbers are wrong for its own clock (S-11 "2 days" vs 2.74 days), the derived value wins and the artboard is regenerated.

### 7.3 Drawer placement (extends §1.2 `CardLayout`)
```ts
export interface CardLayout {
  drawer: Component<CardLayoutProps>; phone: Component<CardLayoutProps>;
  width: string; align: 'end' | 'center';
  /** 'overlay': a panel over the scrimmed board. 'reserve': the board reflows into the space left of the panel (Daylight, D-1). 'sheet': a centred sheet in a scrolling overlay (Paper, P-2). */
  placement: 'overlay' | 'reserve' | 'sheet';
}
export const CARD_LAYOUTS = {
  daylight: { drawer: CardDaylight, phone: CardPhoneDaylight, width: 'min(680px, 100%)', align: 'end', placement: 'reserve' },
  paper:    { drawer: CardPaper,    phone: CardPhonePaper,    width: 'min(780px, calc(100% - 32px))', align: 'center', placement: 'sheet' },
  studio:   { drawer: CardStudio,   phone: CardPhoneStudio,   width: 'min(940px, 100%)', align: 'end', placement: 'overlay' },
  quiet:    { drawer: CardQuiet,    phone: CardPhoneQuiet,    width: 'min(1120px, 100%)', align: 'end', placement: 'overlay' },
};
```
`vibekit:Drawer` gains `placement` with the same three values. For `reserve`, the drawer shell sets `--card-drawer-reserve: <width>` on `.app-shell` while open, and the board group's layout pads its main area by that variable. That is a contract with the board group.

### 7.4 CardModel additions (extend §1.3)
`readonly surface: CardSurface`; `readonly allStages: Stage[]` (the full ordered list, for the phone resume select); `ResumeModel.targets: { key: string; n: number; name: string; current: boolean; allowed: boolean }[]`. This holds every stage. `allowed` = this stage or earlier, and later stages are rendered `disabled` where a vibe lists them (D-20, P-24, S-13, Q-19 all become this). `readonly related` (RelatedWork fetch). `copySessionId()` on every vibe's drawer and page where a session id exists (Q note 5: Quiet drawer adds it; S-12: Studio phone is exempt, so the phone layouts may omit it).

### 7.5 Helpers (extend §1.5)
`whenLabelLong(iso)` → "Thursday 8 October, 19:41" (phone). `paperLight(phase)` (P-1). Studio's compact formatters are in the Studio section. The run-row stop event is seeded as `type: 'response', signal: 'stop'`, never `type: 'error'`, so "0 errors" stays true (S note). The G-5 verb rule is therefore `a.signal === 'stop' ? 'Stopped' : …`.

### 7.6 Gallery cell E (amends §3)
The E model is constructed with `holdDetail: true`, so the snapshot's pending gate stays on screen. The seed hook `staleSnapshotGate(boardId, gateId)` decides the gate through the API with `via: 'matrix'` after the snapshot has been read, so the click gets the G-1 409. Per vibe: Daylight, Studio and Quiet click "Request changes" with an empty note and then "Approve". Paper's E cell is `GatePaper part='reply'` and the test only picks Approve and then clicks "Send reply" (P-14). `GateQuiet` and `GatePaper` take a gallery-only `compact`/`part` prop. The gallery is exempt from the 23-key parity test, because it renders lead blocks only.

### 7.7 Page below 640px
`/b/…/c/…/page` renders `CARD_LAYOUTS[vibe].phone` with `surface: 'page'` when the phone media query matches (S note). The page layouts carry their own breakpoints for 640–1440 (D.3.3, P-11, Studio and Quiet sections).

### 7.8 Parity test
`card-layouts.svelte.test.ts` counts `[data-section=key]` in the DOM. For Studio it activates each tab in turn and sums the counts (S note). Quiet wraps dt/dd pairs in `div[data-section]` (Q-7). Only one instance of a repeated control carries the attribute (Q-8).

### 7.9 vibekit names added by the vibe sections (extend §1.7)
`vibekit:ChoiceList` (Paper/Quiet gate radios: `{ name: string; legend: string; options: { value: string; label: string; description?: string }[]; value (bindable) }`), `vibekit:Kbd`, `vibekit:StageSwatch`, `vibekit:Initials`, `vibekit:NumberedList`, `vibekit:CommandField`, `vibekit:StatusBar`.

Extra props:
- Button: `tone: 'destructive'`.
- AgentQuote: `size`, `density`, `salutation`, `signature`.
- StatePill: `density`.
- Figure: `size: 'lg'`.
- FactList: `variant`.
- Disclosure: `variant`, `openWord`, `closeWord`.
- StageStrip: `numerals: 'arabic' | 'roman'`.
- DefinitionGroups: `clampChars`, `faceAgents`.
- AgentFace: `calm: 'grayscale' | 'saturate' | false`.
- Banner: `icon` optional.

Each vibe section names the props it uses.

### 7.10 Signal discipline (applies to all vibes)
- An archived card never shows signal. Its current stage bar is muted (P-21) and its first fact reads "Archived" (P-30).
- A phone fieldset border is signal only while a decision is needed now (Q-26).
- "Assign to me" is hidden when the viewer already owns the card (D-18, P-19, S-14, Q-20). Those phone baselines are regenerated.

## 8. Gaps: merged index

Counts: shared G-1…G-8 (8), Daylight D-1…D-27 (27), Paper P-1…P-32 (32), Studio S-1…S-21 (21), Quiet Q-1…Q-28 (28). That is **116 rows**. Some describe the same fact in different vibes; after the merges below there are **9 API changes** and **11 behaviour rulings of type (c)**. Everything else is client-side derivation (a). The full rows stay in each vibe section, and where a ruling below differs from a vibe row, the ruling below wins.

### 8.1 API changes (b), one name each
| # | Change | Merges |
|---|---|---|
| API-1 | `resolveGate` 409 `GATE_ALREADY_DECIDED` with `decidedBy`, `decidedAt`, `via` | G-1 |
| API-2 | Archiving a card cancels its pending gates (`status: 'cancelled'`, `resolvedAt`, `decision: null`). The client derives "Its pending review was cancelled when the card was archived." from a cancelled gate with `resolvedAt` equal to `archivedAt` (±5 s) | D-13, P-16, S-9 |
| API-3 | `Card.queuedGrantOwner: string \| null` (principal whose dispatch grant authorised the queue, recorded at queue time) in the snapshot contract. Sentence: "Queued by {q} on {displayPrincipal(owner)}'s grant · {n} agents may be dispatched." where n = `queuedGrant` entries starting with `agt_` | D-19, P-25 (`queuedGrantBy` renamed), S-15 (`queuedOnGrantOf` renamed), Q-21 |
| API-4 | `GateOption.description?: string` (from the pipeline template's gate options) | P-5, Q-12 |
| API-5 | `AgentSummary.role: string \| null` on `GET /v1/agents` | P-4 |
| API-6 | `Card.stageSince: string` (set when `currentStageKey` changes; backfilled) | S-2 |
| API-7 | `Attempt.startedAt: string`, `Attempt.endedAt: string \| null` | S-3 |
| API-8 | `Card.createdAt: string` in the web `Card` type / snapshot serialisation | Q-24, and the "queued … on 8 Oct" sentence in P-28, S-17 |
| API-9 | `app.syncedAt` (client store, not API): set when a snapshot load or feed event resolves | S-6 |

### 8.2 Behaviour rulings (c) that remain (the design changes; those baselines are regenerated)
1. "Assign to me" is hidden when the viewer owns the card (D-18, P-19, S-14, Q-20).
2. Later resume stages are shown but disabled (D-20, P-24, S-13, Q-19; §7.4).
3. An archived card shows no signal (P-21, P-30).
4. A phone fieldset is signal only while a person is needed now (Q-26).
5. One priority word, "P3" (Q-22).
6. The resume placeholders do not name another card's specifics (D-6).
7. Paper's dimmed background is the real Paper board, not the simplified list (P-6).
8. The Paper page spread gets a breakpoint (P-11), and page Enclosure III gets "Add a sub-task" / "Attach a link" (P-8).
9. The phone brief does not show the project inside the spec (Q-28).
10. Gallery-only captions are copy constants (Q-13).
11. Studio's phone "2 days" is derived from its own clock (S-11).

### 8.3 Blockers
None for the spec itself. Implementation depends on: the board group honouring `--card-drawer-reserve` (§7.3), the shell group providing the `bare` slot (§2.1), and the vibekit library providing the §1.7 and §7.9 components.

---

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

---

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

---

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

---

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
