# Digest — shared pages: Projects, Workspace·Agents, Workspace·Other, Board settings, Spend

Sources: `screens/operate-list-pages.md` (OL) L1–72 + L1786–4009; `mockup-corrections.md` (MC) group `shared` Part 1 / Part 2 / Part 3 / Part 4 + appendix; `fixtures-and-harness.md` (F) §A.2, §A.4.2–5, §A.5.7–9, §A.7.4, §B.2, §B.4; references `apps/web/e2e/reference/mockups/SP-{Projects,Workspace-Agents,Workspace-Other,Settings,Spend}-{Daylight,Paper,Studio,Quiet}.html` (checked by hand — they ARE the corrected state and win over OL text).

**Global corrections that overrule OL everywhere in these sections**
- corrected: clock `2026-10-11T08:21:00Z`, browser `timezoneId: 'Asia/Kolkata'`, `locale: 'en-GB'` (F §A.2/§B.4; DEFAULT_CLOCK `2026-10-11T13:51:00+05:30`). OL's "13:51Z, timezoneId UTC" is void. All "13:51" strings are IST renderings of 08:21Z. Board-log times stay UTC (`ts.slice(11,19)`).
- corrected: tenant `tnt_vibes`, owner `usr_b19776fac3c94df4`, ids from F §A (not `tnt_dev`/`usr_dev`/`prj_bip`/`card_…40df`/`failing-test`). Failing-test stage key is `test`.
- corrected: card 4605 (`card_05823a57e8224605`) is LIVE, `input-required` in `reproduce`, `state_since 2026-10-08T14:11:45Z`. DX = 7 live cards; **4 need you** (63ac, 4605, 58f8, 1dfc); workspace attention = 4; unread notifications 19.
- corrected: 22 agents (F §A.4.2 N1–22), 19 capabilities (12 declared + 7 inferred: testing, diagnostics, integration, api, release, security-review, marketing). OL's 17/14 (WA-G1/WA-G6/WO-G11) is void.
- corrected: one file per vibe (MC Part 3): each of the 5 shared artboards is now 4 fixed-vibe references (20 refs). Registry: 4 entries per artboard `{ artboard: 'SP-Projects-Daylight', vibes: ['daylight'], … }` etc.; the prop-vibe entries in F §B.2 are replaced (WC-7). Manifest sizes (w×h, all w=1440): Projects D 1311 / P 1412 / S 1494 / Q 1340; WS-Agents D 2950 / P 3052 / S 2900 / Q 2933; WS-Other D 3584 / P 3641 / S 3860 / Q 3629; Settings D 1967 / P 2074 / S 2083 / Q 1990; Spend D 1997 / P 2107 / S 2140 / Q 2020.
- corrected (MC Part 2): every shared artboard now wears its vibe's donor shell (`dy-*` / `mh-*` / `ar-*`+`bd` / `qn-*`/`sh-root`). The shell is out of scope here except the page-supplied values listed in §1.
- **Studio content is a different DOM** (MC Part 2 "Studio file must restyle its content with the `.ar` base"). The Studio references do NOT use OL's `.page/.panel/.vk-button` markup: roots are `main.pj-main` (Projects), `main.wa-main` (WS-Agents), `main.wo-main` (WS-Other), `main.st-main` (Settings), `main.sp-main` (Spend), built from `ar-hero`, `ar-sec` (`.hd > .no "01" + h2`), `ar-btn`, `ar-btn2`, `ar-ib`, `ar-in`, `ar-field`, `ar-hint`, `ar-st`, `ar-tbl`, `ar-lk`, `ar-sel`, `ar-ta`, `ar-q`, `kick`. OL's "one component, `:global([data-vibe=studio])` CSS" plan is therefore superseded for Studio: Studio needs its own markup per screen (or vibekit Mode-T templates that emit this DOM). Port Studio markup+CSS from the Studio reference files.
- Paper references: `<main class="page pp-page" id="main">` with `.pp-page { max-width: none; padding-left: 56px; padding-right: 56px; }`. Quiet references: `<main class="page" id="content" tabindex="-1">`. Daylight: `<main class="page" id="main">`.
- Count badges: `.count-signal { background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg) }`; Studio `.count-signal { color: var(--vk-color-primary-fg) }` (was `--vk-face-ink`) (VK §3.5) — corrected in every OL CSS quote below.
- Destructive buttons (Revoke, Remove stage): ink outline `background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: inset 0 0 0 2px var(--vk-color-text)`; Studio `background: transparent; box-shadow: inset 0 0 0 2.5px var(--rule)`.
- Faces everywhere: seed = agent **name** (WA-G7), mood face in every vibe.
- "Need you" count anywhere = `itemsFromBoard(board, agents).length` (= 4); `app.needsYou()` deleted or reimplemented as that (OL L1–72).

---

## 1. Screens covered

| Artboard (×4 vibes) | Route | Harness steps (exact roles/names) | hold / fulfil | Masks |
|---|---|---|---|---|
| SP-Projects-{V} | `/b/brd_134a0ddb6d434478?view=projects` | click summary "Project" (create panel) and first card's "Milestones" summary — reference has `details.panel[open]` and project 0's milestones `[open]` (PR-G2: app defaults both closed). Suggested: `p.getByText('Name it and, if you like, give it a target date.').click()` or `locator('summary').filter({hasText:'Project'})`, then `locator('summary', {hasText:'Milestones'}).first().click()` | `hold: ['**/v1/projects/*/rollup']` → **reference = loading state** (all 5 cards "Loading rollup…") | none needed (ph-note not in DOM; only its CSS rule remains) |
| SP-Workspace-Agents-{V} | `/workspace/agents` (opened with DX board as `app.boardId` via localStorage `superpipeline.boardId`) | `getByRole('button',{name:'Actions for writer-quill'}).first().click()` → `getByRole('menuitem',{name:'Issue a token'}).click()` → `getByRole('button',{name:'Actions for analyst-echo'}).first().click()` → `getByRole('menuitem',{name:'Edit agent'}).click()`. corrected: super-chotu's menu is **closed** (MC #11; OL's 3rd step dropped). | — | `.tokbox` text (app shows the real random `spa_…` token in full, WA-G4; reference shows `spt_` + 32 `•`). Registry's old `C-07` header mask (0,0,1440,120) is void after the shell correction. |
| SP-Workspace-Other-{V} | **`/workspace/review`** (dev/e2e-only composite, WO-G15) — F §B.2's `/workspace/needs-you` cannot produce 5 half-width panels | Review route seeds the drawn state via `initial` prop (resume form open with text). Optionally prove the real path on `/workspace/needs-you`: click row 4's `Resume`, fill textbox "Note for the agent" with `The commit is on the branch now. Pick up from the handoff step.` | — | none after correction (reference already 4 rows oldest-first, 19 caps, "that agent", "after you add it") |
| SP-Settings-{V} | `/b/brd_134a0ddb6d434478/settings` | (1) clock at **13:49 IST (08:19Z)**; (2) `getByRole('button',{name:/^2\s*Reproduce/})` — i.e. click the Reproduce `<summary>`; (3) in textarea "Standing rule for this stage" append " x", blur, remove " x", blur (2 real PATCHes → `ruleSavedAt` set); (4) `page.clock.fastForward('02:00')`; wait for "Rule saved · 2 min ago". The registry only has step (2) — add (1)(3)(4). | — | none: corrected reference is pristine ("Saved", Save pipeline `disabled`, SE-G3 resolved) |
| SP-Spend-{V} | `/b/brd_134a0ddb6d434478/operate/telemetry` | none (window "Last 7 days", log collapsed to 8, raw disclosure closed) | none (zero branch = real data: no `usage_records`) | none |

**Workspace-Other "panels" mode** (F §B.2 `mode: { kind:'panels', ref:'section.panel', app:'[data-pixel="workspace-tab-panel"]', count: 5 }`): the 5 panels are the tab panels **Needs you, Labels, People, Connections, Capabilities** (Agents excluded). Reference DOM order: D/P/Q `section.panel[aria-labelledby=nt-h]`, `lt-h`, `pt-h`, `cn-h`, `section.panel.span2[aria-labelledby=ct-h]`; **Studio** uses `section.ar-sec` (not `.panel`) in order `nt-h, ct-h, lt-h, pt-h, cn-h`. Each app panel root must carry `data-pixel="workspace-tab-panel"`. Harness bugs to fix: `renderApp` screenshots `locator(panel).first()` for every i — must be `.nth(i)`; `ref` must be `section.ar-sec` for Studio (or a per-vibe ref selector), and the app's nth order must match each vibe's reference order. Alternative: drop panels mode and full-page diff `/workspace/review`.

**Page values handed to the shell** (per vibe; shell digest owns the rendering):

