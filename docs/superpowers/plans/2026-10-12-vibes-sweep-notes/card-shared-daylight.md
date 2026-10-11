# Digest — card group: shared model + Daylight (drawer, page, states, phone)

Sources read: `screens/card.parts/00-shared.md`, `05-amendments.md` (§7–§8, binding over §1–§6), `10-daylight.md`; `mockup-corrections.md` groups `card-drawer`, `card-page`, `states-phonecard` (Daylight rows), Part 4.1/4.2 for those groups, Appendix for those groups; `fixtures-and-harness.md` §A (ids). References checked: `apps/web/e2e/reference/mockups/SP-{Card,CardPage,Card-States,Phone-Card}-Daylight.html` (already corrected; source of truth for text/markup/CSS).

**Precedence:** mockup-corrections > fixtures-and-harness (F) > 05-amendments > 00-shared/10-daylight. "corrected:" marks spec values overruled.

**One-world overrides (apply everywhere below):**
- corrected: §7.1 "per-artboard seeds" and §7.2 per-artboard clocks are VOID. One seed (F world), one clock `2026-10-11T08:21:00Z` = 13:51 Asia/Kolkata, Sunday, phase `noon`. No `card4605-desktop-*` variant (F §A.7.2 void), no `seedCard4605Desktop/Phone`, no `seedSP*` functions.
- corrected ids: board `brd_134a0ddb6d434478` (not `brd_devx`), user `usr_b19776fac3c94df4` "Rakesh Gangwar" (not `usr_rakesh`), agents `agt_fx_error_eric`, super-chotu = `agt_bb586732b807460c` (principal `prn_d8178f4a05934b72892a`), stage key `test` (not `failing-test`). DX stages: reported Reported · reproduce Reproduce · test Failing test · fix Fix · integrate Integrate · signed-off Signed off (gate approval) · shipped Shipped.
- corrected: card 4605 = phone-literal content everywhere (desktop too): 5 criteria, no plan, 10 detail rows in 5 groups (phone `spec.groups`, no Project row), project `prj_42ab5ec961104f65` "Marketing & Community — Melissa and Anna onboarding", no milestone, 5 GitHub references, no links, no related prior work, `handoff_json` NULL, runs Thu 8 Oct, `state_since 2026-10-08T14:11:45Z` → "2 days", `archived_at` NULL (WC-1; F §A.5.2 table still says archived — WC-1 wins), state `input-required` in `reproduce`, P3, attempt 2 by error-eric, queued by super-chotu.
- DX board now has 7 live cards, 4 need you (drawer backdrop is the board group's concern).

---

## 1. Screens covered

| Artboard | Route | Viewport | Steps / state | Masks |
|---|---|---|---|---|
| SP-Card-Daylight | `/b/brd_134a0ddb6d434478/c/card_05823a57e8224605` | 1440×2342 | drawer open on load (route opens it); no steps. Light + dark (same content) | `C-08` backdrop: everything left of the drawer's left edge. F registry hard-codes `w: 920` for daylight — **wrong**: the drawer is `min(680px,100%)` so its left edge is x=760; use 760 (or resolve from the reference DOM as F §B.2 prefers). |
| SP-CardPage-Daylight | `/b/brd_134a0ddb6d434478/c/card_05823a57e8224605/page` | 1440×3014 | none; shell slot `bare` | none required by data; see Gap 7.4 (resume placeholder still old in reference) |
| SP-Card-States-Daylight | panels A–F (see §1.1) | 1440×1791 (ref) | panels mode, `ref: '.ds-card'`, `app: '[data-pixel="card-top"]'`, count 6 | none |
| SP-Phone-Card-Daylight | `/b/brd_134a0ddb6d434478/c/card_05823a57e8224605` | 390×3068 | live variant (default). All `.sec` closed except "Session activity" and its Run 2 | none (corrected: D-18 `.atm` mask is gone — the corrected reference has no "Assign to me") |

Harness context (F §B.4): `timezoneId: 'Asia/Kolkata'`, `locale: 'en-GB'`, `reducedMotion: 'reduce'` (skeleton static), clock installed+paused at NOW, cookie `vk_appearance=daylight.<theme>.strong.0`, localStorage `superpipeline.devTenant=tnt_vibes`, `superpipeline.devUser=usr_b19776fac3c94df4`. App must set `document.documentElement.dataset.ready='true'` (dev only) when loaded. Registry variants for these screens become `[]` (base world; `card4605-live` is deleted per WC-1).

### 1.1 Card-States panels (F `STATE_PANELS`, corrected)

| Panel | Card / route | Data (corrected) | Steps |
|---|---|---|---|
| A Approval gate | R&I `card_42269e99036f42ae` on `brd_fa33a0a0721d4d18`, stage `recommendation` (5 of 6) | live, input-required, gate `gate_fx_p4` pending, corrected: `options_json = DEFAULT_GATE_OPTIONS` (Approve / Request changes / Reject; F said APPROVAL_SUBJECT_GATE_OPTIONS), approval subject `aps_fx_p4` schema `recommendation/v1` rev 2 digest `sha256:9f3ac2e1d071…cb84`, canonical `{kind, synthesis, sources:[…]}`, gate summary "All done, ready for your review.", producer research-ray, created 07:18Z ("Today, 12:48") | none |
| B Agent question | corrected: Guild Operations & Automation card 1 (`brd_af3fde184dd84d90`), stage `build` (3 of 5: Intake, Shape, Build, Review, Done) | elicitation `elc_fx_guild1`, agent `agt_fx_optimizer_ollie`, question "The handoff needs a commit, and the fix is still on an unmerged branch. Should I hand on the branch commit, or wait until it is merged?", created `2026-10-11T02:10:00Z` ("Today, 07:40"), options [] | none |
| C Archived | `card_e1eb201927f94506` on `brd_e247f164e060443f` (Marketing & Community, 8 stages, current 3 "Messaging approval") | archived `2026-10-09T05:30:00Z` ("Archived 9 Oct"), 1 run by message-melissa, one gate cancelled at archive (spelling: use `cancelled`, the DO's `GateStatus`; F wrote `canceled`) ; description "Verify Super Chotu can dispatch Message Melissa. Produce a DRAFT three-sentence messaging brief for workspace operators about registering an agent." | none |
| D Done | `card_f180b1627c594b41` on `brd_f47143722126442c` (Agent Onboarding, stage `resident`, 7 of 7) | corrected: finished Thu `2026-10-08T13:56:34.688Z` (19:26 IST; F variant D "Fri" void), 5 attempts, P2, last run by onboarding-olivia with `handoff_json = {summary:"Melissa is resident. …", handedOn:"Profile, router description, …"}` | none |
| E Decision error | same card + gate as A | 409 on resolve (see API-1) decided 07:32Z ("13:02") by Rakesh via matrix | pick "Request changes" with empty note → field error; then "Approve" → 409 alert |
| F Loading | 4605 on DX | live; harness holds `**/cards/card_05823a57e8224605/attempts` and `…/activities` | none |

**Conflict (open, see §7):** F renders each panel by opening the real *drawer* and screenshotting `[data-pixel="card-top"]`; the card spec instead builds a test-only gallery route `/dev/card-states`. The reference `.ds-card` is ~440px wide with a compact head (`.ds-title` 1.2rem, `.ds-track` 7px bars) — a 680px drawer top cannot match it. Recommendation: build the card-spec gallery and point STATE_PANELS at it (`app: '[data-pixel="card-top"]'` on each `.ds-card`, nth(i)).

---

## 2. API / contract rulings

### 2.1 Server changes (b) — 05-amendments §8.1 (the 9 merged ids) + others

| Id | Field / endpoint | Exact TS | Server source | Screens | Fixture value |
|---|---|---|---|---|---|
| API-1 (G-1) | `POST /boards/:b/gates/:g/resolve` on a non-pending gate → **409** | `{ error: { code: 'GATE_ALREADY_DECIDED'; message: string; decidedBy: string /*principalId*/; decidedAt: string /*ISO*/; via: 'matrix' \| 'web' \| 'api' } }`; contract type `GateResolveError` in `@superpipeline/contract` | gates row `decided_by`, `resolved_at`; **new** `via` must be recorded at resolve time (new column e.g. `decided_via`; today only `GATE_NOT_PENDING` exists, board-do.ts ~1246) | States E (all vibes) | decidedBy `usr_b19776fac3c94df4`, decidedAt `2026-10-11T07:32:00Z`, via `matrix`. Note F's harness fulfils a different body `{"error":"already_decided","decidedBy":"Rakesh Gangwar","decidedVia":"matrix","decidedAt":"2026-10-11T07:32:00Z"}` — update the registry fulfil to API-1's shape in the same PR (F §B.2 says registry follows the screen spec). |
| API-2 (D-13, P-16, S-9) | `archiveCard` cancels the card's pending gates | `Gate.status: 'cancelled'`, `resolvedAt` = archive time, `decision: null`. D-13 additionally proposed `Gate.cancelReason?: 'archived' \| null` — §8.1 merged it into the derivation below (no `cancelReason` needed) | DO archive path (board-do.ts ~2940 `archived_at = ?`) | States C, phone archived variant | panel C gate: `status 'cancelled'`, `resolvedAt = 2026-10-09T05:30:00Z` |
| API-3 (D-19, P-25, S-15, Q-21) | `Card.queuedGrantOwner` in snapshot | `queuedGrantOwner: string \| null` | principal whose dispatch grant authorised the queue, recorded at queue time (from token subject); new card column `queued_grant_owner` | phone "Session activity", phone asked-by chip `title` | 4605: `usr_b19776fac3c94df4` → "Rakesh Gangwar" |
| API-4 (P-5, Q-12) | `GateOption.description` | `description?: string` on `GateOption` (contract `GateOptionSchema`) | pipeline template stage gate `options[].description` | Paper/Quiet A only (Daylight does not render it) | `gate_fx_p4` approve: "File the recommendation as it is." |
| API-5 (P-4) | `AgentSummary.role` on `GET /v1/agents` | `role: string \| null` | agent profile display role | Paper only (not Daylight) | error-eric `Diagnostics` |
| API-6 (S-2) | `Card.stageSince` | `stageSince: string` (ISO) | new column `stage_since`, set when `current_stage_key` changes; backfill from latest `card.moved` event or `created_at`. (Existing `state_since` trigger fires on state OR stage change.) | Studio page only. corrected (appendix): Studio's figure stays "2 days" from `state_since`; S-2 must adapt | — |
| API-7 (S-3) | `GET /boards/:b/cards/:c/attempts` | `Attempt.startedAt: string`, `Attempt.endedAt: string \| null` | `runs.started_at` / `runs.ended_at` | **Daylight uses it**: run event times/dates, page closed-run end time "· 12:11", "19:41 Thu 8 Oct" | run_fx_4605_1 ended `2026-10-08T06:41:00Z` (12:11); run_fx_4605_2 started `13:20:00Z`, ended `14:11:43Z` (19:41) |
| API-8 (Q-24, P-28, S-17) | `Card.createdAt` in web `Card` + snapshot serialisation | `createdAt: string` | column already exists | handoff fallback sentence "…on 8 Oct…" (drawer, page, phone) | 4605 `2026-10-08T06:04:57.202Z` → "8 Oct" |
| API-9 (S-6) | client store only, NOT API | `app.syncedAt: Date \| null` | set on snapshot load / feed event | Studio only | — |
| G-05 (F) | generic approval-subject renderer | client: unknown `schema` (e.g. `recommendation/v1`) → flat key/value rows from `approvalSubject.canonical` (labels via `humanizeKey`: Kind / Synthesis / Sources; arrays joined) | fixture provides canonical bytes; add `"approvalSubjectSchema":"recommendation/v1"` to R&I `recommendation` stage | States A | Kind "Recommendation, one paragraph"; Synthesis (paragraph); Sources "Organization plane cutover record, 7 Oct" |
| Attempt outcome "sent back" | run 1 word | Either seed `outcome='sent_back'` or derive: `outcome==='completed' && completion.ok===false` → "sent back" (Part 4: "either derive the word or seed outcome `sent_back`"). Fixture has outcome `completed` + completion `{"ok":false,"missing":["repro","observed"]}`. If derived, the server must expose completion (or `failureReason`) on `Attempt` | run_fx_4605_1 → "sent back"/"Sent back"; `failure_reason='repro and observed missing'` (Part 4) |
| Fixture: activity actions | `activities.action` | run_fx_4605_2 seq 1 `action='Started'` (type thought); run_fx_4605_2 seq 14 `type='response'`, `signal='stop'` (never `type:'error'`, so "0 errors" holds); run_fx_4605_1 seq 1 `action='Sent back'` | seed only | all 4605 screens | — |
| Fixture: gate summary | `gate_fx_p4.summary` = "All done, ready for your review." (producing run's response) | `Gate.summary` already exists | States A | — |

### 2.2 Client-only (a) — do NOT add API work
G-2 unclaimed chip, G-3 id tokens, G-4 session id, G-5 verbs, G-6 ref repo prefix (superseded: 4605 now has GitHub blob refs, see D-24), G-7 summaries, G-8 next stage, D-1 reserve placement, D-2 open ring (board group), D-4, D-5 strip words, D-7, D-8 handoff, D-9 Figure, D-10, D-11, D-12 "Opened from", D-14 loading, D-16, D-17 density, D-20 disabled later stages, D-21 Show more, D-22 structured values, D-23 copy, D-24 reference source line, D-26 required evidence, D-27 project short name, archive-cancelled sentence (API-2 + derive), grant count (count principals; `cardProvenance.grantSize` = `queuedGrant.length` already).

### 2.3 Behaviour rulings (c), §8.2 (design changes; references already corrected)
1. "Assign to me" hidden when the viewer owns the card (D-18). 2. Later resume stages shown but `disabled` (phone; desktop lists current + earlier only). 3. Archived card shows no signal (muted current bar; first fact "Archived"). 4. Phone fieldset is signal only while a person is needed now. 5. One priority word "P3". 6. Resume placeholder never names a card's specifics: **"For example: what you checked, and what the agent should look at next."** (drawer, page, phone). 7. Paper backdrop = real board. 8. Paper page breakpoint + Enclosure III buttons. 9. Brief has no Project row. 10. Gallery captions are copy constants. 11. Studio phone "2 days" from its own clock (now 13:51).
Also: destructive "Delete card" = ink outline (`background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: inset 0 0 0 2px var(--vk-color-text)`; phone `.sbtn.danger` same + `border-color: transparent`) — VK §3.5.

---

## 3. Shared model: `CardModel` (the card model refactor)

File `apps/web/src/lib/components/card/card-model.svelte.ts` (runes class like `GateDecisionModel`). Everything in CardDrawer's `<script>` except focus management and layout render moves here verbatim, with renames. Surface-agnostic; drawer, page and gallery each construct one.

```ts
export type CardSurface = 'drawer' | 'page' | 'gallery';
export interface CardModelContext { boardId: string | null; cardId: string | null; surface: CardSurface }
export class CardModel {
  constructor(ctx: () => CardModelContext, opts?: { holdDetail?: boolean }); // holdDetail: gallery F (and E, §7.6) — never resolves the detail fetch
  readonly surface: CardSurface;                         // §7.4
  readonly card: Card | undefined;                       // app.cardById(cardId)
  readonly boardId: string | null; readonly boardName: string;  // app.board?.name ?? ''
  readonly stages: Stage[];                              // orderedStages
  readonly allStages: Stage[];                           // §7.4 full ordered list (phone resume select)
  readonly stageIndex: number;                           // max(0, idx of currentStageKey)
  readonly stageName: string;
  readonly shortId: string;                              // card.id.slice(-4) → "4605"
  readonly detailLoaded: boolean;                        // cardDetail !== null (drives state F)
  readonly gate: Gate | undefined; readonly decidedGates: Gate[];
  readonly elicitation: Elicitation | undefined;
  readonly refs: Reference[]; readonly libraryRefs; readonly otherRefs;
  readonly children: Card[];
  readonly attempts: Attempt[];                          // was drawerAttempts
  readonly activityGroups: ActivityGroup[];              // groupActivities(...)
  readonly stageEntries; readonly stageByRun;
  readonly estimate: Estimate | null;                    // was cardEstimate
  readonly costPct: number;
  readonly linkGroups; readonly hasAnyLink: boolean;
  readonly projectName: string | null; readonly milestoneName: string | null; // was currentProjectName/currentMilestoneName
  readonly acceptanceCriteria: string[] | null;
  readonly overdue: boolean; readonly labels: {id;name;colour}[]; readonly ageHours: number | null;
  readonly lead: CardLead | null; readonly agent: CardAgent;   // was drawerAgent
  readonly delegate: { id: string | null; name: string; iconUrl: string | null; mood: Mood };
  readonly provenance; readonly grantSummary: string;
  readonly counts: CardCounts;                           // includes deliveryActive
  readonly deliveryGate: Gate | undefined; readonly manualItems;
  readonly handoff: Record<string, unknown> | null;      // cardDetail.handoff
  readonly archived: boolean;                            // !!card.archivedAt
  readonly related;                                      // §7.4 RelatedWork fetch moved in
  // local UI state
  showToolCalls: boolean; localError: string | null; gateError: string | null;
  readonly edit: EditForm;          // editing,title,priority,desc,labels,labelsBlind,ac,due,saving; start(),save(),cancel()
  readonly project: ProjectPicker;  // editing,projectId,milestoneId,milestones,saving,error; start(),onProjectChange(),save(),cancel()
  readonly links: LinkEditor;       // open,boardId,cardId,kind,boardCards,adding,error,removing:Set<string>,crossBoardNotice; openAdd(),onBoardChange(),add(),remove(args),cancel()
  readonly subtasks: SubtaskComposer;   // title,adding,error; add()
  readonly refsForm: ReferenceComposer; // url; add()
  readonly delivery: DeliveryControls;  // liveUrl,saving,copied:number|null; change(update),copy(index,text)
  readonly comments: CommentsModel;     // card/comments-model.svelte.ts (from CardComments.svelte)
  readonly resume: ResumeModel;         // card/resume-model.svelte.ts (from CardResume.svelte); targets below; busy; submit()
  readonly question: QuestionAnswer;    // unchanged class
  assignToMe(): Promise<void>; assigning: boolean;
  archive(): Promise<void>; restore(): Promise<void>; archiving: boolean;   // onArchiveCard / onUnarchiveCard
  remove(): Promise<void>;              // keeps confirm('Delete this card? This cannot be undone.')
  onGateResponse(d: GateDecision, r: Response): Promise<boolean>;
  refresh(): Promise<void>;             // refreshDrawer(cardId, boardId)
  copyId(): Promise<void>; copyLink(): Promise<void>; copySessionId(): Promise<void>; copied: 'id' | 'link' | null;
  dispose(): void;                      // stops feed subscription
}
// ResumeModel.targets (§7.4): { key: string; n: number; name: string; current: boolean; allowed: boolean }[]
//   holds every stage; allowed = this stage or earlier.
```

**Surface rule:** after a successful decision/delete — `drawer` → `app.closeCard()`; `page` → stay, `refresh()` (delete navigates to `/b/{boardId}`); `gallery` → nothing.

**Props** (`card/layouts/types.ts`):
```ts
export interface CardLayoutProps {
  model: CardModel; vibe: Vibe; phase: Phase;
  personName: string;               // app.user?.name ?? app.user?.login ?? 'there'
  gate: GateBinding | null; question: QuestionBinding | null;   // unchanged shapes
  pageHref: string;                 // `/b/${boardId}/c/${cardId}/page`
  onClose: () => void;              // app.closeCard()
}
export interface CardPageProps extends Omit<CardLayoutProps, 'onClose'> { boardHref: string }
export interface CardStatesProps { cells: Record<'gate'|'question'|'archived'|'done'|'error'|'loading', { model: CardModel; gate: GateBinding | null; question: QuestionBinding | null }>; vibe: Vibe; phase: Phase }
```
`CardSections`/`CardSectionKey` snippet types removed; `CARD_SECTION_KEYS` stays (23 keys: error,status,facts,editButton,editForm,description,delivery,resume,plan,criteria,details,project,links,subtasks,activity,decisions,comments,handoff,cost,attempts,related,references,cardActions).

**Registry** (`lib/layouts.ts`, §7.3 supersedes D.1):
```ts
export interface CardLayout { drawer: Component<CardLayoutProps>; phone: Component<CardLayoutProps>; width: string; align: 'end'|'center'; placement: 'overlay'|'reserve'|'sheet' }
CARD_LAYOUTS.daylight = { drawer: CardDaylight, phone: CardPhoneDaylight, width: 'min(680px, 100%)', align: 'end', placement: 'reserve' };
// paper  { width:'min(780px, calc(100% - 32px))', align:'center', placement:'sheet' }
// studio { width:'min(940px, 100%)', align:'end', placement:'overlay' }
// quiet  { width:'min(1120px, 100%)', align:'end', placement:'overlay' }
export const CARD_PAGE_LAYOUTS: Readonly<Record<Vibe, Component<CardPageProps>>>;   // daylight: CardPageDaylight
export const CARD_STATES_LAYOUTS: Readonly<Record<Vibe, Component<CardStatesProps>>>; // daylight: CardStatesDaylight
```
`panel` (Tailwind) replaced by `width`. Phone switch in the shell: `const phone = new MediaQuery('max-width: 639.98px')` (`svelte/reactivity`) → `L.phone`. `reserve` (D-1): at ≥1280px the shell sets `--card-drawer-reserve: min(680px, 100%)` on `.app-shell` while open; BoardDaylight main uses `padding-inline-end: var(--card-drawer-reserve, 0)`; scrim covers only the board. <1280 overlay. Contract with board group.

**Parity test** `card-layouts.svelte.test.ts`: counts `[data-section="<key>"]` (exactly one per key; empty section renders its empty sentence or a `hidden` element) over drawer + phone + page of every vibe (12 components). Studio: activate each tab and sum. Only one instance of a repeated control carries the attribute. Gallery exempt.

**Files deleted/converted:** `LeadBubble.svelte` deleted (→ vibekit AgentQuote); `CardComments.svelte` → `card/comments-model.svelte.ts`; `CardResume.svelte` → `card/resume-model.svelte.ts`; `SpecDetails`/`PlanChecklist`/`HandoffView`/`RelatedWork` components deleted once all vibes render from helpers (`spec-details.ts`, `plan.ts` kept); kept: `RawJson.svelte`, `StructuredValue.svelte` (gains shapes D-22), `LibraryArtifact.svelte` (reachable from References), all via `class` prop. `AgentFace.svelte` → thin adapter on vibekit Face; `Tabs.svelte` → vibekit Tabs. Pinned-brief 📌 emoji button deleted.

**Drawer shell** `CardDrawer.svelte` (~200 lines): keeps overlay, scrim button "Close drawer" (`tabindex=-1`), `role="dialog" aria-modal="true" aria-labelledby="drawer-title"`, focus-on-open, trap, restore on destroy, Esc (root `closeCardOnEscape`) — moved into `vibekit:Drawer`/`Sheet`. Removes absolute close button (layouts draw Close). Constructs `new CardModel(() => ({ boardId: app.boardId, cardId: app.openCardId, surface: 'drawer' }))`. Panel div: only `h-full` + `style="width:{L.width}"` (phone `width:100%`). Scrim colour from `--card-scrim` defined per vibe on `:global([data-vibe=x])`; Daylight: `color-mix(in oklch, var(--vk-color-text) 42%, transparent)`.

**Card page route:** `routes/b/[boardId]/c/[cardId]/page/+page@.svelte` (the `@` resets to root layout) + `+page.ts`: `export const load = () => ({ shell: 'bare' as const });`. URL `/b/{boardId}/c/{cardId}/page` (fixture: `/b/brd_134a0ddb6d434478/c/card_05823a57e8224605/page`). Root layout renders no Rail/top bar/BottomNav for `page.data.shell === 'bare'` but still mounts CommandPalette + AppearanceDialog. Page opens the board itself: `$effect(() => { if (app.authState === 'ready' && app.boardId !== boardId) void app.openBoard(boardId); })` then `new CardModel(() => ({ boardId, cardId, surface: 'page' }))`. `<svelte:head><title>{card.title} · {boardName}</title>`. Below 640px the page renders `CARD_LAYOUTS[vibe].phone` with `surface:'page'` (§7.7). Not found: "This card is not on Developer Experience any more." + link "Back to the board" (`This card is not on ${boardName} any more.`).

**Open in new window:** every drawer head has `<a href={pageHref} target="_blank" rel="noopener" aria-label="Open in new window">` with visible text "Open in new window" (Daylight: frame button with `open-window` icon). Phone: same href, **no target** (same tab), text + aria-label "Open as a page". Page's "Back to the board" + board pill → `/b/{boardId}` same tab. Board tiles stay buttons (no middle-click change).

**Gallery route** (card spec; see conflict §1.1): `routes/dev/card-states/+page@.svelte` + `+page.ts`:
```ts
import { error } from '@sveltejs/kit'; import { dev } from '$app/environment'; import { env } from '$env/dynamic/public';
export const load = () => { if (!dev && env.PUBLIC_FIXTURE_ROUTES !== '1') error(404); return { shell: 'bare' as const }; };
```
Opens the needed boards, builds six CardModels `surface:'gallery'` (F and E with `holdDetail:true`; E's gate is pending in the snapshot and decided server-side → click yields the 409). Seed hook `staleSnapshotGate(boardId, gateId)` (decide via API with `via:'matrix'` after the snapshot is read) — or the harness `fulfil`.

---

## 4. Pure derivations (vitest)

Fixture world unless noted. NOW = 2026-10-11T08:21Z, tz Asia/Kolkata.

| Fn (file) | Rule | Examples |
|---|---|---|
| `ageWords(hours): string` (`lib/age.ts`) | floor to largest unit, long form | `ageWords(66.15)` (4605: 2026-10-08T14:11:45Z→NOW) → "2 days"; 5.2 → "5 hours"; 0.4 → "under an hour"; 1 day → "1 day" (singular). `ageLabel` stays ("2d", "33h") |
| `whenLabel(iso, now): string` (`lib/when.ts`) | same local day → `Today, HH:mm`; else `"Ddd D Mon, HH:mm"` en-GB, 24h, viewer tz | `2026-10-08T14:11:45Z` → "Thu 8 Oct, 19:41"; `2026-10-11T07:18:00Z` → "Today, 12:48"; `2026-10-11T02:10:00Z` → "Today, 07:40"; `2026-10-08T13:56:34.688Z` → "Thu 8 Oct, 19:26" |
| `whenLabelLong(iso)` | weekday long, day, month long, HH:mm (phone) | `2026-10-08T14:11:45Z` → "Thursday 8 October, 19:41" |
| `dayMonth(iso)` | "D Mon" | archived `2026-10-09T05:30:00Z` → "9 Oct"; createdAt `2026-10-08T06:04:57Z` → "8 Oct"; long form for phone banner "8 October" |
| `waitingWord(card, lead, now)` / `stateWord(card, lead)` (`card/state-words.ts`) | archived wins → "Archived"; input-required/gate/question → "Waiting on you" (+ " · " + ageWords on desktop; phone omits age); working "Working"; completed "Done"; submitted/queued "Queued"; rejected "Rejected"; failed "Failed". Never raw state | 4605 → "Waiting on you · 2 days" (desktop), "Waiting on you" (phone); panel C → "Archived" |
| `STRIP_WORD: Record<LeadKind\|'archived', string>` (D-5) | stopped/failed/budget → "stopped"; review → "awaiting review"; question → "question pending"; archived → "archived"; phone appends " here" | drawer strip aria `Stages: stage 2 of 7, Reproduce, stopped`; page current label "Reproduce · stopped"; phone `Stage 2 of 7, Reproduce, stopped here`; A `Stage 5 of 6, Recommendation, awaiting review`; B `Stage 3 of 5, Build, question pending`; C `Stopped at stage 3 of 8, Messaging approval, archived` |
| `stopLine(lead, i, n, stages)` (G-8) | `${verb} in stage ${i+1} of ${n}.` + (next ? ` Next: ${next.name}.` : '') ; verb: stopped/failed/budget "Stopped", review "Waiting for review", question "Asked a question", working "Working", else "Queued"; omit Next on last stage | 4605 → "Stopped in stage 2 of 7. Next: Failing test." |
| phone stage caption | `Stage ${i} of ${n} · ${name}, stopped here · next: ${later.join(', ')}`; archived `${name}, where it stopped` | "Stage 2 of 7 · Reproduce, stopped here · next: Failing test, Fix, Integrate, Signed off, Shipped" |
| `unclaimedChip(card, attempts)` (G-2) | when `!delegateAgentId && last=attempts.at(-1)`: `Unclaimed · ${agentName(last)} ran attempt ${attempts.length}`; delegated: `${delegate.name} · working it` | 4605 → "Unclaimed · error-eric ran attempt 2" |
| owner chip | `Owner · ${displayPrincipal(ownerUserId)}`, initials | "Owner · Rakesh Gangwar", "RG"; page row role `Owner · you` when owner is viewer, else `Owner` |
| asked-by chip title (D-4) | agent & grant>0: `${name}, an agent, with dispatch authority on this board`; person: `${name}` no icon | "super-chotu, an agent, with dispatch authority on this board" |
| provenance line | `Asked by ${name} (${byAgent?'an agent':'a person'}${grantCoversDelegate?', allowed to dispatch the one working it':''}).` + (no delegate ? ' Unclaimed now.' : ` ${delegate} is working it.`) | "Asked by super-chotu (an agent, allowed to dispatch the one working it). Unclaimed now." |
| `grantLine(card, names)` (API-3) | `Queued by ${queuedByName} on ${displayPrincipal(queuedGrantOwner)}'s grant · ${n} agents may be dispatched.` n = `queuedGrant.length` (count **principals** — the 32 entries are all `prn_…`; corrected: S-15's `agt_` filter would give 0). Quiet copy rule: "principals" when grant holds people | 4605 → "Queued by super-chotu on Rakesh Gangwar's grant · 32 agents may be dispatched."; phone chip title `Queued on Rakesh Gangwar's grant` |
| facts | `Priority P${p}`/none; Due none/date; Labels none/names; `In ${stageName} for ${ageWords}`; `Attempt ${attemptCount}` when >1; page adds `Project ${projectName ?? 'none'}` | "Priority P3 · Due none · Labels none · In Reproduce for 2 days · Attempt 2"; page "… · Project Marketing & Community — Melissa and Anna onboarding" |
| short id | `card ${id.slice(-4)}`; copy value full id; aria `Copy card id ${short}` | "card 4605", copies `card_05823a57e8224605` |
| `splitTokens(text)` (G-3) | display-only id spans; text never altered. **Spec regex is wrong** (gives `event_id`,`room_id` separately). Use, in this order: `/\b(?:acps\|evt\|run\|card\|brd\|agt)_[\w-]+\|\b[a-z][\w-]*(?:\/[\w-]+)*\/[a-z][\w-]*\b\|\b[a-z]+(?:_[a-z]+)+\b/g` (verified) | 4605 detail → exactly 4 tokens: `acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023`, `event_id/room_id/timestamp`, `matrix-inbound/control-pair/ACP/matrix-outbound`, `matrix_rooms` (then "/ACP metadata" plain). Phone: `tokens:false` |
| `sessionIdOf(text)` (G-4) | first `/\bacps_[0-9a-f-]{36}\b/`; button hidden when none | 4605 → `acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023`; gate summary → null |
| `sentenceCase(detail)` (F C-06, phone only) | upper-case first letter; append "." if not ending `.!?`. Desktop shows stored text verbatim. (corrected: Q-18 lower-case ruling overruled) | "not reproduced end-to-end: …no issue filed." → "Not reproduced end-to-end: …no issue filed."; 1dfc "this stage was not finished twice — … missing commit" → "This stage … missing commit." |
| reply sub-line | `Stopped after ${attemptCount} attempt${s}. Tell ${agent} what to do differently.`; reason `repeated-failure`: `Failed ${failureCount} times; the board stopped retrying. Tell ${agent} what to do differently.`; `not-authorised`: `Not dispatched: nobody with permission asked for it. Say who should pick it up.` | "Stopped after 2 attempts. Tell error-eric what to do differently." |
| resume options | desktop: `targets.filter(allowed)` in stage order, `${n} · ${name}`, current + " (this stage)"; phone: all targets, current + " (where it stopped)", later `disabled` | desktop "1 · Reported", "2 · Reproduce (this stage)"; phone adds "3 · Failing test"…"7 · Shipped" disabled (values reported, reproduce, test, fix, integrate, signed-off, shipped) |
| resume hint / empty error | `Needed before you send. ${note.length} / 8000` (maxlength 8000); empty → `Add a note for ${agent.name} first.` (no request), focus textarea; note `Pressing it with no note says “Add a note for ${agent} first.”` | "Needed before you send. 0 / 8000"; "Add a note for error-eric first." |
| phone dock | `Stopped, waiting on you` + `${n} tr${n===1?'y':'ies'} so far` | "2 tries so far" |
| pinned brief | summary `What ${agent.name \|\| 'the agent'} was asked`; meta `[desc?'Description':null, crit?`${n} criteria`:null].join(' and ') + ` · ${open?'Hide':'Show'}` | "Description and 5 criteria · Show" (corrected from 3) |
| `specGroups(spec)` (`card/spec-groups.ts`) | excludes description, acceptanceCriteria, labels, due, plan, groups (and the card's `project` key — §8.2-9); label `humanizeKey` (first word capitalised, rest lower); `spec.groups` wins, else `SPEC_GROUP_OF`, unmapped → "Other details"; row count = summary count | 4605 → 5 groups/10 rows: What to do [Rework, Required evidence]; Who it is about [Message Melissa, Audience Anna]; Background [Context, Latest confirmed grant]; Rules [Scope, Accounts issues]; Where work goes [Repository, Routing rule]. `humanizeKey('latestConfirmedGrant')` → "Latest confirmed grant"; `accountsIssues` → "Accounts issues"; `messageMelissa` → "Message Melissa" (corrected example: proper-noun capitalisation — Melissa/Anna — so the rule cannot be "rest lower case"; pin with these cases or use the reference labels) |
| required evidence (D-26/S-18) | array deep-equal to acceptanceCriteria → `${n} items, listed under ${criteriaHeading}.` heading "Acceptance criteria" desktop drawer (corrected), "Things to prove" page + phone | drawer "5 items, listed under Acceptance criteria."; page/phone "5 items, listed under Things to prove." |
| Show more (D-21) | stored value longer than its clamp → 3-line `-webkit-line-clamp` + "Show more" (`aria-expanded`), expands in place. NOT a visible-length rule: the seed stores each clamped value as the visible text + a continuation (Part 4: "each with its continuation behind 'Show more'"); D-21's `> 180 chars` must be applied to the full stored value. Visible lengths prove it: Accounts issues (176 visible) clamps, Latest confirmed grant (181) does not | clamped: Rework, Context, Scope, Accounts issues, Routing rule; unclamped: Required evidence, Message Melissa, Audience Anna, Latest confirmed grant, Repository |
| structured values (D-22) | `{matrixId, card}` → mono id + ` · ` + `<a href="/b/{board}/c/{card}">onboarding card</a>`; `{repo, visibility, policyUrl}` → `${repo} · ${visibility} · ` + link "policy" | "@agent_message-melissa:id.agentpod.dev · onboarding card" (card `card_f180b1627c594b41`; Anna `card_fa51f3d3e5e94ace`); "SuperJackfruitLabs/atelier · private · policy" |
| brief summary | drawer `Details · ${rows} fields` + (plan?', plan':'') + ', project'; page `${rows} details`; phone `${rows} fields` | "Details · 10 fields, project"; "10 details"; "10 fields" |
| plan | present: `${done} / ${n} steps · ${round(100*done/n)}%` + meter; absent: "none yet" + `${agent} did not post a plan for this card.` (no meter) | 4605 → "none yet" / "error-eric did not post a plan for this card." |
| project | assigned: `${projectName} · ${milestoneName ?? 'no milestone'}` + button "Change project"; none: "No project." + "Assign to a project"; phone summary = text after last " — " (D-27) | "Marketing & Community — Melissa and Anna onboarding · no milestone"; phone summary "Melissa and Anna onboarding" |
| what-happened summary | `${runs} run${s} · ${d ? `${d} decision${s}` : 'no decisions yet'}` | "2 runs · no decisions yet" |
| `attemptWord(attempt)` | `blocked`→"stopped", `completed` (completion ok)→"done", `failed`→"failed", `sent_back` or completed+completion.ok false →"sent back"; phone capitalised | run 1 "sent back"/"Sent back"; run 2 "stopped"/"Stopped" |
| drawer run summary | `${stageName} · ${agentName}`, status word (signal tone only for latest run when lead.needsYou), `attempt ${i}`, `${events} events · ${errors} errors`; newest open | run 2 "Reproduce · error-eric · stopped · attempt 2 · 14 events · 0 errors"; run 1 "… sent back · attempt 1 · 9 events · 0 errors" |
| page run summary | `Attempt ${i} · ${stageName}`; closed runs append `· ${HH:mm(endedAt)}` (API-7); last event time `${HH:mm} ${Ddd D Mon}`; toggle `Show tool calls · ${hidden} more events` | "Attempt 1 · Reproduce · sent back · 9 events · 0 errors · 12:11"; "19:41 Thu 8 Oct"; "Show tool calls · 12 more events" (corrected from 11) |
| phone run | `Run ${i} · ${stage}` / `${agent} · ${Word} · attempt ${i}`; first event shows the date, later ones the time | "Run 2 · Reproduce" / "error-eric · Stopped · attempt 2"; "Started … — Thu 8 Oct", "Stopped … — 19:41"; "Run 1 · Reproduce" / "error-eric · Sent back · attempt 1", "Sent back — The board refused completion: repro and observed were missing. — Thu 8 Oct" |
| `eventVerb(a)` (G-5, §7.5) | `a.signal === 'stop' ? 'Stopped' : (a.action ?? TYPE_WORD[a.type])`, `TYPE_WORD = { action:'Did', response:'Said', thought:'Thought', prompt:'You said', elicitation:'Asked' }`; sentence `a.body` verbatim; narrative vs tool via `isNarrative` (unchanged) | run 2 seq1 (thought, action 'Started') → "Started" 18:50; seq14 (response, signal stop) → "Stopped" 19:41; run 1 seq1 (action 'Sent back') → "Sent back" |
| `handoffLine(...)` (D-8, P-28/S-17) | handoff present: `Handoff from ${prevStage}: “${summary or first string value}”`; null and card in first worked stage: `From ${prevStageName}: queued by ${queuedByName} on ${dayMonth(createdAt)} with the brief above. No earlier stage output.` | 4605 → "From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output." |
| drawer final line | handoff clause + ` · Attempts: ` + attempts.map(`${i} · ${agent} · ${usd} · ${word}`).join('; ') (each clause its own `span[data-section]`) | "From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output. · Attempts: 1 · error-eric · $0.00 · sent back; 2 · error-eric · $0.00 · stopped" |
| phone attempt rows | `attempt.failureReason ?? word` → `Sent back: ${reason}` / `Stopped: waiting on you` | "Sent back: repro and observed missing", "Stopped: waiting on you" |
| links summary | drawer: `${links?n+' links':'no links'} · ${subtasks? `${open} of ${n} sub-tasks open`:'no sub-tasks'} · ${refs} references · ${related? n+' related':'no related work'}`; page: zero counts omitted | drawer "no links · no sub-tasks · 5 references · no related work"; page "5 references"; empty links "Nothing blocks this card and it blocks nothing." |
| link rows (when present) | label by kind: blockedBy "Blocked by", blocks "Blocks", relates "Relates to", supersedes "Supersedes"; cross-board suffix `· ${boardName}, advisory`; page meta same-board `This board · ${stageName} · ${stateWord}` / cross `${boardName} · advisory` | (no 4605 links in the world) |
| `referenceSource(ref)` (D-24) | GitHub blob URL → `github · ${repoShort} · ${fileBasename} lines ${a}–${b}` from `#L(a)-L(b)` (en dash); non-GitHub → hostname. Description line = `ref.subtitle` (F §A.5.6 stores it as `subtitle`; spec said `metadata.description`) | `https://github.com/SuperJackfruitLabs/agentpod/blob/3f625b…/apps/hub/src/services/matrix-as/inbound.ts#L379-L786` → "github · agentpod · inbound.ts lines 379–786"; `…/accounts/blob/77ca37…/src/issuer/claims.ts#L17-L43` → "github · accounts · claims.ts lines 17–43"; `https://github.com/NousResearch/hermes-agent/blob/0b7060…/acp_adapter/server.py#L818-L883` → "github · hermes-agent · server.py lines 818–883" |
| sub-tasks | drawer `${open} open of ${n}`; phone summary `${open}/${n}`, body `${open} of ${n} open. No sub-tasks yet.` | "0 open of 0"; "0/0"; "0 of 0 open. No sub-tasks yet." |
| talk | summary `No comments yet` / `${n} comment${s}` | — |
| cost | drawer summary `${usd(cost)} · ${est?`est. ${usd}`:'no estimate'} · ${deliveryGate?mode:'no delivery'}`; body `$0.00` + "· no estimate yet"; phone `${usd} spent · ${est} · ${cap?`card cap ${usd(cap)}`:'no card cap set'}` | "$0.00 · no estimate · no delivery"; phone "$0.00 spent · no estimate · no card cap set" |
| criteria count (page) | `${n} acceptance criteri${n===1?'on':'a'}` | "5 acceptance criteria" |
| page small lines | needsYou `${agent} is waiting for your reply`; else `${agent} is working` / `Finished by ${agent}` | "error-eric is waiting for your reply" |
| page people row (agent) | `Agent for ${stageName(last.stageKey)} · ran attempt ${n} · ${delegate?'working it now':'Unclaimed now'}`; queuer `Asked for this · an agent allowed to dispatch` (person: `Asked for this`) | "Agent for Reproduce · ran attempt 2 · Unclaimed now" |
| archived banner (API-2) | `Archived ${dayMonth(archivedAt)}`; second line: any gate `status==='cancelled'` with `|resolvedAt − archivedAt| ≤ 5 s` (§8.1; S-9 said 60 s) → "Its pending review was cancelled when the card was archived."; else "It is off the board. Restore puts it back." | C → "Archived 9 Oct" + cancelled sentence; restore note `Puts it back on the board at ${stageName}.` → "Puts it back on the board at Messaging approval." Phone: `Archived on ${D} ${MonthLong}` + `This card is not running, so there is nothing to resume. Restore it to put it back on the board in ${stageName}.` |
| done block (D) | `Reached ${lastStage.name} on ${whenLabel(stateSince)} · ${attemptCount} attempts`; message = `handoff.summary`, Handed on = `handoff.handedOn` (corrected: spec said response activity / handoff.summary) | "Reached Resident on Thu 8 Oct, 19:26 · 5 attempts" |
| `sealOf(digest)` | strip `sha256:`, first 8 hex as `xxxx·xxxx` | `sha256:9f3ac2e1…` → "9f3a·c2e1"; seal line `Approving exactly this version · sealed 9f3a·c2e1`; head `· revision 2`, `digest 9f3a·c2e1` |
| gate error (API-1) | `Not recorded.` (bold) + `This gate was already decided from ${viaWord} by ${displayPrincipal(decidedBy)} at ${HH:mm}.` viaWord matrix→"Matrix", web→"the web app", api→"the API" | "This gate was already decided from Matrix by Rakesh Gangwar at 13:02." |
| loading (D-14) | eyebrow board name only; `min(stages.length,5)` bars, wide one (flex 2.8) at index `min(stageIndex,1)`; `Loading what ${agent} said and the card’s history…` | 4605 → 5 bars `1,2.8,1,1,1`; "Loading what error-eric said and the card’s history…" |
| `sentenceCase`, appearance label | page `Appearance: Daylight, ${phase} sky` (sun icon day / moon night) | "Appearance: Daylight, noon sky" |

---

## 5. Components (Daylight)

| Component (path under `apps/web/src/lib/components/`) | Renders | CSS prefix to port (reference) |
|---|---|---|
| `CardDrawer.svelte` (rewrite shell) | vibekit Drawer/Sheet + model + layout | `.dl-scrim` → `--card-scrim` |
| `card/layouts/CardDaylight.svelte` (rewrite in place) | drawer layout | `.dl-*` (SP-Card-Daylight.html; root `.dl-drawer`); container query `@container card (max-width: 620px)` → `.dl-groups`, `.dl-grid2`, plan/project grid single column (`.dl { container: card / inline-size }`) |
| `card/layouts/CardPhoneDaylight.svelte` (new) | phone sheet | root `.r` (width:100%), `.sh .sh1 .eb .tl .st .body .dock .secs .foot .cact .addrow .rawrow .nl .att .small .id .wrap .mono .muted` (SP-Phone-Card-Daylight.html) |
| `card/page/CardPageDaylight.svelte` (new) | page | `.dp-*` (SP-CardPage-Daylight.html) + responsive: `@media (max-width:1100px){.dp-main{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.dp-main>:last-child{grid-column:1/-1}}`, `@media (max-width:760px){.dp-head,.dp-main{grid-template-columns:minmax(0,1fr)}.dp-reply{margin-left:0}.dp-dl{grid-template-columns:minmax(0,1fr)}}` |
| `card/states/CardStatesDaylight.svelte` (new) | gallery: h1, explainer, `.ds-grid` (auto-fit `minmax(min(400px,100%),1fr)` → 3 cols), captions, compact heads | `.ds .ds-h1 .ds-grid .ds-cell .ds-label .ds-card .ds-eyebrow .ds-title` |
| `card/state/CardStateDaylight.svelte` (new) `{kind:'archived'\|'done'\|'loading'; model; vibe}` | cells C, D, F | `.ds-banner .ds-done .ds-check .ds-sk .ds-sk--blk ds-breathe .ds-hand .ds-chip` |
| `card/gate/GateDaylight.svelte` (rewrite markup; signature unchanged `{boardId, gate, error, onResponse, agent, lead, vibe}`) | AgentQuote (needs, 36px, `${agent} · needs you`, gate.summary, at) + flag "Awaiting your review" + SubjectFrame (when approvalSubject) + note Field + buttons + Alert **under** buttons | `.ds-flag .ds-count .ds-btns .ds-post* .ds-seal .ds-mono .ds-dl .ds-alert`; root class `ds-lead`, textarea min-height 84px |
| `card/question/QuestionDaylight.svelte` (rewrite; `{model, elicitation, agent, vibe}`) | cell B | form `margin-left:48px` |
| `card/references.ts` | `refLabel`, `subStateLabel`, `SUB_STATE_LABELS` moved verbatim + `referenceSource` | — |
| `card/spec-groups.ts`, `card/state-words.ts`, `lib/age.ts` (+`ageWords`), `lib/when.ts` (new) | helpers | — |
| `StructuredValue.svelte` | + `{matrixId, card}` and `{repo, visibility, policyUrl}` shapes | — |

Drawer tree: head row 1 eyebrow `${boardName} · ${stageName}` + frame Button "Open in new window" + IconButton close `Close (Esc)` (margin -10px); row 2 `h2#drawer-title.dl-title` + IconButton "Edit card" (editing → h2 `sr-only`, form replaces rows 2–5); StageStrip (`labels:'numbers'`, done segment "1" + sr " Reported, done", current "2 · Reproduce", others "3".."7" with `title="Stage n · Name"`) + `.dl-small` stop line; row 4 StatePill + 3 Chips; FactList + `.dl-meta` "card 4605" + CopyButton. Body: [error] Alert; Disclosure `.dl-pinned` "What error-eric was asked" [description, criteria under bold "Acceptance criteria"]; lead (stopped → AgentQuote 40px + `form.dl-reply` h3#reply-h "Send it back to work"; review → GateDaylight; question → QuestionDaylight; archived → CardStateDaylight archived banner moves to the very top of `.dl-body`, no resume/gate; done → kind done, `resume` hidden element; `!detailLoaded` → kind loading (head from snapshot); working/idle → AgentQuote plain); five `.dl-sec` disclosures: "The brief" (open) [details, plan, project], "What happened" [activity, decisions, handoff, attempts], "Links and references" [links, subtasks, references, related], "Talk" [comments], "Cost and delivery" [cost, delivery]; `.dl-foot` "Archive card" (secondary, archive icon) + "Delete card" (destructive ink outline, trash icon).

Page tree: `.vk-sky.dp-sky[data-phase]` (sun `top:92px`) → `nav.dp-bar aria-label="Card window"`: mark link `aria-label="Superpipeline home"` href "/", pill link "Developer Experience board" (`${boardName} board`), `.dp-idchip` "card 4605" + CopyButton `Copy card id 4605`, spacer, ghost pill "Copy link to this card", IconButton `Appearance: Daylight, noon sky`, account "RG" `aria-label="Account, Rakesh Gangwar. Menu has Sign out"` (menu "Sign out" → `logout()` then `location.assign('/')`). `header.dp-head`: `.dp-from` "Opened from Developer Experience · Back to the board"; `h1.dp-title#card-title` + round edit; StageStrip `labels:'all'` ("Reported", "Reproduce · stopped", …) + caption; `aside.dp-people aria-label="People on this card"` (pill + "Attempt 2", 3 PersonRows: error-eric resting 32 / RG Rakesh Gangwar "Owner · you" / super-chotu working 32 with title); `.dp-facts`. `main.dp-main#content` (aria-labelledby card-title), 3 cols `1.3fr 1fr 0.9fr`: col1 "The conversation" (+small) [error], AgentQuote 48px, `form.dp-reply`, `.dp-card` "Talk" ("The agent that works this card reads every comment."); col2 "What error-eric was asked" (desc + "Done when · 5 acceptance criteria" numbered `.dp-crit`), "The brief · 10 details" (groups + raw JSON + Copy + plan + project row "Project · Marketing & Community — Melissa and Anna onboarding · no milestone" + "Change project"), "Links and references · 5 references" (NOLINKS + "Add link", "Sub-tasks · 0 open of 0", References as `<a>` title + `.dp-small` subtitle + mono `<small>` source line, "Related prior work" "No related prior work found in Superlibrary."); col3 "What happened · 2 runs · no decisions yet" (provenance, runs timeline `.dp-tl`, "Handoff from Reported" + fallback sentence, "Decisions / None yet."), "Cost and delivery" ($0.00 `.dp-big` "· no estimate yet", meter, dl "Attempt 1 — error-eric · $0.00 · sent back", "Attempt 2 — error-eric · $0.00 · stopped", "Delivery — None approved on this card."). `footer.dp-foot`: hr, "Edit card", "Archive card", "Delete card" (ink outline), spacer, "Opened from Developer Experience · Back to the board". Lead variants replace the AgentQuote + reply in col 1. `editButton` data-section only on the round button.

Phone tree: `header.sh` sticky (`.sh1`: eyebrow uppercase + frame link "Open as a page" + IconButton "Close (Esc)"; `.tl` h2#drawer-title 23px + "Edit card"; `.trk` bars `role="img"` + caption; `.st` pill + "Unclaimed" + "owner · Rakesh Gangwar" + Chip "asked by super-chotu" (title `Queued on Rakesh Gangwar's grant`); `p.fct` with "Attempt 2" bold). `.body`: [error]; (archived) `section.arch` Banner + Restore; `details.pin` "What error-eric was asked" · Show (desc + "Things to prove · 5" `ol.nl`); `.msg` AgentQuote (32px, `--vk-mood-needs` bubble, sentenceCase, no tokens, `Thursday 8 October, 19:41`); (live) `section.dock` sticky bottom: h3 + Select "Resume at stage" + textarea label "What changed, or what should error-eric do differently? It reads this." + full-width `.go` "Send back to work"; `.secs` 13 `.sec`: Plan "none yet" · Details "10 fields" · Project "Melissa and Anna onboarding" · Links "0" ("Add a link") · Sub-tasks "0/0" (sr label "New sub-task title", placeholder "Add a sub-task", "Add") · Session activity "2 runs" (open; grant line; runs; "Show tool calls" `aria-pressed`) · Decisions "0" ("No decisions on this card yet.") · Comments "0" ("No comments yet.", label "Comment", placeholder "Write a comment", hint "⌘ or Ctrl + Enter to post", button "Comment") · Handoff "from Reported" · Cost "$0.00" · [Delivery only when `counts.deliveryActive`, else hidden data-section] · Attempts "2" · Related prior work "none" · References "5" (`.refs .rf` cards + sr "Attach a link or Superlibrary item", placeholder "Paste a link to attach", "Add"). `footer.foot aria-label="Card actions"`: live "Archive card", "Delete card…" (ink outline); archived "Archived — restore", "Delete card…". `scroll-padding-bottom` = dock height (`bind:clientHeight`).

States cells (Daylight copy constants): h1 "Card states · Daylight"; explainer "Each panel is the top of the card drawer. Coral appears only where a person is needed now."; captions "**A · Approval gate**: the subject is shown before the buttons", "**B · Agent question**: asked once, then the answer box", "**C · Archived**: no live controls, no coral", "**D · Done**: who finished it, when, and what it handed on", "**E · Decision error**: shown beside the buttons, not at the top", "**F · Loading**: the shape of the card, and words for screen readers". Cell texts per §4 and reference (A note label "Add a note (optional)", placeholder "Recorded with your decision. Request changes needs one: it threads into the agent’s next attempt.", counter "0 / 8192" (`GATE_NOTE_MAX`); buttons Approve primary / Request changes secondary / Reject quiet; digest copy `aria-label="Copy the full digest"`; B label "Your answer", placeholder `It goes straight back to ${agent}.`, hint "With no answer: “Type an answer first.”", "Send answer"; C chip "message-melissa · last worked it", "Owner · Rakesh Gangwar", "Restore"; D chips "Owner · Rakesh Gangwar", "Asked by super-chotu", "P2"; E label switches to "Say what needs to change", error "Request changes needs a note: it threads into the agent’s next attempt.", alert + quiet "Refresh to see it" → `model.refresh()`; F section `aria-busy="true"`, face error-eric thinking, `role="status"` text). E corrected: title includes "(gate test — approve from Matrix)". Faces: research-ray needs, optimizer-ollie needs (corrected from coder-kai), message-melissa resting, onboarding-olivia done, super-chotu resting, error-eric thinking.

vibekit mapping (spec name → vibekit-components.md 0.1.0): Drawer/Sheet → `Overlay` (Dialog/Drawer/Sheet, #34; needs `placement` prop added); Button #8 (+`tone:'destructive'`); IconButton #9 (`icon` is a Snippet there, `label`); CopyButton → `CopyId` #18 (`{value,label,display?,oncopied?}`; spec wants text/copiedText/onrefused — mismatch); StageStrip → `StageTrack` #27 (`{stages,current,state,label,size,numbered}`; spec's status/labels/caption — mismatch); StatePill → `StateLabel` #28 (`form:'pill'`); Chip → no direct entry (closest `AgentName`/Face #29/30) — gap; AgentFace → `Face` #30; AgentQuote #31 (`who{id,name,mood}`, `tone`, `text` verbatim pre-line, no `tokens`/`at`/`density` — mismatch); FactList #22 (`items{term,value}`); Meter #40; Disclosure #19 (`size:'section'|'inline'`); Field #13; Alert/Banner → `Notice` #36; Skeleton/LoadingNote → `Loading` #38; EmptyState #37; Tabs #10; ChoiceList → `Choice` #14; Kbd #17; Footnote → `Footnotes` #32; Figure/FigureRow #25. Not in vibekit list (app-local or library additions needed): PersonRow, Checklist, DefinitionGroups, RunRow, LinkList, DoneBlock, SubjectFrame/Seal.

`data-pixel` hooks: `[data-pixel="card-top"]` (States panels, one per cell/top). Board tile `data-open="true"` when open (board group; ring `.dl-tile--open { box-shadow: 0 0 0 3px var(--vk-color-signal); }`).

---

## 6. States & behaviour

- Signal (coral) only where a person is needed now; archived → no signal (muted current bar, "Archived" pill/fact); phone dock border-top signal only when live.
- Pinned brief: closed by default when `lead.needsYou`, open otherwise; re-decided only when `card.id` or `lead.needsYou` changes. "The brief" open by default; other four closed; remembered per card in `sessionStorage['sp:card-open:'+card.id]` (try/catch).
- Focus: on open focus the panel; first Tab → "Open in new window". Escape/scrim/X → `app.closeCard()`. 44px targets everywhere (CopyButton min 44, Copy session id `min-height:44px; margin:-10px 0`).
- Resume: button always enabled; empty note → Field error + focus textarea; busy → "Sending…" disabled; refusal → Field error = server sentence (`refusalOf`).
- Gate: busy → all three disabled, pressed reads "Recording…"; Request changes with empty note → `needNote` state; 409 → Alert under buttons.
- Question: empty → Field error "Type an answer first."; `question.submit()` → `answerElicitation`.
- Restore: busy "Restoring…". Done/loading: no controls.
- Comments: ⌘/Ctrl+Enter posts; `maxlength=8192`; desktop label "Add a comment", placeholder "⌘ or Ctrl + Enter posts it", empty "No comments yet. The agent that works this card reads them."
- "Show tool calls" ↔ "Hide tool calls". Run disclosures are native `<details>`, newest open. "View raw JSON" native details with `<RawJson value={card.spec}/>`; Copy → `JSON.stringify(card.spec, null, 2)`.
- Copy link: `navigator.clipboard.writeText(location.origin + pageHref)`, label "Link copied" 2 s; refusal → `localError = 'Clipboard access was refused. Select the address bar and copy it.'`. Copy id: full id, icon → check 2 s.
- Page loading before snapshot: window bar renders, head shows Skeleton bars + LoadingNote "Loading the card…".
- Agent text verbatim (desktop); phone sentenceCase only.

## 7. Gaps / open questions

1. **States harness vs gallery** (§1.1): F per-panel drawer screenshot cannot match `.ds-card` compact tops; recommend gallery route + repoint STATE_PANELS. Also F's E steps vs §7.6 match (Request changes empty → Approve).
2. **API-1 body shape** differs between card spec and F's harness fulfil; also `decidedBy` principal vs display name. Recommend API-1 shape; client uses `displayPrincipal`; update registry.
3. **"Sent back" source**: seed `outcome='sent_back'` or derive from completion `ok:false` (Attempt currently lacks completion; `failureReason` is NULL on runs in F but Part 4 adds `failure_reason='repro and observed missing'`). Planner must pick; Part 4 allows either.
4. **CardPage-Daylight reference** still carries the old placeholder "For example: I sent a fresh DM to Melissa and Anna at 14:05; trace those two event IDs." (no correction row). §8.2-6 ships the new sentence; either inject the reference string before screenshot (D-6 technique `locator.evaluate((el,v)=>el.placeholder=v, MOCK)`) or re-export.
5. **C-08 mask width** for Daylight should be 760, not F's 920.
6. **`splitTokens` regex** in G-3 is wrong for the fixture text; use the verified regex in §4.
7. **`humanizeKey`** "rest lower case" contradicts "Message Melissa"/"Audience Anna" labels; needs a rule (e.g. split camelCase, capitalise first word only, keep words that are capitalised in a known-names list, or prefer `spec.labels`) — pin with the 10 reference labels.
8. Show-more: D-21 says >180 chars, Paper P-23 says 200 to sentence end. The fixture must store continuations for the 5 clamped rows (exact continuation text unspecified — the seed author picks; mockups show only the visible part) and keep Latest confirmed grant under the threshold.
9. Archive-cancel tolerance: §8.1 says ±5 s, S-9 says 60 s — §8.1 wins.
10. Studio E cell crops options (appendix) — card group decision, not Daylight.
11. Phone archived variant: §8.2-3 no-signal not applied to that secondary reference branch (appendix); only data fixes there.
12. Out of scope: agent-drafted new card; edit form not mocked (keep today's fields/order, port `vk-field` CSS); `LibraryArtifact` reachable but not drawn.
13. Depends on: board group honouring `--card-drawer-reserve` and `data-open`; shell group `bare` slot; vibekit components (§5 mapping mismatches).
