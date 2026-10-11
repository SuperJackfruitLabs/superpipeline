# Digest — card group, Paper + Quiet (drawer, page, states gallery, phone)

Sources: `screens/card.parts/20-paper.md` (P.0–P.8), `40-quiet.md` (Q.0–Q.7), `mockup-corrections.md` groups `card-drawer` / `card-page` / `states-phonecard` (Paper + Quiet rows, Part 4 additions, appendix), and the corrected references `apps/web/e2e/reference/mockups/SP-{Card,CardPage,Card-States,Phone-Card}-{Paper,Quiet}.html` (the source of truth; text below was checked against them).
Shared model (CardModel, registry, routes `/page` + `/dev/card-states`, §4 interactions, G-1…G-8, §7 amendments, §8 API index): see the shared-card digest. It is not repeated here; only Paper/Quiet deltas are listed.

**One-world overrides (apply everywhere below).**
- §7.1 per-artboard seeds are VOID: P-7, P-31, Q-F1, Q-F2, Q-F3, Q-27, `seedPhoneCard4605`, `card4605-desktop-*`, §A.7.1 and the D2 clocks.
- Card 4605 has one record, the phone-literal one. This is corrected wherever the spec quotes 3 criteria, a 4-step plan, PR #642/#648, 3 relates links, "Related prior work · Fixed", the "Melissa and Anna do not answer DMs" handoff, Fri 9 Oct, the 19:22/19:30 log rows, or "Project: none".
- Clock: 2026-10-11T08:21Z = 13:51 Asia/Kolkata. Ids: `brd_134a0ddb6d434478`, `usr_b19776fac3c94df4`, `agt_fx_error_eric`, stage `test`, `state_since 2026-10-08T14:11:45Z` (corrected from `brd_devx`/`usr_rakesh`/`failing-test`/`2026-10-09T19:41+05:30`).

---

## 1. Screens covered

| Artboard | Route | Viewport (manifest) | Strength | Steps / notes |
|---|---|---|---|---|
| SP-Card-Paper | `/b/brd_134a0ddb6d434478/c/card_05823a57e8224605` | 1440×3500 | strong | Open the drawer via the route. Mask the backdrop (see below). |
| SP-CardPage-Paper | same + `/page` (shell `bare`) | 1440×4011 | strong | none |
| SP-Card-States-Paper | panels: `STATE_PANELS` A–F | 1440×2225 | strong | Panels mode: ref `.ps-sheet` nth(i), app `[data-pixel="card-top"]` |
| SP-Phone-Card-Paper | drawer route at 390 wide | 390×3902 | strong | Default `archived=false`. The archived branch is a secondary variant and is not exported. |
| SP-Card-Quiet | drawer route | 1440×3712 | off | Mask the backdrop |
| SP-CardPage-Quiet | `/page` | 1440×4164 | off | none |
| SP-Card-States-Quiet | panels | 1440×2422 | off | ref `.qs-panel` |
| SP-Phone-Card-Quiet | drawer route at 390 | 390×4714 | off | default live |

Spec heights (2457, 2538, 2189, 2409, 3287, 2272) are stale. Use the manifest.

Registry changes forced by the corrections (WC-2, WC-4, WC-5):
- Drop `variants: ['card4605-live', 'card4605-desktop-*']` and the per-screen `clock`.
- Panel B route becomes the Guild Operations & Automation board `brd_af3fde184dd84d90`, card "Guild Operations & Automation fixture card 1" (stage `build`, elicitation `elc_fx_guild1`). The card id is synthesized by §A.6.5. Its variant goes; it is base world.
- Panel A is base world: R&I `card_42269e99036f42ae` is live, with `gate_fx_p4` pending and `options_json = DEFAULT_GATE_OPTIONS` (3 options).
- Panel D is base world: Melissa `card_f180b1627c594b41` finished Thu `2026-10-08T13:56:34.688Z`.
- Panel C: `card_e1eb201927f94506`, already archived 9 Oct.
- Panel E: R&I card plus the 409 fulfil.
- Panel F: 4605 with `**/cards/card_05823a57e8224605/attempts` and `…/activities` held open.

Panel E steps, per vibe:
- **Paper**: `getByRole('radio', { name: /^Approve/ }).check()`, then `getByRole('button', { name: 'Send reply' }).click()`. The 409 shows the alert. The reference has Approve checked and no field error, and no note field in `part='reply'` (P-14, §7.6).
- **Quiet**: the reference draws Request changes checked, the label "Say what needs to change", the field error `Request changes needs a note.` and the alert. A working order:
  1. check Approve;
  2. click `Submit decision` (409, alert);
  3. check `Request changes`;
  4. click `Submit decision` (needNote error, no request).

  This only works if the alert survives a later local validation (see gap X-6).

Masks:
- Drawer backdrop `C-08`. The registry's hand rectangle `{x:0,w:380}` (Paper) and `{x:0,w:800}` (Quiet) is wrong for these layouts. The Paper sheet is centred, 780 wide, so its left edge is at 330. The Quiet panel is `min(1120px,100%)`, so the board keeps 320px.
  - Recommendation: Paper masks the region outside `.pp-sheet`, per P-6 (`mask: [page.locator('[data-board-root]')]`). The reference backdrop is a stand-in `.pp-front`/`.pp-cols` with the `mh` shell and must still show the corrected 7-card text.
  - Quiet masks `x:0, w:320`. The Quiet reference draws the full `header.qn` shell and the Quiet DX board; mask it unless BoardQuiet matches.
- No other masks. The "Live" dot under the Quiet backdrop shell is covered by the backdrop mask.

## 2. API / contract rulings used by Paper/Quiet

| Id | Field / endpoint | TS type | Server source | Used by | Fixture value |
|---|---|---|---|---|---|
| API-5 (P-4) | `AgentSummary.role` on `GET /v1/agents` | `role: string \| null` | agent profile display role (`agents.role`) | Paper signature "Diagnostics, attempt 2"; phone "diagnostics, on Reproduce" | `agt_fx_error_eric.role = 'Diagnostics'`. Null falls back to "agent". |
| API-4 (P-5, Q-12) | `GateOption.description?: string` (contract `GateOptionSchema`, stage gate `options[].description`) | `description?: string` | pipeline template gate options / `gates.options_json` | Paper ChoiceList hints; Quiet radio descriptions (cell A) | `gate_fx_p4` approve: `File the recommendation as it is.`. The other two have no description, so each vibe uses its own role copy (§3). |
| API-3 (P-25, Q-21) | `Card.queuedGrantOwner: string \| null` | principal id | recorded at queue time from the token subject (`cards.queued_grant_owner`) | Phone Paper + Quiet "Queued by … on Rakesh Gangwar's grant · 32 agents may be dispatched."; Quiet phone "super-chotu, on Rakesh Gangwar's grant" | `usr_b19776fac3c94df4`. **Corrected count rule:** count all `queuedGrant` entries (32 `prn_…`), not the `agt_` prefix. |
| API-8 (Q-24, P-28) | `Card.createdAt: string` in the snapshot serialisation / web `Card` | ISO | `cards.created_at` (DO column exists; snapshot JSON already carries `createdAt`) | handoff-empty sentence "…queued by super-chotu on 8 Oct…" (all 8 screens) | 4605 created 8 Oct |
| API-1 (G-1) | `resolveGate` 409 | shared | shared | cell E both vibes | Harness fulfil body is `{"error":"already_decided","decidedBy":"Rakesh Gangwar","decidedVia":"matrix","decidedAt":"2026-10-11T07:32:00Z"}`. That does not match the API-1 shape `{error:{code:'GATE_ALREADY_DECIDED',decidedBy,decidedAt,via}}` (gap X-5). Text: `This gate was already decided from Matrix by Rakesh Gangwar at 13:02.` |
| API-2 (P-16) | archive cancels pending gates | shared | — | cell C both vibes | Seeded directly: gate `status='canceled'` (sic), `resolved_at = archived_at = 2026-10-09T05:30:00Z` |
| API-7 (S-3, needed here too) | `Attempt.endedAt` | `string \| null` | `runs.ended_at` | Paper "stopped at 19:41 Thu 8 Oct", page "sent back at 12:11"; Quiet "stopped at 19:41 on 8 October" / "sent back at 12:11 on 8 October" | run 2 ended 14:11:43Z (19:41 IST); run 1 ended 06:41Z (12:11 IST) |
| Outcome word | `run_fx_4605_1` is `outcome='completed'` + `completion.ok=false` | — | Derive client-side, or seed `outcome='sent_back'` (open choice) | "sent back" / "Sent back" everywhere | Spec P.2 `OUTCOME_WORD.rejected_completion`; derive `sentBack = outcome==='completed' && completion?.ok===false` |

