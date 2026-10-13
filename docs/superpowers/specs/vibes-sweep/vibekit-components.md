# vibekit component library: the shared parts of the four vibes

Status: proposed, 2026-10-11. Scope: the component layer of `@superjackfruit/vibekit` that Superpipeline (SP), Superlibrary (SL), AgentPod (AP) and Superwitness (SW) build their vibes screens from.

Inputs (all read for this spec):
- The approved mockups `scratchpad/vibes-mockups/project/*.dc.html`: 134 artboards. SP 44, SL 30, AP 33, SW 26, plus `Studio-Mix-H`, which is the Studio reference.
- `vk.css`: the tokens the mockups render with.
- `brief/studio-annual.md`.
- Renders in `.playwright-mcp/review/qa/*.png`.
- vibekit `origin/main` at `53dba27`.

`Studio-Dir-*` and `Studio-Mix-{E,F,G,I}` are ignored.

Vocabulary:
- **vibe**: one of `daylight | paper | studio | quiet` (`src/lib/vibes.ts`).
- **form**: the structure a component takes in one vibe.
- **canonical**: the declaration set this spec picks when the mockup copies disagree.

---

## 0. What the mockups say about the current library

1. **The token package is behind the mockups for Studio.**
   - `origin/main` `tokens/source/studio.ts` is the retired Instrument Sans "workstation" look: radius 6/10/14, amber signal `#A86400`, green success.
   - The approved Studio look is "Annual report": Archivo, Azeret Mono, Newsreader serif, radius 2/2/4, vermilion signal `#E8461C`, blue ramp, ink rules.
   - A Terrazzo diff of `src/lib/styles/tokens.css` (main) against the mockup `vk.css` gives:
     - Studio light and Studio dark: 38 differing properties each. All colours, fonts, moods and radii, plus the new `--vk-font-serif`, `--vk-color-rule`, `--vk-color-stage-text`, `--vk-face-ink` and `--vk-stage-1..7`.
     - Daylight, Paper and Quiet: only the font family strings differ, because Fontsource names end in ` Variable`, e.g. `"Figtree Variable"` vs `"Figtree"`. The colours are identical.
2. **The mockups bolt operator rules onto `vk.css`.** These become component rules (§2.3):
   - a button label never wraps (`.vk-button { white-space: nowrap }`);
   - a vibekit button keeps its colours inside link-styling containers;
   - action links don't shrink;
   - an icon button with a label lays them side by side.
3. **The same thing is implemented many times.** Count of parallel local implementations:

   | Pattern | Local implementations |
   |---|---|
   | Button | 14 in SP, 9 in SL, about 10 in AP |
   | Tabs | 3 |
   | Segmented | 3 |
   | Row/table | 5 in AP |
   | Scrim | 5 recipes |
   | Stage bar in Daylight | 4 heights |

   Inside one vibe, the drift is mostly in sizes:
   - borders are 1, 1.5 or 2px;
   - paddings are 14 to 28px;
   - hit areas are 32 or 36px where 44px is the rule.

   The structure, though, is consistent per vibe, and that is what this library encodes.
4. **Studio is the least drifted vibe.** Its `.ar` alias layer is byte-identical in all 8 SP Studio files and shared by SL and AP: `--rule`, `--hair`, `--soft`, `--s1..7`, `--st-text`, `--sans`, `--mono`, `--serif`. Studio's canonical values are therefore read from `.ar-*` (Studio-Mix-H, SP-Board-Studio). The other vibes' canonical values are read from the per-vibe Board, Library or Agents page files, not from the shared multi-vibe files. Those shared files (SP-Projects/Settings/Spend/Workspace-*, AP-Admin-*, AP-Node(s), AP-Settings) draw Studio as a square-cornered Daylight, not as Annual report. The `.vs-srail` "workstation" rail is dead and must not be ported.
5. **No pattern uses a red, green-on-fail or warn colour**, apart from one outlier: the SL phone files define `--sl-danger` and `--sl-outcome-*` as raw hex. Desktop destructive is an ink outline in every product: `.sl-danger`, AP `.danger`, SP `.mi-danger`/`.sbtn.danger`. Failure is ink plus a word plus an icon. Signal means "a person is needed now" and nothing else. §3 keeps it that way.

---

## 1. Inventory of recurring patterns

### 1.1 How to read the table

- **Counts** are artboards that render the pattern, per product: SP / SL / AP / SW.
  - Per-vibe artboards count once each.
  - A shared multi-vibe artboard counts once.
- **Per-vibe forms** are given as D (Daylight), P (Paper), S (Studio) and Q (Quiet).
- **Drift** is graded L/M/H. The quoted copies are verbatim from the named file and selector, abbreviated with `…`.

Every pattern below appears in at least 2 products, or on at least 3 screens of one product. Section 2 turns each one into a component. The components are named in brackets.

### 1.2 Shell

**P1 App navigation [AppNav]**

Counts SP 36 / SL 30 / AP 19 / SW 23: every desktop page and every dialog backdrop.

Per-vibe forms:
- **D:** floating 88px rounded rail of 64px labelled pills, with an inset 2px primary ring when current.
- **P:** no rail. A section bar of text links under the nameplate, divided by 1px rules; current is italic display 18px underlined.
- **S:** a 64px black ink rail of 44×44 icon squares. Current is inverted (bg on text). The count is a signal square. Labels appear in an ink tooltip on hover/focus.
- **Q:** no rail. One row of underlined 18px links; current is bold with no underline.

States: current, hover, focus, count badge, tooltip.

Copies:
- `SP-Board-Daylight .dy-rail {flex:0 0 88px; border-radius:var(--vk-radius-lg); background:surface; box-shadow:0 12px 32px -12px ground, 0 var(--vk-lift) 0 ground}`
- `SL-Library-Daylight .dyl-pill a[aria-current="page"]{…background:var(--vk-color-raised);font-weight:700;box-shadow:inset 0 0 0 2px var(--vk-color-primary)}`
- `AP-Admin-People .st-rail{flex:0 0 64px;…background:var(--vk-color-text);color:var(--vk-color-bg)}`
- `.st-dest[aria-current="page"]{background:var(--vk-color-bg);color:var(--vk-color-text)}`
- `SL-Library-Quiet .sq-links a[aria-current="page"]{font-weight:700;text-decoration:none}`, which conflicts with `.ni[aria-current]{text-decoration-thickness:3px}` in the same file.

Drift **M**:
- the Daylight badge offsets differ;
- Quiet has two current styles in one file;
- AP's Agent-{D,P,Q} carry a stale `.st-top` with a 44px top and a round success light.

Canonical: §2.4 AppNav.

**P2 Masthead / page top [Masthead]**

Counts SP 36 / SL 30 / AP 19 / SW 23. It holds the eyebrow "PRODUCT · SECTION", the title (often a switcher), the command field, the live indicator, and the primary action.

Per-vibe forms:
- **D:** a top bar on the sky. Bricolage title at 28px/700/−.015em, a pill command field with lift, and a success-wash "Live" pill.
- **P:** a newspaper nameplate (32px, 600, all-small-caps, .07em), an italic dateline, a 46px/500 Newsreader edition title, and a `3px double` rule.
- **S:** `.ar-top {min-height:76px; padding:0 24px 0 40px; border-bottom:1px solid rule}`, an uppercase 700 12px .1em eyebrow, `.ar-sw {font:800 28px/1; font-stretch:80%}`, the command field as a 1.5px underline, and LIVE as an 8px `--vk-color-stage-text` square.
- **Q:** `.qn-row {min-height:60px}` of text links, plus "Hub: …, connected" in plain text.

Drift **M**:
- the Paper nameplate is 32px all-small-caps vs 26px small-caps (`SL-Dialogs .slx-name`, `SP-Projects .vs-nameplate`);
- the Daylight switcher is 28px vs 30px.

**P3 Status line [StatusLine]**

Counts SP 6 / SL 16 / AP 16 / SW 12.
- **S:** `.ar-status {min-height:32px; padding:0 40px; border-top:1px solid rule; font:500 12px mono; color:muted}`, with a `.sig` span in signal-text 600. The SL desktop height is 44px.
- **D/P/Q:** a page footer, `.foot {border-top:1px solid line; padding:var(--vk-space-6) 40px; font-size:sm; color:muted}`. Paper uses a text rule. Quiet uses 16px.

Drift **L**.

**P4 Phone tab bar [PhoneTabBar]**

Counts SP 8 / SL 8 / AP 8 / SW 8.
- **D:** a floating card.
  - `.nav {position:sticky; bottom:12px; margin:auto 12px 12px; padding:6px; border-radius:var(--vk-radius-lg); background:surface; box-shadow:0 0 0 1px line, 0 12px 28px -8px ground}`
  - tab `min-height:58px; radius md; 600 12–13px muted`
  - current `bg raised; inset 0 0 0 2px primary`
- **P:** `border-top:3px double text`. Tabs are all-small-caps 15–16px with `a+a {border-left:1px line}`. Current is italic display 17–18px underlined, offset 6px.
- **S:** an ink bar.
  - tabs `min-height:58–60px; font:500 11px mono uppercase .04em`
  - current inverted, plus `inset 0 3px 0 text`
  - square signal count
- **Q:** `border-top:2px solid text`. Underlined 15–16px text, no icons. Current is bold with no underline.

Drift **H**:
- the SP Daylight board tab bar floats, while the SP Daylight card bar is flat;
- AP has 5 tabs and SP/SL have 4.

**P5 Phone compact header [PhoneHeader]**

Counts SP 8 / SL 8 / AP 8 / SW 8.
- **D:** a sky card, `margin:8px 8px 0; border-radius:lg`.
- **P:** `border-top:1px text; border-bottom:3px double text`, with a 24–25px small-caps nameplate.
- **S:** `.ph-top`/`.ap-top {min-height:52–64px; border-bottom:1px solid rule}`, a 22–24px 800 title with font-stretch 80%, and a 40px ink mark.
- **Q:** `padding:6px 16px 10px; border-bottom:1px line`, with 17px links.

Drift **M**.

### 1.3 Controls

**P6 Button, including destructive [Button]**

Counts SP 38 / SL 26 / AP 30 / SW 22.
- **D:** `.vk-button` with radius md and lift.
- **P:** radius sm, a 1px ink edge, no lift, 600 15px. The "write" variant is italic display.
- **S:**
  - primary: an ink slab, radius 2px, 800 14px;
  - secondary: a 1.5px rule inset that inverts on hover;
  - `sm`: 36px with a 44px `::after` hit area.
- **Q:** a 2px ink edge on surface, 700 17–18px, 48px. Tertiary is an underlined link.
- **Destructive, all vibes:** an ink outline with no colour. `SL-Record-Daylight .sl-danger {…background:surface; color:text; box-shadow:inset 0 0 0 2px var(--vk-color-text)}`. Studio uses `.ar-btn.heavy {background:transparent; box-shadow:inset 0 0 0 2.5px var(--rule)}`.

States: hover, active, disabled (opacity .45/.5/.55), busy (`SL-Upload .vk-button[aria-busy="true"]:disabled{opacity:1;background:raised;box-shadow:inset 0 0 0 2px line}`), pressed (`[aria-pressed=true]` primary fill).

Copies:
- `SP-Board-Studio .ar .ar-btn {min-height:44px; padding:0 16px; border-radius:2px; background:var(--text); color:var(--bg); font:800 14px}`
- `SP-Board-Paper .pp-btn {min-height:44px; padding:0 16px; border:1px solid text; border-radius:sm; 600 15px}`
- `SP-Board-Quiet .qn-btn {… border:2px solid text; 700 17px}` vs `SP-Projects .vs-qbtn {border:1px solid text; 18px}`

Drift **H**.

**P7 Icon button [IconButton]**

Counts SP 30 / SL 20 / AP 20 / SW 20.
- **All vibes:** 44×44, `place-items:center`, transparent, muted, radius sm.
- **D:** hover raised. The phone version is a pill with lift on the sky.
- **S:** hover inverts (bg text, colour bg).
- **Q:** the icon is replaced by its text label, underlined (`.x-copy::after{content:"Copy"}`, `.m-ib .i{display:none}`).

Expanded: `inset 0 0 0 2px text`.

Copies:
- `AP-Admin-People .ibtn{width:44px;height:44px;border-radius:var(--vk-radius-sm);…}`
- `SL .ar-ib:hover{background:var(--text);color:var(--bg)}`

Drift **L**.

**P8 Tabs [Tabs]**

Counts SP 34 / SL 12 / AP 14 / SW 20 (`ws-tabs` on 12, `.tabs` on 11).
- **D:** pills on a translucent sky track. Selected is a surface fill with lift (SP) or an inset 2px primary ring (AP).
- **P:** all-small-caps 17px 600 .09em with a 2px ink underline.
- **S:** 700 14px muted. Current is text colour with a 3px ink bar at `bottom:-1px`.
- **Q:** underlined links. Current is bold with no underline.

Copies:
- `SP .mh-tab{font-variant-caps:all-small-caps;…border-bottom:2px solid transparent}`
- `AP-Agent-Studio .tb[aria-selected="true"]::after{…height:3px;background:var(--vk-color-text)}`
- shared `.tabs a{min-height:48px;border-bottom:3px solid transparent}` with selected `border-bottom-color:var(--vk-color-primary)`. This uses primary, not ink, and is rejected.

Drift **H**: three state mechanisms (`aria-current`, `aria-selected`, `data-here`).

**P9 Segmented / quick filter [Segmented, QuickFilter]**

Counts SP 23 / SL 15 / AP 14 / SW 9.

Segmented (exclusive choice):
- **D:** the vk.css pill.
- **P:** underlined text buttons.
- **S:** the run-in underline form `.bd-qf button {min-height:44px; padding:0 14px; border-left:1px solid hair; 700 14px muted}` with pressed `{color:text; text-decoration:underline; text-decoration-thickness:3px; text-underline-offset:8px}`. The compact "box" form is `.op-seg {border:1px solid rule}` with an ink-filled checked item.
- **Q:** text radios, underlined; the checked one is bold.

Quick filter (Segmented plus counts) has the same four forms. In Studio it becomes small multiples (P20) on the Library/Board pages.

Drift **H**: SP's shared `.seg` alone has three different bodies.

**P10 Field, select and textarea [Field]**

Counts SP 25 / SL 22 / AP 20 / SW 10.
- **D:** 2px faint border, radius sm. Some copies use 2px line, which is rejected.
- **P:** in forms, 1px text border with radius sm. In SL dialogs, a bottom rule only (`border-width:0 0 1.5px; border-color:text`).
- **S:** `.ar-in {min-height:44px; padding:0 10px; border:1px solid rule; border-radius:0; background:raised; 400 16px}`, with label `700 12px muted`.
- **Q:** 48px high, 2px text border, 18px.

Invalid: border signal plus a message. Studio uses a 2px border.

Drift **H**: borders are 1, 1.5 or 2px, in faint, line or text.

**P11 Choice: radio card and checkbox [Choice]**

Counts SP 6 / SL 8 / AP 11 / SW 6.
- `.radio{min-height:44px;padding:10px 12px;border-radius:var(--vk-radius-md);box-shadow:inset 0 0 0 1px line}`
- `.radio:has(input:checked){box-shadow:inset 0 0 0 2px primary;background:raised}`
- native `width:20px;height:20px;accent-color:var(--vk-color-primary)`

Drift **L**.

**P12 Command field and palette [CommandField, CommandPalette]**

The trigger is on every shell. The palette appears in SP-Dlg-Palette, AP-Dlg-Palette and SW (`ws-cmd` on 12).
- `.pal-in input{height:52px;font:500 19px/1}` with `:focus-within{box-shadow:inset 0 -2px 0 text}`
- `.pal-item{min-height:52px;padding:6px 10px;radius sm}` with `[data-selected]{background:raised;box-shadow:inset 3px 0 0 text}`; Quiet uses `inset 0 0 0 2px text`
- `mark{background:var(--vk-mood-done);color:var(--vk-face-ink)}`; Quiet uses a 2px underline
- group heading `700 12px uppercase .06em`; Paper italic display 15px; Studio .1em

Drift **L**: the SP and AP palette files share 200 identical rules.

**P13 Kbd [Kbd]**

Counts SP 25 / SL 14 / AP 16 / SW 12.
- **D:** `padding:4px 9px; radius pill; bg raised; 500 12px/1.2 mono`
- **P:** `padding:1px 6px; 1px solid line; radius sm; 12px/1.4 mono; faint`
- **S:** `padding:2px 5px; 1px solid currentColor; radius 2px; 500 11px/1 mono`
- **Q:** bare `400 14px mono; muted`

Drift **H**: six classes.

**P14 Copy id [CopyId]**

Counts SP 14 / SL 10 / AP 13 / SW 8.
- id text: `400 12px/1.4 mono; muted; overflow-wrap:anywhere`
- button: `width:44px;height:44px;margin:-12px -10px -12px -6px` (icon)
- **D** in SL: a text pill, `min-height:32px` (under target, rejected)
- **P:** underlined "Copy" link
- **S:** `.ar-lk`, 700 13.5px underlined 1.5px
- **Q:** text "Copy"

Drift **M**.

**P15 Disclosure [Disclosure]**

Counts SP 25 / SL 12 / AP 16 / SW 10.
- **D:** a 56px summary in a rounded section, with the chevron rotating 90°.
- **P:** a 56px "enclosure" summary in 500 1.2rem display on a 1px text top rule.
- **S:** an underlined 700 13.5px summary, or a 60px row with a mono "+"/"–" glyph.
- **Q:** a bold 44px summary in ruled rows.

Raw toggle: `min-height:44px; underline offset 3px`.

Drift **M**: the chevron rotates 90° or 180°.

**P16 Menu / popover [Menu]**

Counts SP 12 / SL 6 / AP 19 / SW 11 (account, overflow, switcher).
- **D:** `radius md; box-shadow:0 0 0 1px line, 0 12px 32px color-mix(in oklch, text 18%, transparent)`. Items `min-height:44px; radius sm; 600`, hover raised.
- **P:** `1px solid text; radius sm; no shadow`, hover underline.
- **S:** `1px solid rule; radius 0`, hover inverts.
- **Q:** `2px solid text`.

Drift **M**: three widths and five shadows.

### 1.4 Data display

**P17 Data table and row [DataTable]**

Counts SP 14 / SL 12 / AP 20 / SW 16.
- **D:** `th {border-bottom:2px solid line; 600–700 13px muted}`, `td {padding:12px}`, hover raised. Needs rows carry a 4–5px signal edge.
- **P:** `th {border-bottom:1px solid text; italic 400 15px display}`, titles in Newsreader 1.25rem.
- **S:** `.ar-tbl th {height:30px; 700 12px muted; border-bottom:1px rule}`, `td {padding:10px 10px 10px 0; border-bottom:1px hair}`. Numbers are `500 12.5px mono` right-aligned, the index column is mono. Selected rows get `--soft` plus `inset 3px 0 0 text`. Group rows get `border-bottom:1.5px rule` with a `900 28px` count.
- **Q:** `th {border-bottom:2px line}`. Rows are `1px line`. Needs rows get `inset 5px 0 0 signal`.

