# Digest: dialogs (SP-Dlg-*), for the TDD planner

Sources: `screens/dialogs.md` (DLG), `mockup-corrections.md` group `dialogs` + Parts 2–4 + appendix (MC), `fixtures-and-harness.md` (F), references `apps/web/e2e/reference/mockups/SP-Dlg-*-{Daylight,Paper,Studio,Quiet}.html` (REF, the authority for markup/CSS/text), accent brief `accent-tokens.md` (this folder) (ACC), editable sources `scratchpad/vibes-mockups/project/SP-Dlg-*-<Vibe>.dc.html` (DC, for branches the export did not render).

**Global corrections that apply here (MC overrides DLG):**
- Tenant `tnt_vibes`, user `usr_b19776fac3c94df4` "Rakesh Gangwar" (not `tnt_dev`/`usr_rakesh`). DX board id `brd_134a0ddb6d434478` (not `brd_dx`).
- Failing-test stage key is `test` (not `failing-test`).
- Card ids: 58f8 = `card_9ac2116a050858f8`, 4605 = `card_05823a57e8224605`. Card 4605 is LIVE, stopped in Reproduce (error-eric, P3, "2 days").
- DX has 7 live cards, 4 need you (63ac, 58f8, 1dfc, 4605), working 0, queued 2 (f83f, 481f). Research & Intelligence has 1 live card / 1 needs you, `updated_at 2026-10-11T07:18:00Z`.
- Clock `2026-10-11T08:21:00Z` = 13:51 Asia/Kolkata, phase noon/"Midday", on every screen, Studio included (D-11 "13:20" void). No `clock` field and no fixture `variants` in any dialog registry entry.
- Ages follow F§A.2: under 48h → hours ("33h"), else days ("2d"). This overrides DLG's `stopped ${floor(ageHours)}h`.

---

## 1. Screens covered

There are 24 fixed-vibe references, one per `SP-Dlg-<Name>-<Vibe>` (MC Part 3 split; this replaces the prop-vibe `@<vibe>` lookup). Each file keeps only the `theme` prop. Reconnect also kept `state`, but **only `expired` was exported**.