Fixture rows the world must add (Part 4; no API change):
- 4605 `activities`:
  - `run_fx_4605_2` seq 1 `action='Started'`, body `Rework run on this card session; read prior persisted evidence first.`, 13:20Z (18:50 IST);
  - seq 14 `type='response', signal='stop'` (verb "Stopped"; "0 errors" holds), 19:41;
  - `run_fx_4605_1` seq 1 `action='Sent back'`, body `The board refused completion: repro and observed were missing.`.
- 4605 attempt 1 `failure_reason='repro and observed missing'`.
- `handoff_json` NULL.
- 4605 `spec_json` uses the phone keys: `description`, `acceptanceCriteria` (5), no `plan`, `groups`, `rework`, `requiredEvidence` (= the criteria array), `messageMelissa`/`audienceAnna` (`matrixId` + onboarding card `card_f180b1627c594b41` / `card_fa51f3d3e5e94ace`), `context`, `latestConfirmedGrant`, `scope`, `accountsIssues`, `repository` (`SuperJackfruitLabs/atelier`, `private`, policy URL `https://github.com/SuperJackfruitLabs/atelier/blob/main/AGENTS.md`), `routingRule`. Each clamped value = mockup text + a continuation.
- Project `prj_42ab5ec961104f65` "Marketing & Community — Melissa and Anna onboarding", no milestone.
- 5 `card_references` (GitHub blob URLs with `#La-Lb`).
- `BoardUsage.cardUsdCap` null.
- Card C `spec.description` = `Verify Super Chotu can dispatch Message Melissa. Produce a DRAFT three-sentence messaging brief for workspace operators about registering an agent.`
- Melissa `handoff_json = {"summary":"Melissa is resident. Her identity, router description and portrait are in place, and you credentialed her at the resident gate.","handedOn":"Profile, router description, safe profile and portrait drafted through this pipeline. No posting, DMs or scheduling without separate operator authorisation."}`, with no response activity. The Paper D letter comes from `summary`, and "Handed on" (both vibes) comes from `handedOn`.
- `gate_fx_p4` summary = the producing run's response `All done, ready for your review.`
- `approval_subjects.aps_fx_p4`: canonical `{kind, synthesis, sources:[…]}`, revision 2, digest `sha256:9f3ac2e1d07109285773f2418680752df16dbb42e26181bf657d331db98fcb84`.

**Client-only (a). No API work:** P-1, P-2, P-3, P-9, P-10, P-12, P-14, P-15, P-16, P-18, P-20, P-22, P-23, P-26, P-27, P-28, P-29, P-32; Q-1, Q-2, Q-3, Q-5, Q-6, Q-7, Q-8, Q-9, Q-10, Q-11, Q-16, Q-17, Q-25.
- Reference title/description come from `Reference.title` / `metadata.description`.
- The source line is derived from the URL.

## 3. Pure derivations

Paper helpers live in `card/paper-words.ts` (new). Quiet helpers live in `card/quiet-words.ts` (suggested) or `lib/when.ts`. "now" = 2026-10-11T13:51+05:30.