Drift **M–H**: AP has 5 row systems.

**P18 Key/value facts [FactList]**

Counts SP 20 / SL 14 / AP 12 / SW 9 (`facts` on 9, SW "In brief").
- **D:** `grid 104px 1fr`, muted dt.
- **P:** `96px`, dt `12px .08em uppercase`.
- **S:** `.ar-kv {grid max-content 1fr; col-gap 16px; dt/dd padding 9px 0; border-top 1px hair}`.
- **Q:** max-content with a bold dt.

Drift **H**: label widths range from 96 to 180px.

**P19 Hero figure and headline [Hero]**

Counts SP 10 / SL 12 / AP 6 / SW 8.
- **S:** `.ar-hero {grid auto 1fr; column-gap:28px; align-items:end}` with `.big {font:900 184px/.78 Archivo; font-stretch:72%; letter-spacing:-.04em}`. Signal colour when it counts people-needed. Headline `800 44px/1.02 stretch 82%`, lede `400 18px/1.45 serif` with footnote marks. Other sizes: 152 (Record), 150 (Agents), 120 (List), 112/96 (phone).
- **D:** no figure. The greeting sentence is `700 34px/1.1 display`, h1 `800 clamp(2.25rem,1.6rem+2vw,3rem)`.
- **P:** edition h1 `500 clamp(3rem,2rem+3vw,4.5rem)/1` Newsreader, with an italic standfirst of 20px.
- **Q:** h1 `700 34–36px/1.2` and a plain lede.

Drift **M**: seven figure sizes, normalised to three (§2.5).

**P20 Small multiples and unit squares [SmallMultiples]**

Studio only, with an equivalent in each other vibe. Counts SP 3 / SL 6 / AP 4 / SW 4.
- `.ar-sm {repeat(7|8); column-gap:12px}`
- `.ar-mul .band {height:6px; background:var(--s{n})}`
- `.n {900 72px/.9; stretch 72%}`, with zero rendered as `300; muted`
- units `.u {18×18}`: `.needs` signal, `.done` s7, `.queued` `inset 1.5px s5`, `.blocked` hatch
- phone: 4 columns with a 30–40px figure

Equivalents:
- **D:** lanes, or pill chips with counts.
- **P:** ruled columns (`.pp-pipe`).
- **Q:** an underlined count list.

Drift **L**.

**P21 Share bar [ShareBar]**

Studio. SP Board, SL Library, SW Runs (×2 each including phone).
- `.ar-share {grid 3fr 2fr 1fr; gap:3px}`, `i {height:14px}`
- label `b {900 48px}`
- blocked hatch `1.5px 5px`

Drift **L**.

**P22 Figure row and stat tiles [FigureRow]**

Counts SP 8 / SL 6 / AP 13 / SW 8.
- **S:** `border-top:1.5px solid rule; border-bottom:1px hair`, cells divided by `1px hair`. `b {900 30–52px/.9; stretch 72%}`, zero `300 muted`. AP tiles use `border-top:6px solid var(--vk-stage-4)` cycling through stage 3/5/6/7.
- **D:** `.tile {padding:14px 16px; radius md; background:raised}`, `b {700 28px/1.1 display; tabular-nums}`.
- **P:** transparent with a 1px line left border; `b` at weight 500.
- **Q:** `inset 1px line; radius sm`, `b` in the body font at 26px.

Drift **L**.

**P23 Stage strip [StageTrack]**

Counts SP 16 / SL 4 / AP 2 / SW 4.
- **D:** pill bars with done = success, current = primary plus a 2px text outline, stopped = signal plus a 2px signal-text outline, and the current step widened.
- **P:** seven ruled columns of small-caps number over Newsreader name, current italic with a 2px signal underline. On phone, 3px hairline bars with 5px for stopped.
- **S:** `--vk-stage-1..7` bands at `height:8px; opacity:.3` up to done, then `opacity:1`. Current is `height:14px; margin-top:-6px`, stopped adds `inset 0 -4px 0 signal`. Labels are `500 12.5px` on a 1px rule, and the current name is underlined 3px.
- **Q:** an `<ol>` with the current step in bold, or a prose "now at Resident (stage 7 of 7)".

Copies, Daylight bar height:
- `SP-Card-Daylight .dl-track .bar {height:8px}`
- `SP-Card-States-Daylight .ds-track .bar {height:7px}`
- `SP-CardPage-Daylight .dp-track .bar {height:10px}`
- `vk.css .vk-stages__bar {height:6px}`

Drift **H**.

**P24 State label: pill, marker and outcome [StateLabel]**

Counts SP 30 / SL 24 / AP 24 / SW 20.
- **D:** a mood-filled pill (`.vk-pill`); needs = mood-needs plus `inset 0 0 0 2px signal`. A 9px round dot for running/stopped.
- **P:** an uppercase 12.5px .08em word with an 8px round signal dot for needs. Stopped is italic.
- **S:** an 11×11 square plus a 700 13px word.
  - needs: signal square, signal-text word
  - running: stage-6
  - done: stage-7
  - blocked: hatch
  - stopped: `inset 1.5px text`
  - failed: ink, with the word only
- **Q:** a bold word. Needs is signal-text. No dot.

SL outcomes (approved/completed/in-progress/superseded/rejected/failed/abandoned):
- desktop maps them to vk tokens via `.oc-*`;
- the phone uses raw hex `--sl-outcome-*` (rejected, §3.3);
- Studio uses ramp squares.

Drift **H**: the needs ring is 1, 1.5 or 2px; the dot is 7 to 14px.

**P25 Live indicator [LiveDot]**

On the masthead of every page.
- **D:** `.dy-live {min-height:30px; radius pill; bg success-wash; color success-text; 700 14px}`. The dot has `box-shadow:0 0 0 3px color-mix(in oklch, var(--vk-color-success) 35%, transparent)` (×17 AP, ×4 SP).
- **P:** an 8px circle with `0 0 0 3px success-wash`.
- **S:** an 8px stage-text square with "LIVE" in caps.
- **Q:** a bold success-text word.

Drift **L**.

**P26 Face and agent name [Face, AgentName]**

Counts SP 40 / SL 24 / AP 30 / SW 14.
- **D:** a round face with a mood ring. Overlapping stacks use `margin-left:-6px; box-shadow:0 0 0 2px surface`.
- **P:** a round face with `box-shadow:0 0 0 1px line`, and the name in italic Newsreader.
- **S:** a square face (radius 2px). Initials are `background:text; color:bg; 800`.
- **Q:** `filter:grayscale(.6)`. SP Board uses `grayscale(1)` and phones `saturate(.4)`, both rejected.

Name: `.who {display:flex; gap:10px}` with a 700 name.

Drift **M**.

**P27 Agent quote: verbatim agent text [AgentQuote]**

Counts SP 24 / SL 4 / AP 8 / SW 10 (`tx-text`, verdict notes).
- **D:** a speech bubble.
  - `.dl-bubble {border-radius:6px var(--vk-radius-lg) var(--vk-radius-lg) var(--vk-radius-lg); padding:16px 24px; background:signal-wash}` when needs-you, raised otherwise.
  - Copies also use `4px md md md` and `mood-needs`.
- **P:** a "letter".
  - The voice is `display 1.25rem/1.6`, with an italic salutation and an italic-name signature.
  - The short form is `border-left:2px solid signal; italic 1.1875rem/1.55`.
- **S:** `.ar-q {padding:2px 0 0 18px; border-left:4px solid var(--sig)}` with `blockquote {400 19px/1.42 serif}`. Variants: `.ink` (text), `.done` (s7), `.off` (hair). The head is `800 14px` in signal-text.
- **Q:** `fieldset {border:3px solid signal; radius sm}` with a bold legend when needs-you, plain text otherwise.

Drift **H**.

**P28 Footnotes [Footnotes, FootnoteRef]**

Studio. SP 6 / SL 5 / AP 3 / SW 6.
- `.ar .fn {font:600 11px/1 mono; vertical-align:super; color:var(--vk-color-stage-text)}`
- `.ar-notes {grid 2 cols; column-gap:32px; row-gap:10px; padding-top:10px; border-top:1px solid hair}`
- `li {grid 22px 1fr; 400 14.5px/1.45 serif}`, `.k {600 11.5px/1.9 mono; stage-text}`
- `.ar-pfn` is a footnote row with a Copy button

Paper Record has a counter list (`italic 600 16px display` numerals).

Drift **L**.

**P29 Section header, numbered [SectionHeader]**

Counts SP 30 / SL 16 / AP 12 / SW 14.
- **S:** `.ar-sec > .hd {padding-top:10px; border-top:1.5px solid rule}`, with `.no {500 12px mono muted}`, `h2 {800 16px/1.2}` and a right-hand `500 12px mono` meta.
- **P:** a kicker `12.5px 600 .12em uppercase` over `border-bottom:1px solid text`, or `h2 600 28px/1.15 display` with a 1px ink rule.
- **D:** `h2 700 var(--vk-text-lg)/1.2 display` plus a muted count, no rule.
- **Q:** `h2 700 24px`, no rule. The SP Operate copy has a 2px rule, which is rejected.

Drift **M**: Quiet h2 is 22, 24 or 26px.

**P30 Page head: eyebrow, title and lede [PageHead]**

Counts: every page.
- Eyebrow:
  - **D:** `700 12px .02em muted`, not uppercase
  - **P:** `600 12px .12em uppercase`
  - **S:** `700 12px/1.25 .1em uppercase muted`
  - **Q:** `700` body, muted
- Titles per §2.5 type scale.

Drift **M**: Paper has italic and uppercase eyebrow forms.

### 1.5 Overlays and feedback

**P31 Dialog [Dialog]**

SP 6 / SL 2 / AP 8 / SW 1 (Verdict).
- `.dlg {bg surface; radius lg; box-shadow:0 0 0 1px line, 0 28px 70px color-mix(in oklch, text 26%, transparent)}`
- **P:** radius sm, `inset 0 0 0 1px text`, h2 500 23px.
- **S:** radius 2px, `0 0 0 1.5px rule` (SL: `border-top:3px solid rule`), h2 `800 22–28px/1.05; stretch 82%`.
- **Q:** `0 0 0 2px text`, no shadow.

Anatomy: head (title plus 44px close), body, consequence list, actions (right-aligned, lead action `margin-right:auto`).

Drift **M**.

**P32 Drawer [Drawer]**

SP Card ×4, Dlg-Reconnect; AP `.drawer` ×6; SW selected-span margin.
- **D:** `.dl-drawer {width:680px; surface; box-shadow:0 0 0 1px line, -24px 0 64px color-mix(in oklch, text 22%, transparent)}`
- **P:** a centred sheet, `.pp-sheet {width:min(780px,100%); radius sm; 0 30px 80px color-mix(in oklch, text 30%, transparent)}`
- **S:** `.cw-drawer {940px; border-left:1.5px rule}`. AP uses `border-top:6px solid text` (the ink cap).
- **Q:** `.qt-drawer {border-left:2px solid text}`

Drift **H** in width.

**P33 Phone sheet [Sheet]**

SL Phone ×8, AP Phone-Agent ×4, SP Phone-Card dock ×4.
- **D:** `border-radius:lg lg 0 0; box-shadow:0 -12px 32px -8px ground` with a grab handle `44×5px; radius 3px; faint`.
- **P:** `border-top:3px double text` (SL: `2px solid text`).
- **S:** `border-top:6px solid text` (AP) or `3px solid rule` (SL). The SL scrim is a 32px ink strip.
- **Q:** `border-top:3px solid text` (AP) or `2px` (SL).

Drift **M**.

**P34 Scrim**

All overlays. Five recipes (§3.2).

**P35 Toast [Toast]**

SP Dlg-Reconnect, SL Collection ×4, AP States plus 19 shared.
- **D:** `.vk-toast`, a primary pill. AP's newer form is a surface card with an icon.
- **S:** `.ar-toast {padding:4px 0 4px 14px; border-left:4px solid text; 400 17px/1.4 serif}` with a bold underlined action.

Drift **M**.

**P36 Notice: alert, error, ok and secret [Notice]**

SP Card-States ×4, SL SignIn/Upload/States, AP States, SW States.
- **D:** `.ds-alert {radius sm; bg signal-wash; inset 0 0 0 2px signal}` when a person must act. AP `.alertbox {inset 0 0 0 2px text}` for an error without action.
- **P:** `.ps-alert {border-left:3px signal; bg signal-wash}`.
- **S:** `.ss-alert {1.5px rule; bg bg}`.
- **Q:** `.qs-alert {3px solid signal}`, ok `{success-text border; success-wash}`.

Drift **M**.

**P37 Empty state [EmptyState]**

SP Board-Empty plus states, SL Library/Collection, AP 16, SW States.
- **D:** `padding:32px; radius md; surface; inset 2px line; centred`.
- **P:** `italic display 1.25rem` with a top rule.
- **S:** `padding:24px 0; border-bottom:1px hair; 400 17px/1.45 serif`.
- **Q:** plain text with a top rule.

Drift **L**.

**P38 Loading state [Loading]**

SP Card-States, SL Viewer-States/SignIn/Upload, AP States, SW States.
- **D:** `.ds-sk {radius pill; raised; 14px}`, breathing 1.6s.
- **P:** `12px raised radius 2px`, fade 2.4s.
- **S:** shimmer `linear-gradient(90deg, soft 40%, hair 50%, soft 60%) 300% 1.4s linear`.
- **Q:** static.
- Spinner (AP): `36px; inset 0 0 0 4px raised; border-top:4px solid primary; 1s`.
- Indeterminate bar (SL SignIn): `6px pill`; Studio 4px square.

Drift **H**: three timings.

**P39 Load more [LoadMore]**

SL Library ×8, SP List-Quiet, AP Agents, SW Runs.
- Centred secondary button; Paper adds a top rule.
- Quiet: `.qt-more {min-height:48px; 2px text border}`.
- Studio: the `ar-btn` sits right-aligned in the keys row.

Drift **L**.

**P40 Needs-you banner [NeedsYou]**

SP Card/Board/Operate, AP Agent ×4 + Tabs + phones, SW Run (verdict "Needs yours").
- **D:** a pill on `color-mix(surface 80%)` with a signal count chip, or signal-wash plus `inset 2px signal`.
- **P:** an italic ruled line with an uppercase signal-text label.
- **S:** `border-left:4px solid signal` with serif 17px.
- **Q:** `border:2px solid signal` with bold signal-text.

Drift **H**.

**P41 Meter [Meter]**

SP Card/CardPage/Spend/Projects, SL Upload, AP tiles, SW Rubric scores.
- **D:** `8px pill line` with a success fill.
- **P:** `4px line` with a text fill.
- **S:** segmented `grid` 8px s7 with off segments `inset 1px hair`.
- **Q:** `inset 1px text` 8px with a text fill.

Drift **M**: the Spend fill is primary vs success.

### 1.6 Left product-local, not in vibekit

These pass the recurrence rule inside one product only, and their structure is domain-specific. They build on vibekit primitives but are not shared:
- SP board lanes and card tile (`dl-tile`, `pp-story`);
- SL file viewer reading column, TOC, version list, diff, upload dropzone and redaction;
- AP log/terminal (`.log`, `.term`; one background decision noted in §3.2) and roster node cards;
- SW span waterfall (`wf-*`, 8 artboards), transcript step (`tx-*`, 7) and rubric editor.

SL's dropzone and sign-in panel use `Field`, `Button` and `Notice`.

---

## 2. The library

### 2.1 Rendering contract: one component, four forms

Every component reads the vibe once and renders one of two ways. Each component's entry below names its mode.

- **Mode C (CSS-scoped):** the DOM is identical in every vibe and only the CSS differs. Base rules use `.vk-<name>`. Per-vibe rules use `:where([data-vibe="<vibe>"]) .vk-<name>…`, so they add no specificity over the base and a product's single-class override still wins.
- **Mode T (template):** the structure differs (different elements or a different order), so the component renders a per-vibe internal template. Files live in `src/lib/components/<name>/<Name>.<Vibe>.svelte`. The public `src/lib/components/<Name>.svelte` picks one with:

  ```svelte
  <script lang="ts">
    import { useVibe } from '../appearance/context.js';
    import Daylight from './tabs/Tabs.Daylight.svelte'; // …Paper, Studio, Quiet
    const FORMS = { daylight: Daylight, paper: Paper, studio: Studio, quiet: Quiet } as const;
    let props: TabsProps = $props();
    const vibe = useVibe();
    const Form = $derived(FORMS[vibe.current]);
  </script>
  <Form {...props} />
  ```

  All four forms take the same `<Name>Props` type, exported from `src/lib/components/<name>/types.ts`, and render the same accessible tree. Tests in §4.4 assert the ARIA snapshot is identical across vibes.

**Vibe source.** There is a new module `src/lib/appearance/context.ts`:

```ts
export interface VibeState { readonly current: Vibe; readonly theme: Theme }
export function provideVibe(get: () => { vibe: Vibe; theme: Theme }): void; // setContext
export function useVibe(): VibeState; // getContext, falling back to document.documentElement.dataset (client) or 'daylight'/'light' (server)
```

There is a new component `VibeRoot.svelte` with props `{ vibe: Vibe; theme: Theme; children: Snippet }`. It calls `provideVibe`, and on mount and on change sets `data-vibe` and `data-theme` on `<html>`. Products already resolve the vibe server-side from the host-only cookie (`docs/usage.md`), so they render `<VibeRoot>` in the root `+layout.svelte`. SSR then emits the right template, and a vibe change on the client swaps templates without a reload.

**CSS files.**
- Each component gets `src/lib/styles/components/<name>.css`.
- `src/lib/styles/components.css` becomes a list of `@import "./components/<name>.css";` in alphabetical order. It stays inside `@layer vk.components`.
- Mode T components still keep all their CSS in that file, never in `<style>` blocks. This keeps the "usable without Svelte" promise (the classes are the API) and the `tests/styles.test.ts` rule of no raw hex.
- Template class names are `.vk-<name>--<vibe>` on the root and BEM children `.vk-<name>__<part>`.

**Shared rules** in `base.css`, replacing the mockup bolt-ons:

```css
.vk-button, .vk-tabs__item, .vk-iconbutton--labelled, .vk-chip { white-space: nowrap; flex-shrink: 0; }
:where(.vk-button, .vk-iconbutton) { color: var(--_fg); background: var(--_bg); } /* colours come from component-private vars, so a container's `a { color }` can't repaint them */
```

**Hit areas.** Any control drawn smaller than 44px (Studio `sm` button 36px, tx-cite 36px, kbd-sized links) gets the shared helper:

```css
.vk-hit { position: relative; }
.vk-hit::after { content: ""; position: absolute; inset: 50% auto auto 50%; width: max(100%, var(--vk-target-min)); height: max(100%, var(--vk-target-min)); transform: translate(-50%, -50%); }
```

### 2.2 Component list

There are 34 public components: 8 rewritten, 26 new.

