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