| Artboard | Size (manifest) | Route | Dialog box in REF (left, top, width) | What the REF shows |
|---|---|---|---|---|
| SP-Dlg-NewCard-* | 1440×900 | `/b/brd_134a0ddb6d434478` | `.dlg.nc` 320, 44, 800 | the drafted state (draft region out of scope, see below) |
| SP-Dlg-Palette-* | 1440×900 | same | `.dlg.pal` 370, 84, 700 | q=`agent`, first row selected |
| SP-Dlg-Appearance-* | **1440×1200** | same | `.dlg.ap` 220, **20** (corrected: DLG said top 34), 1000 | vibe = the file's own vibe checked; theme "Follow the sun"; time Strong (Quiet: **Off**); location Off; accent "Product colour" |
| SP-Dlg-Move-* | 1440×900 | same | `.dlg.mv` 400, 36, 640 | opened on 58f8; pick "Fix" |
| SP-Dlg-BoardSwitcher-* | 1440×900 | same | `.dlg.bs` anchored, 520 wide: daylight (128, 83), paper (56, 202), studio (104, 76), quiet (32, 117) (corrected per S9: DLG's 124/84, 40/206, 104/74, 32/122 are void) | popover open, q empty, first row selected |
| SP-Dlg-Reconnect-* | 1440×900 | `/b/brd_134a0ddb6d434478/c/card_05823a57e8224605` | `.dlg.rc` 450, 190, 540 | **state=expired** (DC prop default `expired`); the silent toast is not in any REF |

**REF structure (all 24):** `div.art[data-vibe][data-theme]`, then `div.backdrop[aria-hidden][inert]` (the real board in the canonical dy/mh/ar/qn shell), then `div.fg[data-vibe][data-theme]` holding `div.scrim` and `section.dlg.<prefix>`. Appearance alone has `div.fg.acc[data-accent="gold"]` and `div.art[data-time]`. Reconnect's `.fg` also holds a stand-in drawer `div.dr-wrap[aria-hidden][inert] > aside.dr` (620px, right edge) **under** the scrim. BoardSwitcher's `.fg` holds a raised trigger copy `div.bs-anchor > .bs-trigger` above the scrim.

**Masking / comparison (DLG §0.5, D-10, MC Part 2):**
- Compare an element screenshot of `section.dlg`. For BoardSwitcher, compare `section.dlg` plus `.bs-trigger`.
- Sample the scrim colour at 4 points outside the dialog, against the expected `scrim` mixed over the same token bg.
- In the full-frame diff, **mask everything outside `.dlg`**. That covers the backdrop board, the Reconnect `.dr` stand-in drawer, and the shell.
- Suggested registry mode is `mode: { kind: 'panels', ref: 'section.dlg', app: '[data-pixel="dialog"]', count: 1 }`, with `data-pixel="dialog"` on the DialogFrame's `.dlg`. Add `data-pixel="bs-trigger"` as a second panel for the switcher.
- **Element sizes must match exactly**, because a size mismatch fails (F D10). So the dialog heights in the app must equal the REF's.
- Appearance's REF is 1200 tall: the harness viewport is 1440×1200.

**Dark theme:**
- NewCard, Palette, Move, BoardSwitcher and Reconnect: dark is derived by the `data-theme` swap. It is valid because those files have no theme branch inside `.dlg`. Palette's Account row has a branch (`Light theme`/sun when dark, P5), but no Account row is visible with q=`agent`.
- **Appearance needs branch handling.** DC sets `tc = theme==='dark' ? 'dark' : 'sun'`, so the dark render checks "Dark" with hint "Always dark: a lamp-lit room, not black.". A swap of the light REF ("Follow the sun") is therefore wrong. `darkNeedsExport: true` stays, and no `.dark` export exists in `mockups/`, so all 4 Appearance-dark runs report `missing-reference` until someone exports DC with theme=dark.

**Harness steps.** These correct F §B.2. Common rule for all six: after the steps, `await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())`, because no REF draws a `:focus-visible` ring or `:focus-within` style.

| Screen | cookie `vk_appearance` | steps (exact accessible names) |
|---|---|---|
| NewCard | `<vibe>.<theme>.<strong\|off>.0` | `press('n')`. Fill textbox "Describe it in a sentence" with `Fix the highest-severity blocker found in the clean-room journey, with red-test evidence before any fix.`. Fill textbox "Card title" with `Fix the highest-severity blocker found in the clean-room journey`. Fill textbox "Brief for the agent" with the brief (§3). Fill label "Due (optional)" with `2026-10-18`. Click radio "P1". For each of `clean-room`, `evidence-required`, `superpipeline`: click button "Add label", then option `<name>`. Press Escape (closes only the LabelPicker; it must stopPropagation). Blur. Stage stays "Reported · a person"; project stays "No project". **Corrected:** DLG/MC Part 4's draft recipe (Draft brief + seed fulfil `drf_dx_01`) is out of scope. |
| Palette | default | `press('Meta+k')`, `type('agent')`, blur |
| Appearance | **`<vibe>.sun.<strength>.0` for light** (F's `light` would check "Light"; REF checks "Follow the sun"); strength strong (Quiet `off`) | `getByRole('button', { name: /^Appearance/ }).first().click()`, blur |
| Move | default | `getByRole('button', { name: /^Move AgentPod: connector interface/ }).first().click()`. That is the existing CardMoveMenu label `Move {card.title} to another stage`, and on Daylight it may need a hover first to be visible. Then `getByRole('radio', { name: /^Fix/ }).check()` (already the default), then blur. |
| BoardSwitcher | default | `getByRole('button', { name: /Change board/ }).first().click()`. Trigger names: Daylight/Studio `Board: Developer Experience. Change board`; Paper/Quiet `Change board, now Developer Experience`. F's `/Developer Experience/` also matches but is riskier. Then blur. `.bs-in`'s ring is a static `box-shadow: var(--vk-focus)`, so it survives blur. |
| Reconnect | default | **Drop F's `variants:['card4605-live']` (R16) and F's `fulfil /auth/me → user:null`.** A null user at boot shows Landing, not the dialog, and the user must be retained (D-4). Load signed in and wait for ready. Then `page.route('**/hub/session', → 200 {ok:false, reason:'login_required', issuer:'accounts.superjackfruit.com', reauthorize:'/auth/login'})` and `page.route('**/v1/**', → 401)`. Trigger `app.refresh()`: DLG's recipe step 3 asks for it but names no mechanism, so add a dev-only hook, e.g. `window.__spDev.refresh()`. Wait for `getByRole('alertdialog', { name: 'Sign in again to keep going' })`, then blur. Silent state: no pixel compare (no REF); behavioural e2e only. |

**Region to mask/patch for out-of-scope drafting (NewCard).**
- What the REF draws:
  - `div.nc-draftrow` (inside `.nc-body`, after `#nc-sentence`). It holds button `.vk-button--secondary` "Draft again" (sparkle icon) and `span.nc-drafted`: a 24px super-chotu face (mood `done`, aria "super-chotu, done") with "**super-chotu** drafted the title and brief from your sentence. Change anything.".
  - `span.nc-brief-tag` "Drafted · not sent yet", absolute at the bottom-right of `.nc-brief-wrap`.
- What the composer does without drafting: per D-1 `NO_DRAFTER`, D-21. The draft button and note are hidden, the tag never shows, and the lead text is unchanged (verbatim, it still says an agent drafts). Title and brief are typed by hand.
- Consequence: removing `.nc-draftrow` shifts everything below it up (row about 44px plus 16px gap), and a mask cannot fix a shift.
- **Recommendation:** add a harness *reference patch* for SP-Dlg-NewCard-*, like F §B.3.3's dark patches. Delete `.nc-draftrow` and `.nc-brief-tag` from the REF DOM before the screenshot, citing D-1 out of scope. Alternative: render an empty placeholder row in the app. Not recommended.

---

## 2. API / contract rulings

| id | change | exact type | server computation | screens | fixture values |
|---|---|---|---|---|---|
| **D-1** | `POST /v1/boards/:boardId/drafts`, `GET/PUT /v1/drafts/:id`, `draft.ready` socket event, MCP `draft_card` | — | — | NewCard | **OUT OF SCOPE.** Do not build. `drf_dx_01` is not seeded. |
| **D-2** (b) | `POST /v1/boards/:id/cards` accepts more fields | `stageKey?: string; labelIds?: string[]; projectId?: string \| null` | `stageKey` must exist on the board, else 400 `UNKNOWN_STAGE` (default: first stage by order). `labelIds` must be tenant labels, else 400 `UNKNOWN_LABEL`. `projectId` is nullable. `createCard()` in api.ts gains the same three; `app.dispatchCard(title, { priority, description, due, stageKey, labelIds, projectId, boardId })` passes them, plus an optional target `boardId`. | NewCard | e2e only, e.g. stageKey `reported`, labelIds `["lbl_0259a14014754f69","lbl_e9ccaacaa2f94509","lbl_8430ce51795447c3"]` |
| **D-3 / G-08** (b) | `GET /v1/boards` rows gain 3 fields. Today it is `{id,name}` from `listBoards()` (`apps/api/src/db/catalog.ts:793`, `ORDER BY created_at DESC`). | `BoardSummary { id: string; name: string; cardCount: number; needsYouCount: number; lastActivityAt: string \| null }`. Put it in `@superpipeline/contract`; web `BoardSummary` lives at `apps/web/src/lib/api.ts:44`. | `cardCount` = non-archived cards and `needsYouCount` = the `itemsFromBoard` predicate (pending gate, pending question, failed, input-required, over budget, ownerless-stale). Both come from a per-board DO fan-out like `/v1/stale` (index.ts ~1047), counting a non-answering board as unknown. Port the predicate to a module shared by api + web. **`lastActivityAt` = `boards.updated_at`** (MC appendix: fixture `updated_at` applies). Caveat: `updated_at` is bumped today only by rename/stages (`catalog.ts:821,833`); real "last activity" needs a bump on board writes. Open, §7. | BoardSwitcher, Palette (Boards group), NewCard board listbox | DX 7/4 `2026-10-11T08:20:00Z`; R&I (`brd_fa33a0a0721d4d18`) 1/1 `2026-10-11T07:18:00Z`; Client Quality 2/1 `03:30Z`; Guild Ops 3/1 `02:10Z`; Agent Onboarding 20/0 `01:00Z`; Editorial 3/0 `2026-10-10T06:00Z`; Recurring Maintenance 4/0 `2026-10-10T04:00Z`; Planning & Roadmap 3/0 `2026-10-08T06:00Z`; Production Releases 0/0 `2026-10-07T06:00Z`; Reliability & IR 0/0 `2026-10-03T06:00Z`; Marketing & Community 0/0 `2026-10-02T06:00Z`; superwitness canary 0/0 `2026-09-19T06:00Z` |
| **D-4 / G-01** (b) | display name | `User.name` (already optional) | Plane sign-in session `name = claims.name ?? claims.email`, and `/auth/me` returns it. Under DEV_AUTH, `resolveUser` reads `users.name` (`apps/api/src/auth/resolve.ts`). | Reconnect "Signing in as **Rakesh Gangwar**", Palette Sign out sub, Appearance Paper preview "Dear Rakesh," | `Rakesh Gangwar` |
| **D-5** (b) | `POST /hub/session` (new; under `/hub/` because the refresh cookie is `Path=/hub`) | `200 {ok:true}` · `200 {ok:false, reason:'login_required'\|'no_refresh', issuer:'accounts.superjackfruit.com', reauthorize:'/auth/login'}` · `503 {ok:false, reason:'plane_unavailable', retryable:true}` + `Retry-After: 5`. Client: `renewSession(): Promise<{ ok: true } \| { ok: false; reason: RenewReason; issuer?: string; reauthorize?: string; retryable?: boolean }>` with `credentials:'same-origin'`. | It spends the refresh cookie (`tokenGrant` refresh_token), verifies the access token, re-signs the session cookie (`signSession`, `sessionSetCookie`), and rotates refresh/app/hub cookies exactly as `/hub/token` does (`apps/api/src/auth/plane-signin.ts:204`). `grant.refused` → login_required. No refresh cookie → no_refresh. GitHub sign-in mode always answers no_refresh. Add the path to the `owned` list (plane-signin.ts:126). **Dev stub (DEV_AUTH):** cookie `superpipeline_plane_refresh=refused` → login_required with issuer `accounts.superjackfruit.com`; `=slow` → hold 10s, then ok. | Reconnect | expired REF: reason `login_required`, issuer `accounts.superjackfruit.com` |
| D-19 (b, dependency) | vibekit tokens release: `--vk-color-rule`, `--vk-stage-1..7`, Archivo/Azeret/Newsreader | — | vibekit | Studio branches, Appearance Studio preview | — |
| D-20 (b, dependency) | vibekit components | — | build app-local equivalents with the REF CSS until vibekit ships them | all | — |
| **ACC (new, from REF; no DLG ruling)** | Accent tokens + choice | `type Accent = 'gold'\|'moss'\|'jade'\|'teal'\|'azure'\|'cobalt'\|'violet'\|'plum'`; `type AccentChoice = 'product' \| Accent` | Client + tokens only, no server. The 8×4×2 token table, plus Studio stage ramps, comes from ACC (values are also inlined in REF Appearance `<style>` as `.acc[data-vibe][data-theme][data-accent]`). This is a vibekit token dependency, like D-19. | Appearance (whole app once applied) | default `product` → `gold` |

**Client-only rulings, no API work:** D-6 (`#` + last 4 of id), D-7 (palette agent cap/rank), D-11 (READOUT constants), D-15 (phone sheet/card), D-16 (toast sub), D-17 (non-card return box), D-18 (palette uses switcher order), D-21 (pre-draft/LabelPicker/BoardPickButton plain listboxes), D-22 (inline `role=alert` errors), D-23 (inline rename), D-24 (palette faces resting).
**(c) mockup-only, nothing to build:** D-8 (`.pal-ran` banner deleted), D-9 (no empty `<mark>`), D-10 (stand-in backdrop), D-13 (generic "picks it up."), D-14 (details para replaced).

---

## 3. Pure derivations (vitest)

Fixture agents: from F§A.4.2 (22). Capability holders: diagnostics = error-eric; testing = tester-tim; code = coder-kai, optimizer-ollie; integration = integration-ian; api = api-alan; command = super-chotu. DX stages (F§A.5.1): reported (human), reproduce (cap diagnostics), test "Failing test" (cap testing), fix (cap code), integrate (owner integration, `requires.any [integration, api, testing]`), signed-off (human, gate approval), shipped (human). Reuse `stageOwner()` (`components/board/stage-owner.ts`): its `label` is `caps.join(' or ')` for any and `' + '` for all, and its `declaredBy` lists agents by name.

`dialogs/who-picks-up.ts`
- `ownerShort(stage, agents): string`. Human non-gate → `a person`; human gate → `approval gate`; capability with 1 declared → the name; n>1 → `${n} agents`; ownerKind agent → the agent name.
  - reported→`a person`, reproduce→`error-eric`, test→`tester-tim`, fix→`2 agents`, integrate→`3 agents`, signed-off→`approval gate`, shipped→`a person`.
  - The option text is `${stage.name} · ${ownerShort}`, e.g. `Reproduce · error-eric`, `Signed off · approval gate`.
- `ownerLine(stage, agents): string`. Human → stageOwner label; capability → `${label} · ${n===1 ? name : n+' agents'}`; 0 declared → `${label} · no agent yet`; agent → name.
  - `a person`, `diagnostics · error-eric`, `testing · tester-tim`, `code · 2 agents`, `integration or api or testing · 3 agents`, `a person · approval`, `a person`.
- `ownerFace(stage, agents, movedCard)`: a 20px face only when exactly 1 agent is declared or ownerKind is agent (Reproduce, Failing test).
  - **Corrected to REF:** mood = the moved card's mood when that agent is the moved card's delegate, else `resting`. REF draws error-eric `resting` even with 4605 live in Reproduce, and tester-tim `needs`.
  - DLG's "mood on this board if it holds a card here" would give error-eric `needs` and does not match the REF.
- `pickupSentence(stage, stages, agents): string` (D-13):
  - human + gate approval → `It waits here for a person to approve before it can ship.`
  - human + last by order → `It lands with the finished work.`
  - human otherwise → `A person picks it up here; no agent works this stage.`
  - capability, 1 declared → `${name} picks it up.`
  - capability, n>1 → `One of the ${n} agents with ${caps} picks it up.` (caps joined ", " with " or " before the last for `any`; ", " / " and " for `all`)
  - capability, 0 → `No agent declares ${label} yet, so it waits here.`
  - agent → `${name} picks it up.`
  - Examples: fix → `One of the 2 agents with code picks it up.`; integrate → `One of the 3 agents with integration, api or testing picks it up.`; reproduce → `error-eric picks it up.` (M3); signed-off → `It waits here for a person to approve before it can ship.`; shipped → `It lands with the finished work.`; reported → `A person picks it up here; no agent works this stage.`
- `moveThen(pick)` = `In ${pick.name}: ${pickupSentence(pick)}` → `In Fix: One of the 2 agents with code picks it up.`
- `pickupClause(stage, agents)` and `dispatchFoot(stage, boardName, agents)`:
  - default form: `Goes to <strong>{stage.name}</strong> on {board}, where {clause} picks it up.`, with clause: human → `a person`; capability with 1 → name; n>1 → `one of the ${n} agents with ${caps}`; agent → name.
  - gate → `…, where a person approves it.`
  - capability with 0 → `…, where it waits: no agent declares ${label} yet.`
  - Examples: reported → `Goes to Reported on Developer Experience, where a person picks it up.`; reproduce → `Goes to Reproduce on Developer Experience, where error-eric picks it up.`; fix → `…, where one of the 2 agents with code picks it up.`; signed-off → `Goes to Signed off on Developer Experience, where a person approves it.`

`dialogs/move-model.ts` (suggested)
- `initialPick(stages, hereKey)` = `stages[here+1]?.key ?? stages[here-1]?.key`. For test → `fix`. The current stage's radio is disabled.
- `stageCountText(count, blocked)` = `count===0 ? 'Empty' : count+' card'+(count===1?'':'s')` + `(blocked>0 ? \` · ${blocked} blocked\` : '')`.
  - Fixture rows: reported `1 card`, reproduce `1 card` (M2), test `3 cards · 2 blocked`, fix `1 card`, integrate `Empty`, signed-off `Empty`, shipped `1 card`.
- `dirLabel(i, here)` → `back` / `forward` / `''`.
- `moveNowLead(summary)`:
  - stopped → `${delegate} stopped ${age} ago`; working → `${delegate} is working`; question → `${agent} asked a question`; review → `waiting for your review`; done → `Done`; else `Queued`.
  - `age` follows the F§A.2 rule.
  - 58f8 → `tester-tim stopped 33h ago`. Full line: `Now in **Failing test** · [face tester-tim needs] tester-tim stopped 33h ago [Waiting on you]`. The chip shows iff urgency is `needs`.
- `primaryLabel(pick)` → `Move to Fix`; `Moving…` while pending. Live region after success: `${card.title} moved to ${stage.name}`.

`dialogs/palette-index.ts`
- `buildPaletteIndex(ctx): PaletteItem[]` with groups in order Cards, Boards, Agents, Actions, Account. `PaletteItem` is as in DLG §2: `{group,label,sub,needs,meta,icon,verb,act}`.
- `filterPalette(items, q)`: match on `(label+' '+group+' '+sub).toLowerCase().includes(q.trim().toLowerCase())`. "agent" matches every agent via the group name, and Workspace via its sub.
- Highlight: split the first `indexOf(q)` in the lowercased label into pre / `<mark>` / post. **Render `<mark>` only when the hit is non-empty** (D-9). Agents rows have no mark for "agent".
- **Agents group (D-7):** at most 4 rows, ranked name-startsWith > name-includes > capability-includes > group-only.
  - The tie-break is **unresolved**: O-11 says "a D-7 tie-break, not created_at", while Part 4 says "coordinator must choose" (§7).
  - Target output for q=`agent`: `error-eric` (`diagnostics`), `tester-tim` (`testing`), `devops-dave` (`release`), `vulnerability-victor` (`security-review`).
  - Header and total count the rows shown.
- `paletteCount(n, q, boardName|null)`:
  - q empty → `Everything on ${board.name}, plus boards, agents and actions`
  - no board → `Everything in your workspace: boards, agents and actions`
  - else `${n} match${n===1?'':'es'} for “${q.trim()}”`
  - Example: `8 matches for “agent”`.
- `groupCount(k)` → `1 result` / `${k} results`.
- Card row:
  - label = title. sub = `${board.name} · ${stageName}` + (stopped → ` · stopped ${age}`) + (blocked → ` · Blocked`) + (done → ` · Done`).
  - needs chip `Waiting on you` iff urgency `needs`. meta `'#'+card.id.slice(-4)`. verb `Open card`.
  - Examples: 58f8 → `Developer Experience · Failing test · stopped 33h` `#58f8`; 481f → `Developer Experience · Failing test · Blocked` `#481f`; 4605 → `Developer Experience · Reproduce · stopped 2d` `#4605` (corrected: not `66h`).
  - Card order comes from `groupByUrgency(summarize(...))`.
- Board row:
  - sub = `(here?'You are here · ':'') + (cardCount===0?'No cards yet':cardCount+(cardCount===1?' card':' cards')) + (needs>0?' · '+needs+' need'+(needs===1?'s':'')+' you':'')`. verb `Go to board`. Order = switcher order (D-18).
  - DX → `You are here · 7 cards · 4 need you`; R&I → `1 card · 1 needs you`; Agent Onboarding → `20 cards`; Production Releases → `No cards yet`.
- Agent row: sub `capabilities.join(', ')` or `no capabilities`; 28px face mood `resting`; verb `Show agent`.
- Actions and Account rows: labels, subs and verbs verbatim from DLG §2's table, e.g. `Workspace` / `agents, capabilities, labels and people` / `Go`.
  - Account: `Appearance…` / `vibe, light or dark, time of day` / `Open`; `otherThemeLabel(theme)` (`Dark theme` or `Light theme`) / `theme` / `Switch`; `Sign out` / `Rakesh Gangwar` / `Sign out`.
- Expected q=`agent` output: Cards 2 (58f8 needs + selected `↵ Open card`; 481f); Boards 1 (`Agent Onboarding`, `20 cards`); Agents 4; Actions 1 (`Workspace`); total 8.
- Empty state: `No matches for “{q}”.` plus button `Dispatch a card called “{q}”` → `app.requestCompose(q)`.

`dialogs/relative-day.ts`: `relativeDay(iso: string|null, now: Date, timeZone: string): string`, in calendar days in `timeZone`.
- Rule: 0 `Today`, 1 `Yesterday`, 2–6 `${d} days ago`, 7–13 `Last week`, 14–27 `${Math.floor(d/7)} weeks ago`, 28–59 `Last month`, ≥60 `${Math.floor(d/30)} months ago`, null → `''`.
- Examples at now `2026-10-11T08:21Z`, tz Asia/Kolkata: `2026-10-11T07:18:00Z`→`Today`; `2026-10-10T06:00:00Z`→`Yesterday`; `2026-10-08T06:00:00Z`→`3 days ago`; `2026-10-07T06:00:00Z`→`4 days ago`; `2026-10-02T06:00:00Z`→`Last week`; `2026-09-26T06:00:00Z`→`2 weeks ago`; `2026-09-19T06:00:00Z`→`3 weeks ago`.

`dialogs/switcher-model.ts` (suggested)
- `groupBoards(boards, currentId, q)`:
  - "Needs you" = boards with needs > 0, current first, then `lastActivityAt` desc.
  - "Everything else, last used first" = needs 0, `lastActivityAt` desc. When q is non-empty the second header reads `Other boards`.
  - The filter is a case-insensitive name substring.
- Header rights: `${sum needs} card(s)` → **`7 cards`** (REF; MC S4's "8 cards (4+1+1+1+1)" is an arithmetic slip, since 4+1+1+1 = 7). Second group: `${n} board(s)` → `8 boards`.
- Expected order: DX, R&I, Client Quality, Guild Operations & Automation | Agent Onboarding, Editorial & Fact-Checking, Recurring Maintenance, Planning & Roadmap, Production Releases, Reliability & Incident Response, Marketing & Community, superwitness canary.
- Row:
  - sub `cardCount===0 ? 'No cards yet' : n+' card'+(n===1?'':'s')`.
  - chip `1 needs you` / `${k} need you`.
  - right `You are here` (current, `aria-current="page"`) else `relativeDay`.
  - Empty: `No board matches “${q}”.`

Appearance helpers (`dialogs/appearance-copy.ts`)
- `themeHint(pref, phase, resolved)`:
  - sun → `Light by day, dark after dusk. It is ${PHASE_NAMES[phase].toLowerCase()}, so it is ${resolved} now.` → `Light by day, dark after dusk. It is midday, so it is light now.`
  - light → `Always light, whatever the hour.`
  - dark → `Always dark: a lamp-lit room, not black.`
- `timeHint(s)` + ` Quiet starts with this off.`:
  - strong `Strong: the full sky and greeting where the vibe shows them.`
  - subtle `Subtle: a light tint of the sky, no sun.`
  - off `Off: no sky, no tint. Light or dark still applies.`
- `locMeans(on, tz)`:
  - off: `Off: the sun follows your time zone, ${tz}, and the day runs 6:00 to 18:00. Turn it on for real sunrise and sunset; your browser will ask first.` (tz `Asia/Kolkata`; vibekit's window is 06:00–18:00 per `phaseAt` docs, and has no exported constant, so use a copy constant).
  - on: `On: sunrise and sunset are worked out from your rough location (about 11 km). It stays on this device and is never sent anywhere.`
  - denial `locNote`: `Location was not shared, so the sun follows your time zone.`
  - switch word `Off`/`On`.
- `readout(vibe, phase, strength, firstName, hhmm)` = `(strength==='off'?'Time of day is off · ':'') + R`, where R is:
  - daylight `${Phase} · ${greeting minus '.'}, ${firstName}.`
  - paper: noon `Midday · The light is high and even.`, else `${Phase} · ${greeting(phase,'paper')}`
  - studio `${Phase}, ${HH:mm} · the board at a glance`
  - quiet `${Phase}.`
  - REF outputs: `Midday · Good afternoon, Rakesh.` / `Midday · The light is high and even.` / `Midday, 13:51 · the board at a glance` / `Time of day is off · Midday.` (Quiet, strength off).
- `firstName('Rakesh Gangwar')`→`Rakesh`; `initials('Rakesh Gangwar')`→`RG`.
- Preview counts from `app.board`: needs 4, working 0, queued 2.
  - Studio hero `4` (A3). Quiet `Needs your decision (4)`, `In progress (0)`, `Waiting to start (2)` (A5).
  - Daylight sky `Good afternoon`. Paper masthead `Developer Experience`, quote `**Dear Rakesh,** I stopped, and I’d rather ask than guess…`.
  - Studio `.pv-ar-sm` marks: stage1 n · stage2 n (A4) · stage3 n,b,b · stage4 n · stage7 d. Static per DLG, or derived from the board; both give the REF.
- **Accent copy:**
  - `ACC_ORDER = ['gold','moss','jade','teal','azure','cobalt','violet','plum']`.
  - Names: Gold, Moss, Jade, Teal, Azure, Cobalt, Violet, Plum.
  - Subs: gold `Same as the product colour`, moss `Leaf green`, jade `Superwitness’s colour`, teal `Blue-green`, azure `Sea blue`, cobalt `AgentPod’s colour`, violet `Supermessage’s colour`, plum `Superlibrary’s colour`.
  - First option: `Product colour` / `Gold, Superpipeline’s own` (value `product`, renders gold).
  - `OTHERS = [['Superlibrary','plum'],['AgentPod','cobalt'],['Superwitness','jade'],['Supermessage','violet']]`.
  - `accName(sel)` = `ACC_NAMES[acc] + (sel==='product' ? ' (the product colour)' : '')` → `Gold (the product colour)`. Eyebrow `Preview · ${accName}`.
  - Preview aria-label: `Preview of the accent ${accName} on the product mark, the page you are on, the selected tab, a link and the focus ring. The orange for a person needed now does not change.`
  - `clashNote(acc)`: when acc equals another product's colour → `${Name} is ${Product}’s colour too, so the two will look alike side by side. You can still choose it.` (e.g. `Plum is Superlibrary’s colour too, …`), else none. Shown as `p.ac-note[role=status]`.

Reconnect helpers (`dialogs/reconnect-copy.ts`)
- `RC_LEAD[vibe]`, verbatim:
  - daylight `Your sign-in ran out and we could not renew it quietly. Sign in and you will land right back on this card.`
  - paper `Your sign-in has expired, and it could not be renewed in the background. Once you sign in, you return to this card.`
  - studio `SESSION EXPIRED. Background renewal failed. Sign in to return to this card.`
  - quiet `You are signed out. We could not renew your sign-in. After you sign in, this card opens again.`
  - Off a card route: `this card` → `this page`.
- `returnBox(route, card, board)`:
  - card open → bold title, small `${board.name} · ${stageName}`. Fixture → `Diagnose Melissa and Anna Supermessage silence — trace actual failing hop` / `Developer Experience · Reproduce` (R10/R11).
  - no card → bold `board.name`, small = view label (`Board` / `Operate` / `Spend detail` / `Board settings`).
  - workspace → `Workspace` / tab label.
- `whatHappened(issuer)` = `Your sign-in with ${issuer ?? location.host} ended, so it could not be renewed in the background. Your place is saved: after you sign in, you come back here.`
- `reasonLine(r)` = `Reason: ${REASON_TEXT[r]} (${r})`: login_required `refresh refused`, no_refresh `no background renewal for this sign-in`, plane_unavailable `sign-in service unavailable`, unauthorized_after_renew `the session was refused after renewal`. Example: `Reason: refresh refused (login_required)`.
- Toast: `Signing you back in…` + sub `You stay on this card.` / `You stay on this page.` (D-16).

`lib/auth-recovery.svelte.ts` (unit-test the logic):
```ts
export type AuthRecoveryState = 'ok' | 'renewing' | 'expired';
export type RenewReason = 'login_required' | 'no_refresh' | 'plane_unavailable' | 'unauthorized_after_renew';
class AuthRecovery { state = $state<AuthRecoveryState>('ok'); reason = $state<RenewReason|null>(null); issuer = $state<string|null>(null);
  recover(): Promise<boolean>; /* single-flight; true = renewed */ noteUnauthorized(): void; }
export const auth: AuthRecovery;
```
Tests:
- concurrent 401s share one promise;
- `apiFetch` replays the request exactly once after `ok:true`;
- a second 401 after renew → expired with `unauthorized_after_renew`;
- login_required → expired with reason and issuer;
- 503 retried 3× at 5s, then expired with `plane_unavailable`;
- success keeps the route (no navigation);
- `reconnect.test.ts` unchanged.

NewCard copy (`dialog-copy.ts`):
- `NC_LEAD`:
  - daylight `Tell me in a sentence. An agent drafts the brief, and you can change any of it before it goes.`
  - paper `Describe it in a sentence. An agent drafts the brief, and you may change any of it before it goes.`
  - studio `One sentence in, a drafted brief out. Edit anything before dispatch.`
  - quiet `Describe the work in one sentence. An agent writes a draft brief. You can change all of it before you dispatch.`
- Kbd hint: `⌘ ↵ to dispatch` (non-Mac `Ctrl ↵`).
- Brief fixture text (typed by the harness):
```
Done looks like:
• The blocker is reproduced from a clean room and named in one sentence.
• A failing test lands first, with the red run attached as evidence.
• The fix turns that test green and changes nothing else.

Do not:
• Push to the Forge mirror or to GitHub without an approval.
• Close the card without the evidence link.
```

---

## 4. Component structure (shared screens: one component each, vibe differences via `:global([data-vibe=x])`; nothing added to `layouts.ts`)

**CSS port rule.** The REF `.fg` CSS is the reference sheet. Selectors there are `:where(.fg) [data-vibe="x"] …` / `:where(.fg)[data-vibe="x"] …`; in the app they become `:global([data-vibe="x"]) …`, because vibe/theme sit on `<html>`. `.art :focus-visible` / `:where(.fg) :focus-visible` becomes `.sp-dlg :focus-visible`. Text helpers (`.eyebrow .dlg-title .muted .small .mono .link .rule .wrap`) are scoped under `.sp-dlg`, in `dialogs/dialog-base.css`. Studio = Annual report block (DLG §0.2): REF Studio files contain it in the dialog block.

REF dialog CSS (from the comment `/* ---- the dialog ---- */` to `</style>`):

| file | Daylight lines | Studio lines |
|---|---|---|
| NewCard | 1158–1214 | 1296–1362 |
| Palette | 1158–1212 | 1296–1362 |
| Appearance | 1161–1405 | 1299–1543 |
| Move | 1158–1216 | 1296–1365 |
| BoardSwitcher | 1159–1222 | 1297–1375 |
| Reconnect | 1160–1233 | 1298–1376 |

Paper and Quiet files are the same block with their own vibe rules. DLG §1–§6 quote the same CSS verbatim, with these corrections: `.ap` top 20; `.bs` per-vibe left/top as in §1; `.toast-wrap` top per vibe; `.bs-anchor` rules use the canonical shell triggers (`.dy-switch`, `.mh-title`+`.mh-change`, `.ar-board .kick`+`.ar-sw`, `.qn-board`+`.qn-link`), not DLG's `.dl-board/.pp-change/.qt-link`.

| File (under `apps/web/src/lib/components/`) | Role | REF root/prefix | Notes |
|---|---|---|---|
| `dialogs/DialogFrame.svelte` (app-local stand-in for `vibekit:DialogFrame`) | `.sp-dlg-layer` (fixed, flex, `padding: var(--dlg-top) 16px 16px`) > `.scrim` + `section.dlg.sp-dlg` with `data-pixel="dialog"`; props `open, onClose?, role, labelledby, describedby, label, width, top, placement, anchor, radius, phone, initialFocus` | `.scrim`, `.dlg` | aria-modal; Tab trap; `.app-shell` gets `inert`; focus returns to the opener; Esc/scrim close unless `onClose` is absent. Widths/tops: NewCard 800/44 · Palette 700/84 · Appearance 1000/**20** · Move 640/36 · Reconnect 540/190 · Switcher anchored 520 (left = trigger-row left, top = row bottom + 8) |
| `dialogs/NewCardDialog.svelte` (replaces and deletes `shell/ComposeSheet.svelte`; mounted in `routes/b/[boardId]/+layout.svelte`) | head (eyebrow `New card`, BoardPickButton, IconButton `Close without saving`), h2#nc-title `What needs doing?`, lead, `textarea#nc-sentence` rows 2, `.nc-grid` (title `#nc-t`, brief `#nc-b` with hint `#nc-bh`, stage select `#nc-s`, project select `#nc-p`, due `#nc-d` + `Clear`, priority Segmented `None P1 P2 P3 P4`, labels + LabelPicker), `.nc-foot` | `.nc*` | **No `.nc-draftrow`, no `.nc-brief-tag`** (D-1 out of scope). Project options: `No project` then app.projects (N2: Building in public — Marketing & Community flow, Guild — Forge workspaces and checkpoint recovery, Marketing & Community — Melissa and Anna onboarding, SJL Active Portfolio, SJL Operating Baseline). Opened by `app.composeRequest++`, BoardHeader New card, palette actions, and key `N`. Store `composeSentence`, `requestCompose(sentence?)` |
| `dialogs/LabelPicker.svelte`, `dialogs/BoardPickButton.svelte` | listbox popovers (D-21) | — | not drawn; BoardPick reloads stages via `getBoard(id)`, does not navigate |
| `dialogs/CommandPalette.svelte` (replaces `components/CommandPalette.svelte`; in `routes/+layout.svelte`) + `palette-index.ts` | `.pal-in` (search icon, visually-hidden label, input `#pal-q` combobox, Clear IconButton `Clear the search`, `.kbd` esc), `.pal-count[role=status]`, `#pal-list[role=listbox][aria-label=Results]` > `div[role=group][aria-label=<Group>]` > `.pal-gh` + `.pal-item[role=option][aria-selected][data-selected]` | `.pal*` | **Render an empty `<span class="pal-meta mono"></span>` on every row**: REF does, and the empty flex item adds a gap. `.pal-enter` only on the selected row; chip only when needs. Agents rows use `.pal-ic.pal-ic--face` with a 28px face |
| `dialogs/AppearanceDialog.svelte` (replaces `shell/AppearanceDialog.svelte`) + `dialogs/VibePreview.svelte` + **new `dialogs/AccentPicker.svelte`** | head: h2#ap-title `Appearance`, p#ap-sub, IconButton `Close appearance`; fieldset Vibe (4 `label.vc.acc[data-vibe=<card vibe>][data-theme=<resolved>][data-accent=<acc>][data-checked]` with native radio `name=vibe`); **fieldset `Accent for Superpipeline`**; `.ap-row` (Light or dark Segmented, Time of day Segmented, location Switch, Sky readout `role=status`); foot | `.ap*`, `.vc*`, `.pv*`, **`.ac-*`, `.sw*`, `.pva*`** (REF Appearance l.1331–1391 Daylight) | Keep store logic (`set`, `flipLocation`, `locNote`, `tabStops()`). Vibe swatches are **5**: bg, surface, primary, **accent**, signal (Studio: bg, primary, stage-5, accent, signal) |
| `dialogs/MoveCardDialog.svelte` (mounted in board layout; `app.moveCardId`, `openMove/closeMove`) | eyebrow#mv-t `Move card`, `p.mv-card`, `p.mv-now#mv-now`, IconButton `Close without moving`; fieldset legend `Move to`, `.mv-list` of `label.mv-st[data-checked][data-here]` (native radio `name=stage`; current disabled; chip `Here now`; gate chip `Approval gate` with flag icon); `p.mv-then`; `.mv-keys`; `p.vk-visually-hidden[aria-live=polite]`; foot Cancel + primary | `.mv*`; rename REF `.st*` to `.mv-st*` | `CardMoveMenu.svelte`: the ⇄ button calls `app.openMove(card.id)`; delete its dropdown; keep `step()` (Alt+←/→). Key `M` on a focused card tile (CardTile, BoardPaper/Quiet/Studio rows, CardDrawer) |
| `shell/BoardSwitcher.svelte` (trigger only) + `dialogs/BoardSwitcherPopover.svelte` | Trigger per vibe = the canonical shell control, raised while open (`aria-expanded=true`, `aria-controls=bs-list`, class `bs-trigger`, `z-index:52`, `data-pixel="bs-trigger"`). Popover: `.bs-in` (label `Find a board`, placeholder `Find a board`, combobox, `.kbd` esc), `#bs-list[role=listbox][aria-label=Boards]` > groups > `a.bs-row[role=option][href][aria-selected][data-sel][aria-current]` (3 grid cells; **empty `<span></span>` middle cell when no chip**), `.bs-acts[role=group][aria-label="This board"]`, `.bs-foot` | `.bs*` | `.bs-acts` holds `This board:`, `Rename` (pencil), `Board settings` link (gear, `/b/{id}/settings`), and `Delete board…` (bin; S7, ink outline). **REF swaps them:** `.bs-del` (ink outline) sits on "Rename" and "Delete board…" is a plain `.link`. See §7. Foot: `↑ ↓ move ↵ open` + secondary `New board` |
| `dialogs/ReconnectDialog.svelte` + `dialogs/ReconnectToast.svelte` (both in `routes/+layout.svelte`) + `lib/auth-recovery.svelte.ts` + `apiFetch` in `lib/api.ts` | Dialog: `role=alertdialog`, `.rc-ic` lock, h2#rc-t `Sign in again to keep going`, p.rc-lead#rc-d (inline `margin-top: 8px`), `.rc-back` (card icon + small `You will come back to`, bold, small), `.rc-who` (`.bd-avatar` `RG` + `Signing in as <strong>Rakesh Gangwar</strong>`), `a.vk-button--primary.rc-btn` `Sign in again` (`href="/auth/login"`, onclick `reconnect()`, inline `text-decoration:none`), `<details><summary>What happened</summary><p>…</p><p class="mono" style="font-size:12px;color:var(--vk-color-faint)">Reason: …</p></details>`. Toast markup (DC): `<div class="toast-wrap"><div class="vk-toast" role="status"><span class="spin" aria-hidden="true"></span><span>Signing you back in… <span class="toast-sub">You stay on this card.</span></span></div></div>` | `.rc*`, `.toast-wrap`, `.spin` | `.toast-wrap` is `position:fixed; z-index:60; pointer-events:none` (`.vk-toast` auto). Top per vibe is **corrected to REF**: daylight 100, paper 262, studio 136, quiet 170 (DLG's 104/226/134/132 are void, R15). Silent state: no scrim, page interactive |
| `dialogs/dialog-copy.ts`, `who-picks-up.ts`, `relative-day.ts` (+ suggested `move-model.ts`, `switcher-model.ts`, `appearance-copy.ts`, `reconnect-copy.ts`) | pure | — | §3 |

**vibekit mapping** (DLG `vibekit:*` → vibekit-components.md §2.2; vendored 0.0.1 has only Face, Sky, StageTrack and `vk-button`, so build app-local, D-20):

| DLG name | vibekit row | mismatch |
|---|---|---|
| DialogFrame / Scrim | #34 Overlay (Dialog) | vibekit Dialog has `size sm/md/lg = 420/560/720`, padding `--vk-space-5`, a `--vk-scrim` token and different Paper/Studio forms. The REF needs free widths (800/700/1000/640/540/520), `top`, anchored placement and the per-vibe scrim colours. Mockup CSS wins. |
| IconButton | #9 IconButton | ok |
| Button | #8 Button | ok |
| Field / Select | #13 Field (`control='select'`) | REF uses vk.css `.vk-field__input` + `.nc-selwrap` chevron SVG |
| Segmented | #11 Segmented | REF renders `.vk-segmented` from the mockup's vk.css in every vibe; Appearance's checked item gets the accent wash |
| Switch | none | app-local |
| Kbd / KbdHint | #17 Kbd / none | vibekit Kbd's per-vibe forms differ from REF `.kbd` (Studio override only); REF wins |
| Chip | none (closest #28 StateLabel) | app-local `.chip/.chip--needs/--gate/--done` |
| Face | #30 Face (`AgentFace.svelte`) | sizes 20/24/28 |
| CommandList / CommandRow / SearchField | #16 CommandPalette / #15 CommandField | vibekit CommandPalette is one bits-ui Command component; the switcher listbox has no match |
| Toast | #35 Toast (`tone='busy'`) | REF spinner 18px vs vibekit 16px; Quiet REF draws a static spinner, vibekit draws "Working…" text |
| Sky | Sky | ok |
| (Move rows) | #14 Choice list-pick | REF `.st` rows differ; port REF |
| AppearancePicker (future, shared with Superlibrary) | none | app-local today |

---

## 5. States & behaviour

- **All frames:**
  - Esc closes, except Reconnect.
  - A scrim click closes, except Reconnect (expired: base `.scrim`, a click does nothing).
  - Focus is trapped, returns to the opener, and the app root is `inert`.
  - Focus ring is `.sp-dlg :focus-visible { outline: 2px solid var(--vk-color-text); outline-offset: 2px }`. With accent: REF uses `var(--ac-page, var(--vk-color-text))` where `.fg.acc { --ac-page: var(--vk-accent) }`.
  - 44px targets: `.icon-btn` 44, `.link` min-height 44, `.ap-switch` 44, `.mv-st` 56, `.bs-row` 46. Exception: `.nc-label button` is 32 and `.nc-addlabel` 34, so check them against the vibes.spec 44px rule (§7).
- **NewCard:**
  - Opens with focus on the sentence (prefilled from `initialSentence`).
  - Cmd/Ctrl+Enter dispatches. Dispatch is disabled while `title.trim()===''` and reads `Dispatching…` while saving.
  - Success closes; a different target board does not navigate.
  - Failure shows `<p role="alert" class="nc-where">{app.error}</p>` above the foot.
  - Cancel, ×, Esc and the scrim close without confirm, and state resets.
  - Changing the board resets the stage to the first stage and keeps labels and project.
  - `Clear` shows only when a due date is set.
  - The sentence has a permanent `box-shadow: var(--vk-focus)`.
- **Palette:**
  - ⌘/Ctrl+K toggles; opening resets q and selection 0 and focuses the input.
  - ↑/↓ wrap and `scrollIntoView({block:'nearest'})`. Hover selects. Enter or click runs `act`, then closes.
  - Esc clears a non-empty q, else closes. Clear × clears and refocuses.
  - With no board loaded, Cards is empty and Dispatch/Operate/Spend detail/Board settings are omitted.
- **Appearance:**
  - Every control applies at once via `appearance.set`. Picking a vibe resets the time strength when it was at the old vibe's default.
  - Radios use native arrows; Segmented uses a roving tabindex. `.vc:focus-within` outline. Done, ×, Esc and the scrim close.
  - **Accent:** radios `name=accent`. The `.sw[data-checked]` ring is `inset 0 0 0 3px text`, and the tick shows when checked. Selection applies `data-accent` app-wide (§7).
  - Checked Segmented item inside `.acc .ap`: `background: var(--vk-accent-wash); color: var(--vk-accent-text); box-shadow: inset 0 0 0 2px var(--vk-accent)`.
- **Move:**
  - Initial pick is the next stage, and focus goes to the checked radio.
  - Primary `await app.moveCard(id, pick.key)`. On success: announce, close, focus the card tile. On refusal: stay open with `<p role="alert" class="mv-then">{app.error}</p>` under the then box. `Moving…` while pending.
  - `.mv-st:hover` raised.
  - Keys line: `Alt`+`←``→` `moves one stage from the board` · `M` `opens this on a card` · `esc` `closes`.
- **Switcher:**
  - Opens with focus in the search and selection on the first row. ↑/↓ moves `data-sel`; ↵ does `goto('/b/'+id)` and closes; clicking a row navigates.
  - Esc, a scrim click or an outside click closes and returns focus to the trigger. **Do not close on focusout**, so the harness blur keeps it open.
  - The search is always shown.
  - Rename replaces `.bs-acts` with input `Board name` + `Save`/`Cancel` links; Enter saves, Esc cancels; existing `saveRename()` → `app.refresh()` + `app.loadBoards()`.
  - `Delete board…` uses the existing `onDelete()` confirm. New board closes the popover and opens `NewBoardDialog`.
- **Reconnect flow:**
  - `apiFetch` wraps every `/v1/*`, `/auth/me` and `/hub/*` call except `/hub/session`. On 401 it runs `await auth.recover()` and replays once.
  - `renewing` shows the toast and `POST /hub/session`. On ok: `getMe()`, `app.refresh()`, reconnect the socket. The page never navigates, and the drawer and any typed note survive.
  - `expired` mounts the alertdialog with no close and focus on `Sign in again` (`initialFocus:'.rc-btn'`). The user is retained (not nulled).
  - `visibilitychange`→visible polls `getMe()`; on success it closes and refreshes.
  - At boot, `getMe()` null → one silent `POST /hub/session`, else Landing.
  - Landing's sign-in calls `reconnect()` (one-line change). `setUnauthorizedHandler` → `auth.noteUnauthorized()`; the old "any 401 → signed-out" path is removed.
  - `.spin` stops under `prefers-reduced-motion` and in Quiet.
- **Signal rule:** only `chip--needs` (Waiting on you / N need you), `.pva-chip` and `.pva-bub` use signal. Inline errors use the raised box (`nc-where`/`mv-then` style), never signal (D-22). Accents are never orange.

---

## 6. Phone (390) — no SP artboard draws it (D-15)

- Below 600px, `phone:'sheet'`:
  - `.sp-dlg-layer { align-items:flex-end; padding:0 }`.
  - `.dlg { width:100%; max-height:100dvh; overflow-y:auto; border-radius: var(--vk-radius-lg) var(--vk-radius-lg) 0 0 }` (Studio 2px), plus safe-area bottom padding.
  - Grids `.nc-grid`, `.nc-row2`, `.ap-row` become 1 column; `.ap-vibes` becomes `repeat(2,minmax(0,1fr))`; footers wrap.
  - Palette `.pal-list { max-height: calc(100dvh - 160px) }`.
  - Switcher becomes a sheet (not anchored).
- Reconnect uses `phone:'card'`: centred, `width: calc(100% - 32px)`, top 16px.
- `.ac-sec` (grid `1fr 320px`) and `.ac-grid` (3 cols) have no phone rule in any spec. Recommend 1 col / 2 cols (§7).
- Keep 44px targets and no side scroll (vibes.spec). No pixel baseline at 390.

---

## 7. Gaps / open questions

1. **Palette agents tie-break (D-7 / O-11 / MC Part 4).**
   - Problem: with q=`agent` every agent is a group-only match. API order (`created_at`, `catalog.ts:732`) yields research-ray, optimizer-ollie, writer-quill, strategy-sam, but the REF draws error-eric, tester-tim, devops-dave, vulnerability-victor. No stated rule produces that order, and the coordinator has not chosen one.
   - Options:
     - (a) a palette-only rank key, e.g. recency of activity, with fixture timestamps chosen to yield the order;
     - (b) reorder `created_at` (this changes the Workspace-Agents order, which O-11 forbids);
     - (c) mask the Agents group's 4 rows until decided.
2. **Accent is unspecified outside the REF and ACC.**
   - Missing decisions:
     - persistence (per product, "on this device": sub text says the accent "belongs to Superpipeline alone", so not in the shared `vk_appearance` cookie; suggest a host-only cookie such as `sp_accent=product|gold|…` read by the app.html HEAD_SCRIPT, so `data-accent` and class `acc` sit on `<html>` before first paint, and head-script.test.ts must cover it);
     - token home (vibekit tokens release vs app.css; 8 accents × 4 vibes × 2 themes, plus Studio stage-1..7 / stage-text / success overrides from ACC);
     - where the accent applies (mark, current nav, selected tab/segment, links, focus ring, Studio stages: the shell group's job);
     - the target of the `See every accent’s contrast` link (REF `href="Accent-Palette.dc.html"`, no app route).
   - REF sub text (overrides DLG's "Applies to Superpipeline on this device. Superlibrary offers the same four choices."): `Vibe, light or dark and time of day apply to every product on this device. The accent belongs to Superpipeline alone.`
   - REF Accent hint: `The accent marks this product: its mark, the page you are on, the selected tab, links and the focus ring. Each product keeps its own, so with one vibe everywhere you can still tell them apart. Accents are never orange: orange stays for <strong>a person is needed now</strong>.` followed by the link.
   - REF "others" line: `Your other products keep their own:` then `Superlibrary Plum`, `AgentPod Cobalt`, `Superwitness Jade`, `Supermessage Violet`.
   - REF preview (`.pva`): `Superpipeline` mark; nav `Plan` (on), `Operate` + bubble `4`, `Workspace`; tabs `Board` (on), `List`, `Projects`; `Evidence is ready. <span class="ac-link">Open in new window</span>`; `Done` button + `Waiting on you` chip; caption `Focus ring in the accent; the button stays ink; the orange stays for you.`; Studio only adds `.pva-ramp` (7 stage swatches) + `Stages, Reported to Shipped: one colour family from the accent.`
3. **Appearance dark** has no export, so it reports `missing-reference` (4 runs). Fix by exporting DC with theme=dark per vibe.
4. **NewCard draft region.** Recommendation: patch the REF (remove `.nc-draftrow`, `.nc-brief-tag`) rather than mask (§1). D-1 drafting is a follow-up.
5. **BoardSwitcher REF defect.**
   - The ink-outline `.bs-del` sits on `Rename`, while `Delete board…` is a plain `.link`. This contradicts S7: the destructive button should be the outlined one, with label "Delete board…".
   - Options: re-export the REF, or match it and mask `.bs-acts`. Recommend: implement S7 and mask `.bs-acts` until re-export.
   - REF `.bs-del` CSS: `display:inline-flex; gap:6px; min-height:44px; margin-left:auto; padding:0 14px; border-radius: var(--vk-radius-sm); background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: inset 0 0 0 2px var(--vk-color-text); font:600 14px/1`; Studio `background:transparent; box-shadow: inset 0 0 0 2.5px var(--vk-color-rule); border-radius:2px`.
6. **Move owner-face mood.** REF error-eric is `resting` (see §3 `ownerFace`). Confirm the rule, or mask the Reproduce row face.
7. **`lastActivityAt` source.** `boards.updated_at` is not bumped by card activity, so a real "last used" needs the DO or the catalog to bump it on writes (throttled), or a max over DO events. The fixture writes `updated_at` directly.
8. **Reconnect trigger.** The pixel run needs a dev-only `app.refresh()` hook. The DEV_AUTH stub cookie route (`superpipeline_plane_refresh=refused|slow`) serves API/e2e tests; the pixel suite uses `page.route`.
9. **Date input rendering.** `#nc-d` shows `2026-10-18` in Chromium's locale format. The reference page must render in the same locale as the app context (`en-GB`), or the field differs.
10. **Sub-44px targets** in NewCard: label remove 32px, Add label 34px (REF values). Either an exception in vibes.spec or a hit-area extension (`::after` 44px). Unruled.
11. **Out of scope / follow-ups:** D-1 drafts (API, socket event, MCP tool, drafting states "Drafting…" / "{drafter} is drafting…" / "No draft this time. Write the title and brief yourself, or try again.", per-field dirty flags); `vibekit:AppearancePicker` shared with Superlibrary; phone pixel baselines.