| # | Component | Mode | Status | Patterns | Consumers (artboards) |
|---|---|---|---|---|---|
| 1 | VibeRoot | — | new | — | every app root |
| 2 | AppShell | T | new | P1–P3 | every desktop page (SP 36, SL 30, AP 19, SW 23) |
| 3 | AppNav | T | new | P1 | same |
| 4 | Masthead | T | new | P2, P25 | same |
| 5 | StatusLine | T | new | P3 | same |
| 6 | PhoneTabBar | T | new | P4 | all `*-Phone-*` (32) |
| 7 | PhoneHeader | T | new | P5 | all `*-Phone-*` (32) |
| 8 | Button | C | rewrite | P6 | 116 |
| 9 | IconButton | T | new | P7 | 90 |
| 10 | Tabs | T | new | P8 | 80 |
| 11 | Segmented | T | rewrite | P9 | 61 |
| 12 | QuickFilter | T | new | P9, P20 | SP Board/List/Operate/Phone-Board ×4, SL Library/Phone-Library ×4, SW Runs ×4 |
| 13 | Field | C | rewrite | P10 | 77 |
| 14 | Choice | C | new | P11 | 31 |
| 15 | CommandField | T | new | P12 | every shell |
| 16 | CommandPalette | C | new | P12 | SP-Dlg-Palette, AP-Dlg-Palette, SW (`ws-cmd`) |
| 17 | Kbd | C | new | P13 | 67 |
| 18 | CopyId | T | new | P14 | 45 |
| 19 | Disclosure | T | new | P15 | 63 |
| 20 | Menu | C | new | P16 | 48 |
| 21 | DataTable | T | new | P17 | 62 |
| 22 | FactList | C | new | P18 | 55 |
| 23 | PageHead | T | new | P19 (non-Studio), P30 | every page |
| 24 | Hero | T | new | P19 | SP 10, SL 12, AP 6, SW 8 |
| 25 | FigureRow | T | new | P22 | 35 |
| 26 | SmallMultiples | T | new | P20, P21 | SP Board/Phone-Board, SL Library/Phone-Library, AP Overview/Phone-Overview, SW Runs/Phone-Runs (×4 vibes each) |
| 27 | StageTrack | T | rewrite | P23 | 26 |
| 28 | StateLabel | T | new (absorbs StatusPill) | P24, P25 | 98 |
| 29 | AgentName | T | new | P26 (with Face) | 108 |
| 30 | Face | C | keep, extend | P26 | 108 |
| 31 | AgentQuote | T | new | P27, P40 | 46 |
| 32 | Footnotes (+ FootnoteRef) | T | new | P28 | 20 Studio artboards |
| 33 | SectionHeader | T | new | P29 | 72 |
| 34 | Overlay (Dialog / Drawer / Sheet) | T | new | P31–P34 | 39 |
| 35 | Toast | T | rewrite | P35 | 25 |
| 36 | Notice | C | new | P36 | 20 |
| 37 | EmptyState | T | new | P37 | 24 |
| 38 | Loading | C | new | P38 | 14 |
| 39 | LoadMore | C | new | P39 | 13 |
| 40 | Meter | T | new | P41 | 22 |
| — | Sky | C | keep | — | Daylight |

That is 40 rows: 34 components plus VibeRoot, plus FootnoteRef, Dialog/Drawer/Sheet and Sky, which ship as separately exported names. `StatusPill` stays exported as a deprecated alias of `StateLabel` with `form="pill"` for one minor release.

### 2.3 Shared types

`src/lib/components/types.ts`:

```ts
export type State = 'needs' | 'working' | 'thinking' | 'queued' | 'blocked' | 'stopped' | 'failed' | 'done' | 'resting' | 'off';
export type Tone = 'needs' | 'good' | 'neutral' | 'quiet';
export interface NavItem { id: string; label: string; href: string; icon: Snippet | Component; count?: number; countIsNeeds?: boolean; current?: boolean; kbd?: string }
export interface Option<T extends string> { value: T; label: string; count?: number; disabled?: boolean }
```

The failure rule: `State` has no colour of its own except `needs`. `failed` and `stopped` render in ink with the word, and an icon where the form shows icons (§3.3).

### 2.4 Components

For each component: API (Svelte 5 runes `$props()`, snippets, callback props `on<event>`), per-vibe forms with canonical CSS, states, accessibility, and consumers. Canonical declarations use tokens only. `--vk-scrim`, `--vk-shadow-*`, `--vk-hatch-blocked`, `--vk-color-select` and `--vk-live-halo` are defined in §3.

---

#### 2 AppShell (T)

```ts
interface AppShellProps {
  product: Product;
  nav: Snippet;           // usually <AppNav>
  masthead: Snippet;      // usually <Masthead>
  children: Snippet;      // main
  aside?: Snippet;        // drawer slot for side panels (SP card, SW span margin)
  status?: Snippet;       // <StatusLine>
  phone?: { header: Snippet; tabbar: Snippet }; // used below 640px
  skipLabel?: string;     // default 'Skip to content'
}
```

Layout per vibe:
- **D:** `display:grid; grid-template-columns:88px minmax(0,1fr); gap:16px; padding:12px`. The rail floats; the masthead sits inside `<Sky>`.
- **P:** `grid-template-rows:auto 1fr auto`, with the nav inside the masthead and a `max-width:1240px; margin-inline:auto; padding-inline:40px` column.
- **S:** `grid-template-columns:64px minmax(0,1fr) [aside] auto; grid-template-rows:auto 1fr auto`. The rail spans all rows. Main `padding:0 40px`. The aside has `border-left:1px solid var(--vk-color-rule)`.
- **Q:** a single column, `max-width:72ch; margin-inline:auto; padding-inline:32px`, with the skip link visible on focus.

Below 640px (`MediaQuery('max-width: 639.98px')`), every vibe renders `phone.header`, then `children`, then `phone.tabbar`.

Accessibility: `<a class="vk-visually-hidden-focusable" href="#main">` first. Landmarks: `<nav aria-label="{Product}">`, `<header>`, `<main id="main">`, `<footer>` (status).

#### 3 AppNav (T)

```ts
interface AppNavProps { label: string; items: NavItem[]; account: { initials: string; name: string; href?: string; menu?: Snippet }; appearance?: Snippet }
```

**D:** a rail.
```css
.vk-appnav--daylight { flex: 0 0 88px; display: flex; flex-direction: column; gap: var(--vk-space-2); padding: var(--vk-space-3) 8px; border-radius: var(--vk-radius-lg); background: var(--vk-color-surface); box-shadow: var(--vk-shadow-rail); }
.vk-appnav--daylight .vk-appnav__item { width: 72px; height: 64px; display: grid; place-items: center; gap: 4px; border-radius: var(--vk-radius-md); font: 600 13px/1 var(--vk-font-body); color: var(--vk-color-muted); }
.vk-appnav--daylight .vk-appnav__item[aria-current="page"] { background: var(--vk-color-raised); color: var(--vk-color-text); font-weight: 700; box-shadow: inset 0 0 0 2px var(--vk-color-primary); }
.vk-appnav__count { position: absolute; top: 3px; right: 3px; min-width: 20px; height: 20px; padding: 0 5px; border-radius: var(--vk-radius-pill); background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg); font: 800 12px/20px var(--vk-font-body); }
```
The count background is `--vk-color-signal-text`, not `--vk-color-signal`, for contrast (§3.4).

**P:** a section bar.
```css
.vk-appnav--paper { display: flex; border-top: 1px solid var(--vk-color-text); border-bottom: 3px double var(--vk-color-text); }
.vk-appnav--paper .vk-appnav__item { min-height: 44px; padding: 0 18px; font: 400 15px/1 var(--vk-font-body); }
.vk-appnav--paper li + li { border-left: 1px solid var(--vk-color-line); }
.vk-appnav--paper .vk-appnav__item[aria-current="page"] { font: italic 500 18px/1 var(--vk-font-display); text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 6px; }
.vk-appnav--paper .vk-appnav__count { color: var(--vk-color-signal-text); font-weight: 700; } /* rendered as "(3)" after the label */
```

**S:** an ink rail.
```css
.vk-appnav--studio { flex: 0 0 64px; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 0; background: var(--vk-color-text); color: var(--vk-color-bg); }
.vk-appnav--studio .vk-appnav__item { width: 44px; height: 44px; display: grid; place-items: center; border-radius: var(--vk-radius-sm); }
.vk-appnav--studio .vk-appnav__item[aria-current="page"] { background: var(--vk-color-bg); color: var(--vk-color-text); }
.vk-appnav--studio .vk-appnav__count { position: absolute; top: 2px; right: 2px; min-width: 18px; height: 18px; border-radius: 0; background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg); font: 800 12px/18px var(--vk-font-body); }
.vk-appnav--studio .vk-appnav__tip { position: absolute; left: calc(100% + 8px); padding: 6px 10px; background: var(--vk-color-text); color: var(--vk-color-bg); font: 700 13px/1 var(--vk-font-body); white-space: nowrap; }
.vk-appnav--studio .vk-appnav__mark { width: 40px; height: 40px; display: grid; place-items: center; background: var(--vk-color-bg); color: var(--vk-color-text); font: 900 20px/1 var(--vk-font-display); }
.vk-appnav--studio .vk-appnav__account { width: 44px; height: 44px; border: 1.5px solid var(--vk-color-bg); font: 800 12px/1 var(--vk-font-body); }
```

**Q:** a link row.
```css
.vk-appnav--quiet { display: flex; flex-wrap: wrap; gap: 4px 20px; font: 400 18px/1.6 var(--vk-font-body); }
.vk-appnav--quiet .vk-appnav__item { min-height: 44px; display: inline-flex; align-items: center; text-decoration: underline; text-underline-offset: 4px; }
.vk-appnav--quiet .vk-appnav__item[aria-current="page"] { font-weight: 700; text-decoration: none; }
.vk-appnav--quiet .vk-appnav__count { font-weight: 700; color: var(--vk-color-signal-text); } /* "Overview (1 needs you)" */
```

States: current, hover (D raised; S `color-mix` none, the tooltip shows; P/Q underline thickness 2px), focus (base ring), count.

Accessibility:
- `<nav aria-label={label}><ul>` with `<a aria-current="page">`.
- An icon-only item (S) carries the label as visually-hidden text, not only in the tooltip.
- The tooltip has `role="tooltip"` and is referenced by `aria-describedby` only when it carries a kbd hint.
- The count's text is "{n} need you" in visually-hidden text.

#### 4 Masthead (T)

```ts
interface MastheadProps {
  eyebrow: string;                 // "SUPERPIPELINE · BOARD"
  title: string;
  switcher?: { label: string; onopen: () => void };   // title becomes a button with a chevron
  dateline?: string;               // Paper italic dateline / Studio right-hand mono
  command?: Snippet;               // <CommandField>
  live?: { state: 'live' | 'reconnecting' | 'offline'; label?: string };
  actions?: Snippet;               // primary <Button>
  tabs?: Snippet;                  // <Tabs> row under the masthead
}
```

**D:**
```css
.vk-masthead--daylight { display: flex; align-items: center; gap: 16px; min-height: 72px; padding: 0 var(--vk-space-4); }
.vk-masthead--daylight .vk-masthead__title { font: 700 28px/1.1 var(--vk-font-display); letter-spacing: -0.015em; color: var(--vk-sky-text); }
.vk-masthead--daylight .vk-masthead__eyebrow { font: 700 12px/1.2 var(--vk-font-body); letter-spacing: .02em; color: var(--vk-sky-text); opacity: .8; }
```

**P:**
```css
.vk-masthead--paper .vk-masthead__name { font: 600 32px/1 var(--vk-font-display); font-variant-caps: all-small-caps; letter-spacing: .07em; }
.vk-masthead--paper .vk-masthead__dateline { font: italic 400 17px/1.3 var(--vk-font-display); color: var(--vk-color-muted); }
.vk-masthead--paper .vk-masthead__title { font: 500 46px/1.04 var(--vk-font-display); }
```
The Paper masthead uses `eyebrow`'s product word as the nameplate and `title` as the edition title.

**S:**
```css
.vk-masthead--studio { display: flex; align-items: center; gap: 24px; min-height: 76px; padding: 0 24px 0 40px; border-bottom: 1px solid var(--vk-color-rule); }
.vk-masthead--studio .vk-masthead__eyebrow { font: 700 12px/1.25 var(--vk-font-body); letter-spacing: .1em; text-transform: uppercase; color: var(--vk-color-muted); }
.vk-masthead--studio .vk-masthead__title { font: 800 28px/1.05 var(--vk-font-display); font-stretch: 80%; }
```

**Q:**
```css
.vk-masthead--quiet { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 24px; min-height: 60px; padding: 6px 32px 10px; border-bottom: 1px solid var(--vk-color-line); font: 400 18px/1.6 var(--vk-font-body); }
.vk-masthead--quiet .vk-masthead__title { font: 700 18px/1.4 var(--vk-font-body); }
```

Live (LiveDot, inside the Masthead):
- **D:** `min-height:30px; padding:0 12px; border-radius:var(--vk-radius-pill); background:var(--vk-color-success-wash); color:var(--vk-color-success-text); font:700 14px/1`. Dot `8px circle success; box-shadow:0 0 0 3px var(--vk-live-halo)`.
- **P:** dot `8px circle success; box-shadow:0 0 0 3px var(--vk-color-success-wash)`; label 15px.
- **S:** `8px square var(--vk-color-stage-text)`; label `700 12px .1em uppercase`.
- **Q:** the word in `700; color:success-text`.
- `reconnecting`: the dot becomes `inset 0 0 0 2px muted`.
- `offline`: the word is in ink. It never uses signal unless the product asks the person to act.

Accessibility: `<header>`. The title is `<h1>`, or a `<button aria-haspopup="dialog">` wrapping the h1 text when there is a switcher. Live is `role="status"`.

Consumers: every desktop page.

#### 5 StatusLine (T)

```ts
interface StatusLineProps { items: { text: string; tone?: 'needs' | 'plain' }[] }
```
- **S:** `.vk-statusline--studio { min-height:32px; display:flex; gap:24px; align-items:center; padding:0 40px; border-top:1px solid var(--vk-color-rule); font:500 12px/1.4 var(--vk-font-mono); color:var(--vk-color-muted) }`. A `needs` item gets `color:var(--vk-color-signal-text); font-weight:600`.
- **D/P/Q:** a footer.
  - base: `border-top:1px solid var(--vk-color-line); margin-top:var(--vk-space-7); padding:var(--vk-space-5) 0; font-size:var(--vk-text-sm); color:var(--vk-color-muted)`, items joined with " · "
  - Paper: `border-top-color:var(--vk-color-text)`
  - Quiet: `font-size:16px`

Accessibility: `<footer>`; not live.

#### 6 PhoneTabBar (T)

```ts
interface PhoneTabBarProps { label: string; items: NavItem[] }  // 4 or 5 items
```
Base: `position:sticky; bottom:0; z-index:5; display:grid; grid-template-columns:repeat(var(--n), minmax(0,1fr))`, where `--n` is set from `items.length`.

**D:** the floating form, taken from the SP Board form, not the flat SP card form.
```css
bottom: 12px; gap: 4px; margin: auto 12px 12px; padding: 6px; border-radius: var(--vk-radius-lg); background: var(--vk-color-surface); box-shadow: 0 0 0 1px var(--vk-color-line), var(--vk-shadow-pop);
/* tab */ min-height: 58px; flex-direction: column; gap: 4px; border-radius: var(--vk-radius-md); font: 600 13px/1 var(--vk-font-body); color: var(--vk-color-muted);
/* current */ background: var(--vk-color-raised); color: var(--vk-color-text); font-weight: 700; box-shadow: inset 0 0 0 2px var(--vk-color-primary);
/* count */ top: 3px; left: calc(50% + 6px); min-width: 20px; height: 20px; border-radius: var(--vk-radius-pill); background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg); font: 800 12px/20px var(--vk-font-body); box-shadow: 0 0 0 2px var(--vk-color-surface);
```

**P:**
```css
background: var(--vk-color-bg); border-top: 3px double var(--vk-color-text);
/* tab */ min-height: 56px; font: 600 15px/1 var(--vk-font-body); font-variant-caps: all-small-caps; letter-spacing: .05em; /* a + a */ border-left: 1px solid var(--vk-color-line);
/* current */ font: italic 500 17px/1 var(--vk-font-display); font-variant-caps: normal; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 6px;
/* count */ color: var(--vk-color-signal-text); font-weight: 700;
```

**S:**
```css
background: var(--vk-color-text); color: var(--vk-color-bg);
/* tab */ min-height: 58px; font: 500 11px/1 var(--vk-font-mono); letter-spacing: .04em; text-transform: uppercase;
/* current */ background: var(--vk-color-bg); color: var(--vk-color-text); box-shadow: inset 0 3px 0 var(--vk-color-text);
/* count */ min-width: 18px; height: 18px; border-radius: 0; background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg); font: 800 12px/18px var(--vk-font-body);
```

**Q:**
```css
background: var(--vk-color-bg); border-top: 2px solid var(--vk-color-text);
/* tab: no icon */ min-height: 54px; font: 400 15px/1.2 var(--vk-font-body); text-decoration: underline; text-underline-offset: 4px;
/* current */ font-weight: 700; text-decoration: none;
```

Accessibility: `<nav aria-label>` with `aria-current="page"`. The count reads as text ("3 need you", visually hidden in D and S).

Consumers: all 32 phone artboards.

#### 7 PhoneHeader (T)

```ts
interface PhoneHeaderProps { title: string; eyebrow?: string; back?: { href: string; label: string }; actions?: Snippet; below?: Snippet /* greeting, tabs */ }
```
- **D:** `margin:8px 8px 0; padding:8px 8px 8px 10px; border-radius:var(--vk-radius-lg)` inside `<Sky>`. Title `700 22px/1.1 var(--vk-font-display)`. Actions are pill IconButtons with lift.
- **P:** `margin:8px 16px 0; border-top:1px solid var(--vk-color-text); border-bottom:3px double var(--vk-color-text)`. Nameplate `600 24px/1 display all-small-caps .07em`. Back link `italic 17px display`.
- **S:** `min-height:56px; padding:8px 4px 8px 16px; border-bottom:1px solid var(--vk-color-rule)`. Eyebrow `700 11.5px .1em uppercase muted`. Title `800 22px/1.05 display; font-stretch:80%; white-space:normal`. Mark `40px ink square`.
- **Q:** `padding:6px 16px 10px; border-bottom:1px solid var(--vk-color-line); font-size:17px`. Actions are underlined text links. Back renders as "← {label}".

Accessibility: `<header>` with the title as `<h1>`. Back is a real `<a>`.

#### 8 Button (C)

```ts
type ButtonProps = (HTMLButtonAttributes | HTMLAnchorAttributes) & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'signal' | 'danger';   // default 'primary'
  size?: 'md' | 'sm';               // sm = 36px drawn, 44px hit (vk-hit)
  href?: string;                    // renders <a>
  busy?: boolean;                   // aria-busy, disabled, keeps width, shows "Working…" when busyLabel set
  busyLabel?: string;
  pressed?: boolean;                // aria-pressed toggle
  icon?: Snippet;                   // leading icon
  children: Snippet;
};
```
`signal` is reserved for "reply to the person-needed"; it is never a call to action for ordinary work. `danger` is an ink outline (§3.3).