| Fn (suggested) | Rule | Examples → output |
|---|---|---|
| `paperLight(phase)` | `{dawn:'at first light', morning:'in the morning light', noon:'in full daylight', golden:'in the golden hour', dusk:'at dusk', night:'after dark'}` | noon → `in full daylight` |
| `paperDateline(now, phase)` | `` `${weekdayLong} ${d} ${monthLong} · ${paperLight}` `` | → `Sunday 11 October · in full daylight` |
| `paperDay(now, phase)` (phone) | `` `${weekdayLong}, ${paperLight}` `` | → `Sunday, in full daylight` |
| back-link label (Paper drawer) | `` `${boardName} · ${paperLight}` `` | → `Developer Experience · in full daylight` |
| `reTitle(title, kind)` | `'Re: '+title`; pending gate → `'Re: approval. '+title` | 4605 → `Re: Diagnose Melissa and Anna Supermessage silence — trace actual failing hop`; R&I gate → `Re: approval. P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix)`; Guild → `Re: Guild Operations & Automation fixture card 1`; C → `Re: Coordinator dispatch canary — Melissa` |
| `kicker(model, surface)` | needs-you → `A letter that needs a reply`; page → `` `A letter that needs your reply · ${ageWords}` ``; archived → `` `Archived on ${d monthLong}` ``; done → none | drawer/phone/cell → `A letter that needs a reply`; page → `A letter that needs your reply · 2 days` |
| `paperWhen(iso, now)` | today → `Today, HH:mm`; else `` `${weekdayLong} ${d} ${monthLong}, ${HH:mm}` `` | 4605 lead → `Thursday 8 October, 19:41`; gate A → `Today, 12:48`; Guild B → `Today, 07:40`; D → `Thursday 8 October, 19:26` |
| `roman(n)` | 1→I … 12→XII | 2 → `II`, 7 → `VII` |
| `numberWord(n)` | 1–10 words, else digits | 2 → `two` |
| `agentRole(agent, n)` | `` `${role ?? 'agent'}, attempt ${n}` `` | → `Diagnostics, attempt 2` |
| Paper signature line | `` `${agentRole} · ${paperWhen(lead.at)}` `` | → `Diagnostics, attempt 2 · Thursday 8 October, 19:41` |
| Phone Paper signature | `` `${role.toLowerCase()}, on ${stage} · ${paperWhen}` `` | → `diagnostics, on Reproduce · Thursday 8 October, 19:41` |
| `runsSummary(groups)` | `"{n} run(s)"` (+ ", both {w}" only if all outcomes are the same and n=2). **corrected:** run 1 = sent back and run 2 = stopped, so plain | → `2 runs` |
| Paper "What happened" summary | `` `${runsSummary} · ${decisions?n+' decision(s)':'no decisions'} · ${fmtUsd}` `` | → `2 runs · no decisions · $0.00`; phone adds attempts → `2 runs · 2 attempts · no decisions · $0.00` |
| `linkedSummary(counts)` | 0 → `no links`; all relates/advisory → `{n} related card(s)`; else `{n} linked card(s)` | drawer → `no links · no sub-tasks`; page (corrected) → `no related cards · no sub-tasks (0 open of 0) · 5 references · no related prior work` |
| "Attached" summary | `` `${refs} references · ${rel?…:'no related prior work'} · ${delivery?…:'no delivery'}` `` | → `5 references · no related prior work · no delivery` (phone: `5 references · no related prior work`) |
| "The brief" summary | `` `${crit} things to prove · ${rows} details · ${projectName?'project':'no project'}` `` (corrected: there is no plan clause when no plan) | → `5 things to prove · 10 details · project` |
| Paper deck (`PAPER_DECK`) | stopped: `` `${agent} stopped in ${stage} after ${numberWord(attempts)} attempts and has written to you. The brief, the record and the correspondence are enclosed below.` ``; question/review/working/done per P.4 | → `error-eric stopped in Reproduce after two attempts and has written to you. The brief, the record and the correspondence are enclosed below.` |
| Paper reply sub | `` `I stopped after ${numberWord(n)} attempt${s}. Send me back with what changed.` `` | → `I stopped after two attempts. Send me back with what changed.` |
| Paper stage track suffix | done `' · done'`; current `' · stopped here'` (needs) / `' · here'`; next `' · next'` | `I · done`/`Reported`, `II · stopped here`/`Reproduce`, `III · next`/`Failing test`, `IV`/`Fix` … `VII`/`Shipped` |
| Phone Paper track caption | `` `Stage ${i} of ${n} · ${stage}, where it stopped · then ${next}` `` (not needs: `, now`; last stage: no "then") | → `Stage 2 of 7 · Reproduce, where it stopped · then Failing test`; aria `Stage 2 of 7, Reproduce, stopped here` |
| Paper byline 1 | `` `agent for ${stage}, ran attempt ${n}` `` + (unclaimed ? ` · Unclaimed now`) | → `error-eric` + `· agent for Reproduce, ran attempt 2 · Unclaimed now` |
| Paper attempt line (drawer) | `` `Attempt ${n} · ${agent} · ${events} events · ${word}` `` + newest-only `` ` at ${HH:mm} ${EEE d MMM}` `` | → `Attempt 2 · error-eric · 14 events · stopped at 19:41 Thu 8 Oct`, `Attempt 1 · error-eric · 9 events · sent back` |
| Paper attempt line (page) | `` `${events} events, ${errs?…:'no errors'} · ${word}` `` (+ older: ` at HH:mm`) | → `Attempt 2 · error-eric · 14 events, no errors · stopped`; `Attempt 1 · error-eric · 9 events, no errors · sent back at 12:11` |
| Paper page log rows | `verb + ' ' + body`; stop row `Stopped. ` + P-26 copy; time HH:mm, last row adds ` · EEE d Mon` | `Started Rework run on this card session; read prior persisted evidence first.` / `18:50`; `Stopped. Blocked. Waiting on you; the reason is shown at the top of this card.` / `19:41 · Thu 8 Oct` |
| P-26 stop copy | a row whose body equals `lead.sentence` renders `Blocked. Waiting on you; the reason is shown at the top of this card.` | (both vibes, all surfaces) |
| P-27 row time (phones) | the first row of a run, or a row on a new day → `EEE d MMM`; same day as the previous row → `HH:mm` | run 2: `Thu 8 Oct`, `19:41`; run 1: `Thu 8 Oct` |
| `handoffEmpty(card)` (P-28) | `` `From ${firstStage}: queued by ${queuedByName} on ${d MMM(createdAt)} with the brief above. No earlier stage output.` `` | → `From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.` |
| Paper provenance (drawer) | `` `Asked by ${q} (an agent, allowed to dispatch the one working it). ` `` + handoff | → `Asked by super-chotu (an agent, allowed to dispatch the one working it). From Reported: queued by …` |
| Paper provenance (page) | `` `Asked by ${q}, an agent allowed to dispatch the one working it. ` `` + handoff | → `Asked by super-chotu, an agent allowed to dispatch the one working it. From Reported: …` |
| `grantSentence` (phones) | `` `Queued by ${q} on ${displayPrincipal(owner)}'s grant · ${n} agents may be dispatched.` `` | → `Queued by super-chotu on Rakesh Gangwar's grant · 32 agents may be dispatched.` |
| Phone attempt row | `` `${Word}: ${failureReason ?? 'waiting on you'}` `` | → `Sent back: repro and observed missing`, `Stopped: waiting on you` |
| Phone cost | `` `$${c} spent · ${est?…:'no estimate'} · ${cap?'card cap $'+cap:'no card cap set'}` `` | → `$0.00` + `spent · no estimate · no card cap set` |
| `refMeta(ref)` (P-29/Q-25) | `` `${provider} · ${repo} · ${basename} lines ${a}–${b}` `` from `/blob/<sha>/<path>#L<a>-L<b>` (en dash) | → `github · agentpod · inbound.ts lines 379–786`, `github · accounts · claims.ts lines 17–43`, `github · hermes-agent · server.py lines 818–883` |
| `requiredEvidenceWord(value, crit, heading)` (P-32/S-18) | a value deep-equal to `acceptanceCriteria` → `` `${n} items, listed under ${heading}.` `` | Paper (all), Quiet page, Quiet phone → `5 items, listed under Things to prove.`; **Quiet drawer → `5 items, listed under Acceptance criteria.`** (corrected) |
| Paper reference row (drawer) | title link + ` · ` + description, then the source line in `.pp-small` | |
| Paper reference row (page) | `Reference: ` + link + ` · ${desc} · ` + mono source | |
| Quiet reference row (drawer) | link + `, ${desc}` + source line | → `AgentPod v0.1.91 Matrix inbound bridge contract`, `, DM ingress → room lookup → Accounts identity/grant → ACP dispatch`, `github · agentpod · inbound.ts lines 379–786` |
| Quiet reference row (page) | link + ` (${source})` | → `AgentPod v0.1.91 Matrix inbound bridge contract (github · agentpod · inbound.ts lines 379–786)` |
| `whenLong(iso)` (Quiet) | `` `${weekdayLong} ${d} ${monthLong} at ${HH:mm}` `` | → `Thursday 8 October at 19:41`; D → `Thursday 8 October at 19:26` |
| Quiet `who` line | `` `${agent} stopped on ${whenLong} and wrote:` `` (failed → "failed", budget → "stopped at the budget") | → `error-eric stopped on Thursday 8 October at 19:41 and wrote:` |
| Quiet drawer meta | `` `Stage ${i} of ${n}: ${stage} · ${agentClause} · ${stateClause}` ``; no delegate → `` `Agent: none holding it (${last} ran attempt ${n})` ``; needs → `` `Waiting on you for ${ageWords}` `` | → `Stage 2 of 7: Reproduce · Agent: none holding it (error-eric ran attempt 2) · Waiting on you for 2 days` |
| Quiet page meta | `` `${stateClause} · Stage ${i} of ${n}: ${stage} · Attempt ${a} · Priority P${p} · ${due} · ${labels}` `` | → `Waiting on you for 2 days · Stage 2 of 7: Reproduce · Attempt 2 · Priority P3 · No due date · No labels` |
| Quiet page Stages list | before → ` (done)`; current → ` (stopped here)`/` (working here)`/` (archived here)`/` (finished)`; next → ` (next)` | `Reported (done)`, `Reproduce (stopped here)`, `Failing test (next)`, `Fix` |
| Quiet page People / Agent | `` `None holding it. ${agent} ran attempt ${n} of ${stage}.` `` | → `None holding it. error-eric ran attempt 2 of Reproduce.` |
| Quiet initials | first letters of first + last word | `Rakesh Gangwar` → `RG` |
| Quiet history line (drawer) | `` `Attempt ${n}, ${stage}, ${agent}: ${word} at ${HH:mm} on ${d MMMM}. ${ev} events, ${errs?…:'no errors'}.` `` newest first; word blocked→"stopped", sent back→"sent back" | → `Attempt 2, Reproduce, error-eric: stopped at 19:41 on 8 October. 14 events, no errors.`; `Attempt 1, Reproduce, error-eric: sent back at 12:11 on 8 October. 9 events, no errors.` |
| Quiet history (page) | h3 `Attempt ${n}, ${stage}, ${agent}`; p `` `${Word} at ${HH:mm} on ${d MMMM}. …` ``; newest run rows `` `${HH:mm} ${verb} ${body}` ``, stop row `Stopped: ` + P-26 copy | `Stopped at 19:41 on 8 October. 14 events, no errors.`; `18:50 Started Rework run on this card session; read prior persisted evidence first.`; `19:41 Stopped: Blocked. Waiting on you; the reason is shown at the top of this card.`; `Sent back at 12:11 on 8 October. 9 events, no errors.`; toggle `Show tool calls (all 14 events)` |
| Quiet attempts dd | oldest first `` `${i}: ${agent}, $${c}, ${word}.` `` joined by space | → `1: error-eric, $0.00, sent back. 2: error-eric, $0.00, stopped.` |
| Quiet cost dd | `` `$${c}, ${est?…:'no estimate yet'}` `` | → `$0.00, no estimate yet` |
| Quiet project dd | name + ` · ` + (milestone ?? `no milestone`) + `.` + link `Change project`; none → `None. ` + `Assign to a project` | → `Marketing & Community — Melissa and Anna onboarding · no milestone.` |
| Quiet sub-tasks dd | drawer `None.` + `Add a sub-task`; page `` `None (${open} open of ${n}).` `` | page → `None (0 open of 0).` |
| Quiet State dd (drawer) | needs → `` `${stateWord}, for ${ageWords}` `` | → `Waiting on you, for 2 days` |
| Quiet Agent dd (drawer) | no delegate → `None holding it. Last run: ` + face + name | |
| Quiet Asked by | `${q}` + `, an agent` + ` allowed to dispatch the one working it` | → `super-chotu, an agent allowed to dispatch the one working it` |
| Quiet phone meta | `` `Stage ${i} of ${n}: ${stage} · Agent: ` `` + face + agent + lead clause (stopped → `` `Stopped ${ageWords} ago` ``) | → `Stage 2 of 7: Reproduce · Agent: error-eric · Stopped 2 days ago` |
| Quiet phone lead | `` `${Verb}. Waiting for you. ${n} ${n===1?'try':'tries'} so far.` `` | → `Stopped. Waiting for you. 2 tries so far.` |
| Phone lead capitalisation (C-06, corrected Q-18) | phones capitalise the first letter at render; desktop shows the stored text | stored `not reproduced end-to-end: …`; phone → `Not reproduced end-to-end: …`; Quiet phone prefix `error-eric wrote: ` |
| Quiet phone State | live `Stopped, waiting on you`; archived `` `Archived (was ${live lower})` `` | |
| Quiet phone Agent (corrected Q-20) | `` `${last} (last run). Unclaimed.` `` | → `error-eric (last run). Unclaimed.` |
| Quiet phone In stage | `` `${stage} for ${ageWords}, attempt ${n}` `` | → `Reproduce for 2 days, attempt 2` |
| Quiet phone Stages | `` `${n} ${name}` `` + ` (done)`/` (here)`, joined `, ` | → `1 Reported (done), 2 Reproduce (here), 3 Failing test, 4 Fix, 5 Integrate, 6 Signed off, 7 Shipped` |
| Quiet phone disclosures | `` `Show the ${rows} fields of the brief` ``, `` `Show the ${n} things to prove` ``, `` `Show the ${n} references` `` | → `Show the 10 fields of the brief`, `Show the 5 things to prove`, `Show the 5 references` |
| Quiet phone headings | `` `Acceptance criteria (${n} things to prove)` ``, `` `Attempts (${n})` ``, `` `References (${n})` `` | → `Acceptance criteria (5 things to prove)`, `Attempts (2)`, `References (5)` |
| Phone run summary | `` `Run ${n} · ${stage}` `` / `` `${agent} · ${Word} · attempt ${n}` `` | `Run 2 · Reproduce` / `error-eric · Stopped · attempt 2`; `Run 1 · Reproduce` / `error-eric · Sent back · attempt 1` |
| Phone sub-tasks | `` `${open} of ${n} open.` `` + (n=0 ? ` No sub-tasks yet.`) | → `0 of 0 open. No sub-tasks yet.` |
| Phone reply sub (Paper) | `` `${word} · ${n} tries` `` | → `stopped · 2 tries` |
| Phone Paper `.sc` facts | lower-case | `Waiting on you`, `P3`, `no due date`, `no labels`, `in Reproduce 2 days`, `attempt 2`, `owner Rakesh Gangwar`, `asked by super-chotu`, `unclaimed` (no "Assign to me": corrected P-19) |
| Resume options (desktop) | this stage and earlier, in stage order | Paper drawer `1 · Reported`, `2 · Reproduce (this stage)`; Paper page `I · Reported`, `II · Reproduce (this stage)`; Quiet `Stage 1: Reported`, `Stage 2: Reproduce (this stage)` |
| Resume options (phones; corrected P-24/Q-19 → §8.2-2) | all 7; current suffix ` (where it stopped)`; 3–7 `disabled` | `1 · Reported`, `2 · Reproduce (where it stopped)`, `3 · Failing test` … `7 · Shipped` (disabled) |
| `sealOf(digest)` | strip `sha256:`, first4·next4 | → `9f3a·c2e1` |
| Paper digest | `` `digest ${digest.slice(0,15)}…` `` | → `digest sha256:9f3ac2e1…` |
| Paper cell line | `` `${board} · Stage ${i} of ${n}, ${stage} · ${review?'Awaiting your review':'A question'}` `` | A → `Research & Intelligence · Stage 5 of 6, Recommendation · Awaiting your review`; B → `Guild Operations & Automation · Stage 3 of 5, Build · A question` |
| Quiet cell meta A | `` `${board} · Stage ${i} of ${n}: ${stage} · Agent: ${speaker} · Waiting for your review since ${HH:mm}` `` | → `Research & Intelligence · Stage 5 of 6: Recommendation · Agent: research-ray · Waiting for your review since 12:48` |
| Quiet cell meta B | `… · Agent: ${agent} · Asked at ${HH:mm}` | → `Guild Operations & Automation · Stage 3 of 5: Build · Agent: optimizer-ollie · Asked at 07:40` |
| Archived C (Paper) | `` `Archived ${d} ${Mon}` `` + cancelled-gate sentence; line `` `${board} · Was at stage ${i} of ${n}, ${stage} · Owner ${owner}` `` | → `Archived 9 Oct`, `Its pending review was cancelled when the card was archived.`, `Marketing & Community · Was at stage 3 of 8, Messaging approval · Owner Rakesh Gangwar`; `Back to the board at Messaging approval.`; agent caption `Last worked it` |
| Archived C (Quiet) | sentence + always ` Nothing on this card waits for you.`; meta `` `… · Was at stage ${i} of ${n}: ${stage} · Last agent: ` `` + face + `` ` · Owner: ${owner}` `` | → `Its pending review was cancelled when the card was archived. Nothing on this card waits for you.`; `Returns it to Messaging approval.` |
| Cancelled-sentence rule | a gate with status cancelled/canceled and `resolvedAt` within ±60 s (P-16) or ±5 s (§8.1 API-2) of `archivedAt` | seeded resolved_at = archived_at → shown |
| Done D (Paper) | `` `${board} · Stage ${stage} · Priority P${p} · Owner ${owner}` ``; status `` `${paperWhen(stateSince)} · after ${n} attempts` ``; caption `` `Finished it · asked by ${q}` `` | → `Agent Onboarding · Stage Resident · Priority P2 · Owner Rakesh Gangwar`; `This is done.`; `Thursday 8 October, 19:26 · after 5 attempts`; `Finished it · asked by super-chotu` |
| Done D (Quiet) | `Completed`; `` `On ${whenLong(stateSince)}, after ${n} attempts.` ``; dl Finished by / Final stage `` `${stage}, ${board}` `` / Owner / Asked by / Handed on | → `On Thursday 8 October at 19:26, after 5 attempts.`; `Resident, Agent Onboarding` |
| Gate radio hints | `option.description` else per-vibe role copy | Paper: approve desc / changes `Needs a note; it threads into the next attempt.` / reject `Stop here.`. Quiet: approve desc (fallback `Move the card on as it is.`) / `Needs a note. The agent reads it on its next attempt.` / `Stop the card here.` |
| Quiet gate note label | `` `Note for ${speaker} (optional)` ``; changes selected → `Say what needs to change`; counter `` `${len} of 8192 characters` `` | → `Note for research-ray (optional)`, `0 of 8192 characters` |
| Paper gate note | label `Add a note (optional)` (needNote → `Say what needs to change`), placeholder `Recorded with your decision.`, counter `0 / 8192` | |
| Quiet A summary (corrected Q-11) | `` `${speaker}: ${gate.summary}` `` (null → `Waiting for your review.` without the prefix) | → `research-ray: All done, ready for your review.` |
| Quiet subject heading | `` `What you are approving (revision ${rev})` `` | → `What you are approving (revision 2)` |
| Quiet seal | `Sealed: ` + seal + `. You approve exactly this version.` + `Copy digest` · `View raw JSON` | |
| Paper seal | `` `Approving exactly this version, sealed ${sealOf}.` `` | → `Approving exactly this version, sealed 9f3a·c2e1.` |
| Subject rows | every canonical key, humanised; arrays joined | Kind `Recommendation, one paragraph`; Synthesis (verbatim); Sources `Organization plane cutover record, 7 Oct` (both vibes; corrected P-17/Q-14) |
| Detail clamp ("Show more") | see gap X-1 | Rework, Context, Scope, Accounts issues, Routing rule show `Show more`; Latest confirmed grant does not |
| Detail value "Who it is about" | `` `${matrixId} · ` `` + link `onboarding card` → `/b/brd_f47143722126442c/c/${onboardingCard}` | → `@agent_message-melissa:id.agentpod.dev · onboarding card` |
| Repository value | `` `${repo} · ${visibility} · ` `` + link `policy` | → `SuperJackfruitLabs/atelier · private · policy` |
| Quiet token regex (Q-3) | style only `/\b[a-z]+_[0-9a-f-]{8,}\b/` in `.qt-id` | 4605 → only `acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023`. Paper desktop uses G-3 (`event_id/room_id/timestamp`, `matrix-inbound/control-pair/ACP/matrix-outbound`, `matrix_rooms` are styled too); the phone uses `tokens:false` (P-22) |

