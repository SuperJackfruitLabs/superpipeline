# Digest — card group, Studio ("Annual report")

Sources: `screens/card.parts/30-studio.md` (whole), `mockup-corrections.md` groups `card-drawer`, `card-page`, `states-phonecard` (Studio files) + Part 4 + appendix, references `apps/web/e2e/reference/mockups/SP-{Card,CardPage,Card-States,Phone-Card}-Studio.html` (already corrected; **source of truth for markup/CSS/text**). Shared model (CardModel, §1.x, G-n, §7 amendments) is digested elsewhere; only Studio-specific items here.

**Global corrections that void parts of 30-studio.md** (say "corrected:" below):
- One clock: **2026-10-11T08:21Z = 13:51 Asia/Kolkata, phase noon → "midday"** on all four Studio screens. S-1, §7.2 per-artboard clocks (13:27 drawer, 13:31 phone) and the registry's `clock: '…13:27…'` for SP-Card-Studio are void.
- One fixture world, no per-artboard seeds: §7.1 `seed<Artboard>` / `seedPhoneCard4605`, §A.7.1 `card4605-live`, §A.7.2 `card4605-desktop-studio` are void. Card 4605 = the base/phone-literal record everywhere (5 criteria, no plan, 10 phone detail rows in 5 groups, project `prj_42ab5ec961104f65` "Marketing & Community — Melissa and Anna onboarding", no milestone, 5 GitHub references, no links, no related prior work, `handoff_json` NULL, runs Thu 8 Oct). 30-studio.md §30.1/§30.2 desktop fixtures (3 criteria, 4-step plan, PR #642/#648 Forge refs, 3 relates-links, "Related prior work · Fixed …", "Handoff from Reported “Melissa and Anna do not answer DMs…”", Fri 9 Oct runs, "Read/Found" rows) are void.
- Ids (F §A): board `brd_134a0ddb6d434478` (not `brd_devx`), user `usr_b19776fac3c94df4` (not `usr_rakesh`), error-eric `agt_fx_error_eric` (external `prn_fx_error_eric`), super-chotu `agt_bb586732b807460c` (external `prn_d8178f4a05934b72892a`), stage key `test` (not `failing-test`). 4605 `state_since 2026-10-08T14:11:45Z`, `created_at 2026-10-08T06:04:57.202Z`, priority 3, `queued_by prn_d8178f4a05934b72892a` / `queued_by_agent_id agt_bb586732b807460c`, `archived_at NULL` (corrected: F §A.5.2 base had it archived — WC-1).
- DX stages (key → name): `reported` Reported, `reproduce` Reproduce, `test` Failing test, `fix` Fix, `integrate` Integrate, `signed-off` Signed off, `shipped` Shipped.

---

## 1. Screens covered

| Artboard | Route | Viewport | Harness steps / mode | Masks |
|---|---|---|---|---|
| SP-Card-Studio | `/b/brd_134a0ddb6d434478/c/card_05823a57e8224605` (Plan board view + drawer) | 1440 × 2322 (artboard); drawer ≥640px | default tab `spec`; other tabs (`log`, `links`, `talk`, `cost`) are optional extra captures: click tab `role=tab` name `Log 2`, `Links 5`, `Talk 0`, `Cost $0.00` (accessible names include the count) | `C-08` backdrop mask (registry: studio `w: 680`, `h: 4000`). **Gap:** drawer is 940px at 1440 → backdrop is only 500px wide; a 680px mask covers 180px of the drawer. Recommend `w: 500` (1440−940). Backdrop shows the corrected 7-card Studio board (shell + board groups own it). |
| SP-CardPage-Studio | `/b/brd_134a0ddb6d434478/c/card_05823a57e8224605/page`, shell slot `bare` | 1440 × 2383 | none | none listed |
| SP-Card-States-Studio | gallery `/dev/card-states` (00-shared §3) **but** harness uses `mode: { kind: 'panels', ref: '.ss-panel', app: '[data-pixel="card-top"]', count: 6 }` with one route per panel (opens the drawer of each panel's card) | 1440 × 2107 | A: R&I card route; B: Guild Ops card 1 (corrected: registry's `card_e10fb4fe39a91dfc` is void per WC-4); C `/b/brd_e247f164e060443f/c/card_e1eb201927f94506`; D `/b/brd_f47143722126442c/c/card_f180b1627c594b41`; E as A + fulfil `**/gates/gate_fx_p4/resolve` 409, steps: click "Request changes" with empty note, then "Approve"; F: hold `**/cards/card_05823a57e8224605/attempts` and `…/activities` | — |
| SP-Phone-Card-Studio | `/b/brd_134a0ddb6d434478/c/card_05823a57e8224605` at 390×844, full-screen `vibekit:Sheet` | 390 × 2571 | default `archived=false`, tab `spec` (others by clicking `role=tab`). Archived branch is a secondary variant (no data fixes; registry has no variant for it — likely not captured). | — |

Appearance cookie: `studio.light.strong.0` (dark: `studio.dark.strong.0`). Fonts: Archivo (72–85% stretch), Azeret Mono, Newsreader via vibekit `fonts.css` (never Google Fonts; the reference `<link>`s are canvas-only).

Reference CSS ranges (app block = `<style data-dc-tpl="2">`): Card 1031–1280 (root `.ar.cw`, drawer `.cw-drawer`); CardPage 1031–1288 (root `.ar.cp`); States 1031–1264 (root `.ar.ss`, cells `.ss-panel`); Phone 1031–1345 (root `.ar.ph`). Lines 60–1030 are tokens (vk.css) — do not port.

---

## 2. API / contract rulings

| Id | Field / endpoint | TS type | Server source | Used by (Studio) | Fixture value |
|---|---|---|---|---|---|
| API-1 (G-1) | `POST /boards/:b/gates/:g/resolve` non-pending → 409 `{ error: { code: 'GATE_ALREADY_DECIDED', message, decidedBy: principalId, decidedAt: iso, via: 'matrix' \| 'web' \| 'api' } }`; contract `GateResolveError` | as left | gate row `decided_by`, `resolved_at`, `via` | States E (`GateStudioBar` alert) | **Mismatch:** harness fulfils `{"error":"already_decided","decidedBy":"Rakesh Gangwar","decidedVia":"matrix","decidedAt":"2026-10-11T07:32:00Z"}` (flat, name not id, `decidedVia`). Planner must align harness payload and parser (recommend: parser accepts the API-1 shape; change the harness fulfil to it with `decidedBy: 'usr_b19776fac3c94df4'`, `via: 'matrix'`). 07:32Z → "13:02". |
| API-2 | Archiving cancels pending gates (`status 'cancelled'`, `resolvedAt`, `decision null`) | — | DO archive path | States C reason | C gate: F spells status `canceled` (§A.6.3), API-2 `cancelled` → **pick one** (appendix). Tolerance: API-2 ±5 s vs S-9 60 s; fixture `resolved_at = archived_at` exactly so either works. |
| API-3 (S-15, renamed) | `Card.queuedGrantOwner: string \| null` in snapshot | `string \| null` | column `cards.queued_grant_owner`, recorded at queue time | Phone srow chip title, Phone Log note | `usr_b19776fac3c94df4` → "Rakesh Gangwar". (corrected: spec name `queuedOnGrantOf`) |
| API-6 (S-2) | `Card.stageSince: string` | `string` | `stage_since` column, set on stage change, backfilled from latest `card.moved` or `created_at` | Page figure "In Reproduce" | **corrected (O-5, appendix):** the figure reads "2 days" **aged from `state_since`**. stageSince would give 3 days. Studio does not need API-6; if built, compute figure as `stateSince`-based or seed 4605 `stage_since = state_since` (2026-10-08T14:11:45Z). Recommend: figure uses `card.stateSince`. |
| API-7 (S-3) | attempts endpoint adds `startedAt: string`, `endedAt: string \| null` | as left | `runs.started_at`, `runs.ended_at` | Drawer/page runs table "Ended", "#n" | run_fx_4605_1 06:05:10Z → 06:41:00Z ("Oct 8 12:11"); run_fx_4605_2 13:20:00Z → 14:11:43Z ("Oct 8 19:41") |
| API-8 (S-17) | `Card.createdAt: string` in web `Card` / snapshot | `string` | card row `created_at` | derived Handoff sentence (drawer, page, phone) | 2026-10-08T06:04:57.202Z → "8 Oct" |
| API-9 (S-6) | `app.syncedAt: Date \| null` — **client store, not API** | | set on snapshot load/refresh resolve and every feed event | Page status bar "synced 13:51" | 13:51 |
| Attempt outcome word (open) | run 1 is `outcome='completed'` + `completion {"ok":false,"missing":["repro","observed"]}`; screens print "Sent back" | — | `Attempt` has no `completion` today | runs tables, attempts tables, phone attempts list | Part 4: "either derive the word or seed outcome `sent_back`". Option (b): expose `Attempt.completion?: {ok:boolean; missing?: string[]}` (or `completionOk`) and derive; option (fixture): seed outcome `rejected_completion`/`sent_back`. Planner must choose. |
| Attempt failureReason | `failure_reason` | existing `failureReason` | runs | phone attempts list | run 1 `'repro and observed missing'` (Part 4 addition; F base says NULL); run 2 shows "waiting on you" = copy when blocked & needs you (not stored) |
| Activity rows (fixture only) | `action`, `signal` already on `Activity` | | | Latest run rows, phone events | run_fx_4605_2 seq 1 `type thought`, `action 'Started'`; seq 14 `type 'response'`, `signal 'stop'` (never `type 'error'` → Errors 0); run_fx_4605_1 seq 1 `type response`, `action 'Sent back'` |
| Gate options (fixture) | `gate_fx_p4.options_json` | | | States A/E | **`DEFAULT_GATE_OPTIONS`** (Approve / Request changes / Reject) — WC-3 overrules §A.7.3's `APPROVAL_SUBJECT_GATE_OPTIONS`; gate summary `All done, ready for your review.` |
| D handoff (fixture) | 4.2 states-phonecard / appendix | | `handoff_json = {summary, handedOn}` | States D | quote body from `summary`, "Handed on" from `handedOn` (corrected: spec said last response activity + `handoff.summary`) |

Explicitly client-only (a) — no API work: S-5 `whereWord`, S-7 provenance phrase, S-9 archive reason, S-12 (no Copy session id on phone), S-16 clamp, S-17 sentence (given createdAt), S-18 required-evidence sentence, S-20 face moods, S-21 `doneAt = stateSince`, G-2…G-8, `usd/usdShort/clock/quoteWhen/runEnded/...` formatters, reference source line. API-4 (`GateOption.description`) and API-5 (`AgentSummary.role`) are **not** used by Studio.

---

## 3. Pure derivations (`lib/components/card/studio/studio-format.ts` + card helpers)

All times rendered in `Asia/Kolkata`; `now = 2026-10-11T08:21:00Z`.

| Function | Rule | Examples (input → output) |
|---|---|---|
| `stageNo(i: number): string` | `String(i + 1).padStart(2, '0')` | 1 → "02"; 0 → "01"; 6 → "07" |
| `stageOption(stage, i, current, form: 'desktop'\|'phone'): string` | desktop `` `${stageNo(i)} ${name}` `` + `" (this stage)"` if current; phone `` `${i + 1} · ${name}` `` + `" (where it stopped)"` if current | (Reproduce,1,true,desktop) → "02 Reproduce (this stage)"; (Reported,0,false,desktop) → "01 Reported"; (Reproduce,1,true,phone) → "2 · Reproduce (where it stopped)"; (Failing test,2,false,phone) → "3 · Failing test" |
| resume target list | desktop renders **only allowed** targets (this stage and earlier) — reference drawer & page have 2 `<option>`s; phone renders **all 7**, later ones `disabled` (corrected: S-13 overruled by §8.2-2; values `reported, reproduce, test, fix, integrate, signed-off, shipped`) | desktop: ["01 Reported","02 Reproduce (this stage)"]; phone: 7 options, 3–7 disabled |
| `figAge(hours): { value: string; unit: string }` | **corrected:** floor, not `Math.round` (S-11 void; F §A.2 "relative ages floor"): `hours >= 48 → n = floor(hours/24)`, unit `n === 1 ? 'day' : 'days'`; else `{ value: String(floor(hours)), unit: 'h' }` (recommend matching F §A.2's 48h threshold; spec says ≥24h → days) | 66.15h (4605 since 2026-10-08T14:11:45Z) → {"2","days"}; 33.9h → {"33","h"}; 72h → {"3","days"} |
| `quoteWhen(iso, now, { padDay? }): string` | same local day → `HH:mm`; else en-GB `ddd D MMM HH:mm` (no comma); `padDay` → `DD` | 2026-10-08T14:11:45Z → "Thu 8 Oct 19:41"; padDay → "Thu 08 Oct 19:41"; 2026-10-11T07:18Z → "12:48"; 2026-10-11T02:10Z → "07:40" |
| `runEnded(iso): string` | en-US `MMM D HH:mm` | 2026-10-08T14:11:43Z → "Oct 8 19:41"; 2026-10-08T06:41:00Z → "Oct 8 12:11" |
| `clock(now, phase): { text, aria }` | text `` `${HH}:${mm} · ${PHASE_WORD[phase]}` ``; `PHASE_WORD = { dawn:'dawn', morning:'morning', noon:'midday', afternoon:'afternoon', evening:'evening', night:'night' }`; aria drawer `` `Local time ${HH}:${mm}, ${word}` ``, phone `` `${HH}:${mm}, ${word}` ``; refresh every 30 s | (08:21Z, noon) → "13:51 · midday", aria "Local time 13:51, midday" / "13:51, midday" |
| `usd(n)` / `usdShort(n)` | `'$' + n.toFixed(2)`; short = integer when whole else 2 dp | 0 → "$0.00" / "$0"; 1.5 → "$1.50" / "$1.50" |
| `dayMonth(iso, pad?)` | `D MMM` / `DD MMM` | 2026-10-09T05:30Z → "9 Oct"; 2026-10-08T… pad → "08 Oct" |
| `finishedFig(iso)` | `{ value: 'MMM D', label: 'Finished HH:mm' }` | 2026-10-08T13:56:34.688Z → {"Oct 8","Finished 19:26"} (corrected from "Oct 9") |
| `shortDigest(d)` | strip `sha256:`, first 8 hex → `` `sha256:${h}…` ``; seal = existing `sealOf(d)` | `sha256:9f3ac2e1d071…cb84` → "sha256:9f3ac2e1…"; seal "9f3a·c2e1" |
| `stageSuffix(lead.kind)` | stopped/failed/budget → " · stopped"; review → " · review"; question → " · question"; else "" | Reproduce stopped → "02 Reproduce · stopped" |
| `trackAria(...)` | desktop drawer/page `` `Stages: stage ${i+1} of ${n}, ${name}, ${statusWord}` ``; phone `` `Stage ${i+1} of ${n}, ${name}, stopped` ``; states: A "Stage 5 of 6, Recommendation, awaiting review", B "Stage 3 of 5, Build, question pending", C "Was at stage 3 of 8, Messaging approval" | 4605 → "Stages: stage 2 of 7, Reproduce, stopped" / "Stage 2 of 7, Reproduce, stopped" |
| `quoteWho(...)` | who = `agent.name` if claimed else name of `attempts.at(-1).agentId` (G-2); header suffix desktop stopped `" · Stopped · needs you"`, phone `" · Stopped · needs decision"`, review `" · awaiting review"`, question `" · question pending"`, done `" · finished it"`, phone archived `" · last word before archive"` | "error-eric · Stopped · needs you"; phone "error-eric · Stopped · needs decision"; "research-ray · awaiting review"; "optimizer-ollie · question pending"; "onboarding-olivia · finished it" |
| `capFirst(s)` (phone only, C-06) | uppercase first letter at render; desktop shows stored lower-case | "not reproduced end-to-end: …" → "Not reproduced end-to-end: …" |
| `kicker` | drawer `` `${boardName} · stage ${stageNo(i)} ${stageName}` ``; page `` `Card ${shortId} · stage ${stageNo(i)} ${stageName}` ``; phone `` `Stage ${stageNo(i)} · ${stageName}` `` | "Developer Experience · stage 02 Reproduce"; "Card 4605 · stage 02 Reproduce"; "Stage 02 · Reproduce" |
| `costLabel` | drawer/page figure label "Cost · no estimate" when `!estimate?.estimatedUsd` else `` `Cost · of ${usd(est)}` ``; phone "Cost · no est."; Cost panel figure label "Spent · no estimate yet" (drawer) / "no estimate yet" (page); phone Cost pane `` `${usd} spent · ${est ? 'of ' + usd(est) : 'no estimate'} · ${cap ? 'cap ' + usd(cap) : 'no card cap set'}` `` (cap = `board.usage.cardUsdCap`) | "$0.00 spent · no estimate · no card cap set" |
| `whereWord(ref)` (S-5) | `hostname(url) === forgeHost ? 'Forge' : hostname === 'github.com' ? 'GitHub' : hostname` | all 5 refs → "GitHub" |
| `refSourceLine(ref)` | from GitHub blob URL `/{owner}/{repo}/blob/{sha}/{path}#L{a}-L{b}` → `` `${provider} · ${repo} · ${basename(path)} lines ${a}–${b}` `` (en dash) | `…/agentpod/blob/3f62…/apps/hub/src/services/matrix-as/inbound.ts#L379-L786` → "github · agentpod · inbound.ts lines 379–786"; `…/accounts/blob/77ca…/src/issuer/claims.ts#L17-L43` → "github · accounts · claims.ts lines 17–43"; `…/hermes-agent/blob/0b70…/acp_adapter/server.py#L818-L883` → "github · hermes-agent · server.py lines 818–883" |
| `provenanceSentence` (S-7) | `` `Asked by ${queuedByName}, ${byAgent ? 'an agent' : 'a person'} ${phrase}.` `` + `" Unclaimed now."` when no delegate. phrase: covers → "allowed to dispatch the one working it"; not → "not allowed to dispatch the one working it"; grant null → "with no recorded dispatch authority". With no delegate, coverage = last attempt's agent in `queuedGrant`. **Gap:** grant entries are `prn_…` principals, `agentId` is `agt_fx_error_eric` → map via agent `externalId` (`prn_fx_error_eric`). | → "Asked by super-chotu, an agent allowed to dispatch the one working it. Unclaimed now." |
| `grantNote` (phone Log, API-3) | `` `Queued by ${queuedByName} on ${displayPrincipal(queuedGrantOwner)}'s grant · ${n} agents may be dispatched.` ``; **corrected (appendix):** n = number of principals in `queuedGrant` (all 32 entries are `prn_…`, so the spec's `startsWith('agt_')` filter gives 0); spec's mixed case `` `${n} principals may be dispatched` `` | → "Queued by super-chotu on Rakesh Gangwar's grant · 32 agents may be dispatched."; chip title "Queued on Rakesh Gangwar's grant" |
| `outcomeWord(attempt)` | `blocked` → "Stopped"; `rejected_completion` / completed with completion.ok false → "Sent back"; `completed` → "Done"; `failed` → "Failed" | run 2 → "Stopped"; run 1 → "Sent back" |
| `eventVerb(a)` (G-5) | `(a.type === 'error' \|\| a.signal === 'stop') ? 'Stopped' : (a.action ?? TYPE_LABEL[a.type])`; Studio `TYPE_LABEL = { action:'Action', response:'Response', thought:'Thought', prompt:'You', elicitation:'Question' }` | seq1 → "Started"; seq14 → "Stopped"; run1 seq1 → "Sent back" |
| run counts | Events = activities in run; Errors = count `type === 'error'` | run 2 → 14 / 0; run 1 → 9 / 0 |
| `handoffSentence` (S-17) | when `handoff == null` and card is in its first worked stage after the queue stage: `` `From ${prevStageName}: queued by ${queuedByName} on ${dayMonth(createdAt)} with the brief above. No earlier stage output.` `` — **corrected: now used on drawer, page and phone** (heading "Handoff", not "Handoff from Reported") | → "From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output." |
| `requiredEvidenceValue` (S-18) | array deep-equal to `acceptanceCriteria` → `` `${n} items, listed under ${criteriaHeading}.` `` | drawer → "5 items, listed under Acceptance criteria."; **page & phone → "5 items, listed under Things to prove."** (page reference prints "Things to prove" though its heading says "Acceptance criteria" — see Gaps) |
| `detailsSummary` (phone) | `` `${n} fields · ${shortHeadings.join(', ')}` `` | → "10 fields · what to do, who, background, rules, where work goes" (note "who", not "who it is about" — needs a short-word map, e.g. lower-case first word for "Who it is about") |
| `planFraction` | `` `${done} of ${n} · ${Math.round(done/n*100)}%` ``; no plan → "Agent plan" + `` `${agent} did not post a plan for this card.` `` (phone heading "Plan") | 4605 → "error-eric did not post a plan for this card." |
| `stoppedAfter` (page 02) | `` `stopped after ${n} attempt${n === 1 ? '' : 's'}` `` | 2 → "stopped after 2 attempts" |
| `noteHint` | drawer `` `Note needed · ${len}/8000` `` → `` `${len}/8000` `` once non-empty; page adds `` ` · with no note: “Add a note for ${who} first.”` `` | "Note needed · 0/8000"; page "Note needed · 0/8000 · with no note: “Add a note for error-eric first.”" |
| `commentsR` (page 03) | `` `${n} comment${n === 1 ? '' : 's'} · ` `` + Kbd "C" | "0 comments · C" |
| `runsR` | page `` `${runs} run${runs === 1 ? '' : 's'}` ``; phone tab `<b>2 runs</b>` | "2 runs" |
| page Links sentence | `` `Sub-tasks ${open} open of ${n} · ` `` + (k > 0 ? `` `Related prior work ${k}: ${statusLower}, ${text}` `` : `"Related prior work: none. No related prior work found in Superlibrary."`) | → "Sub-tasks 0 open of 0 · Related prior work: none. No related prior work found in Superlibrary." |
| tab counts | Spec = `specGroups` rows (10); Log = runs (2); Links = links + sub-tasks + references (0+0+5 = 5); Talk = comments (0); Cost = `usd` desktop / `usdShort` phone | "Spec 10", "Log 2", "Links 5", "Talk 0", "Cost $0.00"; phone "Cost $0" |
| status bar (page) | items: "Live", `` `card ${shortId}` ``, `` `stage ${i+1}/${n} ${stageName}` ``, signal `` `waiting on you ${ageLabel}` `` (only when needsYou), `` `synced ${HH:mm}` ``; hints "E edit", "C comment" (gate pending → "C request changes"), "⌘↵ send", "G B back to the board" | "Live · card 4605 · stage 2/7 Reproduce · waiting on you 2d · synced 13:51" |
| `archiveReason` (S-9) | cancelled gate with `|resolvedAt − archivedAt|` ≤ tolerance → `ARCHIVE_CANCELLED_REVIEW = "Its pending review was cancelled when the card was archived."`; else `` `Archived by ${displayPrincipal(archivedBy)}.` `` else "Archived." | C → the constant |
| archived banner | desktop C `` `Archived ${dayMonth(archivedAt)}` `` + right "No decisions open" (constant); phone `` `Archived · ${dayMonth(archivedAt, true)}` `` + `` `Not running. Nothing to resume. Restore puts it back in ${stageName}.` ``; Restore hint `` `Returns it to ${stageNo} ${stageName}.` `` | "Archived 9 Oct"; "Returns it to 03 Messaging approval." |
| `doneAt` (S-21) | `card.stateSince` for completed | D → "Oct 8" / "Finished 19:26" |
| face moods (S-20, O-2) | run rows: newest run & `lead.needsYou` → 'needs', else 'resting'. Asked-by queuer: **corrected (O-2): desktop drawn 'working', phone 'resting'** (all agents are `status='offline'` in the fixture, so the spec's `status === 'working'` rule would give resting; treat as surface constant or seed). Quote face: needs (live), resting (phone archived), done (D) | — |
| gate-error alert (G-1) | `"Not recorded."` + `` ` Already decided from ${viaWord} by ${displayPrincipal(decidedBy)} at ${HH:mm}.` ``; viaWord matrix → "Matrix" | → "Not recorded. Already decided from Matrix by Rakesh Gangwar at 13:02." |
| `specGroups` humanize + clamp | rows from `spec.groups`; [+] rows clamp at 3 lines with "Show more"/"Show less" (S-16) — desktop too (references show Show more on 5 rows) | Rework, Context, Scope, Accounts issues, Routing rule get "Show more" |

---

## 4. Component structure (Studio)

`CARD_LAYOUTS.studio = { drawer: CardStudio, phone: CardPhoneStudio, width: 'min(940px, 100%)', align: 'end', placement: 'overlay' }` (§7.3; old 760px wrong). `CARD_PAGE_LAYOUTS.studio = CardPageStudio`, `CARD_STATES_LAYOUTS.studio = CardStatesStudio`. `FACE_VARIANT.studio = 'light'`.

### Files

| File | Status | Renders |
|---|---|---|
| `lib/components/card/studio/card-studio.css` | new | one global sheet, every rule rooted at `.ar`, resets in `:where()`; imported by the four Studio components. Content = reference base block (spec §30.0.2 "App layout CSS" + the "vibekit sheet reference" rules until vibekit ships them) + `.ss-cmd`, `.ss-row`. Excludes board-behind rules (`.ar-rail/.ar-top/.ar-board/.ar-sw/.ar-live/.ar-sub/.ar-fl/.ar-hero/.ar-tbl/.ar-ramp`). Alias layer `.ar { --bg --paper --text --muted --rule --hair --field --soft --s1..--s7 --st-text --sig --sig-text --sig-wash --sig-fg --ff --fm --fs }`. Focus `outline: 3px solid var(--text); outline-offset: 3px`. `.h44` pseudo hit area. |
| `lib/components/card/studio/studio-format.ts` (+ `.test.ts`) | new | §3 formatters |
| `lib/components/card/layouts/CardStudio.svelte` | rewrite | drawer; root `<div class="ar cw-drawer-root" data-vibe="studio">`, `container: card / inline-size`; style block = reference `.cw-*` rules (Card ref 1031–1280) |
| `lib/components/card/page/CardPageStudio.svelte` | new | root `<div class="ar cp" data-vibe="studio">`; `.cp-*` (CardPage ref 1031–1288) |
| `lib/components/card/states/CardStatesStudio.svelte` | new | root `.ar.ss`, `.ss-head`, `.ss-grid` (3 cols; 2 <1280, 1 <900), six `.ss-cell` (`.ss-label` + `.ss-panel`), `.ar-notes` footnote list |
| `lib/components/card/layouts/CardPhoneStudio.svelte` | new | root `<div class="ar ph" data-vibe="studio">` in `vibekit:Sheet labelledBy="drawer-title"`; `.pc-*` (Phone ref 1031–1345) |
| `lib/components/card/studio/StudioWhoWhat.svelte` | new | props `{ model: CardModel; variant: 'list' \| 'inline' \| 'phone' }` — drawer 02 (`.cd-who`), page people row (`dl.cp-people`), phone `.pc-srow` |
| `lib/components/card/studio/StudioResumeForm.svelte` | new | props `{ model; variant: 'drawer' \| 'page' \| 'phone' }`, wraps `model.resume` |
| `lib/components/card/studio/StudioPanels.svelte` | new | props `{ model; vibe; panel: 'spec'\|'log'\|'links'\|'talk'\|'cost'; density: 'drawer'\|'page' }` — drawer tabs / page sections 04–07 |
| `lib/components/card/studio/StudioPhonePanels.svelte` | new | props `{ model; panel }` — phone panes |
| `lib/components/card/gate/GateStudioFrame.svelte` | rewrite | props `{ gate; agent; lead; vibe; footnote: number }` (`showLead` removed): quote + `table.ss-subj` + `.ss-seal` |
| `lib/components/card/gate/GateStudioBar.svelte` | rewrite | props `{ boardId; gate; error: string \| null; onResponse; registerKeys?: (h: (e: KeyboardEvent) => boolean) => void }`: `.ss-cmd` note field, buttons from `gate.options`, Alert. Kbd hints only when `registerKeys` given. No sticky bar (old sticky + `scroll-padding-bottom` removed). |
| `lib/components/card/question/QuestionStudioFrame.svelte` | rewrite | props `{ elicitation; agent }`; `showQuestion` removed |
| `lib/components/card/question/QuestionStudioBar.svelte` | rewrite | props `{ model: QuestionAnswer; elicitation; agent }`; `form.ss-cmd` |
| `lib/components/card/state/CardStateStudio.svelte` | new | `kind: 'archived' \| 'done' \| 'loading'` |
| `GateStudio.svelte`, `QuestionStudio.svelte` (+ tests) | **delete** | tests move to Frame/Bar files |
| `LeadWords.svelte`, `Tabs.svelte` | no longer imported by Studio | |
| `card-layouts.svelte.test.ts` | modify | Studio: activate each tab `['spec','log','links','talk','cost']` and union `[data-section]` counts |

Replacement rules (drawer and page): gate → 01 "Waiting for your review" (`GateStudioFrame`) + 03 "Your decision" (`GateStudioBar`); question → 01 "Question" + 03 "Your answer"; archived → 01 = `CardStateStudio kind="archived"`, 03 dropped; done → `kind="done"`, 03 dropped; `!model.detailLoaded` → 01–04 = `kind="loading"`. Page: the same blocks replace sections 01 and 02. Inside drawer/page, the gallery cell's `.ss-bar`/`.ss-title`/compact track are not used.

### vibekit name mapping (spec name → vibekit-components.md §2.2)

| Spec | vibekit | Note |
|---|---|---|
| Drawer, Sheet | Overlay (Dialog/Drawer/Sheet) | Drawer gains `placement` |
| Button, IconButton, Kbd, Tabs, Field, CommandField, Disclosure, DataTable, FactList, FigureRow, Meter, AgentQuote, EmptyState | same | IconButton `frame?: boolean`; Button `tone: 'destructive'` |
| CopyButton | **CopyId** | mismatch |
| StageStrip | **StageTrack** | mismatch |
| StatePill | **StateLabel** (form pill) | mismatch |
| AgentFace | **Face** (+ AgentName) | |
| Footnote / FootnoteRef | **Footnotes** (+ FootnoteRef) | |
| StatusBar | **StatusLine** | mismatch |
| Alert, Banner | **Notice** (closest) | not in list by those names |
| Skeleton / LoadingNote | **Loading** | |
| StageSwatch, Initials, NumberedList, DefinitionGroups, RunRow, LinkList, SubjectFrame/Seal | **not in vibekit list** | new names (N-10/§7.9 adds Kbd, StageSwatch, Initials, NumberedList, CommandField, StatusBar); until vibekit ships them, keep the reference CSS in `card-studio.css` |

Per-component Studio props (from §30.0): Drawer `{ width:'min(940px, 100%)', align:'end', labelledBy:'cw-title' }`, scrim `color-mix(in srgb, var(--vk-color-text) 45%, transparent)` (= `--card-scrim`), panel `background: var(--vk-color-bg); border-left: 1.5px solid var(--vk-color-rule); box-shadow: -24px 0 60px color-mix(in srgb, var(--vk-color-text) 22%, transparent)`; app Drawer is `position: fixed; inset-block: 0; inset-inline-end: 0` (artboard `grid-column: 3` is canvas-only). Button primary `.ar-btn`, secondary `.ar-btn2`, link `.ar-lk` (`quiet`). IconButton `.ar-ib` (framed) / `.ph-ib`. Tabs `{ label:'Card sections', hint:true }` → `.cd-tabs` + `.ar-tab` + "← →" in `.end` `aria-label="Arrow keys switch sections"`. StageStrip `{ labels:'all'|'current'|'none', status:'needs'|'active'|'archived'|'done', ramp:true }` → `.ar-track`. FigureRow `.ar-figs` / `size:'sm'` `.ss-figs` / `size:'phone'` `.pc-figs` (`<dl>`, dt after dd). AgentQuote `{ tone:'needs'|'ink'|'done'|'off', size:'md'(page 18px)|'sm'(17px states/phone) }` → `.ar-q`. FactList `who` `.cd-who` / `inline` `.cp-people` / `three` `.pc-fx3` / `kv` `.ss-kv`. NumberedList `{ items, columns? }` → `.cd-ol` / `.pc-nl`. DataTable `{ rowGroups }` → `.cd-dt` (`th[scope=rowgroup]`). Meter `steps` → `.cd-meter`. Initials `.ar-ini` (8px font at 20, 10px at 24). CommandField `{ placeholder:'Search or run a command', shortcut:'⌘K', tone:'onInk' }` → opens palette (`app.cmdkOpen = true`), not a live input.

### Destructive buttons (corrected, VK §3.5 Studio form)
- Drawer `.cw-foot`: "Archive card" (`ar-btn2`, icon archive) + **"Delete card"** = `<button class="ar-btn2" type="button" style="background: transparent; border: 0px; box-shadow: inset 0 0 0 2.5px var(--rule);">Delete card</button>`.
- Page 08 "Card actions": same pair, `.cd-acts`.
- Phone `.pc-foot`: "Archive card" + **"Delete card…"** (ar-btn2, transparent, border 0, inset 2.5px rule). Archived variant: "Archived — restore" + "Delete card…".
- `vibekit:Button tone="destructive"` should produce that form.

### Drawer structure (SP-Card-Studio), with corrected content

```
div.ar (content root; frame = .cw-drawer)
  div.cw-bar
    a.crumb[href=/b/brd_134a0ddb6d434478] (arrow-left 16) "Developer Experience"   → onClose() then navigate
    span.id "Card 4605" + CopyId(icon-only 44×44, aria-label "Copy card id 4605", value card_05823a57e8224605)
    span.r: time[aria-label="Local time 13:51, midday"] "13:51 · midday"
            Button(secondary, href=pageHref, target=_blank, rel=noopener, icon external 15, Kbd "⇧O",
                   aria-label "Open in new window, Shift O", aria-keyshortcuts "Shift+O") "Open"
            IconButton(frame, close) aria-label "Close (Esc)"
  div.cw-in   [Alert tone=neutral role=alert first when model.localError]
    header.cw-head: span.kick (StageSwatch c2) "Developer Experience · stage 02 Reproduce";
                    div.row: h2#cw-title {title}; Button(secondary, pencil, Kbd "E", aria-keyshortcuts "E") "Edit"  [data-section=editButton]
    FigureRow 6: "2 of 7" Stage · "2" Attempts · "2 days" Waiting on you (needs) · "$0.00" Cost · no estimate (zero) · "0" Blocks (zero) · "0 of 0" Sub-tasks open (zero)
    StageStrip labels all, status needs: "01 Reported" (+sr ", done"), "02 Reproduce · stopped", "03 Failing test", "04 Fix", "05 Integrate", "06 Signed off", "07 Shipped"
    div.cw-cols (minmax(0,1fr) 300px)
      left:  section.ar-sec "01" "Why it stopped" r "attempt 2"
               AgentQuote(needs, face error-eric 24 role=img aria-label "error-eric, needs you") h3 "error-eric · Stopped · needs you" + mono "Thu 8 Oct 19:41"
               blockquote = needsHuman.detail verbatim (lower-case "not reproduced…"), G-3 tokens in <code>, FootnoteRef 1 after the first acps_ token
               .ar-pfn: "1" "Session" <code>acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023</code> + link "Copy session id" (padding-right 0)
      right: section.ar-sec "02" "Who and what" (.cd-who): State StatePill(needs) "Waiting on you"; Agent "Unclaimed" + muted "(error-eric ran attempt 2)";
               Owner Initials(RG,20) + b "Rakesh Gangwar"; Asked by Face 20 (super-chotu, working) + b "super-chotu" title "An agent with dispatch authority on this board";
               Priority "P3"; Due "none"; Labels "none"
             section.ar-sec "03" "Send it back to work": label "Resume at stage", options "01 Reported", "02 Reproduce (this stage)";
               label "Note to error-eric: what changed, or what to do differently";
               placeholder (corrected) "For example: what you checked, and what the agent should look at next."; hint "Note needed · 0/8000";
               Button primary "Send back to work" Kbd "⌘↵"
    section.ar-sec "04" "The card in full": Tabs "Spec 10 | Log 2 | Links 5 | Talk 0 | Cost $0.00" + "← →" → StudioPanels
    div.cw-foot [data-section=cardActions]
```
data-section placement: `error` top of `.cw-in`; `status` 02 rows State/Agent/Owner/Asked by; `facts` FigureRow + 02 Priority/Due/Labels + `.cw-bar .id`; `editButton` head row; `editForm` replaces head row + FigureRow (`.cw-form` box, `h2.sr` kept); `resume` 03; panels carry their own keys (description, plan, criteria, details, project in Spec; activity, decisions, handoff in Log; links, subtasks, related, references in Links; comments in Talk; cost, attempts, delivery in Cost).

Tab panels (corrected content):
- **Spec:** "Description" = PHONE-DESC; "Acceptance criteria 5" + 5 PHONE-CRIT (`NumberedList`, single column now — the 2-column plan list is gone); "Agent plan" `h3.cd-h` + `p.cd-p` "error-eric did not post a plan for this card."; "Details" mono "10 fields" + "View raw JSON" (`aria-expanded`) + "Copy" (`.cd-acts` space-between), table caption sr "Brief details, 10 fields", 5 rowgroups each `rowspan=2`: What to do (Rework [+], Required evidence "5 items, listed under Acceptance criteria."), Who it is about (Message Melissa `@agent_message-melissa:id.agentpod.dev` · link "onboarding card" → `/b/brd_f47143722126442c/c/card_f180b1627c594b41`; Audience Anna `@agent_audience-anna:id.agentpod.dev` · "onboarding card" → `card_fa51f3d3e5e94ace`), Background (Context [+], Latest confirmed grant), Rules (Scope [+], Accounts issues [+]), Where work goes (Repository "SuperJackfruitLabs/atelier · private · " + link "policy" → `https://github.com/SuperJackfruitLabs/atelier/blob/main/AGENTS.md`; Routing rule [+]). No Project row in the table. Then `kick` "Project" + "Marketing & Community — Melissa and Anna onboarding · no milestone" + link "Change project" ("Assign to a project" when none).
- **Log:** kick "PROVENANCE" sentence (§3); "Runs 2" + "Show tool calls" (`aria-pressed`, flips "Hide tool calls"); runs table Stage/Agent/Outcome/Attempt/Events/Errors/Ended newest first: `Reproduce / error-eric / Stopped (.sigt) / 2 / 14 / 0 / Oct 8 19:41`, `Reproduce / error-eric / Sent back / 1 / 9 / 0 / Oct 8 12:11`; "Latest run Reproduce · 0 errors": `18:50 / Started / Rework run on this card session; read prior persisted evidence first.`, `19:41 / Stopped (.sigt) / Blocked. Waiting on you; the reason is shown at the top of this card.`; "Decisions" + "None yet."; `h3.cd-h` "Handoff" + `p.cd-p` "From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output." Column widths: Attempt 64, Events 56, Errors 52, Ended 96; Latest run time 56, type 92.
- **Links:** `p.cd-p` "Nothing blocks this card and it blocks nothing." + table Kind/Card or reference/Where/(sr "Actions") with 5 rows Kind "Reference", title = ref title (PHONE-REFS), Where "GitHub", no action; "Add link" (`ar-btn2`, plus) + muted "Sub-tasks: 0 open of 0"; `kick` "Related prior work" + "No related prior work found in Superlibrary.". Link rows (when present): Kind "Relates to"/"Blocked by"/"Blocks"/"Supersedes"/"Was blocked by", `a.ttl[href=/b/{board}/c/{card}]`, Where "This board" or `` `${boardName} · advisory` ``, "Remove" (`ar-lk quiet`, "Removing…"). Widths Kind 96, Where 200, Actions 84.
- **Talk:** "No comments yet. The agent that works this card reads them."; field label "Add a comment", placeholder "⌘ or Ctrl + Enter posts it", maxlength 8192; "Comment".
- **Cost:** `.ar-figs` (`grid-auto-flow: row; border-bottom: 0`) "$0.00" / "Spent · no estimate yet"; "Attempts" table Attempt/Agent/Spent/Outcome oldest first: `1 / error-eric / $0.00 / Sent back`, `2 / error-eric / $0.00 / Stopped`; "Delivery: none approved on this card." Widths Attempt 64, Spent 72.

Responsive (not in mockup): `@container card (max-width: 760px) { .cw-cols, .cd-two { grid-template-columns: minmax(0, 1fr); } }`. <640px → phone layout.

### Page structure (SP-CardPage-Studio), corrected

```
div.ar.cp
  header.cp-top (ink bar): a.mk[href=/] aria-label "Superpipeline home";
    nav.cp-crumb[aria-label=Breadcrumb] "Superpipeline" / a[href=/b/brd_134a0ddb6d434478] "Developer Experience board" (CSS uppercase) / span.id "Card 4605" + CopyId aria "Copy card id 4605"
    CommandField(onInk) "Search or run a command" ⌘K (aria-keyshortcuts Meta+K)
    button.cp-tb (link 15) "Copy link to this card" Kbd "⇧C" aria-keyshortcuts "Shift+C" → model.copyLink() ("Link copied" 2 s)
    IconButton.cp-ic (sun/moon 20) aria-label/title "Appearance" aria-haspopup=dialog → appearance.pickerOpen = true
    button.cp-acct "RG" aria-haspopup=menu aria-label "Account, Rakesh Gangwar. Menu has Sign out" → menu "Rakesh Gangwar" + "Sign out" (logout())
  main.cp-body#content [Alert first when localError]
    div.cp-from "Opened from Developer Experience" · a "Back to the board" (arrow-left) Kbd "G B" (aria-keyshortcuts "G B")
    div.cp-head: kick (swatch) "Card 4605 · stage 02 Reproduce", h1 title; Button(secondary, pencil, Kbd E) "Edit"
    FigureRow 7 (corrected: Plan figure removed): "2 of 7" Stage · "2" Attempts · "2 days" Waiting on you (needs) · "2 days" In Reproduce · "$0.00" Cost · no estimate · "0" Blocks · "0 of 0" Sub-tasks open
    StageStrip labels all (same as drawer)
    dl.cp-people: sr "State" + StatePill "Waiting on you"; Agent Face 24 error-eric resting + "Unclaimed" + muted "(error-eric ran attempt 2)"; Owner Initials 24 + "Rakesh Gangwar";
      Asked by Face 24 super-chotu working + "super-chotu" (div title "An agent with dispatch authority on this board"); Priority P3; Due none; Labels none;
      Project "Marketing & Community — Melissa and Anna onboarding" (corrected from "none"; `projectName ?? 'none'`)
    div.cp-cols (1fr 1.15fr .85fr):
      col1: 01 "Why it stopped" r "Copy session id" (link, min-height 0) — quote (size md) "error-eric · Stopped · needs you" "Thu 8 Oct 19:41", body, .ar-pfn "1 Session acps_…9023" + "Copy"
            02 "Send it back to work" r "stopped after 2 attempts" — select (2 options), label as drawer, placeholder "Fresh DMs sent 14:05; trace those event IDs." (reference, see Gaps), hint "Note needed · 0/8000 · with no note: “Add a note for error-eric first.”", only the submit button "Send back to work" ⌘↵
            03 "Talk" r "0 comments · [C]" — "No comments yet. The agent that works this card reads them.", field "Add a comment" (#cp-comment), placeholder "⌘ or Ctrl + Enter posts it", "Comment"
      col2: 04 "Spec" r "10 fields" — as drawer Spec panel, but Required evidence "5 items, listed under Things to prove."; plan block `<p class="note cd-p">error-eric did not post a plan for this card.</p>`; rowgroup th width 92, row th 116
            05 "Links" r "5 · Add link" — table Kind/Card or reference/Where/Actions, 5 rows `Reference | a.ttl title + muted mono source line ("github · agentpod · inbound.ts lines 379–786") | GitHub | (empty)`; sentence "Sub-tasks 0 open of 0 · Related prior work: none. No related prior work found in Superlibrary." Widths Kind 84, Where 120, Actions 76
      col3: 06 "Log" r "2 runs · Show tool calls" — kick "Provenance" sentence; runs table Run/Agent/Outcome/Ev/Ended: `#2 error-eric Stopped(.sigt) 14 Oct 8 19:41`, `#1 error-eric Sent back 9 Oct 8 12:11` (widths Run 40, Outcome 74, Ev 36, Ended 92); "Latest run Reproduce · 0 errors": `18:50` `<span>Started.</span> Rework run…`, `19:41` `<span class="sigt">Stopped.</span> Blocked. Waiting on you…` (time col 52); kick "Handoff" + "From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output."; kick "Decisions" + "None yet."
            07 "Cost" r "$0.00" — figure "$0.00" / "no estimate yet", meter `aria-hidden="true"` 4 `.off` cells; Attempts table `1 error-eric $0.00 Sent back`, `2 error-eric $0.00 Stopped` (Attempt 64, Spent 60); "Delivery: none approved on this card."
            08 "Card actions" — "Archive card", "Delete card" (destructive form)
  footer.ar-status: .ar-live (11px) "Live" | "card 4605" | "stage 2/7 Reproduce" | sig "waiting on you 2d" | "synced 13:51" | r: "E edit" "C comment" "⌘↵ send" "G B back to the board"
```
Page responsive (added): `@media (max-width:1279.98px){ .cp-cols{grid-template-columns:repeat(2,minmax(0,1fr))} .cp-cols>div:nth-child(3){grid-column:1/-1} }`; `@media (max-width:899.98px){ .cp-cols{grid-template-columns:minmax(0,1fr)} .cp-head h1{font-size:34px} .ar-figs{grid-auto-flow:row;grid-template-columns:repeat(4,minmax(0,1fr))} .cp-top{flex-wrap:wrap} }`; <640px renders `CardPhoneStudio` with `surface:'page'` (back → `/b/{boardId}`, no Close). Section-header link-buttons have `min-height: 0` — verify 44px target test; else use `.h44`.

### States gallery (SP-Card-States-Studio), corrected per cell

Header (copy constants): kick "Superpipeline · card states"; h1 "Card states · Studio"; p "Labels in Azeret Mono, sentences in Archivo, the agent’s own words in Newsreader. Vermilion only where a person is needed now; done is the darkest blue, archived is ink." Labels: "A Approval gate", "B Agent question", "C Archived", "D Done", "E Decision error", "F Loading" (`.no` letter + `b`). Bars `` `${boardName} / ${stageName}` ``; F `` `${boardName} / ${shortId}` ``. Tracks: labels 'current' (current `grid-column: span 2`, text `` `${stageNo} ${name}` ``; others numbers only, `title="{n} · {name}"`, sr `` ` ${name}, done` `` / `` ` ${name}` ``); `.ss .ar-track li { font-size: 11px }`. Panel (`.ss-panel`) is the harness unit → app element must carry `data-pixel="card-top"`.

| Cell | Content (verbatim, corrected) |
|---|---|
| A (R&I `card_42269e99036f42ae`, board `brd_fa33a0a0721d4d18`) | bar "Research & Intelligence / Recommendation"; title "P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix)"; track stages Question, Gather, Measure, Synthesise, **05 Recommendation**, Filed, aria "Stage 5 of 6, Recommendation, awaiting review". Quote (needs, Face research-ray 24 "research-ray, needs you") "research-ray · awaiting review" "12:48"; body **"All done, ready for your review."** (corrected from "Ready for your review. Approve exactly the subject below."). `table.ss-subj` caption sr "The subject you are approving": Revision "2" (mono); Kind "Recommendation, one paragraph"; Synthesis (serif) "The organization plane exists so that one issuer, Accounts, says who a person or an agent is in every product. Before it, each product kept its own users and tokens, so a grant made in one place meant nothing in the next. With one issuer, a workspace, its members and its agents are defined once, and every product checks the same token."; **Sources "Organization plane cutover record, 7 Oct"** (canonical value is an array `["…"]` → join); Digest "sha256:9f3ac2e1…" + FootnoteRef 1 + CopyId link "Copy" aria "Copy the full digest" (copies full digest). Rows = every canonical key in order, Revision first, Digest last, labels `humanizeKey`. Seal: lock icon "Approving exactly this version" + mono muted "sealed 9f3a·c2e1" + link "View raw JSON" (`aria-expanded`, margin-left auto → RawJson of canonical). Command: label "Add a note (optional)" + hint "· 0/8192"; placeholder "Recorded with your decision. Request changes needs one."; buttons by `roleOf`: approve → primary "Approve" Kbd "A" (aria-keyshortcuts "A"); changes → secondary "Request changes" Kbd "C"; reject → link quiet "Reject". |
| B (Guild Ops card 1; elicitation `elc_fx_guild1`, agent `agt_fx_optimizer_ollie`, created 2026-10-11T02:10:00Z) | bar "Guild Operations & Automation / Build"; title "Guild Operations & Automation fixture card 1"; stages Intake, Shape, **03 Build**, Review, Done; aria "Stage 3 of 5, Build, question pending". Quote (needs, Face optimizer-ollie 24 "optimizer-ollie, needs you") "optimizer-ollie · question pending" "07:40"; body "The handoff needs a commit, and the fix is still on an unmerged branch. Should I hand on the branch commit, or wait until it is merged?". Form: label "Answer to optimizer-ollie", textarea (no placeholder), primary "Send answer" (icon send) Kbd "⌘↵", hint "Empty: “Type an answer first.”". Options (none here) would render as secondary buttons above the textarea. |
| C (`card_e1eb201927f94506`, `brd_e247f164e060443f`) | banner first (ink, role status): archive icon "Archived 9 Oct" + right mono "No decisions open"; title "Coordinator dispatch canary — Melissa"; stages Requested, Messaging brief, **03 Messaging approval**, Cleared to publish, Community triage, Reply approval, Cleared to reply, Done; aria "Was at stage 3 of 8, Messaging approval" (status archived: plain ink, no signal). Off-quote no face, h3 "Archived · reason", body "Its pending review was cancelled when the card was archived.". kv: Board "Marketing & Community"; Last agent Face 20 + "message-melissa"; Owner Initials 20 + "Rakesh Gangwar"; Attempts mono "1". Command: primary "Restore" (icon restore) → `model.restore()` ("Restoring…" disabled while busy); hint "Returns it to 03 Messaging approval.". No signal anywhere. (Fixture stage key is `messaging-review` in F §A.6.3 — display name must be "Messaging approval".) |
| D (`card_f180b1627c594b41`, `brd_f47143722126442c`) | bar "Agent Onboarding / Resident"; title "Onboard Message Melissa — marketing and messaging"; (no track in Studio D); FigureRow sm: StatePill done "Done"/"State"; "Oct 8"/"Finished 19:26"; "5"/"Attempts"; "P2"/"Priority". Done quote (Face onboarding-olivia 24 mood done) "onboarding-olivia · finished it"; body "Melissa is resident. Her identity, router description and portrait are in place, and you credentialed her at the resident gate." (from `handoff_json.summary`). kv: Handed on "Profile, router description, safe profile and portrait drafted through this pipeline. No posting, DMs or scheduling without separate operator authorisation." (from `handoff_json.handedOn`; corrected); Asked by Face + "super-chotu"; Owner Initials + "Rakesh Gangwar". No command area. |
| E (same R&I card/gate as A) | bar "Research & Intelligence / Recommendation"; title "P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix)" (corrected); body: title only. Field (bad, `.ss-field-bad`): label "Say what needs to change" (when `needNote`), textarea `aria-invalid="true"` `aria-describedby` → error line (alert icon) "Request changes needs a note.", maxlength 8192. Buttons: primary "Approve", secondary "Request changes", link quiet **"Reject"** (corrected: reference now has 3 buttons) — **no Kbd hints** (no `registerKeys`). Alert (role alert, `flex-basis:100%`, alert icon, ink, `.ss-alert`): b "Not recorded." + " Already decided from Matrix by Rakesh Gangwar at 13:02." + link "Refresh" (min-height 0) → `model.refresh()`. Model built with `holdDetail: true`. |
| F (4605) | bar "Developer Experience / 4605"; title "Diagnose Melissa and Anna Supermessage silence — trace actual failing hop"; panel `aria-busy="true"`; FigureRow sm of 4 skeletons over labels "Stage", "Attempts", "Waiting", "Cost"; off-quote `h3 role="status"` "Loading readout…" + 3 skeleton lines (100%, 80%, 60%). |

Footnote list (`.ar-notes`, aria-label "Notes", inline 1 column): "1 The full digest is copied by the button beside it; only its first eight characters are shown, and the seal repeats them."

Add `@media (prefers-reduced-motion: reduce) { .ss-sk { animation: none; } }`.

### Phone (SP-Phone-Card-Studio) — see §6.

---

## 5. States & behaviour

Drawer keyboard (`onkeydown` on CardStudio root inside the Drawer focus trap; ignored when target is `input, textarea, select, [contenteditable]` or a modifier other than Shift is held, except ⌘↵):

| Keys | Action |
|---|---|
| Shift+O | `window.open(pageHref, '_blank', 'noopener')` |
| E | `model.edit.start()` |
| ⌘↵ / Ctrl+Enter in resume note | `model.resume.submit()` |
| ←/→/Home/End on focused tab | roving focus + automatic activation, wraps |
| Esc | close (root layout) |
| A / C (gate pending, focus not in a field) | `decide('approve')` / `decide('request_changes')` via `GateStudioBar registerKeys` |

Page keyboard (`<svelte:window onkeydown>`, same field guard): Shift+C copy link; `G` then `B` within 1000 ms → `goto('/b/' + boardId)` (pending G cleared after 1 s or other key; also G P → `/b/{id}`, G O → `/b/{id}/operate`, G W → `/workspace/needs-you`); E edit; C → focus `#cp-comment` (gate pending → request changes, hint "C request changes"); A approve when gate pending; ⌘↵ submits the textarea's form; ⌘K palette.

Tabs: ids `spec|log|links|talk|cost`, default `spec`, local `$state` reset to `spec` on `card.id` change; buttons `role=tab id=cw-{id} aria-controls=cw-panel aria-selected`, tabindex 0/−1; panel `role=tabpanel id=cw-panel aria-labelledby=cw-{active}`; only active panel rendered. Counts live.

States/feedback: hover on `.ar-btn2`/`.ar-ib` inverts to ink fill; focus ring 3px ink offset 3px (on ink bars `outline-color: var(--bg)`). Empty resume → Field error "Add a note for error-eric first." under textarea, focus moves there, no request. Submitting → disabled "Sending…". Resume refusal (`refusalOf`) → `Alert tone="neutral"` under the button. Copy → check icon + sr "Copied" for 2 s; "Copy link to this card" → "Link copied" 2 s; clipboard refused → `localError` "Clipboard access was refused. Select the address bar and copy it." Remove link → "Removing…" disabled. "View raw JSON" toggles RawJson under Details. Show more → "Show less" (`aria-expanded`). Loading: cell-F block replaces 01–04 while `!model.detailLoaded`. Gate: empty-note request changes → `needNote` (cell E state), focus textarea, no request; 409 → alert; Refresh re-fetches. Question empty → "Type an answer first."; ⌘↵ submits.

Signal discipline: signal only where a person is needed now (Waiting-on-you figure, StatePill needs, current stage underline, newest-run outcome `.sigt`, quote rule, status-bar item). Archived (C, phone archived): no signal, StatePill archived ink, Alert in E is **ink** not signal (decision already happened). Count badges (board behind) use `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg)`.

Agent text verbatim: needsHuman.detail (desktop lower-case "not reproduced…"), activity bodies, gate summary, question, handoff fields, spec values. Product copy: type labels, outcome words, sentences in §3.

44px: all buttons `min-height: 44px`; icon buttons 44×44; `.ttl::after` and `.h44::after` pseudo hit areas; page header link-buttons `min-height: 0` must still pass the 44px test.

---

## 6. Phone (390) specifics — CardPhoneStudio, corrected

```
div.ar.ph (width 100%)
  div.pc-bar (padding-top max(6px, env(safe-area-inset-top)))
    button.back (arrow-left 16) "Developer Experience" → onClose()
    CopyId chip .sid "4605" + copy icon 13, aria-label "Copy card id card_05823a57e8224605" (full id)
    span.clk aria-label "13:51, midday" "13:51 · midday" (corrected from 13:31)
    a.ph-ib[href=pageHref] (external 18) aria-label/title "Open as a page" (same tab)
    button.ph-ib (close 18) aria-label "Close (Esc)" → onClose()
  div.pc-in
    header.pc-hd: kick swatch "Stage 02 · Reproduce"; .tl h2#drawer-title + IconButton(frame, pencil) aria-label "Edit card"
    dl.pc-figs 6 (dt after dd): "2/7" Stage · "2" Tries · "2 days" Stopped for (corrected: S-11 "3 days" void) · "$0.00" Cost · no est. (zero) · "0" Blocks (zero) · "0/0" Sub-tasks (zero)
    div.pc-trk: StageStrip labels none (role img, aria "Stage 2 of 7, Reproduce, stopped") + p "<b>Reproduce · stopped here</b> · next Failing test"
    [live] section.ar-q aria-label "Readout" (needs, Face error-eric 24 "error-eric, needs you"): "error-eric · Stopped · needs decision" + "Thu 08 Oct 19:41"; body capFirst(detail) "Not reproduced end-to-end: …" with code tokens; no footnote, no Copy session id (S-12)
           section.pc-cmd: .h "Resume · blocked" + mono "2 tries"; "Resume at stage" 7 options (3–7 disabled); label "Note to error-eric: what changed? It reads this."; single-line input.ar-in type=text maxlength 8000, no placeholder; primary "Send back to work" (icon send)
    [archived] off-quote (Face resting "error-eric, resting") "error-eric · last word before archive" + same body; section.pc-arch: h3 archive icon "Archived · 08 Oct", p "Not running. Nothing to resume. Restore puts it back in Reproduce.", inverted primary "Restore"
    div.pc-srow: StatePill needs "Waiting on you" (archived: "Archived" ink) · "Unclaimed" (corrected: "· Assign to me" removed, S-14/§8.2-1) · muted "owner · Rakesh Gangwar" · chip Face 20 super-chotu resting + "asked by super-chotu" title "Queued on Rakesh Gangwar's grant"
    Tabs .pc-tabs (aria-label "Card sections", horizontal scroll inside itself): "Spec <b>10</b>", "Log <b>2 runs</b>", "Links <b>5</b>", "Talk <b>0</b>", "Cost <b>$0</b>"; ids t-{id}; panel #p-pane aria-label = tab name; no Kbd hints
  footer.pc-foot aria-label "Card actions" (padding-bottom max(18px, env(safe-area-inset-bottom))): "Archive card" (icon) + "Delete card…" (destructive)
```

Phone panes (StudioPhonePanels):
- **Spec:** "Facts" (`.pc-fx3`) Priority "P3" / Due "none" / Labels "none"; "Description" `.p`; "Things to prove 5" (`.pc-nl`); "Plan" + note "error-eric did not post a plan for this card."; Disclosure (closed by default) "Details" + mono "10 fields · what to do, who, background, rules, where work goes"; groups h4 "What to do", "Who it is about", "Background", "Rules", "Where work goes" (`.pc-grp` + `.pc-kv`), rows as the drawer but Required evidence "5 items, listed under Things to prove."; ids in `.id` mono; links "onboarding card", "policy"; [+] rows clamp with "Show more" (`class="h44"`, min-height 0); **no Project row** inside Details (corrected, phone-card row 4); "View raw JSON" + "Copy" row; "Project" + "Marketing & Community — Melissa and Anna onboarding · no milestone" + link "Change project".
- **Log:** "Session activity 2 runs"; note "Queued by super-chotu on Rakesh Gangwar's grant · 32 agents may be dispatched."; run disclosures (`.pc-run`, run 2 open, run 1 closed): summary `` `Run ${n} · ${stageName}` `` / `` `${agent} · ${outcomeWord} · attempt ${n}` `` → "Run 2 · Reproduce" / "error-eric · Stopped · attempt 2"; events (`.pc-ev`, narrative only unless Show tool calls): "Started" / "Rework run on this card session; read prior persisted evidence first." / "Thu 8 Oct"; "Stopped" (sig) / "Blocked. Waiting on you; the reason is shown at the top of this card." / "19:41"; run 1: "Sent back" / "The board refused completion: repro and observed were missing." / "Thu 8 Oct". Event time = `HH:mm` when same day as previous event, else `ddd D MMM`. "Show tool calls" (`aria-pressed`). "Decisions" + note "No decisions on this card yet."; "Handoff" + `.p` "From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output."; "Attempts 2" list (`.pc-att`): n / Face 20 + name / usd / `` `${outcomeWord}: ${failureReason}` `` → "1 error-eric $0.00 Sent back: repro and observed missing", "2 error-eric $0.00 Stopped: waiting on you" (newest face mood needs).
- **Links:** "Links" + note "Nothing blocks this card and it blocks nothing."; secondary "Add a link" (plus); "Sub-tasks 0/0" + note "0 of 0 open. No sub-tasks yet." + add row (sr label "New sub-task title", placeholder "Add a sub-task", secondary "Add", disabled while empty); "References 5" `.pc-refs` rich list: `b` title, `span` subtitle, `small` source line (§3); attach row (sr label "Attach a link or Superlibrary item", `type=url`, placeholder "Paste a link to attach", "Add"); "Related prior work" + note "No related prior work found in Superlibrary.".
- **Talk:** "Comments"; note "No comments yet."; field label "Comment", rows 2, placeholder "Write a comment"; hint "⌘ or Ctrl + Enter to post"; secondary "Comment" (`.pc-row` space-between).
- **Cost:** "Cost"; `<strong class="mono">$0.00</strong> spent · no estimate · no card cap set`; "Delivery" + note "No approved delivery on this card.".

Phone references (5; `provider 'github'`, `sourceType 'url'`): titles/subtitles: "AgentPod v0.1.91 Matrix inbound bridge contract" / "DM ingress → room lookup → Accounts identity/grant → ACP dispatch"; "AgentPod v0.1.91 Matrix reply delivery contract" / "ACP chunks buffered and flushed via bridge-owned Matrix identity"; "AgentPod v0.1.91 ACP transport contract" / "acp.open/attach and bidirectional broker framing"; "Accounts current claims/grant contract" / "Fresh tokens read the stored grant; bridge authorization reads Accounts principal view directly"; "Hermes ACP adapter at the reproduced build" / "Hermes streams agent_message_chunk and returns end_turn over ACP stdio". Source lines: "github · agentpod · inbound.ts lines 379–786", "github · agentpod · outbound.ts lines 373–486", "github · agentpod · acp-transport.ts lines 90–248", "github · accounts · claims.ts lines 17–43", "github · hermes-agent · server.py lines 818–883".

Interactions: back and Close → `onClose()`; Open as a page same tab; tabs roving tabindex, arrows switch; Details closed by default; Show more expands in place; Add sub-task / Add reference → `model.subtasks.add()` / `model.refsForm.add()`. Archived variant: no resume box, no live controls, no signal.

---

## 7. Gaps / open questions

1. **Studio E buttons.** Part 1 row states-15 appends "Reject" to E (reference has 3 buttons); the appendix says "Studio E is left as drawn". Reference wins → 3 buttons (gate options = DEFAULT_GATE_OPTIONS).
2. **E state after the 409.** Reference shows the field error ("Request changes needs a note.", label "Say what needs to change") **and** the alert together. `GateDecisionModel` must keep `needNote` true after the subsequent Approve → 409.
3. **409 payload shape** (API-1 vs harness fulfil) — see §2; align them.
4. **Attempt "Sent back" word** — needs `completion` on Attempt or a seeded outcome; planner must pick (§2).
5. **Provenance coverage** compares `prn_…` grant entries against `agt_…` attempt agent ids → resolve through `agents.externalId`. Grant count: count all `queuedGrant` entries (32), not `agt_` prefix.
6. **Age rounding:** spec's `Math.round` (S-11) gives "3 days" for 66.2h; corrected value is "2 days" → floor (F §A.2). Recommend `figAge` floors and uses F's 48h hours threshold; reconcile with shared `ageWords`.
7. **"In Reproduce" figure** — O-5: from `state_since`, "2 days". API-6 `stageSince` is not needed for Studio; if implemented, the figure must still read 2 days.
8. **Page resume placeholder:** drawer corrected to "For example: what you checked, and what the agent should look at next." (§8.2-6), but the corrected page reference still prints "Fresh DMs sent 14:05; trace those event IDs." and no card-page row fixes it. Reference is the source of truth for the pixel test; §8.2-6 says placeholders must not name card specifics. Recommend the shared sentence on page too + fix the reference (or mask).
9. **Required evidence wording on the page:** page heading is "Acceptance criteria" but the reference row reads "5 items, listed under Things to prove." (card-page DETAILS literal). Drawer reads "…Acceptance criteria." Either pass `criteriaHeading = 'Things to prove'` on the page (match reference) or fix the reference.
10. **Details summary "who"** (phone) is not a plain lower-case of "Who it is about" — needs a short-heading map.
11. **Asked-by face mood:** desktop working / phone resting (O-2) while all agents are `offline` in the fixture; S-20's status rule cannot produce desktop "working". Treat as per-surface constant or adjust rule.
12. **C stage key/status spelling:** F stage `messaging-review` vs display "Messaging approval"; gate `canceled` vs `cancelled`.
13. **Backdrop mask width** for SP-Card-Studio (680 vs 500) — §1.
14. **Gallery route vs harness:** 00-shared §3 gallery `/dev/card-states` vs registry per-panel drawer routes with `[data-pixel="card-top"]`; Studio's app element for each panel = drawer's `.ss-panel`-equivalent block. The drawer never draws the cell's `.ss-bar`/`.ss-title`/compact track, but the reference `.ss-panel` contains them — the planner must decide what carries `data-pixel="card-top"` (gallery cell vs drawer region).
15. **B card id** for Guild Ops card 1 is not given in these sources (registry's `card_e10fb4fe39a91dfc` route is void) — take from F after WC-4.
16. **Show more on desktop** depends on real overflow (`scrollHeight > clientHeight`) inside 940px drawer / page columns; reference shows it on 5 rows — verify overflow occurs at those widths, else pixel diff.
17. **Phone archived variant** (`archived=true`) and §8.2-3 signal rule inside it: not corrected, no registry variant; treat as secondary/out of scope for baselines.
18. **Spec responsive rules** (drawer container query, page breakpoints, gallery grid breakpoints, reduced-motion) are additions not in the mockup — keep.
19. Out of scope: agent-drafted new card (D-1). Board/shell behind the drawer (7-card board, status bar, `.ar-nav .ct` badge) belongs to the shell/board groups.