Base (all vibes):
```css
.vk-button { --_bg: var(--vk-color-primary); --_fg: var(--vk-color-primary-fg); --_edge: transparent; display: inline-flex; align-items: center; justify-content: center; gap: var(--vk-space-2); min-height: var(--vk-target-min); padding: 0 var(--vk-space-5); border: 0; border-radius: var(--vk-radius-md); box-shadow: inset 0 0 0 var(--_edge-w, 0) var(--_edge), 0 var(--vk-lift) 0 var(--vk-color-ground); font: 600 var(--vk-text-md)/1 var(--vk-font-body); white-space: nowrap; flex-shrink: 0; cursor: pointer; text-decoration: none; }
.vk-button--secondary { --_bg: var(--vk-color-surface); --_fg: var(--vk-color-text); --_edge: var(--vk-color-line); --_edge-w: 2px; }
.vk-button--quiet { --_bg: transparent; --_fg: var(--vk-color-text); padding: 0 var(--vk-space-2); box-shadow: none; text-decoration: underline; text-underline-offset: 4px; }
.vk-button--signal { --_bg: var(--vk-color-signal-wash); --_fg: var(--vk-color-signal-text); --_edge: var(--vk-color-signal); --_edge-w: 2px; }
.vk-button--danger { --_bg: var(--vk-color-surface); --_fg: var(--vk-color-text); --_edge: var(--vk-color-text); --_edge-w: 2px; box-shadow: inset 0 0 0 2px var(--_edge); }
.vk-button--sm { min-height: 36px; padding: 0 var(--vk-space-3); font-size: var(--vk-text-sm); }
.vk-button:disabled, .vk-button[aria-disabled="true"] { opacity: .5; cursor: not-allowed; }
.vk-button[aria-busy="true"] { opacity: 1; --_bg: var(--vk-color-raised); --_fg: var(--vk-color-muted); --_edge: var(--vk-color-line); --_edge-w: 2px; }
.vk-button[aria-pressed="true"] { --_bg: var(--vk-color-primary); --_fg: var(--vk-color-primary-fg); }
.vk-button:active { transform: translateY(1px); }
```

Per vibe:

| Vibe | radius | primary | secondary edge | danger edge | font | min-height | padding |
|---|---|---|---|---|---|---|---|
| Daylight | md (18) | primary + 3px lift | 2px line + lift | 2px text | 600 md | 44 | 0 24px |
| Paper | sm (4) | primary, no lift | 1px text | 2px text | 600 15px | 44 | 0 16px |
| Studio | sm (2) | text bg / bg fg | 1.5px rule; hover invert | 2.5px rule, transparent bg | 800 14px (secondary 700) | 44 (sm 36 + vk-hit) | 0 16px (sm 0 12px) |
| Quiet | sm (2) | primary | 2px text on surface | 2px text | 700 17px | 48 | 0 20px |

```css
:where([data-vibe="paper"]) .vk-button { padding: 0 16px; font-size: 15px; }
:where([data-vibe="paper"]) .vk-button--secondary { --_bg: transparent; --_edge: var(--vk-color-text); --_edge-w: 1px; }
:where([data-vibe="studio"]) .vk-button { padding: 0 16px; font: 800 14px/1 var(--vk-font-body); }
:where([data-vibe="studio"]) .vk-button--secondary { --_bg: transparent; --_edge: var(--vk-color-rule); --_edge-w: 1.5px; font-weight: 700; }
:where([data-vibe="studio"]) .vk-button--secondary:hover { --_bg: var(--vk-color-text); --_fg: var(--vk-color-bg); }
:where([data-vibe="studio"]) .vk-button--danger { --_bg: transparent; box-shadow: inset 0 0 0 2.5px var(--vk-color-rule); }
:where([data-vibe="studio"]) .vk-button--sm { padding: 0 12px; font-size: 13px; }
:where([data-vibe="quiet"]) .vk-button { min-height: 48px; padding: 0 20px; font: 700 17px/1 var(--vk-font-body); }
:where([data-vibe="quiet"]) .vk-button--secondary { --_edge: var(--vk-color-text); }
```
Daylight uses the base. Radius and lift come from tokens (Paper and Quiet lift is 0). Focus keeps the existing `box-shadow: var(--vk-focus), …` per variant.

Accessibility:
- `<button type="button">` by default; `<a>` when `href` is set.
- `busy` sets `aria-busy="true"` plus `disabled` and keeps the label. `busyLabel` replaces the text, and an `aria-live="polite"` sibling announces it.
- `danger` must carry a verb label. The test asserts the label is not a bare "Delete" without an object (copy rule from `copy/messages.ts`).

Consumers: every page and dialog. The destructive variant is used on SL Record ×4, SL Dialogs, SL Upload, AP-Dlg-Palette/Sheet-*, SP Workspace-*, SP Phone-Card ×4 and SL Phone ×8. The SL phone red is replaced.

#### 9 IconButton (T)

```ts
interface IconButtonProps extends HTMLButtonAttributes { label: string; icon: Snippet; expanded?: boolean; href?: string; showLabel?: boolean /* label beside icon */ }
```
- **D/P/S:**
  - `width:44px;height:44px;display:inline-grid;place-items:center;border:0;border-radius:var(--vk-radius-sm);background:transparent;color:var(--vk-color-muted)`
  - hover: D/P `background:var(--vk-color-raised);color:var(--vk-color-text)`; S `background:var(--vk-color-text);color:var(--vk-color-bg)`
  - `[aria-expanded="true"]`: `color:var(--vk-color-text);box-shadow:inset 0 0 0 2px var(--vk-color-text)`
  - `showLabel`: `width:auto;padding:0 12px;gap:8px;display:inline-flex`
- **Q:** the template renders the label as text: `min-height:44px;padding:0 4px;text-decoration:underline;text-underline-offset:4px;color:var(--vk-color-text)`. There is no icon, which is the Quiet rule "nothing is icon-only".

Accessibility: `aria-label={label}` when the label is not visible. The icon has `aria-hidden="true"`.

#### 10 Tabs (T)

```ts
interface TabsProps<T extends string> { label: string; items: (Option<T> & { href?: string })[]; value: T; onchange?: (v: T) => void; mode?: 'links' | 'panels' }
```
- `mode="links"` (page navigation) renders `<nav><a aria-current="page">`.
- `mode="panels"` renders bits-ui `Tabs`, which gives `role="tablist"`, roving tabindex, arrow keys and Home/End.

Forms:
- **D:**
  - track `display:inline-flex; gap:4px; padding:4px; border-radius:var(--vk-radius-pill); background:color-mix(in oklch, var(--vk-color-surface) 55%, transparent)`
  - item `min-height:44px; padding:0 16px; border-radius:var(--vk-radius-pill); font:600 15px/1 var(--vk-font-body)`
  - current `background:var(--vk-color-surface); box-shadow:inset 0 0 0 2px var(--vk-color-primary)`
- **P:**
  - row `display:flex; gap:24px; border-bottom:1px solid var(--vk-color-line)`
  - item `min-height:44px; font:600 17px/1 var(--vk-font-body); font-variant-caps:all-small-caps; letter-spacing:.09em; border-bottom:2px solid transparent; margin-bottom:-1px`
  - current `border-bottom-color:var(--vk-color-text)`
  - count `font:italic 400 15px var(--vk-font-display)`
- **S:**
  - row `display:flex; gap:22px; border-bottom:1px solid var(--vk-color-line)`
  - item `position:relative; min-height:44px; padding:0; font:700 14px/1 var(--vk-font-body); color:var(--vk-color-muted)`
  - current `color:var(--vk-color-text)` and `::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:3px;background:var(--vk-color-text)}`
  - count `font:500 12px var(--vk-font-mono)`
- **Q:**
  - row `display:flex; flex-wrap:wrap; gap:4px 20px`
  - item `min-height:44px; font:400 17px/1 var(--vk-font-body); text-decoration:underline; text-underline-offset:4px`
  - current `font-weight:700; text-decoration:none`
  - count in parentheses

Consumers: SP Board/List/Projects tabs, SP Card tabs (Studio), SL Viewer tabs, AP Agent tabs (Tabs-A/B), SW run tabs (Trace · Transcript · Logs · Errors · Verdicts · Attempts).

#### 11 Segmented (T)

```ts
interface SegmentedProps<T extends string> { label: string; options: Option<T>[]; value?: T /* $bindable */; name?: string; form?: 'auto' | 'box' }
```
Built on bits-ui `RadioGroup`, which gives `role="radiogroup"`, arrow keys and a hidden native input for forms. `form="box"` asks Studio for its boxed form; the other vibes ignore it.

- **D:** the existing `vk.css` pill (track `raised; radius pill; padding 4px`, item 44px, checked surface plus lift).
- **P:** `display:inline-flex; gap:18px`. Item `min-height:44px; font:500 16px/1; text-decoration:none`; checked `font-weight:700; text-decoration:underline; text-decoration-thickness:2px; text-underline-offset:6px`.
- **S, auto:** run-in. Item `min-height:44px; padding:0 14px; border-left:1px solid var(--vk-color-line); font:700 14px/1; color:var(--vk-color-muted)`, first item `border-left:0; padding-left:0`. Checked `color:var(--vk-color-text); text-decoration:underline; text-decoration-thickness:3px; text-underline-offset:8px`.
- **S, box:** `display:inline-flex; border:1px solid var(--vk-color-rule)`. Item `min-height:36px; padding:0 12px; font:700 12px/1; letter-spacing:.08em; text-transform:uppercase` plus `vk-hit`, with `+ item {border-left:1px solid var(--vk-color-rule)}`. Checked `background:var(--vk-color-text); color:var(--vk-color-bg)`.
- **Q:** `gap:20px`. Item underlined 17px with a visible native-looking 20px radio ring drawn by `::before` (`inset 0 0 0 2px text; border-radius:50%`); checked fills it with `inset 0 0 0 6px text` and bold text.

Consumers: SP Operate/List/Settings/Projects/Spend/NewCard priority, SL Viewer rendered/source, AP Agents grouped/one-list, AP Settings, SW Run group-by and time controls.

#### 12 QuickFilter (T)

```ts
interface QuickFilterProps<T extends string> { label: string; options: (Option<T> & { tone?: State })[]; value: T; onchange: (v: T) => void; total?: number }
```
Renders the same radiogroup semantics as Segmented, with counts.
- **D:** pill chips. `min-height:44px; padding:0 16px; border-radius:var(--vk-radius-pill); background:var(--vk-color-surface); box-shadow:inset 0 0 0 2px var(--vk-color-line); font-weight:600`. Checked `background:var(--vk-color-primary); color:var(--vk-color-primary-fg); box-shadow:0 var(--vk-lift) 0 var(--vk-color-ground)`. A needs count is `color:var(--vk-color-signal-text)` inside the chip.
- **P:** text tabs. `min-height:48px; padding:0 16px; border-bottom:3px solid transparent; font-weight:500`, count `font-family:var(--vk-font-display)`. Checked `font-weight:700; border-bottom-color:var(--vk-color-text)`.
- **S:** delegates to `SmallMultiples` with `interactive`. Each multiple is a radio whose figure is the count.
- **Q:** underlined text buttons, `text-underline-offset:4px`. Checked `font-weight:700; text-decoration-thickness:3px`, using thickness rather than an inset shadow (SL phone form).

Phone: horizontal scroller `overflow-x:auto; scrollbar-width:none; padding:2px 16px 6px`. Studio uses a 4-column grid.

#### 13 Field (C)

```ts
type FieldProps = { id: string; label: string; hint?: string; error?: string; control?: 'input' | 'textarea' | 'select'; type?: 'text' | 'email' | 'password' | 'search' | 'number'; value?: string /* $bindable */; options?: Option<string>[]; rows?: number; maxlength?: number; counter?: boolean } & HTMLInputAttributes;
```
`counter` shows "0 / 8000" in mono, as on the SP card "Send back to work".

Base: as today, plus `textarea { min-height: 88px; padding: 10px var(--vk-space-4); resize: vertical; line-height: 1.5 }` and `select { appearance: none; padding-right: 40px; background-image: <chevron mask> }`. The chevron is an inline SVG `mask-image` with `background-color: currentColor`, so there is no raw colour.

| Vibe | border | radius | bg | height | font | label |
|---|---|---|---|---|---|---|
| Daylight | 2px faint | sm (12) | surface | 44 | max(1rem,16px) body | 600 sm |
| Paper | 1px text | sm (4) | surface | 44 | 16px body | 600 sm |
| Paper, `inline` prop (SL dialogs) | `0 0 1.5px` text | 0 | transparent | 44 | 16px | 600 sm |
| Studio | 1px rule | 0 | raised | 44 | 400 16px | 700 12px muted |
| Quiet | 2px text | sm (2) | bg | 48 | 18px | 700 16px |

Invalid: `border-color:var(--vk-color-signal)`; Studio `border-width:2px`. The error text is `--vk-color-signal-text` with an icon.

Focus: `box-shadow: var(--vk-focus)` as today.

Accessibility (existing): label `for`, `aria-describedby` hint and error, `aria-invalid`. The counter is `aria-live="polite"` only when within 10% of the max.

#### 14 Choice (C)

```ts
interface ChoiceProps { type: 'radio' | 'checkbox'; name: string; value: string; checked?: boolean /* $bindable */; label: string; description?: string; card?: boolean; disabled?: boolean }
```
- Native control: `width:20px;height:20px;accent-color:var(--vk-color-primary)`.
- Card form: `min-height:44px;padding:10px 12px;border-radius:var(--vk-radius-md);box-shadow:inset 0 0 0 1px var(--vk-color-line)`. Checked (`:has(input:checked)`): `box-shadow:inset 0 0 0 2px var(--vk-color-primary);background:var(--vk-color-raised)`.
- Studio: `border-radius:0`, checked `inset 0 0 0 2px var(--vk-color-text)`.
- Quiet: `inset 0 0 0 2px var(--vk-color-text)` checked, label 18px.
- List-pick variant (`card` inside `role="radiogroup"` with `pick`): selected `box-shadow:inset 3px 0 0 var(--vk-color-text); background:var(--vk-color-raised)`. Used by the SL Dialogs picker, the AP Sheet pick list and the SP Move dialog.

#### 15 CommandField (T)

```ts
interface CommandFieldProps { placeholder: string; kbd?: string /* '⌘K' */; onopen: () => void }
```
A `<button>` that looks like a search field and opens CommandPalette.
- **D:** `min-height:44px; padding:0 8px 0 16px; border-radius:var(--vk-radius-pill); background:var(--vk-color-surface); box-shadow:0 var(--vk-lift) 0 var(--vk-color-ground); color:var(--vk-color-muted)`.
- **P:** `min-height:44px; border-bottom:2px solid var(--vk-color-faint); font:italic 400 17px var(--vk-font-display)`.
- **S:** `min-height:44px; min-width:420px; border-bottom:1.5px solid var(--vk-color-rule); font:400 16px var(--vk-font-body)`.
- **Q:** a text link, "Search or run a command (⌘K)".

Accessibility: `aria-haspopup="dialog"`, `aria-keyshortcuts="Meta+K Control+K"`.

#### 16 CommandPalette (C)

```ts
interface CommandPaletteProps { open: boolean /* $bindable */; label: string; groups: { heading: string; items: { id: string; label: string; hint?: string; kbd?: string; icon?: Snippet; onselect: () => void }[] }[]; empty?: string; footer?: Snippet }
```
Built on bits-ui `Command` inside `Overlay kind="dialog"`.

Rules:
- input `height:52px; font:500 19px/1 var(--vk-font-body)`; `:focus-within{box-shadow:inset 0 -2px 0 var(--vk-color-text)}`
- item `min-height:52px; padding:6px 10px; border-radius:var(--vk-radius-sm)`
- `[data-selected]{background:var(--vk-color-raised); box-shadow:inset 3px 0 0 var(--vk-color-text)}`
- group heading `700 12px/1.2; letter-spacing:.06em; text-transform:uppercase; color:muted`
- `mark{background:var(--vk-mood-done); color:var(--vk-face-ink)}`

Vibe overrides:
- **P:** heading `italic 400 15px var(--vk-font-display); text-transform:none`.
- **S:** heading `letter-spacing:.1em`.
- **Q:** selected `box-shadow:inset 0 0 0 2px var(--vk-color-text)`; `mark{background:none; text-decoration:underline; text-decoration-thickness:2px}`.

Accessibility: combobox and listbox per bits-ui. ↑/↓/Enter/Esc. Focus returns to the trigger.

#### 17 Kbd (C)

```ts
interface KbdProps { keys: string[] }  // renders <kbd> per key, joined by a thin space
```

| Vibe | declarations |
|---|---|
| Daylight | `padding:2px 8px; border-radius:var(--vk-radius-pill); background:var(--vk-color-raised); font:500 12px/1.2 var(--vk-font-mono)` |
| Paper | `padding:1px 6px; border:1px solid var(--vk-color-line); border-radius:var(--vk-radius-sm); font:400 12px/1.4 var(--vk-font-mono); color:var(--vk-color-faint)` |
| Studio | `padding:2px 5px; border:1px solid currentColor; border-radius:2px; font:500 11px/1 var(--vk-font-mono)` |
| Quiet | `padding:0; border:0; font:400 14px/1 var(--vk-font-mono); color:var(--vk-color-muted)` |

#### 18 CopyId (T)

```ts
interface CopyIdProps { value: string; label: string /* 'session id' */; display?: string /* truncated form */; oncopied?: () => void }
```
- The id: `font:400 12px/1.4 var(--vk-font-mono); color:var(--vk-color-muted); overflow-wrap:anywhere`. Studio uses `500 12.5px`.
- **D:** a 44×44 IconButton with `margin:-12px -10px -12px -6px`, so the inline line height is unchanged.
- **P:** an underlined "Copy" link, 14px.
- **S:** `"Copy {label}"`, `font:700 13.5px/1; text-decoration:underline; text-decoration-thickness:1.5px; text-underline-offset:3px` plus `vk-hit`.
- **Q:** an underlined "Copy" text link.
- After copying, the label reads "Copied" for 2s. An `aria-live="polite"` region says "Copied {label}".

Uses `navigator.clipboard.writeText`. When that rejects, it selects the text and announces "Press ⌘C to copy".

#### 19 Disclosure (T)