Ages: `ageWords` floors days. 2026-10-08T14:11:45Z to 08:21Z on the 11th is 2.76 d → `2 days`.

## 4. Component structure

### Paper (class prefixes `pp-` drawer, `pg-` page, `ps-` gallery + cell-size leads, unprefixed phone under `.r`)
| File | Renders | Port CSS from |
|---|---|---|
| `lib/layouts.ts` | `CARD_LAYOUTS.paper = { drawer: CardPaper, phone: CardPhonePaper, width: 'min(780px, calc(100% - 32px))', align: 'center', placement: 'sheet' }` (§7.3) | — |
| `card/layouts/CardPaper.svelte` (rewrite) | `article.pp-sheet`. Order: `.pp-top` (back `<a class="pp-back" href="/b/{id}">` with preventDefault → onClose; "Open in new window" `target=_blank`; Close IconButton `aria-label="Close (Esc)"`), head (kicker + `h2#drawer-title` + 2 FactList lines), `hr.pp-rule`, `[data-section=error]`, then the letter or the Gate/Question/State block, `form.pp-reply` (h3#reply-h `Your reply`), `Enclosed` + 5 enclosures (The brief **open**, What happened, Who is waiting, Attached, Correspondence **open**), `.pp-foot` | `SP-Card-Paper.html` `.pp-*` (spec P.3 [app] block). [vibekit] blocks (`.pp-scrim/.pp-sheet/.pp-line/.pp-letter/.pp-enc/.pp-dl/.pp-meter/.pp-icon/.pp-copy`) belong to vibekit Paper sheets, not the app |
| `card/page/CardPagePaper.svelte` (new) | `div.pg-wrap`: `header.pg-mast` (`Superpipeline`, dateline, Appearance, account) → `nav.pg-sec aria-label="Card window"` → `section.pg-head` (kicker, `h1#pg-title`, deck, `.pg-track` StageStrip roman, `.pg-byline` 3 PersonRows, `.pg-line`) → `.pg-spread` (article "The letter" / section "Enclosed" I–III / aside "The record" IV + Accounts) → `footer.pg-colophon`. Enclosure V Correspondence sits in column one. | `SP-CardPage-Paper.html` `.pg-*` (P.4). **Add the P-11 breakpoint:** `@media (max-width: 1099.98px) { .pg-spread { grid-template-columns: minmax(0, 1fr); row-gap: var(--vk-space-6); } .pg-col { padding: 0; border-left: 0; } }`. Add `.pg-sc--bare` for the plan label (`border:0;padding:0;margin-top:var(--vk-space-2)`) |
| `card/states/CardStatesPaper.svelte` (new) | `div.ps` → h1 `Card states, in Paper` + `Each panel is the top of the letter. Vermilion appears only where a reply is needed now.` → `.ps-grid` of six `.ps-cell` (caption `.ps-label` + `article.ps-sheet` with `data-pixel="card-top"`) | `SP-Card-States-Paper.html` `.ps-*` |
| `card/gate/GatePaper.svelte` (rewrite) | props `{ boardId, gate, error, onResponse, agent, lead, vibe, size: 'sheet'\|'page'\|'cell'\|'phone', part?: 'all'\|'reply' }`. `all`: letter (AgentQuote letter) → subject Disclosure `Enclosed: the approval subject` + `· revision 2` (open, scroll body `tabindex="0" role="region" aria-label="The approval subject"`, max-height 19rem) → digest line → seal → reply (`Your reply`, ChoiceList legend `Your decision`, note Field, `Send reply`). `reply`: radios without hints, no note (cell E). Uses `GateDecisionModel` | `.ps-*` (cell); `.pp-`/`.pg-` letter sizes for sheet/page |
| `card/question/QuestionPaper.svelte` (rewrite) | letter + reply: label `` `Your answer goes straight back to ${agent}` ``, `Send answer` | `.ps-*` |
| `card/state/CardStatePaper.svelte` (new) | `kind: 'archived'\|'done'\|'loading'`, `size` | Banner `.ps-banner`, DoneBlock `.ps-done`, Skeleton `.ps-sk` (bars 55% / 30%×18px / 100% / 100% / 70%) + note `Opening the letter…` (`role="status"`, `aria-busy="true"` on the article) |
| `card/layouts/CardPhonePaper.svelte` (new) | `.r` (100% wide): sticky `.sh` (back `Developer Experience`, `Open as a page` same tab, Close + visible `Close`) → `header.head` (`.light` day, `.eye`, h2#drawer-title, `.trk` bars + caption) → [archived `section.arch`] → `article.paper aria-label="Letter from error-eric"` (letter + `.sc`) → sticky `section.reply` (live) → `section.encl` `Enclosed` (5 `.en` enclosures, all closed except Correspondence) → `footer.foot aria-label="Card actions"` | `SP-Phone-Card-Paper.html` (P.6 CSS verbatim; `.r{width:100%}`). The Sheet scroller sets `scroll-padding-top/bottom` to the sticky bar heights |

vibekit mapping (Paper). Spec name → vibekit-components.md:
- `Drawer`/`Sheet` → `Overlay` #34. **Mismatch:** it needs `placement:'sheet'`, `labelledBy`, `align`. #34 has `title` and `width` only.
- `IconButton` → #9.
- `CopyButton` → `CopyId` #18 (mismatch: name; the Paper form is an icon or an underlined "Copy").
- `StageStrip` → `StageTrack` #27 (needs `numerals:'roman'`, `labels:'all'|'none'`; Paper phone 3px bars).
- `FactList` → #22 (needs `variant:'smallcaps-line'`; #22 is a `<dl>` only).
- `AgentFace` → `Face` #30 (`variant:'portrait'`, sizes 28/32/36/40).
- `PersonRow` → none (AgentName #29 plus initials; gap).
- `AgentQuote` → #31 (needs `variant:'letter'`, `salutation`, `signature`, `size`, `tokens`; #31 lacks them).
- `Disclosure` → #19 (`variant:'enclosure'|'boxed'`, `toggleText` "Open"/"Close").
- `DefinitionGroups` → none (gap; FactList stack?).
- `Checklist` → none.
- `Meter` → #40.
- `RunRow` → none.
- `LinkList` → none.
- `Field` → #13.
- `ChoiceList` → `Choice` #14 (radio group; mismatch).
- `SubjectFrame`/`Seal` → none.
- `Alert`/`Banner`/`DoneBlock` → `Notice` #36 (tones needs/info/ok).
- `Skeleton`+`LoadingNote` → `Loading` #38.
- `EmptyState` → #37.

### Quiet (prefixes `qt-` drawer, `qp-` page, `qs-` gallery + leads, `qph-` phone)
| File | Renders | Port CSS from |
|---|---|---|
| `lib/layouts.ts` | `CARD_LAYOUTS.quiet = { drawer: CardQuiet, phone: CardPhoneQuiet, width: 'min(1120px, 100%)', align: 'end', placement: 'overlay' }` | — |
| `card/layouts/CardQuiet.svelte` (rewrite) | `.qt-top` (`← Developer Experience board` link that closes; Button frame `Open in new window` `target=_blank`; Button frame `Close` `aria-label="Close (Esc)"`), h2#drawer-title, `.qt-meta`, `[data-section=error]`, lead (`fieldset.qt-form` legend `Your decision is needed` → AgentQuote who line + reason + **`Copy session id`** (corrected row 4) + resume form; or GateQuiet/QuestionQuiet/CardStateQuiet), `.qt-cols` (CSS `columns: 2 380px`) of `.qt-sec` sections in this order: Details, Description, Acceptance criteria (no count), Plan, Brief details (10), History (2 runs), Decisions, Comments, Links (0), Sub-tasks/Project/Cost/Delivery, References and related prior work, Card actions | `SP-Card-Quiet.html` `.qt-*` (Q.1 app block). Write descendant rules as `:where(.qt) a` etc. `.qt-select-narrow{max-width:360px}`, `.qt-comment{min-height:80px}` |
| `card/page/CardPageQuiet.svelte` (new) | skip link `Skip to content` → `header.qp-bar` (nav `aria-label="Card window"`: `Superpipeline`, `Back to Developer Experience board`, `Appearance`, `Rakesh Gangwar — Sign out`, `Opened from Developer Experience · Back to the board`) → `main#content.qp-main`: meta row (`Card id 4605 · Copy`, `Copy link to this card`, `Edit card`), h1, `.qp-meta`, h3 `Stages` list, h3 `People` dl, `.qp-cols` (left: fieldset, Description, Acceptance criteria (5) `ol`, Brief details (10), Plan, Links (0), References…; right: History (2 runs), Decisions, Comments, Sub-tasks, project, cost and delivery, Card actions), footer p | `SP-CardPage-Quiet.html` `.qp-*` (Q.2). Add `@media (max-width: 899.98px) { .qp-cols { grid-template-columns: minmax(0, 1fr); } }`. Below 640 the page keeps one column (this contradicts §7.7, gap X-7) |
| `card/states/CardStatesQuiet.svelte` (new) | root `class="qs qs-gallery"`, h1 `Card states, Quiet`, `Each panel is the top of the card. Orange appears only where your decision is needed now. No motion.`, `.qs-grid` of `.qs-cell` (caption `.qs-label` + `section.qs-panel data-pixel="card-top"`: notice (C, D) → h2 → `.qs-meta` → lead) | `SP-Card-States-Quiet.html` `.qs-*`. Rename the gallery root rule to `.qs-gallery`; lead roots carry `class="qs"` |
| `card/gate/GateQuiet.svelte` (rewrite) | radio fieldset (legend `Your decision is needed`), by line `research-ray:` + summary, `.qs-subject` (heading, dl, seal line), `.qs-radio` ×3 with descriptions, note Field, `Submit decision`; prop `compact` (E: no descriptions, no subject) | `.qs` lead CSS |
| `card/question/QuestionQuiet.svelte` (rewrite) | legend `Your answer is needed`, face + `` `${name} asked:` ``, question, Field `` `Your answer (it goes straight to ${name})` ``, `Send answer` | |
| `card/state/CardStateQuiet.svelte` (new) | archived `.qs-notice` (no icon) + Restore; done `.qs-notice--ok` + dl; loading: only two sentences, no Skeleton (Q-5) | |
| `card/layouts/CardPhoneQuiet.svelte` (new) | `.qph` root: `.qph-top` (back button `← Developer Experience board`, `Open as a page`, `Close` as `.qph-textbtn`) → `header.qph-hd` (h2 + `.meta`) → live `fieldset.fs` (**2px signal border**, corrected Q-26) / archived `section.fs.ar` → 16 `section.qph-sx` (Details dl `.qph-facts`, Description, Acceptance criteria, Plan, History, Decisions, Comments, Links, Sub-tasks, Project, Handoff, Cost, Attempts (2), Delivery, References (5), Related prior work) → `footer.qph-foot` h3 `Card actions` | `SP-Phone-Card-Quiet.html`. Rename `.r/.top/.hd/.sx/.foot/.facts/.addrow/.cact/.rawrow/.wrap/.mono/.muted/.small/.id` to `qph-*`; `.sr` becomes `vk-visually-hidden`. Phone faces use `filter:saturate(0.4)`; desktop faces use `grayscale(0.6)` (Q-2, `Face calm` prop) |

vibekit mapping (Quiet):
- Button `variant:'frame'|'link'`, `tone:'destructive'` → #8. The `frame`/`link` variants are not in #8 (check).
- No IconButton; every control has text.
- CopyButton → CopyId #18 (text `Copy`, copied `Copied`).
- StageStrip → StageTrack #27. The Q list form is drawn without the "— stopped, needs you" suffix; the page appends ` (stopped here)` as app text.
- AgentQuote → #31. The Quiet needs-form in #31 is the fieldset itself. Here the app owns the fieldset and AgentQuote is only the by line + paragraph (mismatch).
- Disclosure → #19 (Quiet raw JSON summary styled as a link; the phone `.dsc`).
- Alert/Banner/DoneBlock → Notice #36.
- LoadingNote → Loading #38 (no skeleton).
- DefinitionGroups → none (`clampChars`, `faceAgents`).

`data-section` attributes:
- Quiet dl rows wrap each dt/dd pair in `<div data-section="…" style="display:contents">` (Q-7).
- Only the meta-row `Edit card` on the Quiet page carries `data-section="editButton"` (Q-8).
- Parity test: 23 keys per layout. The gallery is exempt.

## 5. States & behaviour (Paper/Quiet specifics)

- **Signal only for needs-you.** Signal appears on:
  - the Paper kicker dot and `.sig` fact (`tone:'needs'`), the current track cell underline, the phone current bar (5px), the page log stop row (`.stop`, only while waiting), and the `.ps-alert`;
  - the Quiet drawer/page fieldset 3px, the phone live fieldset 2px, and the `.qs-alert`.

  An archived card shows no signal (§7.10): the phone eye `.eye.ar` is muted, the current bar is muted 5px (P-21), and the first `.sc` fact reads `Archived` (P-30).
- **Destructive.** Every `Delete card` (Paper drawer `.pp-foot`, page colophon, Quiet drawer/page `Card actions`) and the phone `.sbtn.danger` `Delete card…` use the ink outline `background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: inset 0 0 0 2px var(--vk-color-text)` (corrected: they were quiet/secondary/muted border). `Delete card…` keeps `confirm('Delete this card? This cannot be undone.')`.
- **Paper drawer.**
  - Back link: plain click does preventDefault + close; middle-click opens the board.
  - Enclosure toggle word `Close`/`Open` is `aria-hidden`; the accessible name is title + count. Open state is per drawer-open and not persisted.
  - The sheet takes focus on open. The overlay scrolls, not the sheet (P-2): overlay `position:fixed; inset:0; overflow-y:auto; display:grid; justify-items:center; align-items:start`. The scrim is `color-mix(in oklch, var(--vk-color-text) 45%, transparent)`.
  - Gate pending: GatePaper replaces the letter and there is no resume form. Question: QuestionPaper. Archived: CardStatePaper above the head lines, with no reply. Loading replaces letter + reply + enclosures.
- **Resume (Paper).**
  - Note label `What changed, or what should the agent do differently? It reads this.`
  - Drawer placeholder (corrected): `For example: what you checked, and what the agent should look at next.`
  - Hint `Needed before you send. 0 / 8000`; button `Send back to work`; caption `With no note: “Add a note for error-eric first.”`
  - Phone label `Note: what changed, or what should error-eric do differently? It reads this.` with no placeholder.
- **Resume (Quiet).**
  - Hint `You must write a note before sending. Up to 8000 characters.`, `maxlength=8000`.
  - The button is never disabled. An empty note gives the field error `Add a note for error-eric first.` and focuses the textarea.
  - Phone: `Note for error-eric` + hint `Say what changed, or what to do differently. error-eric reads this.`
- **Comments.**
  - Paper drawer: label `Write to whoever works this card. The agent reads it.`, placeholder `⌘ or Ctrl + Enter posts it`, `Comment`; summary `No letters yet`.
  - Paper page: `No letters yet. The agent that works this card reads them.` + label `Write to whoever works this card` (no period).
  - Quiet: `No comments yet. The agent that works this card reads them.`, label `Add a comment`, `Comment`.
  - Phones: `No comments yet.`, label `Comment`, placeholder `Write a comment`, `⌘ or Ctrl + Enter to post`.
- **Empty texts.**
  - Plan: Paper `error-eric did not post a plan for this card.` (drawer heading `Plan`, page `Agent plan` with `.pg-sc--bare`); Quiet drawer `<h3>Plan</h3><p>None yet.</p>`; Quiet page and phone `error-eric did not post a plan for this card.`
  - Links: `Nothing blocks this card and it blocks nothing.` (keep `Add link`; phones `Add a link`).
  - Related: `No related prior work found in Superlibrary.`
  - Decisions: Quiet `None yet.`; Paper page `Decisions: none yet.`; phones `No decisions on this card yet.`
  - Delivery: Paper page and Quiet phone `No approved delivery on this card.`; Quiet desktop `None approved`; Paper phone renders a hidden `[data-section=delivery]` (P-20).
- **Composers.**
  - Paper page Enclosure III gains link-buttons `Add a sub-task` and `Attach a link` after `Add link`, each revealing an `.addrow` (sr labels `New sub-task title` / `Attach a link or Superlibrary item`, placeholders `Add a sub-task` / `Paste a link to attach`, `Add`), closed by default (P-8). The reference has them.
  - Phones: same inputs; Enter adds.
- **Copy controls.**
  - Paper `card 4605` + copy icon `aria-label="Copy card id 4605"`; the page has `Copy session id` in the signature (`actions` slot); `Copy link to this card` → `Link copied`.
  - Quiet `Card id 4605 · Copy`.
  - Quiet phone shows the full `card_05823a57e8224605` + link `Copy` (corrected Q-23).
  - Quiet drawer and page: `Copy session id` link under the reason.
- **Priority.** Quiet phone `P3` (corrected Q-22).
- **Assign to me.**
  - Hidden on every Paper/Quiet surface here, because the owner is the viewer.
  - Quiet: it moves to the Owner row when shown (Q-20).
  - The phone Paper `.atm` button is removed.
- **Show more.**
  - `aria-expanded`, expands in place.
  - Quiet/phone `.more` is 32px high with a 44px hit area (`::before` inset -6px, Q-16).
  - Shown on desktop and phone in both vibes. Q-17's "phone only" is superseded.
- **Show tool calls.**
  - Paper drawer: `Button quiet` toggles `Show tool calls`/`Hide tool calls`.
  - Paper page: `Show tool calls · all 14 events`.
  - Quiet drawer: link on the newest run only.
  - Quiet page: `Show tool calls (all 14 events)`.
  - Phones: `aria-pressed`.
- **Quiet busy copy.** `Sending…`, `Posting…`, `Archiving…`, `Submitting…`, `Restoring…`, each with `aria-busy`. Loading detail: sections backed by `cardDetail` (History, Decisions, Comments, References) show `Loading…`. Page before the snapshot: `Loading the card…`.
- **Not found (both pages).**
  - Text: `This card is not on Developer Experience any more.` + `Back to the board`.
  - Paper puts it in `.pg-head` h1; Quiet uses plain `<p>`s in main.
- **Gallery cells.**
  - Paper A, needPick: `Pick a decision first.` as the Field error.
  - Paper A, needNote: label `Say what needs to change` + error `Request changes needs a note: it threads into the agent’s next attempt.`
  - Quiet A, needPick: `Pick a decision first.` under the radios (`role="alert"`).
  - Quiet A, needNote: `Request changes needs a note.`
  - Gallery-only captions are constants (Q-13): Paper `With nothing picked: “Pick a decision first.”`, `With no answer: “Type an answer first.”`; Quiet `If nothing is picked: “Pick a decision first.”`, `If empty: “Type an answer first.”`.
  - E alert: **`Not recorded.`** `This gate was already decided from Matrix by Rakesh Gangwar at 13:02.` + link-button `Refresh to see it` (Quiet adds a trailing `.`). It calls `model.refresh()` then `app.refresh()`.
  - Paper F: `Opening the letter…`.
  - Quiet F: `Loading the card. This can take a few seconds.` / `Still loading: the stage, what the agent said, and the history.`
- **Agent text verbatim.**
  - The lead sentence is `needsHuman.detail`, rendered as text, never `{@html}`.
  - Token styling is display-only.
  - Phones capitalise only the first character.
- **44px targets.** Every button and link is at least 44px, except `.more` (32px visual + 44px hit). `.pp-copy`/`.sc .atm`/`.facts .atm` use negative margins to keep line height.

## 6. Phone (390) specifics

- The drawer shell renders `L.phone` when `MediaQuery('max-width: 639.98px')` matches, inside `vibekit:Sheet` (full screen, no scrim, `aria-labelledby="drawer-title"`).
  - Paper Sheet: `background bg; border-top 3px double text`.
  - Quiet Sheet: `border-top 3px solid text`.
- **Paper phone.**
  - Sticky top `.sh`; sticky bottom `.reply` (live only).
  - Enclosure summaries are title + count lines with no Open/Close word:
    - `The brief` / `5 things to prove · 10 details · project`
    - `What happened` / `2 runs · 2 attempts · no decisions · $0.00`
    - `Who is waiting` / `no links · no sub-tasks`
    - `Attached` / `5 references · no related prior work`
    - `Correspondence` / `no comments yet`
  - Brief body h4s: `What was asked`, `Things to prove` (ordered 1–5), `Plan`, `Details`, `Project`.
    - The Project row inside `Details › Where work goes` is removed (§8.2-9). The `Project` h4 stays: `Marketing & Community — Melissa and Anna onboarding · no milestone` + `Change project`.
  - What happened h4s: `Session activity`, `Decisions`, `Handoff`, `Attempts`, `Cost`.
  - Who is waiting h4s: `Links`, `Sub-tasks`.
  - Attached h4s: `References` (cards `.rf`: title / description / meta), `Related prior work`.
  - Foot: `Edit card` (link), `Archive card`, `Delete card…`.
- **Quiet phone.**
  - Details dl rows: State, Agent, Owner, Asked by, Priority, Due `None`, Labels `None`, In stage, Stages, Card id, then `Edit card`, then the disclosure `Show the 10 fields of the brief`.
  - Foot h3: `Card actions`.
- **Archived variant (secondary; not exported).**
  - Paper:
    - eye `Archived on 8 October`;
    - `This card was archived on 8 October.` / `Nothing is running, so there is no reply to send. Restore it to put it back in Reproduce.` / `Restore`;
    - foot `Archived — restore`, `Delete card…`.
  - Quiet:
    - meta `… · Archived on 8 October`;
    - h3 `This card is archived` (`.qph-arch-h` 19px);
    - `Archived on 8 October. It is not running, so there is nothing to decide. Restore puts it back in Reproduce.`;
    - `error-eric's last message: ` + sentence;
    - State `Archived (was stopped, waiting on you)`.
  - §8.2-3 (no signal on an archived card) is not corrected inside that branch; the card group decides.
- Gate/question/done/loading have no phone artboard. They reuse the cell-size components at 100% width in the letter/fieldset position (P-18).
- At 320–639px, everything is fluid except the 72px event time column.

## 7. Gaps / open questions

| # | Issue | Recommendation |
|---|---|---|
| X-1 | **The "Show more" clamp rule cannot reproduce the corrected references.** Visible prefixes are 251 (rework), 277 (context), 198 (scope), 176 (accountsIssues) and 184 (routingRule) chars, all with "Show more". `latestConfirmedGrant` (181) has none. P-23 (≤200 chars to sentence end) and Q-17 (240 at a word boundary) both fail. | Store each clamped value as `shownText + "\n\n" + continuation` in the fixture, and clamp at the first paragraph break (rule: show the first paragraph; "Show more" iff more paragraphs). One rule for both vibes and all surfaces. Needs a planner/spec decision. |
| X-2 | The SP-CardPage-Paper reference still has the resume placeholder `For example: I sent a fresh DM to each of them at 14:05; trace those.`, while the drawer is corrected to `For example: what you checked, and what the agent should look at next.` (§8.2-6, O-17). The card-page corrections list has no placeholder row. | Use one constant (the corrected sentence) and re-export/patch the page reference. Otherwise the pixel test fails on that text. |
| X-3 | Required evidence heading. The Quiet drawer prints `…listed under Acceptance criteria.`, but the Quiet page and phone print `…listed under Things to prove.` (references). | Follow the references: pass a heading per surface (S-18 parameter). Flag for a later consistency pass. |
| X-4 | Attempt end times (`stopped at 19:41`, `sent back at 12:11`) need `Attempt.endedAt` (API-7, listed for Studio only). | Reuse API-7 for Paper/Quiet; do not derive from activity timestamps. |
| X-5 | The 409 fulfil body in the harness (`{error:'already_decided', decidedBy:'Rakesh Gangwar', decidedVia, decidedAt}`) differs from the API-1 contract shape. | Make the harness fulfil match API-1 (`error.code='GATE_ALREADY_DECIDED'`, `decidedBy` principal id, `via`). Rendered text is unchanged. |
| X-6 | Quiet cell E draws the needNote field error and the 409 alert together. | The GateQuiet error/alert must persist across a local validation. Steps: Approve → Submit (409) → Request changes → Submit. Or render a local error and the server alert independently. |
| X-7 | The Quiet page says it keeps one column below 640px. §7.7 says the page renders `CARD_LAYOUTS[vibe].phone` below 640. | §7.7 (binding amendment) wins unless the planner chooses otherwise. Paper P.4 also says it keeps its own single column below 640. |
| X-8 | The C-08 backdrop mask rectangles (Paper w 380, Quiet w 800) overlap the sheet/panel. | Paper: mask outside `.pp-sheet` (locator `[data-board-root]`). Quiet: `w:320`. |
| X-9 | The "sent back" outcome is stored as `completed` + `completion.ok=false`. | Derive in the client (`OUTCOME_WORD`), or seed `outcome='sent_back'`. Pick one. |
| X-10 | Gate status spelling: the fixture has `canceled`, API-2/P-16 have `cancelled`. | Accept both in the derivation, or normalise in the contract (one spelling). |
| X-11 | Quiet approve fallback copy `Move the card on as it is.` is not drawn. Paper has no fallback for approve. | Add a Paper fallback constant (e.g. Quiet's sentence). Both vibes use `description` when present. |
| X-12 | The page backdrop and `PersonRow`, `DefinitionGroups`, `RunRow`, `LinkList`, `Checklist`, `SubjectFrame`/`Seal` have no matching component in the vibekit 0.1.0 list (§2.2), and the props AgentQuote `variant/size/salutation`, FactList `variant`, Disclosure `variant/toggleText` and Face `calm` are missing. | Either add them to vibekit (spec §7.9) or keep them app-local for this sweep. A planner decision. |
| X-13 | Melissa D letter: the spec derived it from the last response activity, but the world has none. | Corrected: letter = `handoff.summary`, Handed on = `handoff.handedOn` (Paper); Quiet shows only `handedOn`. |
| X-14 | Studio E crop is not relevant here. The Quiet E `compact` and Paper E `part='reply'` props are gallery-only. | — |

Out of scope / follow-ups:
- Agent-drafted new card.
- Phone archived baselines (not exported).
- Separate per-vibe resume placeholder copy (appendix note).
- Quiet `fieldset.plain` is used only by the edit form wrapper (Q-10; no artboard).
- The `paperLight` / `say('phase.light','paper')` offer to vibekit; the shell masthead must use the same function (P-1).