| Artboard | here | section (Studio kick `Superpipeline · …`) | boardName | view | showing | Studio status bar left items |
|---|---|---|---|---|---|---|
| Projects | plan | projects | Developer Experience | projects (no Filter button) | `Projects group cards across boards. Filters don’t apply here.` | `5 projects` · `7 cards on this board` · `4 need you` (signal) · `synced 13:51`; tabs `Board` · `List 7` · `Projects 3`; studioSubRight `null` |
| WS-Agents | workspace | workspace | null (no switcher; Paper no `.mh-ed`; Quiet no 2nd `.qn-row`) | null | null | `Workspace · Agents` · `4 need you` · `synced 13:51` |
| WS-Other | workspace | workspace | null | null | null | `Workspace` · `4 need you` · `synced 13:51` |
| Settings | plan | settings | Developer Experience | null | null | `Board settings · Developer Experience` · `7 cards` · `4 need you` · `synced 13:51` |
| Spend | operate | spend | Developer Experience | null | null | `Spend` · `4 need you` · `synced 13:51` |

All Studio status bars: right side `⌘K commands` · `N new card`. Operate count: Daylight `.dy-count` "4" (sr ", 4 need you"); Paper "(4)" (sr " need you"); Studio `.ct` "4" aria-label "Operate, 4 need you"; Quiet "Operate (4 need you)". Daylight crew `<b>4 agents</b>3 wait on you`, faces tester-tim, coder-kai, error-eric (+ super-chotu counted, no face per O-12), title `tester-tim, coder-kai and error-eric wait on you; super-chotu queues the work`. Paper dateline `Sunday 11 October · in full daylight`.

---

## 2. API / contract rulings

### Server changes (b)

| Id | Field / endpoint | Exact TS type | Server computation | Screens | Fixture value |
|---|---|---|---|---|---|
| WA-G2 | `GET /v1/agents` → each agent gains `claimedCount`, `workingCount`; `AgentSummary` (contract + `apps/web/src/lib/api.ts` L56) gains both | `claimedCount: number; workingCount: number` | `claimedCount` = cards across the tenant's boards whose `delegateAgentId` = this agent and `state ∉ {completed, rejected}`, not archived (needs a per-board DO fan-out or a D1 mirror — not specified). `workingCount` = of those, `state = 'working'`. | WS-Agents rows + panel meta; (shell crew should use the same field) | Reference shows all 22 agents `Resting · nothing claimed` and "none working right now" ⇒ every agent must return `claimedCount: 0, workingCount: 0`. **Conflict**: 58f8 (tester-tim), 1dfc (coder-kai), 4605 (error-eric) are `input-required` — if their `delegate_agent_id` is set, the formula yields `Holding 1 card`. See §7 Q1. |
| SE-G1 | `BoardSnapshot.github.webhookUrl` (contract + `api.ts`; `GET /v1/boards/:id` snapshot builder) | `webhookUrl: string` (inside `github: { issueTrigger; webhookConfigured; triggerGrantCount; webhookUrl }`) | `` `${env.PUBLIC_APP_ORIGIN}/v1/boards/${boardId}/webhooks/github?tenant=${tenantId}` ``; `PUBLIC_APP_ORIGIN` wrangler var, dev/e2e = `https://app.superpipeline.dev`. Client falls back to the current `location.origin` formula when absent. | Settings (Payload URL `#gh-url`) | corrected: `https://app.superpipeline.dev/v1/boards/brd_134a0ddb6d434478/webhooks/github?tenant=tnt_vibes` |
| SN-G1 | `UsageSummary.byDay` (`apps/api` `computeUsage` + web type L312) | `byDay: Array<{ day: string /* YYYY-MM-DD UTC */; costUsd: number }>` | `SELECT substr(ts,1,10) AS day, SUM(cost_usd) AS cost FROM usage_records WHERE ts >= ? GROUP BY day ORDER BY day`, `?` = midnight UTC six days before today; **always 7 days, independent of `?window`**. Client zero-fills. Contract test: a record at `2026-10-09T12:00Z` appears under `"2026-10-09"`. | Spend chart | Fixture A (pixel): `byDay: []` |
| SN-G4 | `BoardDO.notify` emits `this.emit('notification', { kind, cardId, userId, body })`; contract `BoardEvent.payload.body?: string` for `type === 'notification'` | `body?: string` | body = the same string written to `notifications.body` | Spend board log labels | corrected (MC 4.2): every seeded `notification` event payload gains `body` = matching §A.5.8 body: 22:50:12Z 1dfc `Stuck 24h in Fix: …`, 22:25:12Z 58f8 `Stuck 24h in Failing test: …`, 09:55:20Z 63ac `Stuck 48h in Reported: …`, 14:11:50Z 4605 `Stuck 24h in Reproduce: … Next: resume it` |
| WA-G10 / SE-G9 | vibekit token change: `--vk-color-rule`, `--vk-face-ink`, Annual-report Studio fonts (Archivo / Azeret Mono / Newsreader) | vibekit `LookColors` field + 4 vibe files + `pnpm tokens` + tailwind map | new vibekit tarball | all Studio pages | — (do not add a fallback literal) |
| Dev fixture | `POST /v1/dev/fixture` + `BoardDO.importFixture` (F §A.9, G-04) writes events/notifications with historical `ts`; G-01 DEV_AUTH returns `users.name` | — | — | all | see fixture tables below |

**Already exists — no API work**: `CapabilityRecord.agentCount` / `boardCount` (`api.ts` L1209–1210; contract `primitives.ts` L181 boardCount subquery). `ProjectRollup { projectId; cardsTotal; cardsDone; cardsOverdue; costUsd; computedAt; partial; boardsUnanswered }` (`api.ts` L1324). `issueAgentToken(agentId, scopes?) → { token: string; tokenId: string; scopes?: AgentScope[] }` (POST `/v1/agents/:id/tokens`, body `{scopes}` only when narrowed). `listAttention() → { cards: StaleCard[]; boardsUnanswered: number }` (`GET /v1/stale?attention=1`). `getBoardEvents(boardId, limit)` (`GET /v1/boards/:id/events?limit=`, cap 500). `Notification { seq; kind; cardId; body; read; createdAt }`.

**`GET /v1/boards` counts**: not ruled in these sections. Spend "By board" needs only `app.boards` (id, name) — no counts. (Switcher counts belong to the dialogs/shell digest.)

### Client-only rulings (a)/(c) — do NOT add API work
PR-G1…G10 (Projects all client); WA-G3, G5, G6 (registry order, no `.sort()`), G7, G8, G9, G11, G12, G13, G14; WO-G1…G15 (incl. `AttentionItem.stageName` — client type in `attention/attention.ts`, filled from `StaleCard.stageName` / board stages); SE-G2 (`ruleSavedAt` client-side), G3…G8, G10…G18; SN-G2 (By board = client fan-out `Promise.allSettled(app.boards.map(b => getUsage(b.id, window_)))`; add `GET /v1/usage?window=` only if > 15 boards — out of scope), SN-G3 (label text only), SN-G5…G10; SN-G6 new client route `/b/[boardId]/operate/log` (no API change).

### Harness fulfilment bodies (O-10, WC-6 — kept as routes, not seeded)

**Projects `loaded` variant** (`fulfil` on `**/v1/projects/<id>/rollup`, status 200). Not the pixel reference (references are the loading state); use for a structural/variant test only. Body = `ProjectRollup`; corrected `computedAt: '2026-10-11T08:21:00Z'` (renders "as of 13:51" in IST; OL's 13:19Z and F's 07:49Z are void):

| projectId | cardsTotal | cardsDone | cardsOverdue | costUsd | partial | boardsUnanswered | expected text |
|---|---|---|---|---|---|---|---|
| `prj_34b48f840daa4309` (Building in public — Marketing & Community flow) | 9 | 4 | 0 | 3.10 | false | 0 | bar 44%, `4/9` cards done, `$3.10`, `as of 13:51` |
| `prj_23b93f2d16d54b27` (Guild — Forge workspaces and checkpoint recovery) | 7 | 2 | 1 | 1.85 | false | 0 | 29%, `2/7`, `$1.85`, `as of 13:51 · 1 overdue` |
| `prj_42ab5ec961104f65` (Marketing & Community — Melissa and Anna onboarding) | 5 | 1 | 0 | 0.40 | true | 1 | 20%, `1/5`, `$0.40`, `as of 13:51 · incomplete (1 board did not answer)` |
| `prj_fx_sjl_portfolio` (SJL Active Portfolio) | 12 | 12 | 0 | 9.70 | false | 0 | 100%, `12/12`, `$9.70`, `as of 13:51` |
| `prj_fx_sjl_baseline` (SJL Operating Baseline) | 8 | 8 | 0 | 4.15 | false | 0 | 100%, `8/8`, `$4.15`, `as of 13:51` |