```ts
interface DisclosureProps { summary: string | Snippet; open?: boolean /* $bindable */; meta?: string; size?: 'section' | 'inline'; children: Snippet }
```
Renders native `<details>/<summary>` (keyboard and AT for free), with `list-style:none` and `::-webkit-details-marker{display:none}`.
- **D, section:** `min-height:56px; padding:0 16px; border-radius:var(--vk-radius-md); background:var(--vk-color-raised); font:700 17px/1.2 var(--vk-font-display)`. The chevron rotates **180°**, the canonical value (`transition: transform var(--vk-motion-fast)`).
- **D, inline:** `min-height:44px; text-decoration:underline; text-underline-offset:3px; font-weight:600`.
- **P, section:** `min-height:56px; border-top:1px solid var(--vk-color-text); font:500 1.2rem/1.2 var(--vk-font-display)`, meta italic.
- **S, section:** `min-height:60px; border-top:1.5px solid var(--vk-color-rule); font:800 14px/1.2` with a mono "+"/"–" glyph at the right.
- **S, inline:** `font:700 13.5px; text-decoration:underline; text-decoration-thickness:1.5px`.
- **Q:** `min-height:44px; font-weight:700; border-top:1px solid var(--vk-color-line)`, with a "Show"/"Hide" word instead of a glyph.

#### 20 Menu (C)

```ts
interface MenuProps { label: string; trigger: Snippet<[props: Record<string, unknown>]>; items: ({ label: string; kbd?: string; onselect: () => void; disabled?: boolean; danger?: boolean } | { separator: true } | { heading: string })[]; width?: number /* default 280 */ }
```
Built on bits-ui `DropdownMenu`.

Panel:
- base `padding:6px; border-radius:var(--vk-radius-md); background:var(--vk-color-surface); box-shadow:0 0 0 1px var(--vk-color-line), var(--vk-shadow-pop)`
- items `min-height:44px; padding:0 14px; border-radius:var(--vk-radius-sm); font-weight:600`
- highlighted `background:var(--vk-color-raised)`
- `danger` is ink with the word only

Vibe overrides:
- **P:** panel `border:1px solid var(--vk-color-text); border-radius:var(--vk-radius-sm); box-shadow:none`; highlighted `text-decoration:underline`.
- **S:** panel `border:1px solid var(--vk-color-rule); border-radius:0; box-shadow:var(--vk-shadow-pop)`; highlighted `background:var(--vk-color-text); color:var(--vk-color-bg)`.
- **Q:** panel `border:2px solid var(--vk-color-text); box-shadow:none`; highlighted `text-decoration:underline`.

#### 21 DataTable (T)

```ts
interface Column<R> { key: string; label: string; align?: 'start' | 'end'; numeric?: boolean; width?: string; sortable?: boolean; cell?: Snippet<[row: R]> }
interface DataTableProps<R> { label: string; columns: Column<R>[]; rows: R[]; rowKey: (r: R) => string; groups?: { label: string; count: number; rows: R[] }[]; selected?: string; needs?: (r: R) => boolean; index?: boolean /* Studio-style 01, 02 */; sort?: { key: string; dir: 'asc' | 'desc' }; onsort?: (key: string) => void; onrowopen?: (r: R) => void; keys?: string /* "J / K to move · ↵ to open" */; empty?: Snippet }
```
Renders a `<table>` with `<caption class="vk-visually-hidden">` and `scope` on headers. Sortable headers are `<button>` with `aria-sort`. The row-open action is a real link in the title cell: the row is not clickable as a whole, and the title link gets `::after{content:"";position:absolute;inset:0}` with `tr{position:relative}`. J/K roving is on rows with `tabindex="-1"` and focus on the title link.

- **D:**
  - `th{padding:8px 12px; border-bottom:2px solid var(--vk-color-line); font:700 13px/1.3 var(--vk-font-body); color:var(--vk-color-muted); text-align:start; position:sticky; top:0; background:var(--vk-color-bg)}`
  - `td{padding:12px; border-bottom:1px solid var(--vk-color-line)}`
  - `tr:hover td{background:var(--vk-color-raised)}`
  - needs: `td:first-child{box-shadow:inset 4px 0 0 var(--vk-color-signal)}`
  - selected: `background:var(--vk-color-raised)`
- **P:**
  - `th{border-bottom:1px solid var(--vk-color-text); font:italic 400 15px/1.3 var(--vk-font-display)}`
  - title cell `font:500 1.25rem/1.25 var(--vk-font-display)`
  - group heading row `font:600 1.625rem/1.2 var(--vk-font-display)`
  - needs: `inset 3px 0 0 var(--vk-color-signal)`
- **S:**
  - `th{height:30px; font:700 12px/1.3 var(--vk-font-body); color:var(--vk-color-muted); border-bottom:1px solid var(--vk-color-rule)}`
  - `td{padding:10px 10px 10px 0; border-bottom:1px solid var(--vk-color-line); font-size:14px}`
  - numeric `font:500 12.5px/1 var(--vk-font-mono); text-align:end`
  - index `font:500 12.5px var(--vk-font-mono); color:var(--vk-color-muted)`
  - selected `td{background:var(--vk-color-select)}` with first cell `box-shadow:inset 3px 0 0 var(--vk-color-text)`
  - group row `td{height:44px; border-bottom:1.5px solid var(--vk-color-rule)}` with count `900 28px/1 display; font-stretch:72%`
  - needs: the State column carries the signal square; no row edge
- **Q:**
  - `th{border-bottom:2px solid var(--vk-color-line); font:700 16px}`
  - sort button `min-height:48px; text-decoration:underline`, active not underlined
  - `td{padding:12px 8px; border-bottom:1px solid var(--vk-color-line); font-size:17px}`
  - needs `td:first-child{box-shadow:inset 5px 0 0 var(--vk-color-signal)}`

Phone: below 640px each vibe renders rows as a definition list per row; the template switches on the same media query as AppShell.

Consumers: SP List ×4, SP Board-Studio, SP Operate ×4, SP Workspace/Spend, SL Library/Collection-Studio, AP Admin-People/Services, AP Node(s), AP Runtimes-Activity, AP Agents-Studio, SW Runs ×4, SW Rubrics.

#### 22 FactList (C)

```ts
interface FactListProps { label?: string; items: { term: string; value: string | Snippet; note?: string }[]; layout?: 'grid' | 'stack' }
```
Renders `<dl>`.
- Base: `display:grid; grid-template-columns:max-content minmax(0,1fr); column-gap:var(--vk-space-4)`. `max-content` is the canonical width, replacing the 96–180px fixed widths.
- **D:** dt `font:600 var(--vk-text-sm) var(--vk-font-body); color:var(--vk-color-muted)`; dt/dd `padding:6px 0`.
- **P:** dt `font:600 12px/1.6 var(--vk-font-body); letter-spacing:.08em; text-transform:uppercase`; dd `border-bottom:1px solid var(--vk-color-line)`.
- **S:** dt/dd `padding:9px 0; border-top:1px solid var(--vk-color-line)`; dt `font:700 12px/1.6`; dd `font-size:13.5px`.
- **Q:** dt `font-weight:700`; dt/dd `padding:4px 0`; 18px.
- `layout="stack"` (phone): `grid-template-columns:1fr`, with dt above dd.

#### 23 PageHead (T)

```ts
interface PageHeadProps { eyebrow?: string; title: string; lede?: string | Snippet; byline?: Snippet /* AgentName "Carried out by …" */; actions?: Snippet; crumbs?: { label: string; href?: string }[] }
```
- Eyebrow per §1.4 P30. Title per the §2.5 type scale (`--vk-type-h1`).
- Crumbs: `<nav aria-label="Breadcrumb"><ol>` with `/` separators, 15px muted. Studio uses `700 13.5px` with 44px links.
- Lede:
  - **D:** `font:400 18px/1.5`
  - **P:** `italic 400 20px/1.45 var(--vk-font-display)`
  - **S:** `400 18px/1.45 var(--vk-font-serif)`
  - **Q:** `400 20px/1.5`

#### 24 Hero (T)

```ts
interface HeroProps { figure: number | string; unit?: string; tone?: 'needs' | 'plain'; kicker: string; headline: string; lede?: Snippet /* may contain FootnoteRef */; size?: 'page' | 'section' | 'phone' }
```
- **S:**
  - `.vk-hero--studio { display:grid; grid-template-columns:auto minmax(0,1fr); column-gap:28px; align-items:end; padding-top:28px }`
  - `.vk-hero__figure { font:900 var(--vk-hero-size)/.78 var(--vk-font-display); font-stretch:72%; letter-spacing:-.04em; color: var(--vk-color-text) }`, and `tone="needs"` gives `color: var(--vk-color-signal)`
  - `--vk-hero-size`: page 184px, section 120px, phone 96px. These three replace the seven sizes.
  - kicker `700 12px/1.25 .1em uppercase muted`
  - headline `800 44px/1.02 var(--vk-font-display); font-stretch:82%; letter-spacing:-.02em` (phone 26px)
  - lede `400 18px/1.45 var(--vk-font-serif)`
- **D/P/Q:** the figure is folded into the headline sentence ("3 of 7 cards are waiting on a person") and rendered as PageHead, with the figure in `<strong>`. The data is identical; only the form differs. This is the content-parity rule.

Accessibility: the figure and headline are one `<h1>` or `<h2>` whose accessible text is the sentence. In Studio, the figure span is part of the heading text, so screen readers read "3 of 7 cards are waiting on a person".

Hero is a figure, not a chart, and its contrast check is the text contrast check. The giant signal 3 must meet 3:1 as large text, and is asserted for `--vk-color-signal` on `--vk-color-bg` in `tests/contrast.test.ts`.

#### 25 FigureRow (T)

```ts
interface FigureRowProps { label: string; items: { value: number | string; unit?: string; label: string; tone?: 'needs' | 'plain'; meter?: { value: number; max: number } }[]; size?: 'lg' | 'md' | 'sm' /* 52 / 40 / 30px */ }
```
Renders `<dl>`.
- **S:**
  - row `display:grid; grid-auto-flow:column; grid-auto-columns:minmax(0,1fr); border-top:1.5px solid var(--vk-color-rule); border-bottom:1px solid var(--vk-color-line)`
  - cells `padding:12px 16px; border-left:1px solid var(--vk-color-line)`, first cell `border-left:0; padding-left:0`
  - value `font:900 var(--_s)/.9 var(--vk-font-display); font-stretch:72%; letter-spacing:-.03em`
  - unit `700 17px`; zero `font-weight:300; color:var(--vk-color-muted)`
  - label `700 13px`
  - AP tiles variant (`cap`): `border-top:6px solid var(--vk-stage-{4,3,5,6,7})` by index
- **D:** tiles `padding:14px 16px; border-radius:var(--vk-radius-md); background:var(--vk-color-raised)`, value `700 28px/1.1 var(--vk-font-display); font-variant-numeric:tabular-nums`.
- **P:** cells `padding:0 16px; border-left:1px solid var(--vk-color-line)`, value `500 2.6rem/1 var(--vk-font-display)`.
- **Q:** `box-shadow:inset 0 0 0 1px var(--vk-color-line); border-radius:var(--vk-radius-sm); padding:12px 16px`, value `700 26px/1.2 var(--vk-font-body)`.

#### 26 SmallMultiples (T) (includes UnitChart and ShareBar)

```ts
interface Multiple { key: string; label: string; count: number; units: State[]; note?: string | Snippet; stage?: 1|2|3|4|5|6|7 }
interface SmallMultiplesProps { label: string; caption?: string /* "1 square = 1 card · stages darken towards Shipped" */; items: Multiple[]; interactive?: { value: string; onchange: (k: string) => void }; share?: { label: string; parts: { key: string; label: string; count: number; state: State }[]; total: number } }
```
- **S:**
  - grid `display:grid; grid-template-columns:repeat(var(--n), minmax(0,1fr)); column-gap:12px`
  - band `height:6px; background:var(--vk-stage-{stage})`
  - number `font:500 12px var(--vk-font-mono); color:muted` ("01")
  - name `700 14px`
  - count `font:900 72px/.9 var(--vk-font-display); font-stretch:72%`; zero `300; muted`
  - units row `display:flex; flex-wrap:wrap; gap:4px; padding:8px 0; border-bottom:1px solid var(--vk-color-rule)`
  - unit `18px` square:
    - `needs` `background:var(--vk-color-signal)`
    - `done` `background:var(--vk-stage-7)`
    - `queued` `box-shadow:inset 0 0 0 1.5px var(--vk-stage-5)`
    - `off` `box-shadow:inset 0 0 0 1.5px var(--vk-color-muted)`
    - `blocked` `background:var(--vk-hatch-blocked); box-shadow:inset 0 0 0 1.5px var(--vk-stage-5)`
    - `working` `background:var(--vk-stage-6)`
  - note `400 13px/1.35` with FootnoteRef
  - phone: `--n:4`, count 30–40px, band 5px, gap 4px
  - `interactive`: each multiple is a radio. Checked name is `text-decoration:underline; text-decoration-thickness:3px; text-underline-offset:5px`.
  - ShareBar: `display:grid; grid-template-columns:<fr per part>; gap:3px`, bars `height:14px`, blocked part `var(--vk-hatch-blocked)`, label figure `900 48px/.9 display; font-stretch:72%`, word `700 14px`.
- **D:** each multiple renders as a lane header chip `"{label} {count}"` on `raised`, `radius md`, with unit faces omitted. ShareBar renders as a single 10px pill bar with a legend.
- **P:** ruled columns `border-left:1px solid var(--vk-color-line); padding:0 12px`, a small-caps number over a Newsreader name `500 20px`, count `500 2rem display`. ShareBar is a sentence: "3 waiting on you, 3 blocked, 1 done".
- **Q:** an `<ul>` of "{label}: {count}" lines. Share is a sentence.

Accessibility:
- The units have `aria-hidden="true"`.
- Each multiple has visually-hidden text "{label}: {count} — {needs n need you, blocked n, done n}".
- The figure plus caption is a `<figure>` with a `<figcaption>` holding `caption`.
- No colour carries meaning alone: hatch for blocked, filled vs outline for done vs queued, signal plus the word in the note.

Consumers: SP Board-Studio/Phone-Board-Studio, Studio-Mix-H, SL Library-Studio/Phone-Library-Studio, AP Overview-Studio/Phone-Overview-Studio, SW Runs-Studio/Phone-Runs-Studio. The D/P/Q forms are used by the same artboards' other vibes.

#### 27 StageTrack (T)

```ts
interface StageTrackProps { stages: string[]; current: number; state?: 'current' | 'stopped' | 'needs' | 'failed' | 'finished'; label?: string; size?: 'md' | 'phone'; numbered?: boolean }
```
Keeps the existing ARIA contract: `<ol aria-label>`, `aria-current="step"`, and the hidden "(done)" / "(stopped — needs you)" / "(to do)" text. `failed` says "(failed)". The `e2e/matrix.spec.ts` aria snapshot stays valid.

- **D:**
  - `display:flex; gap:4px`
  - bar `height:8px; border-radius:var(--vk-radius-pill); background:var(--vk-color-line)` (8px is canonical, replacing 6/7/8/10)
  - done `background:var(--vk-color-success)`
  - current `flex:2.6`, bar `background:var(--vk-color-primary); outline:2px solid var(--vk-color-text); outline-offset:1px`
  - stopped/needs `background:var(--vk-color-signal); outline-color:var(--vk-color-signal-text)`
  - name `13px muted`, current `700 text`
- **P:**
  - desktop: seven columns `display:grid; grid-template-columns:repeat(var(--n),minmax(0,1fr)); border-top:1px solid var(--vk-color-text)`
  - each cell `padding:8px 10px 0; border-left:1px solid var(--vk-color-line)`
  - number `600 12px all-small-caps .08em`, name `500 17px/1.2 var(--vk-font-display)`
  - current `font-style:italic; font-weight:600; text-decoration:underline; text-decoration-color:var(--vk-color-signal); text-decoration-thickness:2px; text-underline-offset:5px` when stopped, `text-decoration-color:var(--vk-color-text)` otherwise
  - done names get " ✓"
  - phone: 3px bars `background:line`, done `text`, stopped `height:5px; background:signal`
- **S:**
  - `display:grid; grid-template-columns:repeat(var(--n),minmax(0,1fr)); column-gap:10px`
  - band `height:8px; background:var(--vk-stage-{i+1}); opacity:.3`, done and current `opacity:1`
  - current `height:14px; margin-top:-6px`
  - stopped/needs `box-shadow:inset 0 -4px 0 var(--vk-color-signal)`
  - label `padding-top:6px; border-top:1px solid var(--vk-color-rule); font:500 12.5px/1.3 var(--vk-font-body)`, number `500 11.5px mono muted`
  - current name `text-decoration:underline; text-decoration-thickness:3px; text-underline-offset:5px`
  - more than 7 stages: `--vk-stage-{min(i+1,7)}`
- **Q:** `<ol>` with `list-style:decimal inside; display:flex; flex-wrap:wrap; gap:4px 16px`, current `font-weight:700`. Stopped appends " — stopped, needs you" in signal-text. No bars.

#### 28 StateLabel (T)

```ts
interface StateLabelProps { state: State; label?: string /* default from copy: 'Waiting on you', 'Working', 'Blocked', 'Stopped', 'Failed', 'Done', … */; form?: 'auto' | 'pill' | 'marker' /* marker = glyph only + hidden text, for table columns/rails */ }
```
- **D:** `pill` (default).
  - `padding:4px 12px; border-radius:var(--vk-radius-pill); font:700 var(--vk-text-sm)/1.2; color:var(--vk-face-ink)`
  - backgrounds:
    - working `--vk-mood-working`
    - thinking `--vk-mood-thinking`
    - needs `--vk-mood-needs` plus `box-shadow:inset 0 0 0 2px var(--vk-color-signal)`
    - done `--vk-mood-done`
    - resting `--vk-mood-resting`
    - blocked `background:var(--vk-color-bg); box-shadow:inset 0 0 0 1px var(--vk-color-line)`
    - stopped/failed `background:var(--vk-color-surface); box-shadow:inset 0 0 0 2px var(--vk-color-text)` with a "✕" or "■" glyph
    - queued/off `background:var(--vk-color-raised); color:var(--vk-color-muted)`
  - `marker`: a 9px circle with the same fill. Stopped is `transparent; inset 0 0 0 2px muted`.
- **P:**
  - `font:600 12.5px/1.2 var(--vk-font-body); letter-spacing:.08em; text-transform:uppercase`
  - needs `color:var(--vk-color-signal-text)` with `::before{8px circle signal}`
  - stopped `font-style:italic; text-transform:none; font-family:var(--vk-font-display); font-size:16px`
  - done `color:var(--vk-color-success-text)`
- **S:**
  - `display:inline-flex; gap:7px; font:700 13px/1.3 var(--vk-font-body)`, glyph `11×11` square:
    - needs `background:var(--vk-color-signal)`, word `color:var(--vk-color-signal-text)`
    - working `background:var(--vk-stage-6)`
    - done `var(--vk-stage-7)`
    - blocked `background:var(--vk-hatch-blocked); box-shadow:inset 0 0 0 1.5px var(--vk-stage-5)`
    - queued `inset 0 0 0 1.5px var(--vk-stage-5)`
    - stopped `inset 0 0 0 1.5px var(--vk-color-text)`
    - failed: an outlined ink square with an X, drawn as `box-shadow:inset 0 0 0 1.5px var(--vk-color-text); background:linear-gradient(45deg, transparent calc(50% - .75px), var(--vk-color-text) calc(50% - .75px) calc(50% + .75px), transparent calc(50% + .75px)), linear-gradient(-45deg, …same…)`. This is the SW glyph, used in 5 SW Studio files. The word is "Failed" in 800.
    - off/resting `inset 0 0 0 1.5px var(--vk-color-muted)`
- **Q:** the word only, `font-weight:700`. Needs `color:var(--vk-color-signal-text)`. No glyph.
- **D/P icon slot:** `failed`, `stopped` and `done` carry a 16px stroke icon (X-in-circle, square, check-in-circle; SW `.st`) at `gap:6px; font-weight:600`.

SW verdict pills map onto these states:

| SW verdict | State |
|---|---|
| pass | `done` |
| fail | `failed` |
| changes | `queued` |
| superseded | `off`, with `text-decoration:line-through` |

SW Daylight fills a failed pill with `--vk-mood-needs` (`.val-fail`, `.st-failed`). That is rejected, because peach reads as "needs you". The failed pill uses the ink ring above.

SW log levels (`.lv`) stay in SW as a product-local component on top of StateLabel's tokens.

Product outcome mapping (SL, documented in each product):

| SL outcome | State |
|---|---|
| approved, completed | `done` |
| in-progress | `working` |
| superseded, abandoned | `off` |
| rejected, failed | `failed` |

The Studio form uses the ramp squares above. This deletes `--sl-outcome-*` (§3.3).

Accessibility: `marker` has `role="img"` with `aria-label={label}`. `pill` and auto forms are plain text.

#### 29 AgentName (T) and 30 Face (C)

```ts
interface AgentNameProps { id: string; name: string; mood?: Mood; src?: string; role?: string /* 'Delegate', 'Asked by', 'Carried out by' */; href?: string; size?: 24 | 32 | 44; initials?: string /* person, not agent */ }
```
- Face (existing) gains `ring?: boolean`.
- **Studio: agent faces are round, person initials are square.** Studio-Mix-H and the SW Studio files (`.sr-sq .vk-face svg { border-radius:50% }`) draw agents round in a square slot. The vk.css rule `[data-vibe="studio"] .vk-face svg, img { border-radius: var(--vk-radius-sm) }` is deleted from `components.css`. Squareness belongs only to person initials (`.vk-agentname__initials`).
- Quiet adds `filter:grayscale(.6)`, the canonical value in `[data-vibe="quiet"] .vk-face svg, img`.
- **D:** `display:inline-flex; gap:10px; align-items:center`, name `700`, role `muted 14px` before the face. Stacks: `.vk-agentname-stack > * + * { margin-left:-6px }` with face `box-shadow:0 0 0 2px var(--vk-color-surface)`.
- **P:** face `box-shadow:0 0 0 1px var(--vk-color-line)`, name `italic 500 16px var(--vk-font-display)`.
- **S:** face square, name `700 14px`, role `400 14px muted`. Person initials `background:var(--vk-color-text); color:var(--vk-color-bg); font:800 12px/1; border-radius:0`.
- **Q:** name `700` underlined when `href` is set.

Person initials in other vibes:
- **D:** `40px circle; background:var(--vk-mood-resting); font:800 13px`.
- **P:** `32px circle; background:var(--vk-color-raised); box-shadow:inset 0 0 0 1px var(--vk-color-line); font-family:display`.
- **Q:** `24px; border:1px solid var(--vk-color-text)`.

Accessibility: the face is `aria-hidden` when the name is visible (no double reading). An agent link names the agent.

#### 31 AgentQuote (T)

```ts
interface AgentQuoteProps { who: { id: string; name: string; mood?: Mood }; tone?: 'needs' | 'plain' | 'done' | 'off'; heading?: string /* 'Stopped — waiting on you' */; meta?: string /* 'attempt 2' */; text: string /* verbatim, rendered as text with preserved line breaks */; clamp?: number /* lines, with "Show full reason" */; children?: Snippet /* footnote refs, links after the text */ }
```
The text is verbatim agent output. It is rendered with `white-space:pre-line`, never `{@html}`, and never paraphrased.

- **D:** a bubble.
  - `padding:var(--vk-space-4) var(--vk-space-5); border-radius:6px var(--vk-radius-lg) var(--vk-radius-lg) var(--vk-radius-lg); background:var(--vk-color-raised); font:400 17px/1.55`
  - needs `background:var(--vk-color-signal-wash)` (canonical over mood-needs, because signal-wash is checked against text in `contrast.test.ts`); head `700 var(--vk-text-sm); color:var(--vk-color-signal-text)`
  - done `background:var(--vk-color-success-wash)`
  - face sits above-left
- **P:** a letter.
  - `<figure>` with `<blockquote>` in `font:400 1.25rem/1.6 var(--vk-font-display)`
  - the attribution `<figcaption>` "— {name}" in italic display
  - needs: `padding-left:var(--vk-space-4); border-left:2px solid var(--vk-color-signal)`, heading `600 12.5px .12em uppercase signal-text`
- **S:**
  - `padding:2px 0 0 18px; border-left:4px solid var(--vk-color-signal)` (needs), `var(--vk-color-text)` (plain), `var(--vk-stage-7)` (done), `var(--vk-color-line)` (off)
  - heading `800 14px/1.3; color:var(--vk-color-signal-text)` (needs) or text
  - meta `500 12px mono` right
  - text `400 19px/1.42 var(--vk-font-serif)`
  - "Show full reason" `700 13.5px underline 1.5px`
- **Q:**
  - needs: `<fieldset>` with `border:3px solid var(--vk-color-signal); border-radius:var(--vk-radius-sm); padding:12px 16px 16px` and `<legend>` `700 20px`
  - otherwise a plain `<blockquote>` with `border-left:2px solid var(--vk-color-line); padding-left:16px`, 18px

Accessibility:
- `<figure>` with `<blockquote>` and `<figcaption>`.
- The clamp uses `line-clamp`, with the full text in the DOM. "Show full reason" is a button toggling `aria-expanded`.
- Quiet's fieldset legend names the heading.