**Spend `with spend` variant** (OL "Fixture B"). MC Part 3 removed the `data` prop / with-spend branch from the references (zero branch only), WC-6 keeps it as a harness route: `fulfil` on `**/v1/boards/brd_134a0ddb6d434478/usage*` (and the snapshot's `usage`, or seed `budget`), structural test only. Body (`UsageSummary` + `byDay`), ids corrected to F:
```json
{ "totalCostUsd": 14.20, "estimatedCostUsd": 0, "totalInputTokens": 1600000, "totalOutputTokens": 300000, "unpricedRecords": 2,
  "byModel": [ {"model":"gpt-5-codex","costUsd":10.90,"inputTokens":?,"outputTokens":?}, {"model":"kimi-k2","costUsd":3.30,"inputTokens":?,"outputTokens":?} ],
  "byAgent": [ {"agentId":"agt_fx_coder_kai","costUsd":6.10}, {"agentId":"agt_fx_tester_tim","costUsd":4.05}, {"agentId":"agt_fx_optimizer_ollie","costUsd":2.40}, {"agentId":"agt_fx_error_eric","costUsd":1.65} ],
  "byCard": [ {"cardId":"card_9ac2116a050858f8","costUsd":6.35}, {"cardId":"card_e10fb4fe39a91dfc","costUsd":4.90}, {"cardId":"card_691a65ff9894f83f","costUsd":1.80}, {"cardId":"card_ace250c9c25363ac","costUsd":1.15} ],
  "byDay": [ {"day":"2026-10-05","costUsd":1.20}, {"day":"2026-10-06","costUsd":3.40}, {"day":"2026-10-07","costUsd":0.80}, {"day":"2026-10-08","costUsd":2.90}, {"day":"2026-10-09","costUsd":4.10}, {"day":"2026-10-10","costUsd":1.00}, {"day":"2026-10-11","costUsd":0.80} ] }
```
(per-model token split unspecified — `?`; `estimatedCostUsd` unspecified — the 2 unpriced records have `estimated=1, cost_usd=0`). Board usage (snapshot `usage`): `{ totalCostUsd: 14.20, budgetUsd: 25, cardUsdCap: null, overBudget: false }`. Other boards' totals (fulfil each `/v1/boards/<id>/usage`): Editorial & Fact-Checking `brd_6a899b0f0d054046` 9.80, Agent Onboarding `brd_f47143722126442c` 3.15, Recurring Maintenance `brd_24280cb0c7614d36` 1.30, Production Releases `brd_2441b5578f704b93` 0.00. Expected text: `$14.20`, `of a $25.00 board cap · 57% used`, `$3.55`, `4 cards with spend in this window`, `1.9M`, `1.6M in · 0.3M out`, `2`, `Busiest: Fri 9 · $4.10`, bar heights 1.20→50, 3.40→141, 0.80→33, 2.90→120, 4.10→170, 1.00→41, 0.80→33; caps status `Board $25.00 · card none` (SN-G10).

---

## 3. Pure derivations (vitest)

### Projects — `apps/web/src/lib/components/plan/project-rollup.ts` (keep existing `formatAsOf`, `progressPct`, `rollupSegments`)

```ts
export interface ProjectGroup { state: ProjectState; label: string; id: string; projects: Project[] }
export const GROUP_ORDER = [
  { state: 'active', label: 'Active', id: 'g-act' }, { state: 'planned', label: 'Planned', id: 'g-plan' },
  { state: 'paused', label: 'Paused', id: 'g-pause' }, { state: 'completed', label: 'Completed', id: 'g-done' },
  { state: 'canceled', label: 'Canceled', id: 'g-cancel' } ] as const;
export function groupProjects(ps: Project[]): ProjectGroup[];   // only non-empty groups; within group server order (name ASC)
export function projectsSummary(ps: Project[]): string;
// `${n} project${n===1?'':'s'} · ` + non-zero groups in GROUP_ORDER as `${count} ${label.toLowerCase()}` joined ", " + "."; 0 → "No projects yet."
export function fmtTarget(iso: string | null): string;
// 'Target ' + d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric', timeZone:'UTC' }); null → "No target date"
```
| fn | input | output |
|---|---|---|
| projectsSummary | the 5 fixture projects | `5 projects · 3 active, 2 completed.` |
| projectsSummary | [] | `No projects yet.` |
| projectsSummary | 1 planned | `1 project · 1 planned.` |
| groupProjects | fixture | `[Active(3: Building…, Guild…, Marketing…), Completed(2: SJL Active Portfolio, SJL Operating Baseline)]` |
| fmtTarget | `'2026-10-05'` | `Target 5 Oct 2026` |
| fmtTarget | `'2026-10-09'` | `Target 9 Oct 2026` |
| fmtTarget | null | `No target date` |
| milestone date | `fmtTarget('2026-10-12').replace('Target ','')` | `12 Oct 2026` |
| progressPct | 4/9, 2/7, 12/12, 0/0 | 44, 29, 100, 0 |
| rollupSegments | guild rollup | `['2/7 cards done', '$1.85', 'as of 13:51 · 1 overdue']` (tz Asia/Kolkata) |

Constants: `STATE_LABEL = { planned:'Planned', active:'Active', paused:'Paused', completed:'Completed', canceled:'Canceled' }`; `HEALTH_LABEL = { 'on-track':'On track', 'at-risk':'At risk', 'off-track':'Off track' }`. Delete confirm: `Delete “{name}”? Its cards stay on their boards but will no longer show this project.`; failure `Couldn't delete “{name}” ({status})`.

### WS-Agents — `apps/web/src/lib/components/workspace/agent-status.ts`
```ts
export interface AgentStatus { mood: Mood; line: string }
export function agentStatus(a: AgentSummary): AgentStatus;
// workingCount > 0 → { mood:'working', line:`Working · ${claimedCount} claimed` }
// else claimedCount > 0 → { mood:'thinking', line:`Holding ${claimedCount} ${claimedCount===1?'card':'cards'}` }
// else { mood:'resting', line:'Resting · nothing claimed' }
export function agentsPanelMeta(agents: AgentSummary[]): string;
// half1 (WA-G3): k = agents with externalId !== null; k===n → "All linked to AgentPod"; k===0 → "None linked to AgentPod"; else `${k} of ${n} linked to AgentPod`
// half2 (WA-G2): w = agents with workingCount>0; w===0 → "none working right now"; else `${w} working right now`; joined " · "
```
| input | output |
|---|---|
| fixture (22 linked, none working) | `All linked to AgentPod · none working right now` |
| {claimed 0, working 0} | `Resting · nothing claimed`, mood resting |
| {claimed 1, working 0} | `Holding 1 card` |
| {claimed 3, working 1} | `Working · 3 claimed` |
| 3 of 5 linked, 2 working | `3 of 5 linked to AgentPod · 2 working right now` |

Other row strings: heading `` `${n} ${n===1?'agent':'agents'}` `` → `22 agents`; tokens `` `${n} ${n===1?'token':'tokens'}` `` → `5 tokens`, `1 token`, writer-quill after issue `3 tokens`; menu group eyebrow `5 tokens in use` / `1 token in use` / n=0 `No tokens in use`; rows `Token {i+1}` · `issued to {name}` · `Revoke` (aria-label `Revoke token {i} of {name}`, `title="tok_…"`), at most 2 rows collapsed then `and {n−2} more · ` + link `show all {n}` → research-ray `and 3 more · show all 5`, writer-quill `and 1 more · show all 3`; banner `{name}'s token.` / run-only `{name}'s run-only token.` (scopes present and not incl. `claim`); edit heading `Editing analyst-echo`; edit form aria-label `Edit {name}`; back link `Back to ${app.board.name}` / no board `Back to your boards` → `/`. Capability chip order = registry order from `getCapabilities()` (fixture `created_at` alphabetical ⇒ A–Z), then selected keys not in registry in order added. Unused chip (WA-G13): `data-unused` when `boardCount === 0` or not in registry → only `command` in fixture.

### WS-Other — `apps/web/src/lib/components/workspace/needs-row.ts`
```ts
export const WS_KIND_LABEL = { review:'Review', question:'Asked', blocked:'Blocked', 'repeated-failure':'Failing', refused:'Refused', 'sub-tasks':'Waiting', 'no-owner':'Unowned', failed:'Failed', budget:'Budget' };
export function chipClass(kind): 'chip-signal' | 'chip-line';
// chip-signal: review, failed, repeated-failure, blocked, refused, budget; chip-line: question, sub-tasks, no-owner
export function metaLine(item: AttentionItem): string;
// [item.boardName, item.kind==='no-owner' ? null : item.stageName, item.headline, age(item.ageHours)].filter(Boolean).join(' · ')
// age(h): null → omitted; <1 → "just now"; <48 → `${Math.floor(h)}h`; else `${Math.floor(h/24)}d`
export function clip(detail: string): { shown: string; long: boolean };
// length ≤ 140 → whole, no button. Else first sentence (up to first '.' followed by whitespace or end, '.' removed) + '…' when that sentence is 40–240 chars; else detail.slice(0,140).trimEnd() + '…'
export function sortOldestFirst(items: AttentionItem[]): AttentionItem[];
// ageHours desc, nulls last, ties by title A–Z
```
`attention.ts`: `AttentionItem.stageName: string`; `ownerless()` headline `` `nothing claims the ${stageName} stage` `` (was `Nothing claims stage ${stageKey}`).

| fn | input | output |
|---|---|---|
| metaLine | 63ac no-owner, age 70.5h | `Developer Experience · nothing claims the Reported stage · 2d` |
| metaLine | 4605 blocked, 66.2h | `Developer Experience · Reproduce · stopped and is waiting on you · 2d` |
| metaLine | 58f8 blocked, 33.9h | `Developer Experience · Failing test · stopped and is waiting on you · 33h` |
| metaLine | 1dfc blocked, 33.6h | `Developer Experience · Fix · stopped and is waiting on you · 33h` |
| sortOldestFirst | [58f8, 63ac, 1dfc, 4605] | [63ac, 4605, 58f8, 1dfc] |
| clip | 58f8 detail (first sentence 182 chars) | `Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim's station write access…`, long=true |
| clip | 1dfc detail (137 chars) | whole, long=false |
| clip | 4605 detail (first sentence ≈456 > 240) | `not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, w…` (mid-word cut is what the formula gives — MC appendix: change the formula, not the row) |
| chipClass | blocked / no-owner | `chip-signal` / `chip-line` |

NeedsYouTab: `headMeta = 'Oldest first. ' + (unanswered===0 ? 'Every board answered.' : `${u} ${u===1?'board':'boards'} did not answer.`)` → `Oldest first. Every board answered.`; product footer when u>0 `` `${u} ${u===1?'board':'boards'} did not answer; this list may be incomplete.` ``; n===0 → count `.count` `0` and `Nothing on any board is waiting on you.`

`capability-notes.ts`: `orphanNote(c, holders)` for `boardCount===0 && agentCount>0`: text `` `is held by ${listNames(holders)} but no board stage asks for it, so it lets ${holders.length===1?'that agent':'them'} claim nothing.` ``, link `Add a stage that asks for it` → `app.boardId ? /b/${id}/settings : '/'`, tail ` or remove it.` → fixture: **command** `is held by super-chotu but no board stage asks for it, so it lets that agent claim nothing.` `unstaffedNote(c)` for `agentCount===0 && boardCount>0`: `` `is asked for by ${n} ${n===1?'board':'boards'} but no agent holds it, so cards there wait for ever.` `` link `Give it to an agent` → `/workspace/agents`, tail `.`. `listNames`: `a` / `a and b` / `a, b and c`.

Other WS-Other formulas: `labelsHeading` `3 labels` (0 → `No labels yet`); `peopleHeading` `1 person`/`n people`; `capsHeading` `19 capabilities`; `agentCountText` `2 agents`/`1 agent`/0 → `No agent`; `holders(c) = agents.filter(a => a.capabilities.includes(c.key))` in getAgents order; caps rows sorted by key `localeCompare`; `initials('Rakesh Gangwar')` → `RG` (first letter of first + last word; single word → first two letters); `lastOwner(m) = m.role==='owner' && owners.length===1`; `ROLE_HELP = { owner:'everything, including people and deleting boards', admin:'also manages boards, agents and connections', member:'creates, moves and decides cards', viewer:'reads boards and cards, changes nothing' }`; `ROLE_HELP_TITLE[r] = `${Label}: ${ROLE_HELP[r]}`` → `Owner: everything, including people and deleting boards`; `ROLE_HINT[r] = `${Label}: ${ROLE_HELP[r]}.` + ' No email is sent — they sign in and find this workspace waiting.'` → `Member: creates, moves and decides cards. No email is sent — they sign in and find this workspace waiting.`; `similarText = `Similar to ${similar.join(', ')}. Routing matches names exactly, so two spellings are two capabilities; remove the new one if you meant an existing one.``

### Settings — PipelineEditor / GithubSettings (copy verbatim, OL §5)
```ts
const cardsPerStage = $derived(board.cards.filter((c) => !c.archivedAt)
  .reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.currentStageKey]: (acc[c.currentStageKey] ?? 0) + 1 }), {}));
const FIELDS = ['name', 'ownerKind', 'owner', 'requires', 'gate', 'wipLimit'] as const;
const norm = (s: Stage) => JSON.stringify(FIELDS.map((f) => s[f] ?? null));
const unsavedCount = $derived.by(() => {
  const saved = new Map(board.stages.map((s) => [s.key, s]));
  const keys = new Set(draft.map((s) => s.key));
  let n = 0;
  for (const s of draft) { const o = saved.get(s.key); if (!o || norm(o) !== norm(s)) n++; }
  for (const k of saved.keys()) if (!keys.has(k)) n++;
  const sameKeys = draft.filter((s) => saved.has(s.key)).map((s) => s.key);
  const savedOrder = board.stages.filter((s) => keys.has(s.key)).map((s) => s.key);
  if (sameKeys.join() !== savedOrder.join()) n++;
  return n;
}); // `instructions` excluded
function ownerLabel(stage: Stage): string {
  if (stage.ownerKind === 'agent') return `Agent ${displayAgent(stage.owner ?? '', app.agents)}`;
  const parts = stage.requires?.any ?? stage.requires?.all ?? (stage.owner ? [stage.owner] : []);
  if (parts.length === 0) return 'Agent with no capability set';
  return `Agent with ${parts.join(stage.requires?.any ? ' or ' : ' and ')}`;
}
function ago(at: number, now: number): string {
  const m = Math.floor((now - at) / 60_000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`;
}
const ghState = !board.github.webhookConfigured ? 'Not set up' : board.github.issueTrigger ? 'Opening cards from issues' : 'Connected · trigger off';
const ghStateClass = board.github.webhookConfigured && board.github.issueTrigger ? 'saved' : 'unsaved';
// ruleLine = stage.instructions?.trim() ? 'Rule: ' + stage.instructions.trim().replace(/\s+/g, ' ') : 'No standing rule'
// grantNote: triggerGrantCount === null → 'Saving carries your dispatch authority onto every card this trigger opens. Without it, no agent can claim those cards.'
//            else `Cards from this trigger may be dispatched to ${n} ${n===1?'agent':'agents'}. Save again to refresh that.`
```
| fn | input | output |
|---|---|---|
| cardsPerStage | fixture (7 live; archived 4828 in reproduce, 6281 in integrate excluded) | `{reported:1, reproduce:1 (4605), test:3 (58f8,f83f,481f), fix:1, shipped:1}` → summary lines `1 card`, `1 card`, `3 cards`, `1 card`, `0 cards` (integrate, signed-off), `1 card`. corrected: Reproduce `1 card` / `1 card here` (OL said 0) |
| ownerLabel | reproduce (owner diagnostics) | `Agent with diagnostics` |
| ownerLabel | integrate (requires any [integration, api, testing]) | `Agent with integration or api or testing` |
| ownerLabel | test / fix | `Agent with testing` / `Agent with code` |
| unsavedCount | pristine | 0 → `Saved`, Save pipeline disabled |
| unsavedCount | Fix WIP → 2 | 1 → `1 unsaved change`, summary `WIP limit 2` |
| ago | 120 s | `2 min ago`; 30 s `just now`; 125 min `2 h ago` |
| ghState | fixture (not configured) | `Not set up` (class unsaved, no icon) |
| ruleLine | reproduce | `Rule: Make the problem happen on purpose. Until it can be reproduced on demand, nothing after this stage can tell a fix from a coincidence.` (CSS ellipsis) |
| Pipeline meta | 7 stages | `7 stages a card moves through, in order. Open a stage to edit it.` |

### Spend — `apps/web/src/lib/components/operate/spend-format.ts`
`usd(n) = '$' + n.toFixed(2)`; `pctOf(a, max) = Math.round(a / max * 100)` (tile-1 clamp 100); `compactCount(n, unit?)`: `<1000 → String(n)`, `<1e6 → (n/1e3).toFixed(1)+'k'`, else `(n/1e6).toFixed(1)+'M'`; the in/out pair uses the unit chosen for the total (`compactCount(300000,'M')` → `0.3M`); `pluralCards(1)='card'` else `'cards'`; `barHeight = cost===0 ? 2 : Math.max(2, Math.round(cost/maxCost*170))`; `dayLabel(d)` = en-GB weekday short + UTC day → `Mon 5`; `dayRange(days)` → `Monday 5 to Sunday 11 October` (month once when shared, else `Monday 28 September to Sunday 4 October`, UTC); busiest = max, ties → latest day; all zero → `No spend recorded in these 7 days.`; else `Busiest: {dayLabel} · {usd}`; chart aria-label `Spend per day, Mon 5 $0.00, Tue 6 $0.00, Wed 7 $0.00, Thu 8 $0.00, Fri 9 $0.00, Sat 10 $0.00, Sun 11 $0.00`. 7 days = UTC dates ending today (`new Date()` UTC → 2026-10-05..11).
`shortId(cardId) = cardId.replace(/^card_/, '').slice(0, 6)`; `shortTitle(t)`: `w = t.split(' ')`; `n = w.slice(0,3).join(' ').length < 25 ? 4 : 3`; `w.slice(0,n).join(' ') + (w.length > n ? '…' : '')`.
`eventLabel(e)`: `cards.stale_digest` → `Stale-card digest sent`; `notification` → `'Notification: ' + lcFirst(head(payload.body))`, head = text before first `:`; no body → `'Notification: ' + KIND[payload.kind]` with `stale→stuck, overdue→overdue, failed→failed, blocked→stopped, gate→review needed, input→question asked, rework→sent back, reclaimed→run reclaimed, control-pair→not dispatched`, else the kind; `link.added` → `Link added`; `card.updated` → `Card updated`; `card.created` → `Card created`; `card.moved` → `` `Moved to ${stageName(payload.to)}` ``; other → sentence case with `.`/`_` → space (`gate.decided` → `Gate decided`). Raw row = `` `${e.type}${summary ? ' ' + summary : ''}` `` with existing `eventSummary(e)` (keys `cardId, agentId, to, from, name, reason, decision`, `k=v` joined `' · '`).

| fn | input | output |
|---|---|---|
| eventLabel | notification body `Stuck 24h in Fix: this stage…` | `Notification: stuck 24h in Fix` |
| eventLabel | body `Stuck 24h in Failing test: …` / `Stuck 24h in Reproduce: …` / `Stuck 48h in Reported: …` | `Notification: stuck 24h in Failing test` / `Notification: stuck 24h in Reproduce` / `Notification: stuck 48h in Reported` |
| eventLabel | notification `{kind:'blocked'}` no body | `Notification: stopped` |
| eventLabel | card.moved to `test` | `Moved to Failing test` |
| shortId | `card_e10fb4fe39a91dfc`, `card_9ac2116a050858f8`, `card_05823a57e8224605`, `card_ace250c9c25363ac` | `e10fb4`, `9ac211`, `05823a`, `ace250` |
| shortTitle | 1dfc / 58f8 / 63ac / 4605 titles | `Superpipeline: manual-delivery completion…` / `AgentPod: connector interface…` / `Fix the highest-severity blocker…` / `Diagnose Melissa and Anna…` |
| raw | link.added 23:05:00 | `link.added to=card_482b4aa0bdd6481f · from=card_9ac2116a050858f8` |
| raw | card.moved | `card.moved cardId=card_482b4aa0bdd6481f · to=test · from=reported` |
| compactCount | 1900000 / 0 / 950 / 1200 | `1.9M` / `0` / `950` / `1.2k` |
| tile 2 | n=0 | `—`, `0 cards with spend in this window` |
| log meta | 60 events | `last 60 events, newest first · times in UTC` (1 → `1 event`) |

BudgetCaps status: both null → `.unsaved` `No caps set`; else `Board {usd|none} · card {usd|none}`; 4 s after save `.saved` `Caps saved`. Validation `/^\d+(\.\d{1,2})?$/` and > 0; invalid hint `Enter an amount in dollars, like 25 or 12.50, or leave it empty for no cap.`; save failure `Could not save the caps ({res.status}). Nothing changed.`; busy `Saving…`.

---

## 4. Component structure

### vibekit name mapping (OL name → vibekit-components.md §2.2)
Button→#8 Button; IconButton→#9; Tabs→#10; Segmented / SegmentedControl→#11 Segmented; Field / Input / Select / Textarea→#13 Field; Checkbox→#14 Choice; Disclosure (incl. inline "Show all")→#19; Action menu (`.menu-pop/.mi`, OL keeps app-local)→#20 Menu; DataTable (`as:'list'`)→#21; AgentChip / AgentFaceStack→#29 AgentName + #30 Face; StatePill / Chip / ChipGroup / Count / SaveState / SaveStatus→#28 StateLabel (no Chip/Count/SaveState component; count badge per VK §3.5 — **mismatch**); ProgressBar / Meter→#40 Meter; Skeleton→#38 Loading; EmptyState→#37; Note→#36 Notice; Footnote→ none (#32 Footnotes is Studio-only footnotes — **mismatch**, treat as `.t-meta` product-local); Panel→ none (#33 SectionHeader is the head only; Studio `ar-sec` = SectionHeader) — **mismatch**; CopyField / CopyChip→#18 CopyId; FigureTile→#25 FigureRow; Studio page head `ar-hero`→#24 Hero / #23 PageHead; Avatar, Swatch, Code, Icon→ not in vibekit (product-local).

### Shared stylesheet
`apps/web/src/lib/styles/screen.css` (new; imported once from `app.css` after vibekit; all selectors under `.screen`, vibe branches `[data-vibe="x"] .screen …`): type scale `.t-h1/.t-h2/.t-h3/.t-eyebrow/.t-body/.t-meta/.t-num/.t-key` + per-vibe overrides, `.page`, `.panel`, `.panel-head`, `.panel-body`, `.sr`, `.iconbtn`, `.iconbtn:hover`, `.mono`, `.sec-head`, `.sec-head .state`, `.empty`, `.code`, `.row-form`, Studio `.t-h2/.panel/.input` overrides. CSS text: OL L1947–2001 (Projects) = L2229–2286 (WS-Agents Block A/B). Port from the references (Daylight files) as the authority.

### Projects
- `plan/ProjectView.svelte` — rewrite markup (keep `refresh`, `loadProjectDetail`, `addProject`, `removeProject`, `addMilestone`, `removeMilestone`, `rollups`/`rollupErrors`/`milestonesByProject`); delete `Button` import from `$lib/components/ui/button`, `healthColor()`, `fmtDate()`. No props. `app.projects = projects` after each refresh stays.
- D/P/Q markup: `main.page#main` (Paper `+ .pp-page`; Quiet `#content tabindex=-1`) → header (`p.t-eyebrow` `{board.name} · Plan`, `h1.t-h1` `Projects`, `p.t-body` `{projectsSummary} Each shows how many of its cards are done and what they cost.`) → `details.panel` create (summary `Button primary sm as=span` "+ Project" + `.t-meta` `Name it and, if you like, give it a target date.`; `form.createform[aria-label="New project"]` fields `np-name` "Project name" placeholder `e.g. Clean-room journey fixes`, `np-date` "Target date (optional)" type date; Create/`Creating…`, Cancel) → per group `section[aria-labelledby=g-act]` `.group-h` (h2 + `.count` neutral) → `.pgrid` (3 cols) of `article.panel.pcard[aria-labelledby=pj-{id}]` (h3.ptitle; state chip `.chip` (active) / `.chip-line`; health `.chip-ok`+check "On track"; calendar + `Target 5 Oct 2026` / `No target date`; rollup: error `.t-meta` `Rollup unavailable — {err}` (muted, PR-G10) / loaded bar+`<strong>4/9</strong> cards done`+cost+provenance / loading `.skel` + `Loading rollup…` `aria-busy`) → `.pfoot` (`details` "Milestones · none yet"|`· {n}`, `.mslist`, `form.msform[aria-label="Add a milestone to {name}"]` Milestone/Date/Add; trash `iconbtn` `aria-label="Delete project {name}"`) → Footnote `If a rollup fails, the card says “Rollup unavailable” with the reason instead of showing a number. Deleting a project asks first.`
- CSS: OL L1947–2065 (`.pgrid .pcard .ptitle .pfoot .msform .group-h .createform` + per-vibe), `.mslist` added; `.msform > .field:first-child { grid-column: 1 / -1 }` keep (reference authority).
- Studio: port `main.pj-main` from SP-Projects-Studio.html: `.ar-hero` (`span.big.ink` "5" aria-hidden + `.txt` kick/h1/p), `details.pj-new` (summary `span.ar-btn` Project + `span.ar-hint`; `form.pj-create` with `.ar-field/.ar-in`, `.pj-acts` `ar-btn` Create, `ar-btn2` Cancel), `section.ar-sec[aria-labelledby=g-act]` `.hd` (`span.no` "01", h2, `span.pj-n` "· 3"), `ol.pj-list > li.pj-row` (`span.pj-ix` "01.1", `.pj-name` h3.pj-t#pj-{i} + `.pj-meta` `.ar-st` (`span.u.act`) + `.pj-date`; `.pj-roll` `.pj-load[aria-busy] .pj-skel + p.ar-hint`; `button.ar-ib.pj-del`; `details.pj-ms` summary + `form.pj-msform`). Ids index-based (`pj-0`, `ms-0`, `md-0`).

### Workspace (shared by Agents + Other)
- `routes/workspace/+layout.svelte` rewrite: `<div class="screen"><main class="page" id="main">` → `WorkspaceHeader` → `WorkspaceTabs` → children; `current = page.route.id === '/workspace/review' ? 'needs-you' : page.params.tab`; description `REVIEW_DESCRIPTION` on review route; runs `workspaceCounts.refresh()` on mount.
- `workspace/WorkspaceHeader.svelte` `{ description }`: back link `a.t-meta` chevron-left 16 (inline-flex, gap 4, min-height 32), `p.t-eyebrow` `Workspace · shared by every board`, `h1.t-h1` `Workspace`, `p.t-body` muted max-width 70ch.
- `workspace/WorkspaceTabs.svelte` `{ current, counts }` → vibekit Tabs `as:'links'` `div.tabs[role=tablist][aria-label=Workspace] > a.tab[role=tab][aria-selected]` ×6: Needs you (`countTone:'signal'`, sr ` waiting on you`, only when > 0), Agents, Capabilities, Labels, People (`.count`), Connections (no count). Fixture: `4`, `22`, `19`, `3`, `1`.
- `workspace/workspace-counts.svelte.ts`: `WorkspaceTab` union; `WorkspaceCounts {needsYou,agents,capabilities,labels,people: number|null}`; `refresh()` = `Promise.allSettled([listAttention(), getAgents(), getCapabilities(), listLabels(), getMembers()])`; rejected → null (pill omitted, never 0).
- `workspace/workspace-copy.ts`: `WORKSPACE_DESCRIPTION` — agents `The agents that can claim cards on your boards. A card in a stage goes to an agent holding that stage's capability.`; needs-you `Every card, on any board, that is waiting on a person.`; capabilities `What agents can do, and which board stages ask for it.`; labels `The labels cards carry, shared by every board.`; people `Who can see and change this workspace.`; connections `The forge and the AgentPod fleet this workspace uses.`; `REVIEW_DESCRIPTION` `Every workspace tab, shown together for review: Needs you, Capabilities, Labels, People and Connections. (Agents has its own artboard.)`

### WS-Agents
- `workspace/AgentsTab.svelte` rewrite (keep `refresh, startEdit, saveEdit, onDelete, onIssue, onRevoke, onUnlink, mint`; call `workspaceCounts.refresh()` after mutations). Scoped `.banner`, `.tokbox`. Markup: `div.banner[role=status]` (key 22, `<strong>{name}'s token.</strong> Copy it now — it won't be shown again.`, `code.tokbox[aria-label="New token for {name}"]`, `Copy token` secondary (→ `Copied` 2 s, min-width fixed), `Done` quiet) → `section.panel[aria-labelledby=agents-h]` (`.panel-head`: h2 `22 agents`, `.t-meta` meta, `a.vk-button--primary.btn-sm[href=#new-agent]` "New agent" margin-left auto; `.panel-body.legend` 3 Footnotes: **Linked to AgentPod** — `this agent has an AgentPod identity, so it signs in as itself and its work shows under its own name.`; **Tokens** — `access keys it uses to reach this workspace. Revoke one from <em>Actions</em> if a station is retired.`; **Actions** — `edit, issue or revoke tokens, unlink, delete.` (corrected: trailing "(This used to be…)" dropped); `div.colhead.t-eyebrow[aria-hidden]` "" Agent Capabilities AgentPod Tokens span(min-width 116); `ul.alist`) → `section.panel#new-agent[aria-labelledby=new-h]` (h2 `New agent` + `.t-meta` `Creates the agent and issues its first token, shown once.`; `form.panel-body.new-agent-form` grid `minmax(0,1fr) minmax(0,2fr)`: Name `na-name` placeholder `e.g. tester-tim`, Capabilities `span.lbl#na-caps` + CapabilityChips + sr label "New capability" + input `na-new` 200px/36px placeholder `Add a capability`; `Create agent and issue token` primary).
- `workspace/AgentRow.svelte` `{ agent, status, onEdit, onIssue(scopes?), onUnlink, onRevoke(tokenId), onDelete }` → `li.arow` 6 cells: face 32 (seed name); `p.t-h3` name + `p.t-meta` status.line; `div.caps` `span.chip.chip-line` per capability (empty → `No capabilities — this agent can claim nothing`); `p.t-meta.linked` check16 `Linked to AgentPod` / `Not linked`; `p.t-meta.t-num` (color text) `{n} tokens`; `details.menu > summary.vk-button--secondary.btn-sm[aria-label="Actions for {name}"]` (min-width 116) "Actions " + `.disc-ico` chevron; `div.menu-pop[role=menu][aria-label="Actions for {name}"]`: `button.mi[role=menuitem]` pencil `Edit agent`; key `Issue a token`; key `Issue a run-only token` + `.t-meta` `can run cards, not change them`; link `Unlink from AgentPod` (only when externalId); `div.mi-group` eyebrow + `.tokrow`s + "and N more · show all N"; `button.mi.mi-danger` trash `Delete agent…`. **Every `.mi` needs `role="menuitem"`** (harness uses it). Revoke buttons: ink outline (corrected).
- `workspace/AgentEditRow.svelte` → `li.arow.arow-edit` face + `form.editgrid[aria-label="Edit {name}"]`: `Editing {name}`; Name `ed-name-{id}`; Cards at once number min 1 + hint `How many cards it may hold at the same time.`; Capabilities chips + `ed-newcap-{id}` + hint `Faint chips: no board stage asks for this yet, so an agent holding only it can claim nothing.`; Picture (optional) url placeholder `https://… leave empty to keep the generated face`; Save primary + Cancel quiet.
- `workspace/CapabilityChips.svelte` `{ selected (bindable), registry, id, labelledBy }` → `div.caps[role=group] > button.chip.pick[type=button][aria-pressed]` (pressed = check 14 + key). corrected picker: 19 chips A–Z `analysis api claim-check code command design diagnostics integration maintenance marketing onboarding planning release research resilience security security-review testing writing`; edit row pressed = analysis, claim-check; `command` gets `data-unused` (`color: var(--vk-color-faint)` on unpressed).
- `workspace/agent-status.ts` (§3). Block C CSS: OL L2342–2357 (`.editgrid .menu .menu-pop(width 430) .mi .mi-danger .mi-group .tokrow .banner .tokbox`) + DataTable reference `.alist .arow .arow-edit .colhead` L2363–2368 + responsive `@media (max-width: 899px)` L2404–2416.
- Studio: port `main.wa-main` from SP-Workspace-Agents-Studio.html (uses `ar-tbl`, `ar-btn2` ×62, `kick` ×23, `ar-lk`, `ar-in`, `ar-field`).

### WS-Other
- `routes/workspace/review/+page.svelte` (new) + `+page.ts` `export const load = () => { if (!(import.meta.env.DEV || import.meta.env.PUBLIC_E2E === '1')) error(404, 'Not found'); };` Markup: `div.grid2` > col1 `NeedsYouTab reviewTag="Needs you tab" reviewNote={NEEDS_REVIEW_NOTE} initial={…}`; col2 `LabelManager "Labels tab"`, `PeopleTab "People tab"`, `ConnectionsTab "Connections tab" reviewNote={CONNECTIONS_REVIEW_NOTE}`; `CapabilitiesTab "Capabilities tab" reviewNote={CAPS_REVIEW_NOTE} class="span2"`. Review notes verbatim: NEEDS `If a board does not answer, this line says so: “1 board did not answer; this list may be incomplete.”`; CONNECTIONS `Changing the forge host takes a host, not a URL: forge.example.com. When new fleet agents appear, they show here as pickable chips with a capability picker and “Add N”.`; CAPS `When a stage asks for a capability no agent holds, it shows here too, with a link to staff it.` `.grid2` 2 cols gap space-5; `.span2 { grid-column: 1 / -1 }`.
- `workspace/PanelTag.svelte` `{ text }` → `p.t-eyebrow.tabtag` chevron-right 14 + text.
- `workspace/NeedsYouTab.svelte` rewrite (keep `load()`/`resume()`); props `{ reviewTag?, reviewNote?, initial?: { expandedResume?, resumeText? } }`. corrected `initial` for review route: `expandedResume` = the **1dfc** (Superpipeline: manual-delivery…) item id, `resumeText: 'The commit is on the branch now. Pick up from the handoff step.'` Panel: h2 `Waiting on you, across every board` + `.count-signal` `4`; `.t-meta` headMeta; `Refresh` secondary (refresh icon; busy `Refreshing…`); `ol` of rows.
- `workspace/WorkspaceNeedsRow.svelte` `{ item, open, draft?, onToggleResume, onResume }` → `li.nrow` (grid 84px | 1fr): `span.chip.{chipClass}`; title `a.t-h3[href=/b/{boardId}/c/{cardId}]` inline `text-decoration: none; overflow-wrap: anywhere`; `p.t-meta` metaLine; detail `p.t-body` shown + `Show all`/`Show less` quiet (32px, `aria-expanded`); instruction `p.t-meta`; `.nacts` actions in `item.actions` order (`resume` primary `Resume` `aria-expanded`; `open` secondary `Open`; `review` primary `Review`; `answer` `Answer`; `log` `Open log` `?tab=attempts`; `staff` `Staff an agent` → `/workspace/capabilities`); `form.resume[aria-label="Resume this card"]` (`Note for the agent` textarea `rs-{id}` min-height 72 maxlength 8000; `Send back to work` primary (disabled blank/busy); `Cancel` quiet). Corrected rows (reference): 1 Unowned 63ac (actions: Open only), 2 Blocked 4605 (clipped, Show all, Resume+Open), 3 Blocked 58f8 (clipped), 4 Blocked 1dfc (whole detail, resume form open). Instructions: blocked `Read why it stopped, fix that, then resume it with a note the agent will read.`; no-owner `No agent works this stage and no review is asked for here, so it will sit forever. Move it to a stage someone works.`
- `workspace/LabelManager.svelte`, `PeopleTab.svelte`, `ConnectionsTab.svelte`, `CapabilitiesTab.svelte` rewrites per OL markup L2832–2916 (verbatim in OL; copy). Key strings: Labels meta `Renames save when you leave the field. “Inferred” means a card created it.`; `New label`/`Name`/`Add`; swatch aria `Colour of {name}`, `Colour of the new label`; remove `Remove label {name}`. People: role select options row Owner/Admin/Member/Viewer, invite Member/Viewer/Admin/Owner; `Invite by email` placeholder `name@example.com`; remove `Remove {name}` disabled+title `A workspace needs at least one owner`. Connections: `Connections` / `Where agents push code and where they come from.` / `Forge host`·`Where agents push branches`·`forge.superjackfruit.com`·`Change` / `AgentPod fleet`·`Where your agents run`·`Linked` (check, success text, corrected `title="fleet_vibes"`)·`Change` / `Add from AgentPod`·`Bring fleet agents in as workspace agents`·`Every agent in the fleet already has one here.`·`Connect to AgentPod` (shown whenever `hubConfigured`). Capabilities: h2 `19 capabilities`, meta `What agents can do. A board stage asks for one; an agent holding it claims the card.`; `.note` orphan for `command`; rows `.crow` (key + face stack 24 + count, `title="{agentCount} agents hold this · {boardCount} boards ask for it"`; description input `cd-{key}` placeholder `Add a description`; `.caps` implies chips (`implies analysis` on claim-check with 28px × `Remove implies {to}`), `no board asks` (command), `inferred` (title `Nobody defined this — it turned up in use`) on the 7 inferred, `Implies…` quiet (aria `Add an implied capability to {key}`); trash `Remove {key}`); add form `Add a capability` placeholder `e.g. diagnostics`, hint corrected `If the name is close to one you have, a “similar to …” hint appears after you add it.`
- Face stacks (corrected): analysis predictor-paul+analyst-echo; api api-alan; claim-check analyst-echo; code optimizer-ollie+coder-kai; command super-chotu; design artistic-lyra; diagnostics error-eric; integration integration-ian; maintenance cleaner-cody; marketing message-melissa; onboarding onboarding-olivia; planning strategy-sam+project-manager-pete+controller-casey; release devops-dave; research research-ray; resilience chaos-charlie; security threat-hunter-theo; security-review vulnerability-victor; testing tester-tim; writing writer-quill. Use vibekit Face (OL's `AgentFace agentId=…` must be seeded by name).
- CSS: OL L2672–2762 (`.nrow .nacts .resume .crow .stack .swatch .lrow .me .kv .grid2 .span2 .tabtag` + responsive). Hook classes `.member`, `.invite`. Keep inline styles (beat Quiet `a { underline }`).
- Studio: `main.wo-main` from SP-Workspace-Other-Studio.html: 5 `section.ar-sec` in order needs-you, capabilities, labels, people, connections; needs-you is an `ar-tbl` table with caption `Cards waiting on you across every board, oldest first`, columns `No.`/`Kind`/`Card · where`/`Why`/`Actions`, row numbers `01`–`04`.

### Settings
- `routes/b/[boardId]/settings/+page.svelte`: drop `p-3` wrapper and `← Board`; `{#if app.board}<BoardSettings board={app.board} onChanged={() => void app.refresh()} />{:else}<div class="page"><p class="t-meta" role="status">Loading board settings…</p></div>{/if}`.
- `BoardSettings.svelte` rewrite (props `{ board, onChanged }`): `.screen > .page` → head (back `Back to the board` → `/b/{id}`; eyebrow `Board settings`; h1 `{board.name}`; `Each section saves on its own. Budget caps live in <a href="/b/{id}/operate/telemetry">Operate → Spend</a>.`) → `.cols` (1.45fr | 1fr): left `NameSection` + `PipelineEditor`; right `ScheduleList` + `GithubSettings` + `AgentProfiles`. Imports `settings/board-settings.css` (global, `.screen`-scoped; OL L3194–3233 + responsive L3245–3255; plus corrected `.stage-body .code { overflow-wrap: normal; }`).
- New `settings/NameSection.svelte`, `settings/PipelineEditor.svelte`, `settings/StageRow.svelte` (props `{ stage, index, total, cards, savedAt, now, agents, onMove, onRemove, onOwner, onMatch, onRule }`, `<details class="stage">`, ids suffixed `-{key}`), `settings/GithubSettings.svelte`, `settings/AgentProfiles.svelte`; restyle `board/ScheduleList.svelte` (logic unchanged; `priority: number|null`). Markup verbatim in OL §3.1–3.6 (L3280–3430). No `<style>` blocks; stop importing `lib/components/ui/button`.
- Key strings: `Name`/`Board name`/`Rename` (`Renaming…`, disabled when not dirty → disabled in reference); state `Saved`/`Unsaved change`; `Pipeline`; `Save pipeline` (`Saving…`); stage summary `{n}` `.num`, name, owner chip (`A person` person-icon / `Agent with …` agent-icon, `chip chip-line`), `Approval gate` (filled `chip`, Signed off), `.sumrule`, `{cards} card(s)<br>no WIP limit`; open body: `Stage name`, `Key` + `.code` + `fixed — cards, runs and gates refer to it`, `Who works this stage` seg `A person`/`An agent`, `Capability` + hint `Comma-separated. Agents holding it claim cards here. Saves when you leave the field.`, single-cap hint `With two or more capabilities, choose “needs all” or “any one” here.`, `WIP limit` min 0 placeholder `No limit`, `Approval` checkbox `Approval gate — a person approves before a card leaves this stage`, `Standing rule for this stage`, `Rule saved · 2 min ago`, foot `Move earlier` (disabled at 0, aria `Move {name} earlier`), `Move later`, `1 card here`, `Remove stage` (aria `Remove stage {name}`; corrected: ink outline, **disabled** since Reproduce holds 4605), hint `A stage holding cards cannot be removed until they are moved; the last stage cannot be removed.`; `Add a stage` placeholder `Stage name` `Add` (enabled even when empty), hint `A stage's key is made from its name and can't change later. To rename a key, add a stage and remove the old one.`; Schedules `Cards that open themselves on a cadence.` empty `No recurring cards on this board yet. Each one you add lists its cadence, time zone, target stage, next and last run, and who set it up, with Pause and Remove.`, form `aria-label="Add a recurring card"` (Card title `e.g. Weekly dependency check`; Cadence `daily at 09:00`; Time zone `e.g. Asia/Kolkata`; Opens in stage `First stage (Reported)` + others; Priority `e.g. 2`; If the previous card is still open `Skip this one`/`Open another anyway`; `How to write a cadence` details; `Add schedule`; empty-submit error `Give the card a title, a cadence and a time zone.`); GitHub (github 22, `Not set up`, 3 steps, `Payload URL` copyfield + `Copy`, `Secret · not set` placeholder `Generate or paste a secret`, `Generate`, `Copy` (disabled, aria `Copy secret`), checkbox `Open a card for each new GitHub issue`, grant note, `Save GitHub settings`); Agent profiles (`Named run settings (model and so on) an agent can claim with.`, `No profiles yet.`, Key `e.g. opus-careful`, Model `Model name`, `Add`).
- Studio: `main.st-main` from SP-Settings-Studio.html (`ar-sec`, `ar-field/ar-in/ar-sel/ar-ta`, `ar-btn/ar-btn2`).

### Spend
- `routes/b/[boardId]/operate/telemetry/+page.svelte`: drop `p-3` wrapper and `← Operate`; body `<Telemetry />`.
- `Telemetry.svelte` rewrite: root `<div class="screen sn"><div class="page">` (D/P/Q reference uses `main.page#main`); `.sn-head` (back `Back to Operate` → `/b/{id}/operate`; eyebrow `Operate · spend, in detail`; h1 `Agent spend`; sub `{board.name} · what agents cost, by day, agent, board, model and card.`; Segmented `aria-label="Time window"` `Last 7 days`/`Last 5 hours`) → `.tiles` 4 `.panel.tile` (`Spend vs budget` `$0.00` bar `aria-label="0% of budget used"` + `No budget cap set · ` + `<a href="#caps">Set a cap</a>`; `Average cost per card` `—` `0 cards with spend in this window`; `Tokens` `0` `0 in · 0 out`; `Unpriced records` `0` `Usage records without cost data`) → `section.panel[aria-labelledby=day-h]` `Spend by day` + chart `.chart/.col/.b(.zero)/.days` → `.grid2`: By agent (`aria-label="Spend by agent"`), By board (`all your boards`), By model, Top spenders · by card (`aria-label="Top spenders by card"`), `<BudgetCaps id="caps"/>`, Coming next → `<BoardLog/>`. Empty copies exactly as in OL Content map (verbatim, see reference text). State: `window_`, `usage`, `week` (= usage when 7d), `boardTotals`, `loading`, `usageError`, `events` (`getBoardEvents(boardId, 60)`), `eventsError`; `$effect` on `[app.boardId, window_]`.
- `operate/spend-format.ts` (new, §3). `operate/BudgetCaps.svelte` (new; `{ id?: string = 'caps' }`; reads `app.board.usage`, calls `setBudget`; fields `{id}-b` "Board cap" (corrected from "Board cap, per 7 days"), `{id}-c` "Card cap", `$` prefix, placeholder `none`, `inputmode=decimal`; `Save caps`; hint `The card cap draws the cost bar on each card. A card over its cap shows in Needs you. The same caps are editable from Operate → Spend.` / op-caps: `…editable from Spend, in detail.`). `operate/BoardLog.svelte` (new; `{ events, error, collapsedRows = 8, fullLogHref }`; `Board log`, meta, `Open the full board log` + chevron-right → `/b/{id}/operate/log`; `ol.log > li.lrow` time/label/card cell (link `t-meta` shortTitle with `title`=full + `button.idchip[aria-label="Copy card id {shortId}"]` `#{shortId}`); `Show all 60 events`/`Show the latest 8`; `details` `Show raw event names` with every loaded event raw). New route `operate/log/+page.svelte` (`getBoardEvents(id, 500)`, `collapsedRows={Infinity}`, `fullLogHref={null}`, back link `Back to Operate · spend`). `operate/Spend.svelte`: replace inline editor with `<BudgetCaps id="op-caps" />`.
- CSS: OL L3700–3790 spend-only blocks (`.tiles .tile .big .grid2 .chart .col .b .days .rrow .rrow.here .money .emptyp`; BoardLog `.log .lrow .time .idchip .raw`; BudgetCaps `.capform .money-in`) + responsive L3826–3835.
- Studio: `main.sp-main` from SP-Spend-Studio.html (`ar-sec` ×9, `ar-tbl`, `ar-sw`, `ar-hint`).
- `data-pixel` hooks: only `[data-pixel="workspace-tab-panel"]` on each of the 5 WS-Other panel roots.

---

## 5. States & behaviour (beyond the strings above)
- **Signal only for needs-you**: Needs-you tab count + H2 count `.count-signal` only when > 0 (0 renders nothing / `.count` 0); `Blocked` chips `chip-signal`, `Unowned` stays `chip-line` (WO-G4); rollup error, at-risk/off-track health, save errors (Settings `.note role=alert` neutral), "Rollup unavailable" are never signal. Write refusals in WS-Other and Spend validation use `--vk-color-signal-text` hints (`role=alert`). Spend tile-1 bar turns signal + ` · over the cap` only when `overBudget`.
- Projects: create panel default closed; `Create` disabled on empty/busy; Enter submits; Cancel clears; milestone disclosure native; Add `Adding…`; Remove `Removing…`; delete `confirm()`; list states `Loading projects…` / `No projects yet. Use “Project” above to add the first.` / `loadError` `role=alert`.
- WS-Agents: one menu open at a time; closes on Escape (focus back to summary), outside click, after item; Edit → one edit row, focus `#ed-name-{id}`; Issue → banner, menu closes, count +1; Revoke `confirm('Revoke this token? The agent loses access immediately, and this cannot be undone.')`; Delete existing confirm; Add a capability: Enter → `capabilityTag(value)` appended pressed; Save disabled saving/blank, `aria-busy`, error `p.hint role=alert` (`Saving failed ({status})`); New agent disabled until name + ≥1 cap; Loading (`agents === null`) heading `Agents` + Skeleton rows 3 h 64 + sr `Loading agents…`; load failed `Could not load the agents: {message}` + `Try again`; empty `0 agents` + `No agents yet. Create one below — you'll get a token to point an AI agent at this workspace.`; `.mi:focus-visible { outline: none; box-shadow: var(--vk-focus); }`, `.mi:hover` raised.
- WS-Other: one resume form open at a time (`openId`), focus textarea on open, Cancel keeps draft; Send → `refusalOf(await resumeCard(...))`, success closes + reload + `workspaceCounts.refresh()`; loading lines `Loading…`, `Loading labels…`, `Loading people…`, `Loading connections…`, `Loading capabilities…` (H2 count omitted until loaded); Needs-you load error `Could not load what is waiting: {message}`; label rename on blur, Enter blurs; remove label confirm `Delete the label "{name}"? Cards carrying it will drop it on their next edit.`; remove member confirm `Remove {name ?? email} from this workspace? They lose access on their next request.`; forge bad host `That is a host, not a URL — forge.example.com.`; Connect `Connecting…`.
- Settings: stages native `<details>`, several may open, none open on load; Save pipeline re-seeds draft after success (SE-G17); errors `Could not rename the board (${status}).`, `Could not save the rule for {name} ({status}).`, `Could not save the GitHub settings (${status}).`, `Give the profile a key.`, `Could not add the profile (${status}).`; Copy → `Copied` 1600 ms; Generate 24 random bytes hex; `now` ticks 30 s. Back link min-height 32 (44px audit must allow it).
- Spend: loading tiles `—`, panels `Loading spend…` (never $0.00 before data); usage error `Couldn't load spend — {usageError}. ` + `Try again`; events error `Couldn't load the board log` + message; no events `Nothing has happened on this board yet.`; idchip copies full id, text `Copied` 2 s + `aria-live=polite` sr `Card id copied`; `Set a cap` preventDefault + focus `#caps-b`.
- All: vibekit focus ring, no `outline: none`; 44px targets (`.btn-sm`, `.iconbtn`, `.mi`, summaries); one-line buttons (`white-space: nowrap`).

---

## 6. Phone (390) specifics
No phone artboards for these screens. Responsive rules only (not pixel-tested; `vibes.spec.ts` checks no side scroll + 44px): Projects `<1100px` 2 cols, `<700px` 1 col + stacked create form + `.page` 16px gutter. WS-Agents `<900px` (OL L2404): `.page` 16px, hide `.colhead`, `.arow` `32px 1fr auto`, caps/linked/tokens span 2/-1, `.editgrid`/`.legend`/`.new-agent-form` 1 col, `.menu-pop` `min(430px, 100vw-32px)`, `.tokbox` basis 100%. WS-Other `<1100px` `.grid2` 1 col; `<640px` `.nrow` 1 col, `.lrow.member`, `.invite`, `.kv` reflow; `<900px` `.crow` reflow. Settings `<1100px` `.cols` 1 col; `<600px` single-col forms, 16px gutters, copyfield wraps. Spend `<1100px` tiles 2 cols, grid2 1 col; `<600px` 16px gutter, capform 1 col, tight chart, `.lrow` `72px 1fr`.

---

## 7. Gaps / open questions
1. **claimedCount vs stopped cards** (WA-G2): reference draws every agent `Resting · nothing claimed`, but tester-tim/coder-kai/error-eric hold stopped (`input-required`) cards 58f8/1dfc/4605. Either the fixture's `delegate_agent_id` is NULL on those cards, or `claimedCount` must exclude `input-required` (or count only cards with an active claim/`current_run_id`). Recommend: decide in the API PR; the pixel fixture needs 0 for all 22.
2. **Studio DOM** is not the OL shared markup (§0) — each Studio screen needs its own template ported from the Studio reference; OL never specified it. Plan a per-vibe Studio component per screen (or vibekit Mode-T forms).
3. **WS-Other harness**: registry route `/workspace/needs-you` + panels mode `first()` cannot match 5 half-width review panels; use `/workspace/review`, `.nth(i)`, and a Studio ref selector `section.ar-sec` with Studio order (nt, ct, lt, pt, cn).
4. **Resume target**: F §A.7.4 says "open resume on 58f8"; corrected reference opens it on row 4 = **1dfc** (Superpipeline). Follow the reference.
5. **Labels colour**: corrected F stores `var(--vk-mood-thinking|done|working)` as `labels.colour` (no masks; swatches follow theme). OL WO-G6 assumed hex; `<input type="color">` cannot hold a `var()` value — the native picker's initial value is undefined for these rows. New-label default `#ffd9c2` stays.
6. **Settings harness steps**: registry lacks the rule-save PATCH dance and the 13:49 IST clock start; must be added (§1).
7. **Spend with-spend**: per-model token split and `estimatedCostUsd` unspecified; MC Part 3 says the branch is removed from references while WC-6 keeps the fulfilment — structural test only.
8. **Projects loaded** is not exported as a reference (all 4 refs are loading); loaded variant = structural test with the bodies in §2.
9. Studio sub-right on Projects view: left `null` (unresolved, MC appendix).
10. `AgentFace`/`Face` seed-by-name is cross-screen (WA-G7) — shell/board digests must agree.
11. Out of scope / follow-ups: `GET /v1/usage?window=` (SN-G2, > 15 boards); rolling-window billing cap (SN-G3 product decision); profiles delete route (SE-G7, none added); SE-G10 key-column design fix (corrected reference already carries `.stage-body .code { overflow-wrap: normal; }`); `CapabilityPicker` removal after stage editor ported; agent-drafted new card (D-1) out of scope.