Consumers: SP Card/CardPage/Card-States/Phone-Card ×4 (reason, question, finisher's message), SP Operate ×4, AP Agent ×4 (needs), AP Phone-Overview, SL Record ×4 (timeline messages), SW Run/Transcript (agent text, verdict notes).

NeedsYou (P40) is `AgentQuote tone="needs"` with a heading and no `who` when the system, not an agent, raises it. `who` is optional for that case.

#### 32 Footnotes and FootnoteRef (T)

```ts
interface FootnoteRefProps { n: number }   // <sup><a href="#fn-{n}" id="fnref-{n}">
interface FootnotesProps { items: { n: number; text: string | Snippet; copy?: { value: string; label: string } }[]; label?: string /* 'Notes' */ }
```
- **S:**
  - ref `font:600 11px/1 var(--vk-font-mono); vertical-align:super; margin-left:2px; color:var(--vk-color-stage-text)`
  - list `display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); column-gap:32px; row-gap:10px; padding-top:10px; border-top:1px solid var(--vk-color-line)`
  - `li{display:grid; grid-template-columns:22px 1fr; font:400 14.5px/1.45 var(--vk-font-serif)}`
  - key `600 11.5px/1.9 var(--vk-font-mono); color:var(--vk-color-stage-text)`
  - copy row uses CopyId in Studio form
  - phone: 1 column, 20px key, 14px text
- **P:** refs render as `<sup>` in `italic 600 13px var(--vk-font-display)`. The list is "Notes" with `counter` numerals `italic 600 16px/1.5 var(--vk-font-display)`, at `16px/1.5`, under a 1px text rule.
- **D:** refs render nothing visible (`hidden`). The list renders as a plain `<ul>` of muted 15px lines under the section, without numbers. Each item keeps its CopyId.
- **Q:** the same as D, with no refs: a plain list of facts under the heading "Details", 17px.

The same facts are present in every vibe (parity). Only Studio and Paper link them.

Accessibility: refs are links with `aria-label="Note {n}"`, and each note has a back-link "↩" `aria-label="Back to text"` (Studio and Paper).

#### 33 SectionHeader (T)

```ts
interface SectionHeaderProps { n?: number /* renders 01 */; title: string; level?: 2 | 3; meta?: string | Snippet; count?: number; action?: Snippet }
```
- **S:** `padding-top:10px; border-top:1.5px solid var(--vk-color-rule); display:flex; align-items:baseline; gap:12px`, number `500 12px/1 var(--vk-font-mono); color:muted`, title `800 16px/1.2`, meta right `500 12px var(--vk-font-mono); color:muted`.
- **P:** `padding-bottom:6px; border-bottom:1px solid var(--vk-color-text)`, title `600 28px/1.15 var(--vk-font-display)`, meta `italic 16px display muted`. With `n`, a kicker `600 12.5px .12em uppercase` sits above.
- **D:** title `700 var(--vk-text-lg)/1.2 var(--vk-font-display)`, count `500 14px var(--vk-font-mono); muted`. No rule.
- **Q:** title `700 24px/1.3` (canonical over 22 and 26), no rule, count "— 43 agents" in 400 muted.

Accessibility: a real `<h2>`/`<h3>`. The number is `aria-hidden` (decorative ordinal).

#### 34 Overlay: Dialog, Drawer and Sheet (T)

```ts
interface OverlayBase { open: boolean /* $bindable */; title: string; description?: string; onclose?: () => void; children: Snippet; actions?: Snippet; lead?: Snippet /* left-aligned action */ }
interface DialogProps extends OverlayBase { size?: 'sm' | 'md' | 'lg' /* 420 / 560 / 720 */; eyebrow?: string; role?: 'dialog' | 'alertdialog' }
interface DrawerProps extends OverlayBase { width?: string /* default per vibe */; eyebrow?: string; tools?: Snippet /* header icon buttons */ }
interface SheetProps extends OverlayBase { grab?: boolean }
```
All three are built on bits-ui `Dialog`, which gives the focus trap, Esc, inert background, focus return and scroll lock. Sheet uses `Dialog` positioned to the bottom on screens under 640px.

Scrim: `background:var(--vk-scrim)` in every vibe. The value comes from the token in §3.2; Studio's phone ink strip renders as `var(--vk-scrim)` plus a 32px label strip only when `description` is set.

Dialog:
- **D:** `background:var(--vk-color-surface); border-radius:var(--vk-radius-lg); padding:var(--vk-space-5); box-shadow:0 0 0 1px var(--vk-color-line), var(--vk-shadow-dialog)`, title `700 var(--vk-text-lg)/1.2 var(--vk-font-display)`.
- **P:** `border-radius:var(--vk-radius-sm); box-shadow:inset 0 0 0 1px var(--vk-color-text), var(--vk-shadow-dialog)`, title `500 23px/1.2 display`.
- **S:** `border-radius:0; border-top:3px solid var(--vk-color-rule); box-shadow:0 0 0 1px var(--vk-color-rule), var(--vk-shadow-dialog)`, eyebrow `700 12px .1em uppercase`, title `800 26px/1.1 display; font-stretch:82%`.
- **Q:** `border-radius:var(--vk-radius-sm); box-shadow:0 0 0 2px var(--vk-color-text)`, title `700 24px`.
- Head: title plus close IconButton `margin:-10px -10px 0 auto`.
- Actions: `display:flex; justify-content:flex-end; gap:var(--vk-space-2); padding-top:var(--vk-space-4)`, `lead` gets `margin-right:auto`.
- Consequence list: `<ul>` under heading `700 12px uppercase .06em` (Paper `italic 14px display`).

Drawer (side, ≥ 640px):

| Vibe | width | edge |
|---|---|---|
| Daylight | 680px | `box-shadow:0 0 0 1px var(--vk-color-line), var(--vk-shadow-drawer)`, `border-radius:var(--vk-radius-lg) 0 0 var(--vk-radius-lg)` |
| Paper | `min(780px, 100%)`, centred | `border-radius:var(--vk-radius-sm); box-shadow:var(--vk-shadow-dialog)` (the "sheet" form) |
| Studio | 940px (SP card), 420px default | `border-left:1.5px solid var(--vk-color-rule); border-top:6px solid var(--vk-color-text)` when `eyebrow` is set (AP ink cap), no shadow |
| Quiet | `min(1120px, 100%)` | `border-left:2px solid var(--vk-color-text)` |

Sheet (phone):
- **D:** `border-radius:var(--vk-radius-lg) var(--vk-radius-lg) 0 0; background:var(--vk-color-surface); box-shadow:var(--vk-shadow-sheet)`, grab `44×5px; border-radius:3px; background:var(--vk-color-faint); margin:8px auto 0`.
- **P:** `background:var(--vk-color-bg); border-top:3px double var(--vk-color-text)`.
- **S:** `background:var(--vk-color-bg); border-top:6px solid var(--vk-color-text)`, head `min-height:52px; border-bottom:1px solid var(--vk-color-rule)`, title `800 20px stretch 85%`.
- **Q:** `background:var(--vk-color-bg); border-top:3px solid var(--vk-color-text)`.
- Actions: `display:grid; grid-template-columns:1fr 1fr; gap:12px`, full-width buttons `min-height:52px`.

Accessibility: `aria-labelledby` points to the title and `aria-describedby` to the description. A destructive confirm uses `role="alertdialog"` with initial focus on the least destructive action.

Consumers:
- Dialog: SP-Dlg-{Appearance, BoardSwitcher, Move, NewCard, Palette, Reconnect}, SL-Dialogs ×6, SL-Viewer-States revoke, AP-Dlg-Sheet-A/B/C, AP Admin `.dlg`, SW-Verdict.
- Drawer: SP Card ×4, SP Dlg-Reconnect, AP `.drawer` ×6, SW span margin.
- Sheet: SL Phone ×8, AP Phone-Agent ×4, SP Phone-Card reply dock ×4. The dock uses `Sheet` in non-modal mode: `modal={false}`, sticky, no scrim.

#### 35 Toast (T)

```ts
interface ToastProps { message: string; tone?: 'plain' | 'ok' | 'bad' | 'busy'; actionLabel?: string; onaction?: () => void; ondismiss?: () => void }
```
- Region: products mount one `<Toaster>` (part of this component file, exported as `Toaster`) with `role="status"` for plain/ok/busy and `role="alert"` for bad. Toasts never auto-dismiss when they carry an action.
- **D:** the existing pill (`primary` background), plus an icon slot. Busy shows a spinner `16px; border:2px solid color-mix(in oklch, var(--vk-color-primary-fg) 35%, transparent); border-top-color:var(--vk-color-primary-fg)`.
- **P:** `background:var(--vk-color-surface); color:var(--vk-color-text); border-radius:var(--vk-radius-sm); box-shadow:inset 0 0 0 1px var(--vk-color-text), var(--vk-shadow-pop)`.
- **S:** `padding:4px 0 4px 14px; background:var(--vk-color-bg); border-left:4px solid var(--vk-color-text); font:400 17px/1.4 var(--vk-font-serif)`, action `700 14px underline` in the body font.
- **Q:** `background:var(--vk-color-bg); border:2px solid var(--vk-color-text); border-radius:var(--vk-radius-sm)`, 17px. Busy is static text "Working…".
- `bad` in every vibe: `box-shadow:inset 0 0 0 2px var(--vk-color-text)` plus a "!" icon. Ink, not signal.

#### 36 Notice (C)

```ts
interface NoticeProps { tone: 'needs' | 'error' | 'ok' | 'info' | 'secret'; title?: string; children: Snippet; action?: Snippet }
```
`needs` is for when a person must act now. `error` is a failure that needs no immediate person (ink). `secret` is "this contains a secret" (SL Upload).

- Base: `display:grid; grid-template-columns:22px minmax(0,1fr); gap:10px; padding:12px var(--vk-space-4); border-radius:var(--vk-radius-sm)`.
- **D:**
  - needs `background:var(--vk-color-signal-wash); box-shadow:inset 0 0 0 2px var(--vk-color-signal)`
  - error `background:var(--vk-color-surface); box-shadow:inset 0 0 0 2px var(--vk-color-text)`
  - ok `background:var(--vk-color-success-wash); color:var(--vk-color-success-text)`
  - info `background:var(--vk-color-raised)`
  - secret `background:var(--vk-color-signal-wash); box-shadow:inset 4px 0 0 var(--vk-color-signal)`
- **P:** needs `border-left:3px solid var(--vk-color-signal); background:var(--vk-color-signal-wash); border-radius:0`; error `border-left:3px solid var(--vk-color-text)`; ok `border-top:2px solid var(--vk-color-success)`.
- **S:** `border-radius:0`. Needs `border-left:4px solid var(--vk-color-signal); background:transparent`; error `box-shadow:inset 0 0 0 1.5px var(--vk-color-rule); background:var(--vk-color-bg)`. Archived banner (tone info with `inverse`): `background:var(--vk-color-text); color:var(--vk-color-bg); font:800 14px`.
- **Q:** needs `border:3px solid var(--vk-color-signal)`; error `border:3px solid var(--vk-color-text)`; ok `border:2px solid var(--vk-color-success-text); background:var(--vk-color-success-wash)`.

Accessibility: needs and error get `role="alert"` when they appear after load and `role="note"` when present on load. The icon is `aria-hidden` and the title says it.

#### 37 EmptyState (T)

```ts
interface EmptyStateProps { title: string; body?: string; action?: Snippet; size?: 'page' | 'inline' }
```
- **D:** `display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; padding:var(--vk-space-6); border-radius:var(--vk-radius-md); background:var(--vk-color-surface); box-shadow:inset 0 0 0 2px var(--vk-color-line)`, with a product-mark chip.
- **P:** `padding:var(--vk-space-5) 0; border-top:1px solid var(--vk-color-line); font:italic 400 1.25rem/1.4 var(--vk-font-display); color:var(--vk-color-muted)`.
- **S:** `padding:24px 0; border-bottom:1px solid var(--vk-color-line); font:400 17px/1.45 var(--vk-font-serif)`. A page-size empty adds `border-top:1.5px solid var(--vk-color-rule)` and a title `800 34px/1.05; font-stretch:82%`.
- **Q:** `padding:16px 0; border-top:1px solid var(--vk-color-line)` with plain 18px text.

#### 38 Loading (C)

```ts
interface LoadingProps { kind: 'skeleton' | 'spinner' | 'bar'; label: string /* 'Loading the board' */; lines?: number; progress?: number /* bar only, 0..1 */ }
```
- Skeleton line: `height:14px; border-radius:var(--vk-radius-pill); background:var(--vk-color-raised)`, with the heading line at `height:26px; width:62%`.
- Animation:
  - canonical `vk-breathe` `1.6s ease-in-out infinite` (opacity 1 → .55)
  - Studio uses shimmer `background:linear-gradient(90deg, var(--vk-color-select) 40%, var(--vk-color-line) 50%, var(--vk-color-select) 60%); background-size:300% 100%; animation:vk-shimmer 1.4s linear infinite` with radius 0
  - Quiet and reduced motion: no animation
- Spinner: `36px; border-radius:50%; box-shadow:inset 0 0 0 4px var(--vk-color-raised); border-top:4px solid var(--vk-color-primary); animation:vk-rot 1s linear infinite`.
- Bar: `height:6px; border-radius:var(--vk-radius-pill); background:var(--vk-color-raised)`, fill `primary` (Studio `var(--vk-stage-7)`, 4px, square). Indeterminate slides 40% width over 1.4s.

Accessibility: `role="status"` with `aria-live="polite"` and visually-hidden `label`. Skeleton blocks are `aria-hidden`. The bar uses `role="progressbar"` with `aria-valuenow` when the progress is known.

#### 39 LoadMore (C)

```ts
interface LoadMoreProps { shown: number; total: number; label?: string /* 'Show 25 more' */; busy?: boolean; onmore: () => void }
```
Layout: `display:flex; flex-direction:column; align-items:center; gap:8px; padding:var(--vk-space-5) 0`, with "{shown} of {total} shown" in muted sm above a `Button variant="secondary"`.
- **P:** adds `border-top:1px solid var(--vk-color-line)`.
- **S:** `align-items:flex-end`, text `500 12px mono`.
- **Q:** the button is full-width `min-height:48px`.

Accessibility: after loading, focus moves to the first new row, and a polite live region announces "{n} more shown".

#### 40 Meter (T)

```ts
interface MeterProps { value: number; max: number; label: string; segments?: number /* Studio discrete */; tone?: 'good' | 'plain' }
```
- **D:** `height:8px; border-radius:var(--vk-radius-pill); background:var(--vk-color-line)`, fill `var(--vk-color-success)` (good) or `var(--vk-color-primary)` (plain). Canonical: spend is `plain`.
- **P:** `height:4px; background:var(--vk-color-line)`, fill `var(--vk-color-text)`.
- **S:** discrete `display:grid; grid-template-columns:repeat(var(--seg),1fr); gap:2px`, each `height:8px`, on `var(--vk-stage-7)`, off `box-shadow:inset 0 0 0 1px var(--vk-color-line)`. Continuous: `height:10px; box-shadow:inset 0 0 0 1px var(--vk-color-line)` with a `var(--vk-stage-6)` fill.
- **Q:** `height:8px; box-shadow:inset 0 0 0 1px var(--vk-color-text)`, fill text.

Accessibility: `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-label`. The value is also shown as text by the consumer.

### 2.5 Type scale (new tokens, per vibe)

The components refer to `--vk-type-*` instead of literal sizes. These are added to `tokens/source/<vibe>.ts` as `shape.type` and emitted as `font` shorthands.

| Token | Daylight | Paper | Studio | Quiet |
|---|---|---|---|---|
| `--vk-type-h1` | 700 34px/1.1 display | 500 46px/1.04 display | 800 44px/1.02 display (stretch 82% via `--vk-type-h1-stretch`) | 700 34px/1.2 body |
| `--vk-type-h2` | 700 22px/1.2 display | 600 28px/1.15 display | 800 16px/1.2 body | 700 24px/1.3 body |
| `--vk-type-eyebrow` | 700 12px/1.2 body | 600 12px/1 body | 700 12px/1.25 body | 700 16px/1.4 body |
| `--vk-type-meta` | 400 14px/1.4 body | 400 14px/1.4 body | 500 12px/1.4 mono | 400 16px/1.5 body |
| `--vk-type-mono` | 400 12px/1.4 mono | 400 12px/1.4 mono | 500 12.5px/1.4 mono | 400 14px/1.4 mono |
| `--vk-type-quote` | 400 17px/1.55 body | 400 20px/1.6 display | 400 19px/1.42 serif | 400 18px/1.55 body |
| `--vk-type-body` | 400 16px/1.5 body | 400 16px/1.5 body | 400 14px/1.45 body | 400 18px/1.6 body |

Studio's figure sizes (`--vk-hero-size` 184/120/96, small-multiple 72, figure row 52/40/30) are component-local custom properties, not global tokens.

---

## 3. Token changes

### 3.1 Studio becomes Annual report (`tokens/source/studio.ts`, rewritten)

The values are exactly the mockup `vk.css`.

- **Light** `color`:
  - bg `#F6F3EC`, surface `#EEEAE0`, raised `#FBF9F4`, line `#D8D2C5`
  - text `#15130F`, muted `#5C564D`, faint `#6B655B`
  - primary `#15130F`, primaryFg `#F6F3EC`
  - signal `#E8461C`, signalWash `#FBE5DA`, signalText `#B2300C`
  - success `#354E92`, successWash `#E4E8F4`, successText `#233772`
  - ground `#E6E1D5`
- **Dark** `color`:
  - bg `#14130F`, surface `#1C1B17`, raised `#23211C`, line `#36332C`
  - text `#F1EDE4`, muted `#AAA398`, faint `#8F887D`
  - primary `#F1EDE4`, primaryFg `#14130F`
  - signal `#FF6A3D`, signalWash `#2E1D16`, signalText `#FF8D68`
  - success `#93A7DA`, successWash `#23283A`, successText `#A3B6EC`
  - ground `#0C0B09`
  - The mockup's dark signal wash is `rgba(255,106,61,.14)`. A DTCG colour must be opaque hex for `contrast.ts`, so it becomes the composited value over bg `#14130F`, which is `#2E1D16`.
- **shape:**
  - font display/body `['Archivo Variable','system-ui','sans-serif']`
  - mono `['Azeret Mono Variable','ui-monospace','monospace']`
  - serif `['Newsreader Variable','Georgia','serif']`
  - radius `{ sm: 2, md: 2, lg: 4, pill: 999 }`, lift 2, motion unchanged
- **moods:**
  - light: working `#D3DBEF`, thinking `#E4E8F4`, needs `#FFB398`, done `#FFFFFF`, resting `#C7C2B8`
  - dark: working `#7F8FB8`, thinking `#9AA6C6`, needs `#FF8D68`, done `#E6E2D8`, resting `#6F6A60`
  - The moods move from `shared.ts` to a per-vibe override: `VibeSource.mood?: Record<Theme, Record<Mood, Hex>>`, with `MOODS_BY_THEME` as the fallback.
- **Face ink:** `faceInk?: Record<Theme, Hex>`. Studio uses `#15130F` (light) and `#14130F` (dark). Emitted as `--vk-face-ink` in the look block, which overrides the base `rgb(35 35 58)`. `tests/styles.test.ts` "face-ink equals FACE_INK" changes to assert the base value only.
- **Sky:** Studio keeps `flat(bg, text)` with the LED suns, on the new bg values.

New fonts in `dependencies` and `fonts.css`:
- `@fontsource-variable/archivo@5.3.0`, with wdth and wght axes: `@import "@fontsource-variable/archivo/wdth.css";`, so that `font-stretch` works
- `@fontsource-variable/azeret-mono@5.3.0`

`@fontsource-variable/instrument-sans` is removed (no vibe uses it). Newsreader is already present.

### 3.2 New colour tokens on every look (`LookColors` gains these keys)

| Key → CSS | Purpose | Daylight L / D | Paper L / D | Studio L / D | Quiet L / D |
|---|---|---|---|---|---|
| `rule` → `--vk-color-rule` | section and structural rules (ink in Studio and Paper) | `#F0DCCF` / `#36355A` (= line) | `#1C1B18` / `#EDE7DC` (= text) | `#15130F` / `#F1EDE4` | `#111113` / `#FAFAFA` (= text) |
| `stageText` → `--vk-color-stage-text` | footnote marks, live square, ramp-coloured words | `#1D5A35` / `#AEE6C3` (= successText) | `#3A5E44` / `#A9CDB2` | `#2B3F8C` / `#A3B6EC` | `#15803D` / `#4ADE80` |
| `stage` (7) → `--vk-stage-1..7` | stage ramp | Daylight L `#F0DCCF #E3CDBE #CDEFD9 #A6E0BC #7FD3A0 #4F9E6E #1D5A35`; D `#36355A #45446B #1F3B2C #2E5A40 #5C9F76 #7FC79B #9FD9B4` | L `#E2DACB #CFC6B4 #BDB29E #8F8676 #5E5A52 #3A5E44 #1C1B18`; D `#33302A #48443C #5E594F #7A7468 #A39C90 #A9CDB2 #EDE7DC` | L `#C9D3EC #A9B9E0 #879DD3 #6680C2 #4A65AD #354E92 #233772`; D `#2A3864 #33467D #3F5797 #5470B4 #7189C8 #93A7DA #BCCAEE` | L `#E4E4E7 #D4D4D8 #A1A1AA #71717A #52525B #15803D #111113`; D `#27272A #3F3F46 #52525B #71717A #A1A1AA #4ADE80 #FAFAFA` |

How the non-Studio ramps are built:
- Each is a one-family ramp from `line` to `text`, with steps 6 and 7 at `successText` and `text`.
- The Studio ramp is unchanged.
- Daylight, Paper and Quiet use the ramp only where a component asks for "stage n" (FigureRow `cap`, Meter). Their StageTrack forms do not read it.
- `tests/contrast.test.ts` adds: stage-7 vs bg ≥ 3:1 (a non-text graphic, WCAG 1.4.11) in all 8 looks, and stageText vs bg ≥ 4.5:1 in all 8.

`--vk-font-serif` is added to every look:
- Studio and Paper: `"Newsreader Variable", Georgia, serif`
- Daylight: `"Figtree Variable", system-ui, sans-serif` (the body font)
- Quiet: `"Atkinson Hyperlegible Next", system-ui, sans-serif`

Components can therefore use `--vk-font-serif` unconditionally. Only Studio and Paper resolve it to a serif.

### 3.3 Decisions: no danger colour, no outcome hues

- **No `--vk-color-danger`.** All three products' desktop destructive buttons are an ink outline plus a verb (§0.5). The brief forbids colours beyond the ramp and signal in Studio, and the other vibes follow the same rule. Button `danger` is specified in §2.4/8.
  - SL phone `--sl-danger` (`#AD2E1F` light / `#FF6B5B` dark) is deleted. `.m-danger` becomes `Button variant="danger"`.
- **No outcome palette.** SL's seven `--sl-outcome-*` hexes are deleted. Outcomes map to `State` (§2.4/28). Failure is ink plus the word plus a glyph.
  - **Superlibrary:** "lib/vibe/superlibrary.css" must drop those variables when it adopts StateLabel.
  - **Superwitness:** the mockups already express fail without red. `SW .okdot` is success or stage-text, and errors are a ⚠ glyph plus a word (`.tx-err`).

### 3.4 Derived tokens (`src/lib/styles/derived.css`, in `@layer vk.tokens`)

These tokens mix existing tokens, so they cannot be DTCG hex. They live in a new hand-written file (no raw hex; `tests/styles.test.ts` checks it like `base.css`). `vibekit.css` imports it after `tokens.css`.

```css
:root, [data-theme="light"] {
  --vk-scrim: color-mix(in oklch, var(--vk-color-text) 42%, transparent);
  --vk-shadow-pop: 0 12px 32px -12px color-mix(in oklch, var(--vk-color-text) 22%, transparent);
  --vk-shadow-dialog: 0 24px 60px color-mix(in oklch, var(--vk-color-text) 28%, transparent);
  --vk-shadow-drawer: -24px 0 64px color-mix(in oklch, var(--vk-color-text) 22%, transparent);
  --vk-shadow-sheet: 0 -12px 32px -8px color-mix(in oklch, var(--vk-color-text) 18%, transparent);
  --vk-shadow-rail: 0 12px 32px -12px var(--vk-color-ground), 0 var(--vk-lift) 0 var(--vk-color-ground);
  --vk-live-halo: color-mix(in oklch, var(--vk-color-success) 35%, transparent);
  --vk-color-select: color-mix(in oklch, var(--vk-color-text) 6%, var(--vk-color-bg));
  --vk-hatch-blocked: repeating-linear-gradient(135deg, var(--vk-stage-5) 0 1.5px, transparent 1.5px 4px);
  --vk-sky-glass: color-mix(in oklch, var(--vk-color-surface) 55%, transparent);
  --vk-sky-glass-hover: color-mix(in oklch, var(--vk-color-surface) 45%, transparent);
}
[data-theme="dark"] {
  --vk-scrim: color-mix(in oklch, var(--vk-color-bg) 74%, transparent);
  --vk-shadow-pop: 0 12px 32px -12px color-mix(in oklch, var(--vk-color-bg) 80%, transparent);
  --vk-shadow-dialog: 0 24px 60px color-mix(in oklch, var(--vk-color-bg) 80%, transparent);
  --vk-shadow-drawer: -24px 0 64px color-mix(in oklch, var(--vk-color-bg) 80%, transparent);
  --vk-shadow-sheet: 0 -12px 32px -8px color-mix(in oklch, var(--vk-color-bg) 80%, transparent);
}
[data-vibe="studio"][data-theme="light"] { --vk-scrim: color-mix(in oklch, var(--vk-color-text) 45%, transparent); }
[data-vibe="studio"][data-theme="dark"]  { --vk-scrim: color-mix(in oklch, var(--vk-color-ground) 72%, transparent); }
[data-vibe="paper"] { --vk-shadow-dialog: 0 24px 60px color-mix(in oklch, var(--vk-color-text) 20%, transparent); }
[data-vibe="paper"][data-theme="dark"] { --vk-shadow-dialog: 0 24px 60px color-mix(in oklch, var(--vk-color-bg) 80%, transparent); }
[data-vibe="quiet"] { --vk-shadow-pop: none; --vk-shadow-dialog: none; --vk-shadow-drawer: none; --vk-shadow-sheet: none; }
[data-vibe="paper"] { --vk-hatch-blocked: repeating-linear-gradient(135deg, var(--vk-color-faint) 0 2px, transparent 2px 5px); }
```

Canonical choices:
- The scrim is 42% text, the AP and SP-Card value and the median of the five recipes.
- The Studio scrim keeps its mockup values.
- Everything is in oklch. The Studio files' `srgb` mixes are converted; the visual difference at these percentages is below the 0.002 pixel tolerance of the reference sheets, and is checked by the reference pixel test.
- The terminal/log background (AP, product-local) uses `--vk-color-ground` with `--vk-color-text`, the newer AP-States form, not primary.
- `--vk-code-bg: var(--vk-color-raised)` is added to the `:root` block. It is the background for inline code and `pre` in every product.
  - It replaces the mockups' raised (SW rubric, SL `.sl-pre`), surface (SW `.tx-pre`) and ground (`pre.raw`) choices.
  - Studio `pre` keeps its 2px `--vk-stage-7` left rule on top.
- `--vk-warn-row: color-mix(in oklch, var(--vk-mood-done) 35%, transparent)` is added. It marks warning rows in SW logs and is the only non-signal emphasis wash.

### 3.5 The count badge colour (contrast fix)

The mockups put white or face-ink text on `--vk-color-signal` for count badges. Measured:
- `#23233A` on `#E2502E` (Daylight light) is about 4.1:1;
- `#FFF8EE` on `#E2502E` is about 3.7:1.

Both fail 4.5:1 at 12px. Every count badge (AppNav, PhoneTabBar, QuickFilter) therefore uses `background:var(--vk-color-signal-text); color:var(--vk-color-primary-fg)`:

| Look | Contrast |
|---|---|
| Daylight L | 5.6 |
| Paper L | 5.9 |
| Studio L | 6.0 |
| Quiet L | 5.7 |
| All four dark looks | 7.5 to 9.8 |

The large figures and squares keep `--vk-color-signal`, because they are non-text graphics or large text at ≥ 3:1. `tests/contrast.test.ts` gains a "count badge" pair: signalText vs primaryFg ≥ 4.5 in all 8 looks.

---

## 4. Reference sheets

### 4.1 What a sheet is

There is one static HTML page per component × vibe: `references/components/<Name>.<vibe>.html`. That makes 40 × 4 = 160 files, plus `references/components/index.html` listing them.

- **Light** is the default. **Dark** is the same file with `?theme=dark`. A 3-line inline script sets `document.documentElement.dataset.theme` from the query, before first paint.
- Each sheet shows **every variant × every state** in a fixed grid:
  - `<main id="sheet" style="width:960px; padding:24px; display:grid; gap:24px">`
  - one `<section data-case="<variant>-<state>">` per cell
  - each cell has a 12px system-ui label (`font:12px/1 ui-monospace` in `--vk-color-faint`), then the rendered component
- Forced states are drawn with classes that the sheet's CSS maps to the pseudo-state, e.g. `.is-hover` gets the `:hover` declarations, `.is-focus` the `:focus-visible` declarations. There is no hover-dependence.
- Phone-only components (PhoneTabBar, PhoneHeader, Sheet) use `width:390px`.

The case list for each component is its "States" plus variants in §2.4. For example, `Button.<vibe>.html` cases are primary, secondary, quiet, signal, danger, each × default/hover/active/focus/disabled/busy/pressed, plus `sm` × the same, which is 70 cells. `StateLabel` has 10 states × 3 forms.

### 4.2 How a sheet is produced

Sheets are **independent of the library code**. They are built from the mockups' own markup with the canonical declarations from this spec, so a pixel match proves the Svelte component reproduces the approved mockup and not itself.

1. **Source fragments** live in `references/src/<Name>/<vibe>.html` (markup) and `references/src/<Name>/<vibe>.css` (CSS).
   - The markup is copied from the source artboard and selector named in the table below, with real labels and data from that artboard.
   - The CSS is the mockup rule set for that pattern with the declarations replaced by this spec's canonical ones. Selectors keep the mockup class names (`.ar-btn`, `.dy-dest`, …), so they never collide with `.vk-*`.
2. **Frame:** `references/src/_frame.html` links:
   - `../../src/lib/styles/fonts.css`, built from Fontsource, the same files as the library. Never Google Fonts, so rasterisation is identical.
   - `../../src/lib/styles/tokens.css` and `derived.css`. Tokens are the shared truth; component CSS is not linked.
   - `references/src/_sheet.css`, which holds the grid and cell labels only.
3. **Build:** `pnpm references` runs `tsx scripts/references.ts`. It inlines each fragment into the frame with `data-vibe="<vibe>" data-theme="light"`, writes `references/components/<Name>.<vibe>.html`, and writes `index.html`.
   - `pnpm references:check` rebuilds and runs `git diff --exit-code references/components`. It is added to `pnpm verify`.
4. **Approval:** a sheet is approved when its screenshot is reviewed against the source artboard's render in `.playwright-mcp/review/qa/`. The sheets are committed.

Source artboards per component (selector source in parentheses):

| Component | Daylight | Paper | Studio | Quiet |
|---|---|---|---|---|
| AppShell/AppNav/Masthead/StatusLine | SP-Board-Daylight (`.dy-*`) | SP-Board-Paper (`.mh-*`) | Studio-Mix-H (`.ar-rail`, `.ar-top`, `.ar-status`) | SP-Board-Quiet (`.qn-*`) |
| PhoneTabBar/PhoneHeader | SP-Phone-Board-Daylight (`.nav`, `.pd-top`) | SP-Phone-Board-Paper | SP-Phone-Board-Studio (`.ph-nav`, `.ph-top`) | SP-Phone-Board-Quiet (`.pqb`, `.pq`) |
| Button | vk.css `.vk-button` + SL-Record-Daylight `.sl-danger` | SP-Board-Paper `.pp-btn` | SP-Board-Studio `.ar-btn`/`.ar-btn2`, SL `.ar-btn.heavy` | SP-Board-Quiet `.qn-btn` |
| IconButton | AP-Admin-People `.ibtn` | same | SL-Library-Studio `.ar-ib` | AP-Agent-Quiet `.x-copy` |
| Tabs | AP-Agent-Daylight `.tbs` | SP-Board-Paper `.mh-tab` | AP-Agent-Studio `.tb` | SP-Board-Quiet links |
| Segmented | vk.css `.vk-segmented` | SL-Viewer-Paper `.tabs` | SP-Board-Studio `.bd-qf`; SP-Operate-Studio `.op-seg` (box) | AP-Agents-Quiet radios |
| QuickFilter | SL-Library-Daylight `.tab` | SL-Library-Paper `.tab` | SL-Library-Studio `.ar-sm` | SL-Library-Quiet `.qt` |
| Field | vk.css `.vk-field` | SP-Card-Paper fields; SL-Dialogs `.mfg` (inline) | Studio-Mix-H `.ar-in`/`.ar-ta`/select | SP-Card-Quiet `.inp` |
| Choice | AP-Admin-People `.radio` | same with `[data-vibe=paper]` | same `[data-vibe=studio]` | same `[data-vibe=quiet]` |
| CommandField/CommandPalette | SP-Dlg-Palette | SP-Dlg-Palette `[data-vibe=paper]` | SP-Dlg-Palette `[data-vibe=studio]`, Studio-Mix-H `.ar-cmd` | SP-Dlg-Palette `[data-vibe=quiet]` |
| Kbd | SP-Board-Daylight `.dy-kbd` | SP-Board-Paper `.mh-kbd` | Studio-Mix-H `.ar .kbd` | SP-Board-Quiet `.qn-kbd` |
| CopyId | SP-Card-Daylight `.dl-copy` | SP-Card-Paper `.pp-copy` | Studio-Mix-H `.ar-pfn` | AP-Agent-Quiet `.x-copy` |
| Disclosure | SP-Card-Daylight `.dl-sec` | SP-Card-Paper `.pp-enc` | SP-Phone-Board-Studio `.pb-stages`, SL `.ar-disc` | SP-Card-Quiet |
| Menu | SL-Collection-Daylight `.menu` | SL-Library-Paper `.mh-menu` | SP-Board-Studio `.ar` menu | AP-Agents-Quiet `.qt-pop` |
| DataTable | SP-List-Daylight | SP-List-Paper | Studio-Mix-H `.ar-tbl` | SP-List-Quiet |
| FactList | SP-CardPage-Daylight `.dp-dl` | SP-CardPage-Paper `.pg-dl` | SP-Card-Studio `.ar-kv` | SP-CardPage-Quiet `.qp-dl` |
| PageHead | SL-Library-Daylight | SL-Library-Paper `.mast` | — (Hero) | SL-Library-Quiet |
| Hero | — (PageHead) | — | Studio-Mix-H `.ar-hero` | — |
| FigureRow | AP-Admin-People `.tile` | same paper | Studio-Mix-H card figures (`.cd-fig`); AP `.tile` studio (cap) | same quiet |
| SmallMultiples | SP-Board-Daylight lane heads | SP-Board-Paper `.pp-pipe` | Studio-Mix-H `.ar-sm`, `.ar-share` | SP-Board-Quiet counts |
| StageTrack | SP-Card-Daylight `.dl-track` | SP-CardPage-Paper `.pg-track`; SP-Phone-Card-Paper `.bars` | SP-Board-Studio `.ar-track` | SP-Card-Quiet `<ol>` |
| StateLabel | vk.css `.vk-pill`, AP `.dot` | SP-Board-Paper `.state--needs` | Studio-Mix-H `.ar-st`, AP-Agent-Studio `.u` | SP-Board-Quiet `.st--needs` |
| AgentName/Face | SP-Card-Daylight | SP-Card-Paper `.pp-by` | Studio-Mix-H card people | SP-Card-Quiet |
| AgentQuote | SP-Card-Daylight `.dl-bubble` | SP-CardPage-Paper `.pg-voice` | Studio-Mix-H `.ar-q` | SP-Card-Quiet fieldset |
| Footnotes | SL-Record-Daylight notes list | SL-Record-Paper `.p-refs` | Studio-Mix-H `.ar-notes`, `.fn` | SL-Record-Quiet |
| SectionHeader | AP-Agents-Daylight `.dl-sect__h` | AP-Agents-Paper `.pp-sect__h` | Studio-Mix-H `.ar-sec > .hd` | AP-Agents-Quiet h2 |
| Dialog | SP-Dlg-Move | SP-Dlg-Move paper | SP-Dlg-Move studio + SL-Dialogs studio | SP-Dlg-Move quiet |
| Drawer | SP-Card-Daylight `.dl-drawer` | SP-Card-Paper `.pp-sheet` | SP-Card-Studio `.cw-drawer`, AP `.drawer` studio | SP-Card-Quiet `.qt-drawer` |
| Sheet | AP-Phone-Agent-Daylight | AP-Phone-Agent-Paper | AP-Phone-Agent-Studio | AP-Phone-Agent-Quiet |
| Toast | SP-Dlg-Reconnect `.vk-toast`; AP-States `.toast` | AP-States paper | SL-Collection-Studio `.ar-toast` | AP-States quiet |
| Notice | SP-Card-States-Daylight `.ds-alert` | SP-Card-States-Paper `.ps-alert` | SP-Card-States-Studio `.ss-alert`, `.ss-banner` | SP-Card-States-Quiet `.qs-alert` |
| EmptyState | SL-Library-Daylight `.note` | SL-Library-Paper `.note` | SL-Library-Studio `.ar-empty` | SL-Library-Quiet |
| Loading | SP-Card-States-Daylight `.ds-sk`; AP-States `.spin` | SP-Card-States-Paper | SP-Card-States-Studio `.ss-sk`; SL-SignIn bar | SP-Card-States-Quiet |
| LoadMore | SL-Library-Daylight `.morerow` | SL-Library-Paper | SL-Library-Studio `.ar-keys` | SP-List-Quiet `.qt-more` |
| Meter | SP-CardPage-Daylight `.dp-meter` | SP-CardPage-Paper `.pg-meter` | SP-Card-Studio `.cd-meter` | SP-Spend quiet `.bar` |

Where a vibe's form is "renders as another component" (Hero in D/P/Q, PageHead in Studio), that sheet shows the delegated form with the same data. It is still produced, so every component has four sheets.

### 4.3 Where things live in vibekit

```
references/
  src/_frame.html, src/_sheet.css
  src/<Name>/<vibe>.html, src/<Name>/<vibe>.css      (hand-maintained, from the table above)
  components/<Name>.<vibe>.html                       (generated, committed)
  components/index.html
scripts/references.ts
src/lib/appearance/context.ts
src/lib/components/<Name>.svelte                      (public)
src/lib/components/<name>/<Name>.<Vibe>.svelte        (Mode T forms)
src/lib/components/<name>/types.ts
src/lib/styles/components/<name>.css
src/lib/styles/derived.css
src/stories/<Name>.stories.svelte
.storybook/main.ts, preview.ts, VibeDecorator.svelte
e2e/components.spec.ts
```

The `files` field in `package.json` is unchanged, so references and stories are not published.

### 4.4 Unit tests added (vitest)

- `tests/styles.test.ts`:
  - every `.vk-<name>` root class in §2 exists;
  - no raw hex in `components/*.css` or `derived.css`;
  - every Mode T form file has a matching `.vk-<name>--<vibe>` rule.
- `tests/contrast.test.ts`: the pairs in §3.2 and §3.5.
- `tests/tokens.test.ts`: `studio.ts` equals the §3.1 values; every look has `rule`, `stageText`, `stage[7]` and `font.serif`.
- `src/lib/components/components.test.ts` renders each component in all 4 vibes with `svelte/server` `render` and asserts:
  - the same accessible names, roles, and `aria-*` set across vibes (the parity contract);
  - no `<div onclick>` (real buttons and links).

---

## 5. Storybook

### 5.1 Compatibility (checked against npm on 2026-10-11)

vibekit `origin/main` resolves svelte `5.57.2`, vite `8.3.4`, `@sveltejs/vite-plugin-svelte` `7.3.1`, `@sveltejs/kit` `2.70.3`, vitest `4.1.11`, typescript `6.0.3` and `@playwright/test` `1.64.0`.

| Package | latest | peer requirements | fits |
|---|---|---|---|
| `storybook` | 10.6.1 | — | yes |
| `@storybook/sveltekit` | 10.6.1 | `svelte ^5`, `vite ^5–^8`, `storybook ^10.6.1` | yes |
| `@storybook/svelte-vite` (dep of the above) | 10.6.1 | `@sveltejs/vite-plugin-svelte ^2…^7`, `vite …^8`, `svelte ^5` | yes (7.3.1) |
| `@storybook/addon-svelte-csf` | 5.1.5 | `storybook …^10.6`, `svelte ^5`, `vite …^8`, `vite-plugin-svelte ^4–^7` | yes |
| `@storybook/addon-a11y` | 10.6.1 | `storybook ^10.6.1` | yes |
| `@storybook/addon-vitest` | 10.6.1 | `vitest ^3–^5`, `@vitest/browser`, `@vitest/browser-playwright ^4–^5` | yes, with `@vitest/browser@4.1.11` and `@vitest/browser-playwright@4.1.11` (match vitest, not the 5.0.3 latest) |

Known wrinkle: `@storybook/svelte-vite` has a *dependency* (not a peer) on `typescript ^4.9.4 || ^5`, used by `svelte2tsx` for docgen. pnpm installs a nested TypeScript 5 for it; the project's own TS 6 is unaffected. Check with `pnpm why typescript` after install: two copies are expected and accepted.

Framework choice: `@storybook/sveltekit`, because the repo is a SvelteKit library with `svelte.config.js` and `$lib`. It mocks `$app/*`, though the library imports none.

### 5.2 Setup

devDependencies, pinned exact like the existing Terrazzo and Fontsource pins:

```
storybook 10.6.1, @storybook/sveltekit 10.6.1, @storybook/addon-svelte-csf 5.1.5,
@storybook/addon-a11y 10.6.1, @storybook/addon-vitest 10.6.1,
@vitest/browser 4.1.11, @vitest/browser-playwright 4.1.11,
pixelmatch 7.1.0, pngjs 7.0.0
```

The pixelmatch and pngjs versions are pinned at install to the then-latest 7.x. The plan step runs `npm view pixelmatch version` and records it.

Scripts:

```json
"storybook": "storybook dev -p 6006",
"storybook:build": "storybook build -o storybook-static",
"references": "tsx scripts/references.ts",
"references:check": "pnpm references && git diff --exit-code -- references/components",
"test:stories": "vitest run --project storybook",
"test:pixels": "playwright test e2e/components.spec.ts"
```

`verify` becomes `pnpm tokens:check && pnpm references:check && pnpm check && pnpm test && pnpm package && pnpm build && pnpm storybook:build`. `.gitignore` adds `storybook-static/`.

`.storybook/main.ts`:

```ts
import type { StorybookConfig } from '@storybook/sveltekit';
export default {
  framework: { name: '@storybook/sveltekit', options: {} },
  stories: ['../src/stories/**/*.stories.svelte'],
  addons: ['@storybook/addon-svelte-csf', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  staticDirs: [{ from: '../references', to: '/references' }, { from: '../static', to: '/' }],
  core: { disableTelemetry: true }
} satisfies StorybookConfig;
```

`.storybook/preview.ts`:

```ts
import '../src/lib/styles/fonts.css';
import '../src/lib/styles/vibekit.css';
import type { Preview } from '@storybook/sveltekit';
import VibeDecorator from './VibeDecorator.svelte';
export default {
  globalTypes: {
    vibe:  { description: 'Vibe',  toolbar: { icon: 'paintbrush', items: ['daylight', 'paper', 'studio', 'quiet'], dynamicTitle: true } },
    theme: { description: 'Theme', toolbar: { icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true } }
  },
  initialGlobals: { vibe: 'daylight', theme: 'light' },
  decorators: [(_, ctx) => ({ Component: VibeDecorator, props: { vibe: ctx.globals.vibe, theme: ctx.globals.theme } })],
  parameters: { a11y: { test: 'error', options: { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }, layout: 'fullscreen' }
} satisfies Preview;
```

`.storybook/VibeDecorator.svelte` renders `<VibeRoot {vibe} {theme}>` and sets `data-motion="reduce"` on `<html>`, so screenshots are stable. Inside it, `<div id="sheet-root">` holds `{@render children()}`.

`vite.config.ts` gains a vitest `projects` entry:
- `storybook`: `storybookTest({ configDir: '.storybook' })` with `browser: { enabled: true, provider: playwright(), instances: [{ browser: 'chromium' }], headless: true }`
- the existing node project keeps `include: ['src/**/*.test.ts','tests/**/*.test.ts']`

That runs every story's play function and the a11y check as tests.

### 5.3 Stories

There is one file per component, `src/stories/<Name>.stories.svelte`, written in addon-svelte-csf v5 syntax:

```svelte
<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Button from '$lib/components/Button.svelte';
  import { BUTTON_CASES } from './cases/button.js';   // the same case list the reference sheet uses
  const { Story } = defineMeta({ title: 'Components/Button', component: Button, tags: ['autodocs'] });
</script>
<Story name="Sheet" parameters={{ layout: 'fullscreen' }}>
  {#snippet template()}<main id="sheet" class="vk-ref-sheet">{#each BUTTON_CASES as c (c.id)}<section data-case={c.id}><p class="vk-ref-label">{c.id}</p><Button {...c.props} class={c.force}>{c.label}</Button></section>{/each}</main>{/snippet}
</Story>
<Story name="Primary" args={{ variant: 'primary', children: 'New card' }} />
<!-- one Story per variant for docs; Sheet is the one the pixel test reads -->
```

- `src/stories/cases/<name>.ts` exports the case list (`id`, props, forced-state class, label). It is the single source the `Sheet` story and `references/src/<Name>/<vibe>.html` are checked against: `scripts/references.ts` fails if a reference sheet's `data-case` set differs from the case list.
- `.vk-ref-sheet` and `.vk-ref-label` live in `src/stories/sheet.css`, imported by `preview.ts`, and are byte-identical to `references/src/_sheet.css`. A test asserts equality.
- Forced states: `class="is-hover"` etc. The library CSS does **not** contain `.is-hover`. Instead, `src/stories/force-states.css` is generated by `scripts/references.ts` from `components/*.css`: every `:hover` / `:focus-visible` / `:active` selector is duplicated with `.is-hover` / `.is-focus` / `.is-active`. It is imported only by Storybook, and the reference sheets do the same for their own CSS.
- Vibe × theme: each story renders in whatever the toolbar globals say. The pixel test sets them through the URL.

### 5.4 Pixel test: story vs reference sheet

`e2e/components.spec.ts` gets a new Playwright project `components` in `playwright.config.ts`:
- `use: { baseURL: 'http://localhost:6007', reducedMotion: 'reduce', viewport: { width: 1008, height: 800 }, deviceScaleFactor: 1 }` on Desktop Chrome
- `webServer: { command: 'pnpm references && pnpm storybook:build && pnpm dlx http-server storybook-static -p 6007 -s', port: 6007, reuseExistingServer: true }`

The existing `phone` and `desktop` projects keep `testDir: 'e2e'` with `testIgnore: 'components.spec.ts'`.

```ts
import { expect, test } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { COMPONENTS } from '../src/stories/cases/index.js';   // [{ name: 'Button', storyId: 'components-button--sheet', phone?: boolean }]
const VIBES = ['daylight', 'paper', 'studio', 'quiet'] as const;
const THEMES = ['light', 'dark'] as const;

async function shot(page, url: string, sel: string) {
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  return PNG.sync.read(await page.locator(sel).screenshot({ animations: 'disabled', caret: 'hide' }));
}

for (const c of COMPONENTS) for (const vibe of VIBES) for (const theme of THEMES) {
  test(`${c.name} ${vibe} ${theme} matches its reference sheet`, async ({ page }, info) => {
    const ref = await shot(page, `/references/components/${c.name}.${vibe}.html?theme=${theme}`, '#sheet');
    const story = await shot(page, `/iframe.html?id=${c.storyId}&viewMode=story&globals=vibe:${vibe};theme:${theme}`, '#sheet');
    expect.soft([story.width, story.height], 'sheet size').toEqual([ref.width, ref.height]);
    const diff = new PNG({ width: ref.width, height: ref.height });
    const bad = pixelmatch(ref.data, story.data, diff.data, ref.width, ref.height, { threshold: 0.1, includeAA: false });
    if (bad) await info.attach('diff.png', { body: PNG.sync.write(diff), contentType: 'image/png' });
    expect(bad / (ref.width * ref.height)).toBeLessThanOrEqual(0.002);     // same ratio as playwright.config.ts
    await expect(page.locator('#sheet')).toHaveScreenshot(`${c.name}-${vibe}-${theme}.png`);  // regression baseline of the story itself
  });
}
```

What it guarantees:
- **The Svelte component equals the approved mockup.** The reference sheet is built from mockup markup, canonical CSS and the shared tokens and fonts. The story is built from the library. Both use the same case list at the same 960px width.
- **No regressions between reviews.** `toHaveScreenshot` stores `e2e/components.spec.ts-snapshots/<Name>-<vibe>-<theme>-components-darwin.png`, following the existing matrix naming.

The run is 40 components × 4 vibes × 2 themes = 320 tests. Phone components set `viewport: { width: 438, height: 800 }` via `test.use` in a `describe` for `c.phone`.

An a11y check runs in both layers:
- `addon-a11y` with `test: 'error'` inside `pnpm test:stories`;
- `AxeBuilder` on each story URL in `components.spec.ts`, with the same tag set as `matrix.spec.ts`.

CI (`.forgejo/workflows/ci.yml` and `.github/workflows/ci.yml`) adds `pnpm test:stories` and `pnpm test:pixels` after `pnpm verify`. The snapshots are darwin, as today; CI runs the pixel job on the same macOS runner label as the existing matrix job.

---

## 6. Order of work

This is the order for the implementation plan.

1. **Tokens:**
   - `studio.ts` rewrite (§3.1);
   - the new `LookColors` keys and serif (§3.2);
   - `derived.css` (§3.4);
   - fonts;
   - the contrast pairs (§3.2, §3.5).

   `e2e/matrix.spec.ts` Studio snapshots are re-baselined; that is the only intentional visual change to existing components.
2. **Runtime:** `appearance/context.ts`, `VibeRoot`.
3. **Storybook and the references pipeline**, with Button as the first component end to end: reference sheets, story, pixel test green.
4. **Components:**
   1. controls (8–20)
   2. data display (21–33)
   3. overlays and feedback (34–40)
   4. shell (2–7)

   The shell comes last because it composes the others.
5. **Exports:**
   - `src/lib/index.ts` exports every component and the types.
   - `docs/usage.md` gains a "Components" section listing each with its props table.
   - `static/llms.txt` gains the same list.
   - `StatusPill` is marked deprecated.
