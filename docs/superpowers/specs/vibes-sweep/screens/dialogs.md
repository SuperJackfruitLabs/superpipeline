# Screen spec: dialogs (SP-Dlg-*)

Group `dialogs`. Artboards: SP-Dlg-NewCard, SP-Dlg-Palette, SP-Dlg-Appearance, SP-Dlg-Move, SP-Dlg-Reconnect, SP-Dlg-BoardSwitcher. All are 1440×900 desktop artboards with a `vibe` tweak (daylight | paper | studio | quiet) and a `theme` tweak (light | dark). Reconnect also has a `state` tweak (silent | expired). The reference HTML (`apps/web/e2e/reference/mockups/SP-Dlg-*.html`) is the default render: vibe=daylight, theme=light, state=expired. The `.dc.html` sources are the authority for the other vibe branches. Where a rendered PNG in `.playwright-mcp/review/qa/` disagrees with the source, the source wins. One known case: `SP-Dlg-Appearance.png` predates Annual report and still shows the Studio card as "Precise and dense… table with tiles". The reference HTML and the source both read "An annual report: …".

Sources (all quoted CSS is verbatim from these): `scratchpad/vibes-mockups/project/SP-Dlg-<Name>.dc.html` (lines 158–260 hold the dialog CSS; lines 14–157 are the backdrop shell, identical in all six files).

Code base: origin/main 1a4dc22. Current files touched: `lib/components/shell/ComposeSheet.svelte` (106), `lib/components/CommandPalette.svelte` (285), `lib/components/shell/AppearanceDialog.svelte` (180), `lib/components/board/CardMoveMenu.svelte` (73), `lib/components/shell/BoardSwitcher.svelte` (149), `lib/reconnect.ts`, `lib/api.ts`, `lib/stores/app.svelte.ts`, `routes/+layout.svelte`.

---

## 0. What all six share

### 0.1 vibekit components (coordinator update: shared UI comes from the vibekit component library)

Dialog-specific composition, flows and data stay in the app. Reusable patterns are named `vibekit:<Name>` below, with the props they need. These names are descriptive and get reconciled with the vibekit inventory later. Each one must render exactly the mockup CSS quoted in this file, so the CSS here is the reference sheet for the vibekit component as well.

| vibekit component | Props | Used by |
|---|---|---|
| `vibekit:DialogFrame` | `open: boolean; onClose?: () => void` (absent = cannot be dismissed, e.g. Reconnect); `role?: 'dialog' \| 'alertdialog'` (default dialog); `labelledby?: string; describedby?: string; label?: string`; `width: number` (px, desktop); `top: number` (px from viewport top at ≥900px viewport height); `placement?: 'center' \| 'anchored'`; `anchor?: HTMLElement` (anchored: left = anchor.left, top = anchor.bottom + 8); `radius?: 'lg' \| 'md'` (default lg); `phone?: 'sheet' \| 'card'` (default sheet); `initialFocus?: HTMLElement \| string`; `class?: string`; children snippet | all six |
| `vibekit:Scrim` | `onclick?: () => void` | inside DialogFrame; also on its own for the BoardSwitcher popover |
| `vibekit:IconButton` | `label: string; icon: Snippet; size?: 44; onclick` | close buttons, palette Clear |
| `vibekit:Button` | `variant: 'primary' \| 'secondary' \| 'quiet'; type?; disabled?; href?; full?: boolean; onclick; children` (renders `.vk-button vk-button--*`) | every footer |
| `vibekit:Field` | `label: string; for: string; hint?: string; optional?: boolean` (appends `<span class="opt">(optional)</span>`); children = the control (`.vk-field__input`) | NewCard |
| `vibekit:Select` | `id; value; options: Array<{value: string; label: string}>; onchange` (`.vk-field__input` plus a chevron, = `.nc-selwrap`/`.nc-select`) | NewCard stage, project |
| `vibekit:Segmented` | `label: string; options: Array<{value: string; label: string}>; value: string; onchange; fill?: boolean` (fill = `.nc-prio` stretch). Markup: `div.vk-segmented[role=radiogroup]` > `button.vk-segmented__item[role=radio][aria-checked][data-state]`; roving tabindex, arrow keys move and select | NewCard priority, Appearance theme + time |
| `vibekit:Switch` | `checked: boolean; labelledby; describedby; onclick; word: string` (= `.ap-switch` + `.ap-track`) | Appearance location |
| `vibekit:Kbd` | `keys: string[]` (each one `<span class="kbd">`) | palette/switcher/move/newcard hints |
| `vibekit:KbdHint` | `keys: string[]; text: string` (`<span><Kbd/> text</span>`) | foot hint rows |
| `vibekit:Chip` | `tone?: 'default' \| 'needs' \| 'gate' \| 'done'; children` | palette, switcher, move |
| `vibekit:Face` (app wrapper `AgentFace.svelte`) | `agentId; name; mood; size` (20 / 24 / 28 / 32) | all |
| `vibekit:CommandList` | `id; label: string; groups: Array<{name: string; count: string; items: T[]}>; selected: number; onselect(i); onpick(i); row: Snippet<[T, boolean]>` (listbox + group + option roles; `.pal-list`/`.bs-list`) | Palette, BoardSwitcher |
| `vibekit:CommandRow` | `selected: boolean; href?: string` (anchor when set, else div[role=option]); children | Palette rows, BoardSwitcher rows |
| `vibekit:SearchField` | `id; label (visually hidden); placeholder; value; onkeydown; clearable?: boolean; escHint?: boolean; size: 'lg' \| 'md'` (lg = `.pal-in`, md = `.bs-in`) | Palette, BoardSwitcher |
| `vibekit:Toast` | `busy?: boolean` (spinner `.spin`); children; `role="status"` | Reconnect silent |
| `vibekit:Sky` | `phase; class` (`.vk-sky` + `__sun` + `__content`) | Appearance readout |
| `vibekit:VisuallyHidden` | children | labels |

App-local composition (one file per dialog, under `apps/web/src/lib/components/dialogs/`). Each file owns the dialog's own layout CSS in its `<style>` block, quoted per artboard below:
- `NewCardDialog.svelte` (replaces `shell/ComposeSheet.svelte`, which is deleted)
- `CommandPalette.svelte` (moved from `lib/components/CommandPalette.svelte`, rewritten)
- `AppearanceDialog.svelte` (moved from `shell/`, rewritten)
- `MoveCardDialog.svelte` (new; `board/CardMoveMenu.svelte` keeps its trigger button and `step()`, and its dropdown is deleted)
- `ReconnectDialog.svelte` + `ReconnectToast.svelte` (new)
- `BoardSwitcherPopover.svelte` (new; `shell/BoardSwitcher.svelte` becomes the trigger only and mounts it)
- `dialog-copy.ts` (new): every fixed string in this file, as exported constants, plus the per-vibe records.
- `who-picks-up.ts` (new): `ownerShort`, `pickupSentence`, `pickupClause` (§4, §1).
- `relative-day.ts` (new): `relativeDay` (§6).

Per decision 1 these are shared screens: one component each, with vibe differences as `:global([data-vibe=x])`-scoped CSS. Nothing is added to `layouts.ts` for them.

### 0.2 Base dialog CSS (port into `vibekit:DialogFrame` / `Scrim` / `Chip` / `Kbd` / `IconButton`, plus a small `dialogs/dialog-base.css` for the text helpers)

Verbatim from every file, lines 158–181. Text helpers `.eyebrow .dlg-title .muted .small .mono .link .rule .wrap` are scoped under `.sp-dlg` (the DialogFrame root gets class `sp-dlg`) so they cannot collide with app.css's `.mono`.

```css
.scrim { position: absolute; inset: 0; background: color-mix(in oklch, var(--vk-color-text) 36%, transparent); }
[data-theme="dark"] .scrim { background: color-mix(in oklch, var(--vk-color-bg) 70%, transparent); }
.dlg { position: absolute; background: var(--vk-color-surface); color: var(--vk-color-text); border-radius: var(--vk-radius-lg); box-shadow: 0 0 0 1px var(--vk-color-line), 0 28px 70px color-mix(in oklch, var(--vk-color-text) 26%, transparent); }
[data-theme="dark"] .dlg { box-shadow: 0 0 0 1px var(--vk-color-line), 0 28px 70px color-mix(in oklch, var(--vk-color-bg) 80%, transparent); }
[data-vibe="paper"] .dlg { border-radius: var(--vk-radius-sm); }
[data-vibe="studio"] .dlg { border-radius: var(--vk-radius-sm); }
[data-vibe="quiet"] .dlg { box-shadow: 0 0 0 2px var(--vk-color-text); }
.eyebrow { font: 600 13px/1.2 var(--vk-font-display); color: var(--vk-color-muted); letter-spacing: .01em; }
[data-vibe="studio"] .eyebrow { font: 700 12px/1.2 var(--vk-font-body); text-transform: uppercase; letter-spacing: .1em; }
[data-vibe="paper"] .eyebrow { font-style: italic; font-weight: 500; font-size: 14px; }
.dlg-title { margin: 0; font: 700 var(--vk-text-lg)/1.2 var(--vk-font-display); }
[data-vibe="paper"] .dlg-title { font-weight: 500; }
[data-vibe="studio"] .dlg-title { font: 800 28px/1.05 var(--vk-font-body); font-stretch: 82%; letter-spacing: -.015em; }
.muted { color: var(--vk-color-muted); }
.small { font-size: var(--vk-text-sm); }
.mono { font-family: var(--vk-font-mono); }
.kbd { display: inline-block; font: 500 11px/1 var(--vk-font-mono); padding: 4px 6px; border-radius: 6px; background: var(--vk-color-raised); border: 1px solid var(--vk-color-line); color: var(--vk-color-muted); }
.icon-btn { width: 44px; height: 44px; flex: none; display: inline-grid; place-items: center; border: 0; background: transparent; color: var(--vk-color-muted); border-radius: var(--vk-radius-sm); cursor: pointer; }
.icon-btn:hover { background: var(--vk-color-raised); color: var(--vk-color-text); }
.link { color: var(--vk-color-text); text-decoration: underline; text-underline-offset: 3px; background: none; border: 0; padding: 0 4px; min-height: 44px; font: inherit; cursor: pointer; }
.rule { height: 1px; background: var(--vk-color-line); border: 0; margin: 0; }
[data-vibe="paper"] .rule { background: var(--vk-color-text); opacity: .25; }
.wrap { overflow-wrap: anywhere; }
```

Chips (lines 146–155) and the quiet face rule:

```css
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); border: 1px solid var(--vk-color-line); font-size: 12px; color: var(--vk-color-muted); line-height: 1.4; }
.chip--needs { background: var(--vk-color-signal-wash); color: var(--vk-color-signal-text); border-color: var(--vk-color-signal); font-weight: 700; }
.chip--gate { background: transparent; border-color: var(--vk-color-text); color: var(--vk-color-text); font-weight: 600; }
.chip--done { background: var(--vk-color-success-wash); color: var(--vk-color-success-text); border-color: transparent; font-weight: 600; }
[data-vibe="studio"] .chip { border-radius: 0; font-family: var(--vk-font-mono); font-size: 11.5px; text-transform: none; letter-spacing: 0; }
[data-vibe="quiet"] .chip { background: transparent; border-color: var(--vk-color-line); }
[data-vibe="quiet"] .vk-face svg { filter: grayscale(1); opacity: .85; }
.bd-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--vk-mood-resting); display: grid; place-items: center; font: 700 13px/1 var(--vk-font-body); color: var(--vk-face-ink); }
.art :focus-visible { outline: 2px solid var(--vk-color-text); outline-offset: 2px; }
```

The Studio = Annual report dialog block, identical in all six files:

```css
[data-vibe="studio"] .scrim { background: color-mix(in srgb, var(--vk-color-text) 45%, transparent); }
[data-vibe="studio"][data-theme="dark"] .scrim, [data-theme="dark"] [data-vibe="studio"] .scrim { background: color-mix(in srgb, var(--vk-color-ground) 72%, transparent); }
[data-vibe="studio"] .dlg { border-radius: 2px; box-shadow: 0 0 0 1.5px var(--vk-color-rule), 0 28px 70px color-mix(in srgb, var(--vk-color-text) 24%, transparent); }
[data-vibe="studio"] .kbd { border-radius: 2px; background: transparent; border-color: currentColor; }
[data-vibe="studio"] .chip--needs { background: transparent; }
[data-vibe="studio"] .chip--done { background: transparent; border-color: var(--vk-stage-7); color: var(--vk-color-text); }
```

Renames for the app. `data-vibe` and `data-theme` live on `<html>`, so `[data-vibe="x"] .dlg` in a component becomes `:global([data-vibe="x"]) .dlg`. `.art :focus-visible` becomes `.sp-dlg :focus-visible`. `.art` (the 1440×900 canvas root) is dropped. `.vk-visually-hidden` comes from vibekit.

### 0.3 Placement in the app (replaces the artboard's absolute px)

In the artboard each dialog is `position:absolute` with `left` equal to `(1440 − width) / 2`. In the app, `vibekit:DialogFrame` renders:

```css
.sp-dlg-layer { position: fixed; inset: 0; z-index: 50; display: flex; justify-content: center; align-items: flex-start; padding: var(--dlg-top) 16px 16px; overflow-y: auto; }
.sp-dlg-layer > .scrim { position: fixed; inset: 0; }
.sp-dlg-layer > .dlg { position: relative; left: auto; top: auto; width: min(var(--dlg-w), 100%); flex: none; }
@media (max-height: 899px) { .sp-dlg-layer { padding-top: 16px; } }
```

At 1440×900 this reproduces the mockup's left and top exactly. Values per dialog: NewCard w 800 top 44 · Palette w 700 top 84 · Appearance w 1000 top 34 · Move w 640 top 36 · Reconnect w 540 top 190 · BoardSwitcher: anchored (§6).

Behaviour common to every frame:
- `aria-modal`, Tab and Shift+Tab trapped inside, focus returns to the opener on close.
- The app root (`.app-shell`) gets `inert` while a modal is open. The mockup marks the backdrop `aria-hidden inert`.
- Escape closes, except Reconnect (§5).
- Clicking the scrim closes, except Reconnect.

### 0.4 Phone (not drawn in any SP mockup)

No SP artboard shows a dialog at 390. Ruling (Gap D-15):
- Below 600px, `phone: 'sheet'` frames pin to the bottom: `.sp-dlg-layer { align-items: flex-end; padding: 0 }`, `.dlg { width: 100%; max-height: 100dvh; overflow-y: auto; border-radius: var(--vk-radius-lg) var(--vk-radius-lg) 0 0 }`, with Studio radius 2px and safe-area bottom padding.
- Internal 2-column grids (`.nc-grid`, `.nc-row2`, `.ap-row`) become 1 column and `.ap-vibes` becomes `repeat(2, minmax(0,1fr))`.
- Footers wrap.
- Reconnect uses `phone: 'card'`: centred, `width: calc(100% - 32px)`, top 16px.
- BoardSwitcher becomes a sheet, not anchored.
- These keep the 44px targets and the no-side-scroll rule from `e2e/vibes.spec.ts`. No pixel baseline at 390 exists for dialogs.

### 0.5 Backdrop

The backdrop behind every dialog in the mockups is a stand-in: the vibe's shell plus a generic lane board (`.bd-lanes`) that is the same in every vibe. In the app it is the real screen, specified by the shell and board groups.

Pixel-diff ruling (Gap D-10): for SP-Dlg-* the test compares
- (1) an element screenshot of the `.dlg` section (BoardSwitcher: section plus trigger)
- (2) the scrim colour, sampled at 4 points outside the dialog against the mockup's computed scrim over the same token background.

The full-frame diff masks everything outside the dialog box.

### 0.6 Clock and person (all six)

The fixture clock is `2026-10-11T08:21:00Z` (13:51 Asia/Kolkata, phase `noon` = "Midday"). The browser time zone is `Asia/Kolkata`. The signed-in person is `Rakesh Gangwar` (user `usr_rakesh`), with initials `RG`. Gap D-4 covers the name.

---

## 1. SP-Dlg-NewCard: New card composer

1440×900, every vibe. Route: any board route (`/b/brd_dx…`) with the composer open. The mockup state is *after a draft*: the sentence is typed, a draft has arrived from super-chotu, and the person has picked P1 and a due date of 2026-10-18.

### Component tree
- `apps/web/src/lib/components/dialogs/NewCardDialog.svelte`
  - Props: `{ open: boolean; onClose: () => void; initialSentence?: string; boardId?: string }`.
  - Mounted once in `routes/b/[boardId]/+layout.svelte` (moved out of BoardHeader).
  - Opened by: `app.composeRequest` (counter, existing), BoardHeader's New card button, the palette's "Dispatch a card" and "Dispatch a card called “q”" (passes `initialSentence`), and the `N` key when focus is not in a text field.
- Delete `lib/components/shell/ComposeSheet.svelte`. BoardHeader stops owning `composing`, sets `app.composeRequest++`.
- New store state in `app` (`stores/app.svelte.ts`): `composeSentence = $state<string>('')`. `requestCompose(sentence?: string)` sets it.
- Composition:
  - `vibekit:DialogFrame{width:800, top:44, labelledby:'nc-title'}`
  - head: eyebrow, board button, `vibekit:IconButton{label:'Close without saving'}`
  - body: title, lead, sentence `<textarea>`, draft row (`vibekit:Button secondary` + `vibekit:Face` 24 + note), `.nc-grid` with `vibekit:Field` ×5 / `vibekit:Select` ×2 / `vibekit:Segmented{fill}` / label chips + `LabelPicker`
  - foot: who-picks-up line, `vibekit:KbdHint{keys:['⌘','↵'], text:'to dispatch'}`, Cancel, Dispatch.
- New `dialogs/LabelPicker.svelte`
  - Props: `{ selected: string[]; onchange: (ids: string[]) => void }`.
  - It is the "Add label" button plus a `role=listbox` popover of `app.labels` names (multi-select, Escape closes, typing filters). It is not drawn in the mockup: Gap D-21.
- New `dialogs/BoardPickButton.svelte`
  - Props: `{ boardId: string; onpick: (id: string) => void }`.
  - It is the `.nc-board` button with `aria-haspopup="listbox"` and a listbox of `app.boards` names. Picking one changes the target board and reloads that board's stages via `getBoard(id)`. It does **not** navigate.

### Layout & CSS (verbatim, `.nc` block, lines 183–214)
```css
.nc { left: 320px; top: 44px; width: 800px; display: flex; flex-direction: column; }
.nc-head { display: flex; align-items: flex-start; gap: 12px; padding: 22px 24px 4px 28px; }
.nc-board { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 12px; margin-left: -12px; border: 0; border-radius: var(--vk-radius-sm); background: transparent; color: var(--vk-color-text); font: 600 15px/1 var(--vk-font-body); cursor: pointer; }
.nc-body { padding: 4px 28px 0; display: flex; flex-direction: column; gap: 16px; }
.nc-lead { margin: 6px 0 0; color: var(--vk-color-muted); font-size: 15px; }
[data-vibe="paper"] .nc-lead { font-family: var(--vk-font-display); font-style: italic; font-size: 17px; }
.nc-sentence { width: 100%; min-height: 76px; resize: none; padding: 14px 16px; border: 2px solid var(--vk-color-text); border-radius: var(--vk-radius-md); background: var(--vk-color-surface); color: var(--vk-color-text); font: 500 18px/1.4 var(--vk-font-body); box-shadow: var(--vk-focus); }
[data-vibe="paper"] .nc-sentence { font-family: var(--vk-font-display); font-size: 20px; border-radius: var(--vk-radius-sm); }
.nc-draftrow { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.nc-drafted { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: var(--vk-color-muted); }
.nc-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 20px; }
.nc-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.nc-brief { width: 100%; min-height: 214px; resize: none; padding: 12px 14px 40px; border: 2px solid var(--vk-color-faint); border-radius: var(--vk-radius-sm); background: var(--vk-color-surface); color: var(--vk-color-text); font: 400 15px/1.5 var(--vk-font-body); white-space: pre-wrap; }
.nc-brief-wrap { position: relative; }
.nc-brief-tag { position: absolute; right: 10px; bottom: 10px; display: inline-flex; gap: 6px; align-items: center; padding: 3px 8px; border-radius: var(--vk-radius-pill); background: var(--vk-mood-done); color: var(--vk-face-ink); font: 600 12px/1.3 var(--vk-font-body); }
.nc-select { appearance: none; width: 100%; padding-right: 40px; background-image: none; }
.nc-selwrap { position: relative; }
.nc-selwrap svg { position: absolute; right: 14px; top: 50%; margin-top: -8px; color: var(--vk-color-muted); pointer-events: none; }
.nc-row2 { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); gap: 12px; }
.nc-labels { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.nc-label { display: inline-flex; align-items: center; gap: 2px; padding-left: 10px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); border: 1px solid var(--vk-color-line); font-size: 13px; }
.nc-label button { width: 32px; height: 32px; border: 0; background: transparent; color: var(--vk-color-muted); display: grid; place-items: center; border-radius: 50%; cursor: pointer; }
.nc-addlabel { display: inline-flex; align-items: center; gap: 4px; min-height: 34px; padding: 0 10px; border: 1px dashed var(--vk-color-faint); border-radius: var(--vk-radius-pill); background: transparent; color: var(--vk-color-text); font-size: 13px; cursor: pointer; }
.nc-prio { display: flex; }
.nc-prio .vk-segmented { width: 100%; }
.nc-prio .vk-segmented__item { flex: 1; padding: 0 8px; }
.nc-due { display: flex; gap: 8px; align-items: center; }
.nc-due .vk-field__input { flex: 1; min-width: 0; }
.nc-where { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: var(--vk-radius-sm); background: var(--vk-color-raised); font-size: 14px; }
.nc-foot { display: flex; align-items: center; gap: 12px; padding: 18px 28px 22px; margin-top: 18px; border-top: 1px solid var(--vk-color-line); }
.nc-foot .grow { flex: 1; }
.vk-field__label .opt { font-weight: 400; color: var(--vk-color-muted); }
```
Notes:
- `left/top/width` move to DialogFrame (§0.3).
- `.nc-where` is unused in the markup; port it anyway, it is harmless.
- Inline styles kept verbatim:
  - head wrapper `flex: 1; min-width: 0`
  - drafter name `<strong style="color: var(--vk-color-text)">`
  - priority fieldset `border:0;padding:0;margin:0`, legend `margin-bottom: 8px`
  - foot left `class="grow small muted" style="display:flex;align-items:center;gap:8px"` with a board icon `flex:none`.
- Phone: §0.4.

### Content map
| Element | Source |
|---|---|
| eyebrow "New card" | copy |
| "on Developer Experience ⌄", aria-label "Board: Developer Experience. Change board" | `on ${targetBoard.name}` from `app.boards` / `app.board.name` |
| Close icon, aria-label "Close without saving" | copy |
| h2 "What needs doing?" (id `nc-title`) | copy |
| lead | `NC_LEAD[vibe]`, verbatim: daylight "Tell me in a sentence. An agent drafts the brief, and you can change any of it before it goes." · paper "Describe it in a sentence. An agent drafts the brief, and you may change any of it before it goes." · studio "One sentence in, a drafted brief out. Edit anything before dispatch." · quiet "Describe the work in one sentence. An agent writes a draft brief. You can change all of it before you dispatch." |
| sentence textarea (visually-hidden label "Describe it in a sentence", rows 2) | local state `sentence`; fixture text "Fix the highest-severity blocker found in the clean-room journey, with red-test evidence before any fix." |
| button "Draft again" + sparkle icon (`M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z`) | copy. Before any draft exists it reads "Draft brief" (D-21) |
| drafted note: 24px face (agent, mood `done`, aria-label "super-chotu, done") + "**super-chotu** drafted the title and brief from your sentence. Change anything." | `draft.drafter.name` from `GET /v1/drafts/:id` (D-1). Hidden until a draft is ready |
| "Card title" input | `title`, filled from `draft.title` = "Fix the highest-severity blocker found in the clean-room journey" |
| "Brief for the agent" + hint "What done looks like, and anything it should not do." (`aria-describedby`) | `brief`, filled from `draft.brief` (verbatim text in Fixtures) |
| tag "Drafted · not sent yet" (sparkle 12px) | shown while `brief === draft.brief`, hidden after any edit |
| "Starts in stage" select | options = board stages by order, `${stage.name} · ${ownerShort(stage)}` (§4 helper): "Reported · a person", "Reproduce · error-eric", "Failing test · tester-tim", "Fix · 2 agents", "Integrate · 3 agents", "Signed off · approval gate", "Shipped · a person". Value defaults to `draft.stageKey ?? stages[0].key` |
| "Project (optional)" | options "No project" + `app.projects` names; value `draft.projectId ?? ''` |
| "Due (optional)" date + "Clear" (`.link small`, shown only when set) | `due`, mockup value 2026-10-18 (set by the person in the recipe) |
| "Priority" segmented None P1 P2 P3 P4 | `priority` 0..4 (P1 = 1). Mockup P1. Default `draft.priority ?? 0` |
| "Labels" chips clean-room, evidence-required, superpipeline, each with × (aria-label "Remove label {name}") + "Add label" | `labelIds` (default `draft.labelIds`), names via `app.labelById()` |
| foot "Goes to **Reported** on Developer Experience, where a person picks it up." | `Goes to <strong>{stage.name}</strong> on {board.name}, where {pickupClause(stage)} picks it up.`. `pickupClause`: human non-gate → "a person"; gate → "a person" (and the sentence ends "…, where a person approves it." instead); capability with 1 declared → that name; n>1 → `one of the {n} agents with {caps}`; 0 → the sentence becomes `…, where it waits: no agent declares {label} yet.`; ownerKind agent → agent name |
| "⌘ ↵ to dispatch" | copy (`vibekit:KbdHint`). Shows "Ctrl ↵" on non-Mac (`navigator.platform` not Mac) |
| Cancel / Dispatch | copy. While saving, Dispatch reads "Dispatching…" (existing) |

### Interactions & states
- Open: focus goes to the sentence textarea. If `initialSentence` is passed, it is prefilled.
- **Draft brief / Draft again**
  - Calls `createDraft(boardId, sentence)` (D-1).
  - Button state while drafting: disabled, label "Drafting…". The note row shows a 24px face with mood `thinking` and the text "{drafter} is drafting…".
  - Then poll `getDraft(id)` every 1s (or the board socket event `draft.ready`) until `status` is `ready` or `failed`, up to 60s.
  - Ready: fill title, brief, stage, priority, labels, project. Fields the person already edited since the last draft are **not** overwritten: track a dirty flag per field.
  - Failed or timeout: note reads "No draft this time. Write the title and brief yourself, or try again." and the button returns to "Draft again".
  - No drafter configured (API 409 `NO_DRAFTER`): the draft button and note are hidden and the lead is unchanged. The form works by hand.
- Cmd/Ctrl+Enter anywhere in the dialog dispatches. Dispatch is disabled while `title.trim()===''`.
- **Dispatch** → `app.dispatchCard(title, { priority, description: brief, due, stageKey, labelIds, projectId, boardId: targetBoardId })`.
  - This extends the existing signature. `createCard` gains `stageKey`, `labelIds`, `projectId` (D-2).
  - Success closes. A different target board does **not** navigate. A failure leaves the dialog open and shows `app.error` in a `<p role="alert" class="nc-where">` above the foot.
- Cancel, ×, Escape and the scrim close without saving (with no confirm). State resets on close (existing behaviour).
- Board button: listbox of boards. Picking one reloads stages; stage resets to the first stage, and the labels and project are kept.
- Label × removes. Add label opens LabelPicker.
- Focus is visible everywhere via `.sp-dlg :focus-visible`. The sentence carries `box-shadow: var(--vk-focus)` permanently (mockup).

### Fixture needs
- Board `brd_dx` "Developer Experience" with stages §7.
- Labels: `clean-room`, `evidence-required`, `superpipeline` (and `+2` others on card 1 per board fixture).
- Projects: may be empty, since "No project" is selected.
- Agent super-chotu with capability `command` (drafter).
- A draft record `drf_dx_01`, created in the e2e recipe by `seed.ts` acting as super-chotu through `PUT /v1/drafts/:id`:
  - `title` = "Fix the highest-severity blocker found in the clean-room journey"
  - `stageKey` = `reported`, `priority` = 1
  - `labelIds` = [clean-room, evidence-required, superpipeline]
  - `brief` =
```
Done looks like:
• The blocker is reproduced from a clean room and named in one sentence.
• A failing test lands first, with the red run attached as evidence.
• The fix turns that test green and changes nothing else.

Do not:
• Push to the Forge mirror or to GitHub without an approval.
• Close the card without the evidence link.
```
- Recipe:
  1. Open the composer and type the sentence.
  2. Click Draft brief.
  3. Seed fulfils the draft.
  4. Set due 2026-10-18, keeping P1.
  5. Blur everything (the mockup shows no focus ring except the sentence's permanent shadow).

---

## 2. SP-Dlg-Palette: Command palette

1440×900, every vibe. Shown over any route; the mockup state is the board with query "agent" typed and the first row selected.

### Component tree
- `apps/web/src/lib/components/dialogs/CommandPalette.svelte` (replaces `lib/components/CommandPalette.svelte`). Mounted in `routes/+layout.svelte` as now, with no props. It reads `app.cmdkOpen`.
- Pure index builder in a new `dialogs/palette-index.ts`:
  - `buildPaletteIndex(ctx: PaletteCtx): PaletteItem[]`
  - `filterPalette(items, q): { groups: PaletteGroup[]; flat: PaletteItem[] }`
  - Unit-tested.
- `interface PaletteItem { group: 'Cards'|'Boards'|'Agents'|'Actions'|'Account'; label: string; sub: string; needs: boolean; meta: string; icon: 'card'|'board'|'plus'|'pulse'|'coin'|'settings'|'people'|'swatch'|'moon'|'sun'|'power'|{ agentId: string; name: string }; verb: string; act: () => void }`
- Composition: `vibekit:DialogFrame{width:700, top:84, label:'Command palette'}` > `vibekit:SearchField{size:'lg', clearable, escHint}` > `.pal-count` > `vibekit:CommandList` with `vibekit:CommandRow` rows (`.pal-ic` + `.pal-text` + `vibekit:Chip needs` + `.pal-meta` + `.pal-enter`) > `.pal-empty` > `.pal-foot` of `vibekit:KbdHint`s.

### Layout & CSS (verbatim, lines 183–211)
```css
.pal { left: 370px; top: 84px; width: 700px; display: flex; flex-direction: column; overflow: hidden; }
.pal-in { display: flex; align-items: center; gap: 12px; padding: 10px 14px 10px 20px; border-bottom: 1px solid var(--vk-color-line); color: var(--vk-color-muted); }
.pal-in input { flex: 1; min-width: 0; height: 52px; border: 0; background: transparent; color: var(--vk-color-text); font: 500 19px/1 var(--vk-font-body); outline: none; }
.pal-in input::placeholder { color: var(--vk-color-faint); }
.pal-in:focus-within { box-shadow: inset 0 -2px 0 var(--vk-color-text); }
.pal-count { padding: 10px 20px 0; font-size: 13px; color: var(--vk-color-muted); }
.pal-list { max-height: 590px; overflow: auto; padding: 4px 10px 10px; }
.pal-gh { display: flex; justify-content: space-between; padding: 12px 10px 6px; font: 700 12px/1 var(--vk-font-display); color: var(--vk-color-muted); letter-spacing: .04em; text-transform: uppercase; }
[data-vibe="paper"] .pal-gh { text-transform: none; font-style: italic; font-weight: 500; font-size: 14px; letter-spacing: 0; }
[data-vibe="studio"] .pal-gh { font-family: var(--vk-font-body); font-weight: 700; font-size: 12px; letter-spacing: .1em; }
.pal-item { display: flex; align-items: center; gap: 12px; min-height: 52px; padding: 6px 10px; border-radius: var(--vk-radius-sm); cursor: pointer; color: var(--vk-color-text); }
.pal-item[data-selected="true"] { background: var(--vk-color-raised); box-shadow: inset 3px 0 0 var(--vk-color-text); }
[data-vibe="quiet"] .pal-item[data-selected="true"] { background: transparent; box-shadow: inset 0 0 0 2px var(--vk-color-text); }
.pal-ic { width: 28px; height: 28px; flex: none; display: grid; place-items: center; color: var(--vk-color-muted); border-radius: 8px; background: var(--vk-color-raised); }
.pal-item[data-selected="true"] .pal-ic { background: var(--vk-color-surface); }
.pal-ic--face { background: transparent; }
.pal-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.pal-label { font-size: 15px; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }
.pal-label mark { background: var(--vk-mood-done); color: var(--vk-face-ink); border-radius: 3px; padding: 0; }
[data-vibe="quiet"] .pal-label mark { background: transparent; color: inherit; text-decoration: underline; text-decoration-thickness: 2px; }
.pal-label mark:empty { display: none; }
.pal-sub { font-size: 13px; color: var(--vk-color-muted); overflow-wrap: anywhere; }
.pal-meta { font-size: 11px; color: var(--vk-color-faint); flex: none; }
.pal-enter { flex: none; font: 500 12px/1 var(--vk-font-mono); color: var(--vk-color-text); padding: 6px 8px; border-radius: 6px; border: 1px solid var(--vk-color-line); background: var(--vk-color-surface); }
.pal-empty { padding: 28px 20px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
.pal-foot { display: flex; align-items: center; gap: 18px; padding: 12px 20px; border-top: 1px solid var(--vk-color-line); font-size: 13px; color: var(--vk-color-muted); background: var(--vk-color-bg); }
.pal-foot span { display: inline-flex; gap: 6px; align-items: center; }
.pal-foot .grow { flex: 1; }
```
- `.pal-ran` is dropped (canvas-only: D-8).
- `<mark>` is rendered only when the hit is non-empty (D-9). The mockup render shows a thin empty-mark sliver after agent names; that sliver is an artefact, so do not reproduce it.
- Phone: sheet; `.pal-list` max-height becomes `calc(100dvh - 160px)`.

### Content map
| Element | Source |
|---|---|
| search icon 20px; input (visually-hidden label "Search cards, boards, agents and actions"; `role=combobox aria-expanded=true aria-controls=pal-list aria-autocomplete=list`; placeholder "Jump to a card, board, agent, or action…") | copy |
| Clear × (aria-label "Clear the search"), shown when q non-empty; `esc` kbd | copy |
| count line (`role=status`) | q empty: `Everything on ${board.name}, plus boards, agents and actions`. Else `${n} match${n===1?'':'es'} for “${q.trim()}”`. Mockup: "8 matches for “agent”" |
| group header `{name}` / `{n} result(s)` | `1 result` or `${k} results` |
| **Cards**: one per card of `app.board` (non-archived) in `groupByUrgency(summarize(...))` order | label `card.title`. sub `${board.name} · ${stageName}` + status: lead `stopped` → ` · stopped ${Math.floor(ageHours)}h`; `blocked` badge → ` · Blocked`; urgency done → ` · Done`. needs chip "Waiting on you" iff `urgency==='needs'`. meta `'#' + card.id.slice(-4)` (D-6). verb "Open card". act `goto('/b/'+boardId+'/c/'+id)` |
| **Boards**: `app.boards` in switcher order (§6) | label name. sub `(here?'You are here · ':'') + (cardCount===0?'No cards yet':cardCount+(cardCount===1?' card':' cards')) + (needs>0?' · '+needs+' need'+(needs===1?'s':'')+' you':'')`. verb "Go to board". act `goto('/b/'+id)` |
| **Agents**: `app.agents` matches, **at most 4 rows** (D-7) | label name. sub `capabilities.join(', ')` (or "no capabilities"). icon = 28px face, mood `resting` (D-24). verb "Show agent". act `goto('/workspace/agents')` |
| **Actions** (fixed order) | "Dispatch a card" / `new card on ${board.name}` / plus / "Open composer" / `app.requestCompose()` · "Operate" / "what needs you, what is running, what it cost" / pulse / "Go" / `goto(/b/:id/operate)` · "Spend detail" / "by model, by card, and the board log" / coin / "Go" / `goto(/b/:id/operate/telemetry)` · "Board settings" / `stages, gates and schedules for ${board.name}` / settings / "Go" / `goto(/b/:id/settings)` · "Workspace" / "agents, capabilities, labels and people" / people / "Go" / `goto('/workspace')` |
| **Account** | "Appearance…" / "vibe, light or dark, time of day" / swatch / "Open" / `appearance.pickerOpen=true` · `otherThemeLabel(appearance.theme)` ("Dark theme") / "theme" / moon (sun when dark) / "Switch" / `appearance.toggleTheme()` · "Sign out" / `app.user.name` ("Rakesh Gangwar") / power / "Sign out" / `signOut()` |
| selected row trailing `↵ {verb}` (`.pal-enter`) | the item's verb |
| empty state: "No matches for “{q}”." + secondary button (plus 16px) "Dispatch a card called “{q}”" | act `app.requestCompose(q)` |
| foot: "↑ ↓ move", "↵ open", "esc close", spacer, "⌘ K opens this anywhere" | copy |

Icon SVG paths, verbatim from the source, 16px, stroke 2:
- card `rect 4,5,16,14 rx2; M8 10h8M8 14h5`
- board `rects (3,4,5,16),(10,4,5,11),(17,4,4,7) rx1.5`
- plus `M12 5v14M5 12h14`
- pulse `M3 12h4l3-7 4 14 3-7h4`
- coin `circle r9; M15 9.5c-.5-1-1.6-1.5-3-1.5-1.8 0-3 .9-3 2.1 0 2.9 6 1.4 6 4.3 0 1.2-1.2 2.1-3 2.1-1.4 0-2.6-.6-3-1.6M12 6v2M12 16v2`
- settings (gear path as in the source)
- people `circle 9,8 r3.5; M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5; M16 4.6a3.5 3.5 0 010 6.8M18.5 14.8c1.6.8 2.6 2.5 3 5.2`
- swatch `circle r9; circles (8.5,10),(12,7.5),(15.5,10) r1.3; M12 21a3 3 0 010-6h2`
- moon `M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z`
- power `M12 3v8M6.3 6.3a8 8 0 1011.4 0`
- sun (not in mockup; used when dark) `circle r4; M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4`

Filter: `(label + ' ' + group + ' ' + sub).toLowerCase().includes(q)`. This is why "agent" matches every agent (group name "Agents") and "Workspace" (sub). Highlight: the first `indexOf(q)` in the lowercased label is split into pre / `<mark>` / post.

### Interactions & states
- Cmd/Ctrl+K toggles from anywhere (existing). Opening resets q='' and selection 0, and focuses the input.
- ArrowDown/ArrowUp wrap the selection and scroll it into view (`block:'nearest'`). Hover sets the selection. Enter or click runs `act`, then closes.
- Escape: when q is non-empty, clear q (mockup). When q is empty, close.
- Clear × clears and refocuses.
- `aria-selected` / `data-selected` on rows. Clicking the scrim closes.
- With no board loaded (workspace routes), Cards is empty, the count reads "Everything in your workspace: boards, agents and actions", and the board-bound actions (Dispatch, Operate, Spend detail, Board settings) are omitted.

### Fixture needs
- 6 DX cards (§7), whose ids end in `63ac`, `58f8`, `1dfc`, `f83f`, `481f`, `9ed9` in that order.
- 12 boards (§7).
- `app.agents` with the API order beginning error-eric [diagnostics], tester-tim [testing], devops-dave [release], vulnerability-victor [security-review].
- Recipe: open with ⌘K, type `agent`. Expected rows:
  - Cards 2: AgentPod… (`#58f8`, needs, selected, "↵ Open card"); agentpod-connectors… (`#481f`, "Developer Experience · Failing test · Blocked").
  - Boards 1: Agent Onboarding "20 cards".
  - Agents 4.
  - Actions 1: Workspace.
  - Total 8.

---

## 3. SP-Dlg-Appearance: Appearance picker (shared with Superlibrary)

1440×900, every vibe. Overlay on any route. The mockup state is vibe daylight (checked), theme "Follow the sun", time Strong, location Off.

### Component tree
- `apps/web/src/lib/components/dialogs/AppearanceDialog.svelte` (replaces `shell/AppearanceDialog.svelte`). Mounted in `+layout.svelte`. Reads and writes `appearance` (existing `AppearanceStore`: `value`, `phase`, `theme`, `set`, `useLocation`, `stopUsingLocation`, `pickerOpen`). Keep the existing `flipLocation()` logic and its `locNote`.
- Vibe card previews: new `dialogs/VibePreview.svelte`, props `{ vibe: Vibe; board: { name: string; needs: number; working: number; queued: number }; greeting: string }`. It renders the 4 static mini-layouts, `aria-hidden`.
- Composition:
  - `vibekit:DialogFrame{width:1000, top:34, labelledby:'ap-title', describedby:'ap-sub'}`
  - 4 `.vc` labels (native radio `name="vibe"`)
  - 2 × `vibekit:Segmented`
  - `vibekit:Switch`
  - `vibekit:Sky{phase: appearance.phase, class:'ap-readout'}`
  - `vibekit:Button primary` "Done".
- Superlibrary uses the same component from vibekit later: name it `vibekit:AppearancePicker{product: 'Superpipeline' | 'Superlibrary', sibling: string}`. Today it is app-local.

### Layout & CSS (verbatim, lines 183–263)
```css
.ap { left: 220px; top: 34px; width: 1000px; display: flex; flex-direction: column; }
.ap-head { display: flex; align-items: flex-start; gap: 12px; padding: 22px 22px 0 30px; }
.ap-body { padding: 14px 30px 0; display: flex; flex-direction: column; gap: 20px; }
.ap fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
.ap legend { padding: 0; font: 700 16px/1.3 var(--vk-font-display); }
.ap-hint { margin: 4px 0 0; font-size: 14px; color: var(--vk-color-muted); }
.ap-hint strong { color: var(--vk-color-text); }
.ap-vibes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 12px; }
.vc { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 10px 10px 14px; border-radius: var(--vk-radius-md); background: var(--vk-color-bg); color: var(--vk-color-text); box-shadow: inset 0 0 0 2px var(--vk-color-line); cursor: pointer; font-family: var(--vk-font-body); }
.vc[data-checked="true"] { box-shadow: inset 0 0 0 3px var(--vk-color-text); }
.vc input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.vc:focus-within { outline: 2px solid var(--vk-color-text); outline-offset: 3px; }
.vc-name { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 4px; font: 700 19px/1.1 var(--vk-font-display); }
[data-vibe="paper"].vc .vc-name { font-weight: 500; font-style: italic; font-size: 21px; }
.vc-tick { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; border: 2px solid var(--vk-color-faint); color: transparent; }
.vc[data-checked="true"] .vc-tick { background: var(--vk-color-text); border-color: var(--vk-color-text); color: var(--vk-color-bg); }
.vc-desc { padding: 0 4px; font-size: 13px; line-height: 1.4; color: var(--vk-color-muted); }
.vc-desc b { color: var(--vk-color-text); font-weight: 600; }
.vc-sw { display: flex; gap: 4px; padding: 0 4px; }
.vc-sw i { width: 18px; height: 10px; border-radius: 3px; box-shadow: inset 0 0 0 1px var(--vk-color-line); }
.pv { height: 128px; border-radius: calc(var(--vk-radius-md) - 6px); background: var(--vk-color-bg); box-shadow: inset 0 0 0 1px var(--vk-color-line); overflow: hidden; display: flex; flex-direction: column; }
.pv-dl-sky { height: 30px; background: linear-gradient(180deg, var(--vk-sky-noon-top), var(--vk-sky-noon-bottom)); position: relative; font: 700 10px/30px var(--vk-font-display); padding-left: 8px; color: var(--vk-sky-noon-text); }
.pv-dl-sky::after { content: ""; position: absolute; right: 10px; top: 6px; width: 16px; height: 16px; border-radius: 50%; background: var(--vk-sky-noon-sun); }
.pv-dl-cols { flex: 1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; padding: 6px; }
.pv-dl-col { background: var(--vk-color-raised); border-radius: 7px; padding: 4px; display: flex; flex-direction: column; gap: 4px; }
.pv-dl-tile { height: 26px; border-radius: 5px; background: var(--vk-color-surface); display: flex; align-items: center; gap: 4px; padding: 0 4px; box-shadow: 0 2px 0 var(--vk-color-ground); }
.pv-dl-tile i { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.pv-dl-tile s { flex: 1; height: 4px; border-radius: 2px; background: var(--vk-color-line); }
.pv-dl-tile[data-n="1"] { box-shadow: inset 2px 0 0 var(--vk-color-signal), 0 2px 0 var(--vk-color-ground); }
.pv-pp { padding: 8px 10px; gap: 5px; }
.pv-pp-mast { font: italic 500 14px/1 var(--vk-font-display); border-bottom: 3px double var(--vk-color-text); padding-bottom: 4px; }
.pv-pp-cols { flex: 1; display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 8px; }
.pv-pp-col { display: flex; flex-direction: column; gap: 3px; border-right: 1px solid var(--vk-color-line); padding-right: 6px; }
.pv-pp-col:last-child { border-right: 0; }
.pv-pp-h { font: 600 7px/1.2 var(--vk-font-body); text-transform: uppercase; letter-spacing: .08em; color: var(--vk-color-muted); }
.pv-pp-q { font: italic 400 9px/1.25 var(--vk-font-display); color: var(--vk-color-text); }
.pv-pp-q b { color: var(--vk-color-signal-text); font-weight: 600; }
.pv-pp-l { height: 3px; background: var(--vk-color-line); border-radius: 2px; }
.pv-st { padding: 8px 10px; gap: 6px; }
.pv-ar-hero { display: flex; align-items: flex-end; gap: 6px; padding-bottom: 4px; border-bottom: 1.5px solid var(--vk-color-rule); }
.pv-ar-hero b { font: 900 34px/.8 var(--vk-font-body); font-stretch: 72%; color: var(--vk-color-signal); }
.pv-ar-hero span { flex: 1; display: flex; flex-direction: column; gap: 3px; padding-bottom: 2px; }
.pv-ar-hero s { height: 4px; background: var(--vk-color-text); }
.pv-ar-hero s + s { width: 64%; height: 3px; background: var(--vk-color-muted); }
.pv-ar-sm { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }
.pv-ar-sm > span { display: flex; flex-direction: column; gap: 2px; padding-bottom: 3px; border-bottom: 1px solid var(--vk-color-rule); }
.pv-ar-sm > span > i { height: 3px; }
.pv-ar-sm u { display: flex; flex-wrap: wrap; gap: 1px; min-height: 6px; text-decoration: none; }
.pv-ar-sm em { width: 6px; height: 6px; }
.pv-ar-sm em[data-k="n"] { background: var(--vk-color-signal); }
.pv-ar-sm em[data-k="b"] { background: repeating-linear-gradient(135deg, var(--vk-stage-5) 0 1px, transparent 1px 2.5px); box-shadow: inset 0 0 0 1px var(--vk-stage-5); }
.pv-ar-sm em[data-k="d"] { background: var(--vk-stage-7); }
.pv-ar-rows s { display: block; height: 3px; margin-top: 5px; background: var(--vk-color-line); }
.pv-qt { padding: 8px 12px; gap: 4px; }
.pv-qt-h { font: 700 11px/1.2 var(--vk-font-display); }
.pv-qt-g { font: 700 8px/1.2 var(--vk-font-body); margin-top: 3px; }
.pv-qt-i { display: flex; flex-direction: column; gap: 2px; padding-left: 6px; border-left: 2px solid var(--vk-color-line); }
.pv-qt-i[data-n="1"] { border-left-color: var(--vk-color-signal); }
.pv-qt-i s { height: 3px; width: 85%; background: var(--vk-color-text); opacity: .7; }
.pv-qt-i u { height: 2px; width: 22%; background: var(--vk-color-text); text-decoration: none; }
.ap-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 28px; }
.ap-col { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.ap .vk-segmented { margin-top: 10px; }
.ap-switch { display: flex; align-items: center; gap: 14px; margin-top: 10px; min-height: 44px; padding: 0; border: 0; background: transparent; color: var(--vk-color-text); font: 600 15px/1.3 var(--vk-font-body); cursor: pointer; text-align: left; }
.ap-track { position: relative; width: 52px; height: 30px; flex: none; border-radius: 999px; background: var(--vk-color-raised); box-shadow: inset 0 0 0 2px var(--vk-color-faint); }
.ap-track i { position: absolute; top: 4px; left: 4px; width: 22px; height: 22px; border-radius: 50%; background: var(--vk-color-faint); }
.ap-switch[aria-checked="true"] .ap-track { background: var(--vk-color-primary); box-shadow: none; }
.ap-switch[aria-checked="true"] .ap-track i { left: 26px; background: var(--vk-color-primary-fg); }
.ap-means { margin: 8px 0 0; padding: 10px 12px; border-radius: var(--vk-radius-sm); background: var(--vk-color-raised); font-size: 14px; display: flex; gap: 10px; }
.ap-readout { border-radius: var(--vk-radius-md); min-height: 74px; }
.ap-readout .vk-sky__content { padding: 14px 18px; display: flex; flex-direction: column; gap: 2px; }
.ap-readout .vk-sky__sun { width: 34px; height: 34px; top: 18px; right: 18px; }
.ap-readout b { font: 700 17px/1.2 var(--vk-font-display); }
[data-vibe="studio"] .ap-readout b { font: 800 18px/1.2 var(--vk-font-body); font-stretch: 85%; }
[data-vibe="paper"] .ap-readout b { font-style: italic; font-weight: 500; }
[data-vibe="quiet"] .ap-readout, [data-vibe="paper"] .ap-readout { box-shadow: inset 0 0 0 1px var(--vk-color-line); }
.ap-foot { display: flex; align-items: center; gap: 12px; padding: 18px 30px 22px; margin-top: 22px; border-top: 1px solid var(--vk-color-line); }
.ap-foot .grow { flex: 1; font-size: 14px; color: var(--vk-color-muted); }
```
- Each `.vc` carries its own `data-vibe={id}` and `data-theme={appearance.theme}`, so its tokens, fonts and preview are that vibe's own.
- In the app the selector `[data-vibe="paper"].vc .vc-name` stays non-global; it matches the card element. Selectors like `[data-vibe="studio"] .ap-readout b` become `:global([data-vibe="studio"]) .ap-readout b` (the html vibe).
- The location label has inline style `display:block;margin:0;font:700 16px/1.3 var(--vk-font-display);color:var(--vk-color-text)`; keep it verbatim.
- Phone: sheet; `.ap-vibes` becomes 2 columns and `.ap-row` 1 column.

### Content map
| Element | Source |
|---|---|
| h2 "Appearance" (id ap-title); sub (id ap-sub) "Applies to Superpipeline on this device. Superlibrary offers the same four choices." | copy |
| close icon, aria-label "Close appearance" | copy |
| legend "Vibe"; hint "A vibe changes **the layout of your boards and cards**, not only the colours and type. Operate, settings and Workspace keep one layout in every vibe. Every action stays in every vibe." | copy |
| Daylight card | name "Daylight"; swatches bg, surface, primary, signal; desc "Playful and sunlit. **Board:** columns with faces. **Card:** a conversation."; preview sky text = `greeting(phase,'daylight')` without its trailing "." ("Good afternoon"); tiles static (needs, working, thinking, done, done moods), the first with `data-n=1` |
| Paper card | name "Paper" (italic); same 4 swatches; desc "Calm and editorial. **Board:** a front page. **Card:** a letter."; preview masthead = `board.name` ("Developer Experience"); columns "Waiting on you" with quote "**Dear Rakesh,** I stopped, and I’d rather ask than guess…" (copy; "Rakesh" = first name of `app.user.name`), "In progress", "Shipped" |
| **Studio card = Annual report** | name "Studio"; swatches bg, **primary, stage-5, signal**; desc verbatim **"An annual report: warm paper, ink and one blue. **Board:** a report led by one big figure. **Card:** a profile with footnotes."**; preview hero figure = `board.needs` ("3") in signal, then 7 stage bars `--vk-stage-1..7` with marks: stage1 n · stage3 n,b,b · stage4 n · stage7 d (static), then 2 rule rows |
| Quiet card | name "Quiet"; 4 swatches; desc "Plain and focused. **Board:** one list by urgency. **Card:** a form."; preview header = `board.name`; groups `Needs your decision (${needs})`, `In progress (${working})`, `Waiting to start (${queued})` → (3), (0), (2) |
| tick (check path `M5 12.5l4.5 4.5L19 7`) | checked state |
| "Light or dark" segmented: Follow the sun / Light / Dark | `appearance.value.theme` sun / light / dark |
| theme hint | sun: `Light by day, dark after dusk. It is ${PHASE_NAMES[phase].toLowerCase()}, so it is ${appearance.theme} now.` → "…It is midday, so it is light now." · light: "Always light, whatever the hour." · dark: "Always dark: a lamp-lit room, not black." |
| "Time of day" segmented: Strong / Subtle / Off | `value.timeStrength` |
| time hint + " Quiet starts with this off." | strong "Strong: the full sky and greeting where the vibe shows them." · subtle "Subtle: a light tint of the sky, no sun." · off "Off: no sky, no tint. Light or dark still applies." |
| "Use my location for the sun" + switch word "Off"/"On" | `value.useLocation \|\| locBusy` |
| means box (pin icon) | off: `Off: the sun follows your time zone, ${Intl tz}, and the day runs 6:00 to 18:00. Turn it on for real sunrise and sunset; your browser will ask first.` (tz = "Asia/Kolkata"; "6:00 to 18:00" is vibekit's time-zone-mode day window, so take it from vibekit's exported constant if there is one, else the copy constant) · on: "On: sunrise and sunset are worked out from your rough location (about 11 km). It stays on this device and is never sent anywhere." · after a denial, `locNote` "Location was not shared, so the sun follows your time zone." shows as a `role=status` paragraph under the box (existing, D-22) |
| readout sky (`role=status`, `data-phase` = phase): small "Now", bold readout | `(timeStrength==='off' ? 'Time of day is off · ' : '') + READOUT[vibe]` (D-11). daylight `${Phase} · ${greeting minus '.'}, ${firstName}.` → "Midday · Good afternoon, Rakesh." · paper: noon "Midday · The light is high and even.", other phases `${Phase} · ${greeting(phase,'paper')}` · studio `${Phase}, ${HH:mm} · the board at a glance` · quiet `${Phase}.` |
| foot "Every change applies at once and is saved on this device." + "Done" | copy |

### Interactions & states
- Every control applies immediately through `appearance.set(...)`. Done, ×, Escape and the scrim only close, and focus returns to the opener.
- Picking a vibe resets the time strength to that vibe's default when it was at the old default (existing store logic).
- Vibe radios: arrow keys (native). Segmented: roving tabindex.
- The existing `tabStops()` trap is kept: a radio group counts as one stop.
- Location switch: the existing `flipLocation()`.
- Hover: none beyond the cursor. Focus: `.vc:focus-within` outline.

### Fixture needs
- Cookie `vk_appearance` = daylight / sun / strong / no location.
- Clock and tz per §0.6.
- `app.board` = DX, giving needs 3 (`app.needsYou()` predicate per urgency `needs`), working 0, queued 2.
- `app.user.name` "Rakesh Gangwar".

---

## 4. SP-Dlg-Move: Move card

1440×900, every vibe. Opened on card `AgentPod: connector interface…` (stage Failing test). The mockup's pending pick is "Fix".

### Component tree
- `apps/web/src/lib/components/dialogs/MoveCardDialog.svelte`
  - Props: `{ open: boolean; cardId: string; onClose: () => void }`.
  - Mounted once in `routes/b/[boardId]/+layout.svelte`.
  - New store state `app.moveCardId = $state<string|null>(null)` with `openMove(id)` / `closeMove()`.
- `board/CardMoveMenu.svelte`:
  - The `⇄` button now calls `app.openMove(card.id)`. Its `role=menu` dropdown and the `open` bindable are removed; the `visible` prop stays.
  - The exported `step(delta)` (Alt+←/→) stays and keeps its own announcement.
- Key `M` on a focused card tile (every board layout, list rows, and inside CardDrawer) calls `app.openMove(id)`. Wire it in `CardTile.svelte` and the layout row components where `CardMoveMenu` is mounted (BoardPaper, BoardQuiet, BoardStudio).
- New helper `dialogs/who-picks-up.ts` (uses `stageOwner` from `board/stage-owner.ts`):
  - `ownerShort(stage, agents): string`
  - `ownerLine(stage, agents): string`
  - `pickupSentence(stage, stages, agents): string`
  - `pickupClause(stage, agents): string`
- Composition:
  - `vibekit:DialogFrame{width:640, top:36, labelledby:'mv-t', describedby:'mv-now'}`
  - head: eyebrow, card title, now line with `vibekit:Face` 20 + `vibekit:Chip needs`
  - fieldset of `.st` radio rows: `vibekit:Chip` "Here now" / gate chip, `vibekit:Face` 20
  - `.mv-then`, `.mv-keys` of `vibekit:KbdHint`, polite live region
  - foot: Cancel + primary.

### Layout & CSS (verbatim, lines 183–213)
```css
.mv { left: 400px; top: 36px; width: 640px; display: flex; flex-direction: column; }
.mv-head { display: flex; gap: 12px; align-items: flex-start; padding: 22px 20px 0 28px; }
.mv-card { margin: 6px 0 0; font: 600 18px/1.3 var(--vk-font-display); overflow-wrap: anywhere; }
[data-vibe="paper"] .mv-card { font-weight: 500; font-size: 20px; }
.mv-now { margin: 6px 0 0; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 14px; color: var(--vk-color-muted); }
.mv-body { padding: 16px 28px 0; }
.mv fieldset { border: 0; margin: 0; padding: 0; }
.mv legend { padding: 0; margin-bottom: 8px; font: 700 15px/1.3 var(--vk-font-display); }
.mv-list { display: flex; flex-direction: column; }
.st { position: relative; display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; gap: 12px; align-items: center; min-height: 56px; padding: 6px 12px 6px 6px; border-radius: var(--vk-radius-sm); cursor: pointer; }
.st input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.st:hover { background: var(--vk-color-raised); }
.st[data-checked="true"] { background: var(--vk-color-raised); box-shadow: inset 0 0 0 2px var(--vk-color-text); }
.st:focus-within { outline: 2px solid var(--vk-color-text); outline-offset: 2px; }
.st[data-here="true"] { cursor: default; background: transparent; }
.st-mark { position: relative; width: 28px; height: 100%; display: grid; place-items: center; }
.st-mark::before { content: ""; position: absolute; left: 13px; top: -6px; bottom: -6px; width: 2px; background: var(--vk-color-line); }
.st:first-child .st-mark::before { top: 50%; }
.st:last-child .st-mark::before { bottom: 50%; }
.st-dot { position: relative; width: 16px; height: 16px; border-radius: 50%; background: var(--vk-color-surface); box-shadow: inset 0 0 0 2px var(--vk-color-faint); }
.st[data-checked="true"] .st-dot { background: var(--vk-color-text); box-shadow: 0 0 0 3px var(--vk-color-surface); }
.st[data-here="true"] .st-dot { width: 20px; height: 20px; background: var(--vk-color-primary); box-shadow: 0 0 0 4px var(--vk-color-raised); }
[data-vibe="studio"] .st-dot { border-radius: 0; }
.st-name { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-weight: 600; font-size: 16px; }
.st-owner { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--vk-color-muted); margin-top: 1px; }
.st-right { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--vk-color-muted); }
.st-dir { font: 500 11px/1 var(--vk-font-mono); color: var(--vk-color-faint); text-transform: uppercase; letter-spacing: .06em; }
.mv-then { margin: 14px 0 0; padding: 12px 14px; border-radius: var(--vk-radius-sm); background: var(--vk-color-raised); display: flex; gap: 10px; align-items: flex-start; font-size: 14px; }
.mv-keys { margin: 12px 0 0; display: flex; flex-wrap: wrap; gap: 14px; font-size: 13px; color: var(--vk-color-muted); }
.mv-keys span { display: inline-flex; gap: 4px; align-items: center; }
.mv-foot { display: flex; gap: 12px; align-items: center; justify-content: flex-end; padding: 16px 28px 20px; margin-top: 16px; border-top: 1px solid var(--vk-color-line); }
```
- The class `.st` collides with shell names like `.st-rail` only by prefix. Rename `.st`, `.st-mark`, `.st-dot`, `.st-name`, `.st-owner`, `.st-right`, `.st-dir` to `.mv-st`, `.mv-st-mark` and so on. They are component-scoped anyway.
- Phone: sheet.

### Content map
| Element | Source |
|---|---|
| eyebrow "Move card" (id mv-t) | copy |
| card title | `card.title` |
| now line (id mv-now): "Now in **Failing test** · [face 20, mood needs] tester-tim stopped 33h ago [Waiting on you]" | `Now in <strong>{stageName}</strong> · ` + lead phrase: stopped → `{delegate} stopped {floor(ageHours)}h ago`; working → `{delegate} is working`; question → `{agent} asked a question`; review → `waiting for your review`; done → `Done`; else `Queued`. Face = `summary.delegate` with `summary.mood`. Chip "Waiting on you" iff urgency needs |
| close, aria-label "Close without moving" | copy |
| legend "Move to" | copy |
| one row per stage (by order) | name; `ownerLine`: human → stageOwner label ("a person", "a person · approval"); capability → `${label} · ${declaredBy.length===1 ? declaredBy[0] : declaredBy.length+' agents'}` (0 → `${label} · no agent yet`); agent → name. A 20px face before the owner when exactly one agent is declared or ownerKind agent (mood = that agent's mood on this board if it holds a card here, else resting: error-eric resting, tester-tim needs). count: `count===0 ? 'Empty' : count+' card'+(s)` + (blocked>0 ? ` · ${blocked} blocked` : '') from `stageSummaries`. dir "back"/"forward" relative to the current stage (empty for current) |
| chips "Here now" (current) and gate chip (flag icon `M5 21V4M5 4h11l-2 4 2 4H5`, 12px) "Approval gate" when `stage.gate==='approval'` | stage fields |
| then box (arrow `M5 12h14M13 6l6 6-6 6`): "In Fix: One of the 2 agents with code picks it up." | `In ${pick.name}: ${pickupSentence(pick)}` (rules below) |
| keys: "Alt+← → moves one stage from the board", "M opens this on a card", "esc closes" | copy (`Alt` `+` `←` `→` as kbd) |
| live region (visually hidden, polite) | `${card.title} moved to ${stage.name}` after success |
| Cancel; primary `Move to ${pick.name}` ("Move to Fix") | copy + pick |

`pickupSentence(stage)` (D-13):
- human, gate approval → "It waits here for a person to approve before it can ship."
- human, last stage by order → "It lands with the finished work."
- human, otherwise → "A person picks it up here; no agent works this stage."
- capability, 1 declared → `${name} picks it up.`
- capability, n>1 → `One of the ${n} agents with ${caps} picks it up.`, where caps are joined ", " with " or " before the last for `any` (", " / " and " for `all`): "integration, api or testing"
- capability, 0 → `No agent declares ${label} yet, so it waits here.`
- agent → `${name} picks it up.`

### Interactions & states
- Open:
  - The initial pick is the next stage forward (`stages[here+1]`, else the previous one). That gives "Fix" here.
  - Focus goes to the checked radio. The current stage's radio is `disabled`.
- Arrow keys move between radios (native).
- Primary → `await app.moveCard(card.id, pick.key)`:
  - On success (`app.error` null), announce, close, and focus the card tile.
  - On refusal (WIP limit, gate) keep the dialog open and show `app.error` verbatim in a `<p role="alert" class="mv-then">` under the then box (D-22).
  - The primary reads "Moving…" (disabled) while pending.
- Cancel, ×, Escape and the scrim close.
- Hover: `.mv-st:hover` raised.

### Fixture needs
- DX stages and agents per §7. Card `crd_…58f8`:
  - state input-required, delegate tester-tim, stage failing-test
  - stateSince `2026-10-09T23:21:00Z` (33h)
  - needsHuman `{reason:'blocked', detail: 'The Forge mirror of SuperJackfruitLabs/agentpod is read-only, so my push was refused. I need the writable repository URL and write access for tester-tim.'}`
- Failing test holds 3 cards, 2 of them blocked (blockedBy non-empty): `f83f` and `481f`.

---

## 5. SP-Dlg-Reconnect: Reconnect / silent sign-in (new)

1440×900, every vibe, `state` silent | expired. Route: `/b/brd_dx/c/crd_…58f8` (the card drawer is open on the AgentPod card). The backdrop drawer belongs to the card group; the mockup's `.dr` is a stand-in (§0.5).

### Flow (replaces "401 → signed-out → Landing")
1. **Detection.** Every API call goes through a new `apiFetch(input, init)` in `lib/api.ts`. It replaces the bare `fetch(` in every `/v1/*`, `/auth/me` and `/hub/*` caller except `/hub/session` itself. `noteAuth` stays as an alias that calls `auth.noteUnauthorized()`. On a 401, `apiFetch` calls `await auth.recover()` and then **replays the same request once**. Bodies are JSON strings, so they are replayable. A 401 is refused before any handler runs, so a replay cannot double-apply a write. A second 401 after a successful recover is treated as expired.
2. **Silent retry** (state `renewing`, mockup `state=silent`). `auth.recover()` is single-flight: concurrent 401s share one promise.
   - It shows `ReconnectToast` and calls `POST /hub/session` (new, D-5). The path sits under `/hub/` because the plane refresh cookie is `Path=/hub`.
   - The Worker spends the refresh cookie (`tokenGrant` refresh_token), verifies the access token, re-signs the superpipeline session cookie (`signSession`, `sessionSetCookie`), rotates refresh/app/hub cookies exactly as `/hub/token` does, and answers `200 {ok:true}`.
   - Refused (`grant.refused`) → `200 {ok:false, reason:'login_required', issuer:'accounts.superjackfruit.com', reauthorize:'/auth/login'}`. No refresh cookie → `{ok:false, reason:'no_refresh', …}`. The GitHub sign-in mode always answers `no_refresh`.
   - Plane down → `503 {ok:false, reason:'plane_unavailable', retryable:true}` with Retry-After 5. The client retries 3 times at 5s while the toast stays, then treats it as expired with that reason.
   - On `ok:true`: re-read `getMe()`, `app.refresh()`, and reconnect the socket if it is closed. The toast leaves and the replayed requests resolve. The page never navigates, and the drawer and any typed note stay.
3. **Dialog** (state `expired`). `auth.state='expired'` mounts `ReconnectDialog`. The app stays mounted under it (`inert`), so nothing typed is discarded until the person signs in.
   - "Sign in again" is `<a href="/auth/login">` whose click handler calls the existing `reconnect()` from `lib/reconnect.ts`. That saves `location.pathname + location.search` under `superpipeline.returnTo` and navigates to `/auth/login`.
   - After `/auth/callback` lands on `/`, `+layout.svelte`'s existing `takeReturnTo()` + `goto(back, {replaceState:true})` returns to `/b/brd_dx/c/crd_…58f8`. The `SAFE` regex already admits that path.
4. **Boot.** When `getMe()` returns null at `app.init()`, call `POST /hub/session` once silently. On success continue the boot; otherwise show Landing as today. Landing's sign-in button must also call `reconnect()`, so a deep link opened while signed out is preserved (one-line change in `Landing.svelte`).
5. `app.authState` loses its "any 401 → signed-out" handler. `setUnauthorizedHandler` now calls `auth.noteUnauthorized()`, which starts `recover()`. Sign out (`signOut()`) is unchanged.

New module `lib/auth-recovery.svelte.ts`:
```ts
export type AuthRecoveryState = 'ok' | 'renewing' | 'expired';
export type RenewReason = 'login_required' | 'no_refresh' | 'plane_unavailable' | 'unauthorized_after_renew';
class AuthRecovery {
  state = $state<AuthRecoveryState>('ok');
  reason = $state<RenewReason | null>(null);
  issuer = $state<string | null>(null);          // host shown in "What happened"
  recover(): Promise<boolean>;                    // single-flight; true = renewed
  noteUnauthorized(): void;                       // fire-and-forget recover()
}
export const auth: AuthRecovery;
```
New in `lib/api.ts`: `renewSession(): Promise<{ ok: true } | { ok: false; reason: RenewReason; issuer?: string; reauthorize?: string; retryable?: boolean }>` → `POST /hub/session` with `credentials:'same-origin'`.

### Component tree
- `dialogs/ReconnectToast.svelte`, no props. Reads `auth.state==='renewing'` and `app.openCardId`. Composition: `vibekit:Toast{busy:true}` inside `.toast-wrap`.
- `dialogs/ReconnectDialog.svelte`, no props. Reads `auth`, `app.user`, `app.board`, `app.openCardId`, `appearance.value.vibe`. Composition: `vibekit:DialogFrame{role:'alertdialog', width:540, top:190, labelledby:'rc-t', describedby:'rc-d', onClose: undefined, phone:'card', initialFocus:'.rc-btn'}`.
- Both mounted in `routes/+layout.svelte` beside CommandPalette.

### Layout & CSS (verbatim, lines 196–220)
```css
.toast-wrap { position: absolute; left: 0; right: 0; top: 76px; display: flex; justify-content: center; }
.toast-wrap .vk-toast { box-shadow: 0 12px 30px color-mix(in oklch, var(--vk-color-text) 22%, transparent); gap: 14px; padding: 0 22px 0 18px; min-height: 52px; }
.spin { width: 18px; height: 18px; border-radius: 50%; border: 2px solid color-mix(in oklch, var(--vk-color-primary-fg) 35%, transparent); border-top-color: var(--vk-color-primary-fg); animation: spin 900ms linear infinite; }
[data-vibe="quiet"] .spin { animation: none; border-color: var(--vk-color-primary-fg); border-right-color: transparent; }
[data-vibe="daylight"] .toast-wrap { top: 104px; }
[data-vibe="paper"] .toast-wrap { top: 226px; }
[data-vibe="studio"] .toast-wrap { top: 134px; }
[data-vibe="quiet"] .toast-wrap { top: 132px; }
@keyframes spin { to { transform: rotate(360deg); } }
.toast-sub { font-weight: 400; opacity: .85; }

.rc { left: 450px; top: 190px; width: 540px; padding: 28px 30px 26px; display: flex; flex-direction: column; gap: 16px; }
.rc-ic { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; background: var(--vk-color-raised); color: var(--vk-color-text); }
.rc-lead { margin: 0; font-size: 16px; color: var(--vk-color-muted); }
[data-vibe="paper"] .rc-lead { font-family: var(--vk-font-display); font-style: italic; font-size: 18px; color: var(--vk-color-text); }
.rc-back { display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: var(--vk-radius-sm); background: var(--vk-color-raised); }
.rc-back b { display: block; font-weight: 600; overflow-wrap: anywhere; line-height: 1.35; }
.rc-who { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--vk-color-muted); }
.rc-who .bd-avatar { width: 28px; height: 28px; font-size: 12px; }
.rc-btn { width: 100%; }
.rc details { font-size: 14px; color: var(--vk-color-muted); }
.rc summary { min-height: 44px; display: flex; align-items: center; cursor: pointer; color: var(--vk-color-text); text-decoration: underline; text-underline-offset: 3px; list-style: none; }
.rc summary::-webkit-details-marker { display: none; }
.rc details p { margin: 0 0 6px; overflow-wrap: anywhere; }
```
- `.toast-wrap` becomes `position: fixed; z-index: 60`, with the per-vibe `top` kept (it sits just under each vibe's top bar at 1440).
- `.spin` gets `@media (prefers-reduced-motion: reduce) { animation: none; border-right-color: transparent }`, the same as Quiet.
- The `.rc-btn` anchor has inline `text-decoration: none`.
- In the `expired` state the scrim is the base `.scrim`, and clicking it does nothing. In `renewing` there is no scrim and the page stays interactive (the mockup's silent `.bd` is not inert).

### Content map
| Element | Source |
|---|---|
| toast: spinner + "Signing you back in…" + sub "You stay on this card." | copy. Sub when no card is open: "You stay on this page." (D-16) |
| lock icon 22px in `.rc-ic` (rect 5,11,14,10 rx2; `M8 11V8a4 4 0 018 0v3`) | copy |
| h2 "Sign in again to keep going" (id rc-t) | copy |
| lead (id rc-d) | `RC_LEAD[vibe]` verbatim: daylight "Your sign-in ran out and we could not renew it quietly. Sign in and you will land right back on this card." · paper "Your sign-in has expired, and it could not be renewed in the background. Once you sign in, you return to this card." · studio "SESSION EXPIRED. Background renewal failed. Sign in to return to this card." · quiet "You are signed out. We could not renew your sign-in. After you sign in, this card opens again." Off a card route, replace "this card" with "this page" (D-17) |
| back box: card icon, small "You will come back to", bold `card.title`, small `${board.name} · ${stageName}` | `app.cardById(openCardId)`, `app.board`. With no card open: bold `board.name`, small = the view label ("Board", "Operate", "Spend detail", "Board settings"). Workspace routes: bold "Workspace", small = tab label (D-17) |
| "RG" avatar 28px + "Signing in as **Rakesh Gangwar**" | `initials(app.user.name)`, `app.user.name`. The user is retained through `expired`; it is not nulled any more |
| primary full-width link "Sign in again" | copy, `href="/auth/login"`, onclick `reconnect()` |
| details summary "What happened" (collapsed) | copy |
| para 1 | `Your sign-in with ${auth.issuer ?? location.host} ended, so it could not be renewed in the background. Your place is saved: after you sign in, you come back here.` (D-14) |
| para 2, mono 12px faint | `Reason: ${REASON_TEXT[reason]} (${reason})`: login_required → "refresh refused" (mockup "Reason: refresh refused (login_required)"); no_refresh → "no background renewal for this sign-in"; plane_unavailable → "sign-in service unavailable"; unauthorized_after_renew → "the session was refused after renewal" |

### Interactions & states
- `renewing`: toast `role=status`, page usable. `ok`: nothing shown.
- `expired`: alertdialog, focus on "Sign in again", Tab trapped. Escape and the scrim do nothing (there is no close). The details disclosure toggles natively.
- Multiple tabs: when another tab renews (cookie now valid), the next replay succeeds. The dialog also polls `getMe()` on `visibilitychange` → visible; if that succeeds it closes the dialog and calls `app.refresh()`.

### Fixture needs
- Same card as §4, plus the drawer content (owned by the card group): History "tester-tim stopped · 33h ago", "tester-tim committed the red test 7a444f3a · 33h ago", and the note text "Writable URL is ssh://git@forge.superjackfruit.com:2222/SuperJackfruitLabs/agentpod.git; write access granted."
- Recipe expired:
  1. Sign in as `usr_rakesh` and open the card.
  2. Clear the session cookie and set the refresh cookie to a value the dev plane stub refuses (dev Worker: `POST /hub/session` with `DEV_AUTH` and cookie `superpipeline_plane_refresh=refused` answers `login_required`, issuer `accounts.superjackfruit.com`).
  3. Trigger `app.refresh()`.
- Recipe silent: same, with `superpipeline_plane_refresh=slow`, which the dev stub holds for 10s before answering ok. Screenshot during the hold.

---

## 6. SP-Dlg-BoardSwitcher: Board switcher

1440×900, every vibe. An anchored popover under the board trigger, which stays visible and highlighted above the scrim. Route: `/b/brd_dx`.

### Component tree
- `shell/BoardSwitcher.svelte` keeps only the trigger, whose form comes from the shell group per vibe: Daylight `.dl-board`, Paper "Change board" `.pp-change`, Studio crumb button, Quiet `.qt-link`.
  - While open the trigger gets `aria-expanded="true"`, `aria-controls="bs-list"`, class `bs-trigger`, and `position: relative; z-index: 52`.
  - It mounts `BoardSwitcherPopover` and `NewBoardDialog` (unchanged).
  - The inline rename, delete and settings logic moves into the popover.
- `dialogs/BoardSwitcherPopover.svelte`
  - Props: `{ open: boolean; anchor: HTMLElement | null; onClose: () => void; onNewBoard: () => void }`.
  - Composition: `vibekit:Scrim` + `vibekit:DialogFrame{placement:'anchored', anchor, width:520, radius:'md', label:'Switch board'}` > `vibekit:SearchField{size:'md', escHint}` > `vibekit:CommandList` of `vibekit:CommandRow{href}` > `.bs-acts` > `.bs-foot` (`vibekit:KbdHint` + `vibekit:Button secondary` "New board").
- New `dialogs/relative-day.ts`: `relativeDay(iso: string, now: Date, timeZone: string): string`.

### Layout & CSS (verbatim, lines 182–215)
```css
.bd .sh-switch { visibility: hidden; }
.bs-anchor { position: absolute; display: inline-flex; align-items: center; }
.bs-anchor .bs-trigger { background: var(--vk-color-surface); box-shadow: inset 0 0 0 2px var(--vk-color-text); color: var(--vk-color-text); border-radius: var(--vk-radius-sm); }
.bs-anchor .dl-board { margin-left: 0; border-radius: var(--vk-radius-md); }
.bs-anchor.pp-ed { align-items: baseline; }
.bs-anchor .pp-change { padding: 0 8px; margin-left: -8px; }
.bs-anchor .qt-link { display: inline-flex; align-items: center; min-height: 44px; padding: 0 6px; color: var(--vk-color-text); text-decoration: underline; text-underline-offset: 4px; }
.bs { left: 124px; top: 84px; width: 520px; display: flex; flex-direction: column; overflow: hidden; border-radius: var(--vk-radius-md); }
[data-vibe="paper"] .bs { left: 40px; top: 206px; }
[data-vibe="paper"] .bs-list { max-height: 430px; }
[data-vibe="studio"] .bs { left: 104px; top: 74px; border-radius: 2px; }
[data-vibe="quiet"] .bs { left: 32px; top: 122px; }
[data-vibe="quiet"] .bs-list { max-height: 520px; }
.bs-in { display: flex; align-items: center; gap: 10px; margin: 12px; padding: 0 6px 0 14px; border: 2px solid var(--vk-color-text); border-radius: var(--vk-radius-sm); color: var(--vk-color-muted); box-shadow: var(--vk-focus); }
.bs-in input { flex: 1; min-width: 0; height: 44px; border: 0; outline: none; background: transparent; color: var(--vk-color-text); font: 500 16px/1 var(--vk-font-body); }
.bs-list { max-height: 572px; overflow: auto; padding: 0 8px 8px; }
.bs-gh { display: flex; justify-content: space-between; padding: 10px 10px 6px; font: 700 12px/1 var(--vk-font-display); color: var(--vk-color-muted); text-transform: uppercase; letter-spacing: .05em; }
[data-vibe="paper"] .bs-gh { text-transform: none; font-style: italic; font-weight: 500; font-size: 14px; letter-spacing: 0; }
[data-vibe="studio"] .bs-gh { font-family: var(--vk-font-body); font-weight: 700; font-size: 12px; letter-spacing: .1em; }
.bs-row { display: grid; grid-template-columns: minmax(0, 1fr) auto 92px; align-items: center; gap: 10px; min-height: 46px; padding: 4px 10px; border-radius: var(--vk-radius-sm); color: var(--vk-color-text); text-decoration: none; }
.bs-row:hover { background: var(--vk-color-raised); }
.bs-row[data-sel="true"] { background: var(--vk-color-raised); box-shadow: inset 3px 0 0 var(--vk-color-text); }
[data-vibe="quiet"] .bs-row { text-decoration: underline; text-underline-offset: 3px; }
.bs-name { display: flex; flex-direction: column; min-width: 0; }
.bs-name b { font-weight: 600; font-size: 15px; overflow-wrap: anywhere; line-height: 1.3; }
.bs-name span { font-size: 12px; color: var(--vk-color-muted); }
.bs-when { font-size: 12px; color: var(--vk-color-muted); text-align: right; }
.bs-here { font-weight: 700; color: var(--vk-color-text); }
.bs-empty { padding: 18px 12px; font-size: 15px; }
.bs-acts { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 6px; padding: 8px 14px; border-top: 1px solid var(--vk-color-line); font-size: 14px; }
.bs-acts .link { display: inline-flex; gap: 6px; align-items: center; font-size: 14px; }
.bs-foot { display: flex; align-items: center; gap: 12px; padding: 10px 14px 14px; }
.bs-foot .grow { flex: 1; font-size: 12px; color: var(--vk-color-muted); display: flex; gap: 6px; align-items: center; }
```
Notes:
- `.bd .sh-switch` / `.bs-anchor` are canvas mechanics: the mockup hides the shell's trigger and draws a copy above the scrim. In the app the real trigger is raised instead, so port only the `.bs-trigger` highlight: `:global(.bs-trigger[aria-expanded="true"]) { background: var(--vk-color-surface); box-shadow: inset 0 0 0 2px var(--vk-color-text); color: var(--vk-color-text); border-radius: var(--vk-radius-sm); }`, plus the Daylight `.dl-board` radius md / margin-left 0, the Paper `.pp-change` padding, and the Quiet `.qt-link` rules above.
- Placement: `left = anchorRow.left`, `top = anchorRow.bottom + 8px`, where anchorRow is the trigger (Quiet: the "Board: … — Change board" line; Paper: the edition-title row; Studio: the crumb column). The expected values at 1440 are daylight (124, 84), paper (40, 206), studio (104, 74), quiet (32, 122), and the e2e asserts them ±1px.
- The per-vibe `.bs-list` max-heights are kept.
- Phone: sheet, not anchored.

### Content map
| Element | Source |
|---|---|
| search (icon 18px; visually-hidden label "Find a board"; placeholder "Find a board"; combobox) + `esc` kbd | copy. **Always shown** (the old threshold of >8 boards is removed) |
| group "Needs you" / `${sum needs} card(s)` ("5 cards") | boards with `needsYouCount>0`: the current board first, then `lastActivityAt` desc |
| group "Everything else, last used first" (when q non-empty: "Other boards") / `${n} board(s)` ("9 boards") | boards with `needsYouCount===0`, `lastActivityAt` desc |
| row: bold name; sub `cardCount===0 ? 'No cards yet' : n+' card'+(s)`; needs chip `${k} need you` / `1 needs you`; right "You are here" (current, `aria-current="page"`) or `relativeDay(lastActivityAt)` | `BoardSummary` (D-3) |
| empty: `No board matches “${q}”.` | copy |
| acts (group label "This board"): small muted "This board:", link-buttons "Rename" (pencil `M4 20h4L19 9l-4-4L4 16v4z`), "Board settings" (gear, `<a href="/b/{id}/settings">`), "Delete…" (bin `M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13`) | copy |
| foot: "↑ ↓ move ↵ open" + secondary "New board" (plus 16px) | copy |

`relativeDay`, computed in calendar days in `timeZone`:
- 0 → "Today"
- 1 → "Yesterday"
- 2–6 → `${d} days ago`
- 7–13 → "Last week"
- 14–27 → `${Math.floor(d/7)} weeks ago`
- 28–59 → "Last month"
- ≥60 → `${Math.floor(d/30)} months ago`
- null → ""

### Interactions & states
- Open: focus goes to the search and the selection is the first row.
- ↑↓ move `data-sel`, ↵ follows the selected row (`goto('/b/'+id)`, close), and clicking a row navigates.
- Escape (or ✕-less scrim click, or a click outside) closes and focus returns to the trigger.
- Typing filters by name (case-insensitive substring) and keeps the selection on the first row.
- Rename: replaces the `.bs-acts` row with an input (label "Board name", prefilled with the name) and the link-buttons "Save" and "Cancel". Enter saves, Escape cancels. The existing `saveRename()` handles `renameBoard`, then `app.refresh()` and `app.loadBoards()` (D-23).
- Delete…: the existing `onDelete()` with its confirm text.
- New board: close, then `NewBoardDialog`.

### Fixture needs
`GET /v1/boards` returns the 12 boards in §7, with `cardCount`, `needsYouCount` and `lastActivityAt`.

---

## 7. Fixture (shared by the six artboards; reconcile ids with the board/card groups)

- Tenant `tnt_dev`, user `usr_rakesh` named "Rakesh Gangwar" (owner). Clock and time zone per §0.6.
- **Board `brd_dx` "Developer Experience"**, stages by order:

| key | name | ownerKind | owner / requires | gate |
|---|---|---|---|---|
| reported | Reported | human | n/a | none |
| reproduce | Reproduce | capability | diagnostics | none |
| failing-test | Failing test | capability | testing | none |
| fix | Fix | capability | code | none |
| integrate | Integrate | capability | requires.any [integration, api, testing] | none |
| signed-off | Signed off | human | n/a | approval |
| shipped | Shipped | human | n/a | none |

- **Agents** (API order begins with these four, D-7): error-eric [diagnostics], tester-tim [testing], devops-dave [release], vulnerability-victor [security-review]. Then coder-kai [code], optimizer-ollie [code], super-chotu [command], plus exactly two more agents declaring `integration` or `api` and nothing in diagnostics/testing/code (for example the board group's integration agents). The rest of the workspace-agents fixture must not declare diagnostics, testing, code, integration or api.
  - Resulting counts: Reproduce = error-eric; Failing test = tester-tim; Fix = 2 agents; Integrate = 3 agents.
- **Cards** (ids end in the given 4 hex chars):

| id suffix | title | stage | state | priority | detail |
|---|---|---|---|---|---|
| 63ac | Fix the highest-severity blocker found in the clean-room journey | reported | submitted | 1 | labels clean-room, evidence-required, +3 more (5 total incl. superpipeline); dueAt 2026-10-06; no delegate; stateSince ≥ 24h ago (ownerless attention) |
| 58f8 | AgentPod: connector interface and generic effects ledger, state machine and executor | failing-test | input-required | 2 | delegate tester-tim; stateSince 2026-10-09T23:21:00Z; needsHuman blocked + detail (§4) |
| 1dfc | Superpipeline: manual-delivery completion and approval-subject hardening | fix | input-required | 0 | delegate coder-kai; attemptCount 5; stateSince 2026-10-09T23:21:00Z |
| f83f | Integrate editorial workflows and prove no-write publishing acceptance | failing-test | submitted | 2 | blockedBy non-empty; queuedByAgentId super-chotu |
| 481f | agentpod-connectors: X connector (connector x) | failing-test | submitted | 0 | blockedBy non-empty |
| 9ed9 | Build immutable approval subjects and digest-bound gates | shipped | completed | 2 | n/a |

  Needs-you = 3 (63ac, 58f8, 1dfc); working = 0; queued = 2 (f83f, 481f, which are not attention items because they are blocked, not ownerless-stale).
- **Boards** (`GET /v1/boards`, D-3). name · cardCount · needsYouCount · lastActivityAt:
  - Developer Experience · 6 · 3 · 2026-10-11T08:00Z
  - Client Quality · 2 · 1 · 2026-10-11T07:00Z
  - Guild Operations & Automation · 3 · 1 · 2026-10-11T06:00Z
  - Agent Onboarding · 20 · 0 · 2026-10-11T05:00Z
  - Editorial & Fact-Checking · 3 · 0 · 2026-10-10T07:00Z
  - Recurring Maintenance · 4 · 0 · 2026-10-10T05:00Z
  - Planning & Roadmap · 3 · 0 · 2026-10-08T06:00Z
  - Production Releases · 0 · 0 · 2026-10-07T06:00Z
  - Reliability & Incident Response · 0 · 0 · 2026-10-03T06:00Z
  - Marketing & Community · 0 · 0 · 2026-10-02T06:00Z
  - Research & Intelligence · 0 · 0 · 2026-09-26T06:00Z
  - superwitness canary · 0 · 0 · 2026-09-19T06:00Z
- Labels: clean-room, evidence-required, superpipeline (and two more on card 63ac).
- Projects: none needed.
- Draft `drf_dx_01` per §1.

---

## 8. Tests to update / add (apps/web)

- `CommandPalette.svelte.test.ts`:
  - grouping order Cards, Boards, Agents, Actions, Account
  - "agent" yields 8 with the counts in §2
  - agents cap of 4
  - `#` + last 4 of the id
  - Escape clears and then closes
  - empty state dispatch passes q
- `palette-index.test.ts` (new).
- `AppearanceDialog.svelte.test.ts`:
  - Studio desc text "An annual report: warm paper, ink and one blue." and Studio swatches primary, stage-5, signal
  - theme hint formula
  - readout per vibe
- `CardMoveMenu.svelte.test.ts` → `MoveCardDialog.svelte.test.ts`:
  - initial pick next stage, CTA "Move to Fix"
  - pickupSentence rules
  - refusal keeps it open
  - `step()` unchanged
- `who-picks-up.test.ts`, `relative-day.test.ts` (new).
- `auth-recovery.test.ts` (new):
  - single-flight
  - replay once
  - `login_required` → expired with reason
  - 503 retried 3× then expired
  - success keeps the route
  - `reconnect.test.ts` unchanged and still green
- API (`apps/api`): `/hub/session` (ok, refused, no refresh cookie, 503), `GET /v1/boards` new fields, `POST …/cards` stageKey/labelIds/projectId validation, drafts routes.
- e2e `dialogs.spec.ts`: one test per artboard × 4 vibes × light/dark at 1440×900, element-screenshot diff per §0.5, plus axe and focus-trap checks.

---

## 9. Gaps and rulings

| # | Mockup shows | API / code today | Ruling |
|---|---|---|---|
| D-1 | "super-chotu drafted the title and brief from your sentence", Draft again, "Drafted · not sent yet" | No draft feature | **(b)** New `POST /v1/boards/:boardId/drafts` `{sentence: string}` → `201 {draftId, status:'pending', drafter:{agentId, name}}` or `409 {error:{code:'NO_DRAFTER'}}`. The draft routes to the workspace agent declaring capability `command`; the name comes from data, never from code. `GET /v1/drafts/:id` → `{draftId, status:'pending'\|'ready'\|'failed', drafter, title?, brief?, stageKey?, priority?, labelIds?, projectId?, dueAt?}`. The agent fulfils with `PUT /v1/drafts/:id` (agent token; same body fields; `status` ready/failed) or the MCP tool `draft_card`. Board socket event `{type:'draft.ready', draftId}`. Drafts expire after 24h. Contract types go in `@superpipeline/contract`. |
| D-2 | "Starts in stage", "Project", "Labels" chosen at creation | `POST /v1/boards/:id/cards` accepts title/spec/priority/dueAt/ownerUserId only | **(b)** Accept `stageKey?: string` (must exist on the board, else 400 `UNKNOWN_STAGE`; default first stage), `labelIds?: string[]` (tenant labels, else 400 `UNKNOWN_LABEL`), `projectId?: string \| null`. `createCard()` in api.ts gains the same three fields, and `app.dispatchCard` passes them plus an optional `boardId`. |
| D-3 | Per-board "6 cards", "3 need you", "Today/Yesterday/…" (switcher and palette) | `BoardSummary {id, name}` | **(b)** `GET /v1/boards` adds `cardCount: number` (non-archived), `needsYouCount: number` (the same predicate as `itemsFromBoard`: pending gate, pending question, failed, input-required, over budget, ownerless-stale; port it to a shared module used by both api and web) and `lastActivityAt: string \| null` (latest board event). "Last used" means last activity on the board. |
| D-4 | "Rakesh Gangwar" (Reconnect, palette Sign out, Paper preview first name) | Plane sign-in stores `name = claims.email` | **(b)** Session `name = claims.name ?? claims.email`. `/auth/me` returns it, and `User.name` becomes the display source. Shared with the shell group's account name. |
| D-5 | Silent renewal before the dialog; "Reason: refresh refused (login_required)"; issuer host | 401 → `authState='signed-out'` → Landing; refresh cookie is `Path=/hub`; no session re-mint | **(b)** `POST /hub/session` as in §5 step 2, with responses `{ok:true}` / `{ok:false, reason, issuer, reauthorize}` / 503 `plane_unavailable`. Dev stub in `DEV_AUTH` mode (`refused`/`slow` cookie values) for e2e. Client: `apiFetch` + `auth-recovery.svelte.ts`. |
| D-6 | Palette card meta `#58f8`, `#481f` (the mockup hashes the title) | Current palette shows `#` + first 8 of id | **(a)** `'#' + card.id.slice(-4)`. The fixture's card ids end in the mockup's 4 chars (§7). |
| D-7 | Agents group shows exactly 4 agents for "agent" (all agents match via the group name) | Palette lists every agent | **(a)** The Agents group shows at most 4 matches, ranked: name starts with q, name contains q, capability contains q, group-only match; ties keep `app.agents` (API) order. The header and total count the rows shown. The fixture's API order starts error-eric, tester-tim, devops-dave, vulnerability-victor. |
| D-8 | "In the app this would now: …" banner | n/a | **(c)** Canvas-only demonstration; not implemented. |
| D-9 | Faint empty `<mark>` sliver after agent names in the render | n/a | **(c)** Render artefact; render `<mark>` only for a non-empty hit. |
| D-10 | Generic lane board behind every dialog | The real vibe board differs | **(c)** Stand-in backdrop; pixel diff compares the dialog element and samples the scrim (§0.5). |
| D-11 | Readout "Midday · Good afternoon, Rakesh." (+ paper/studio/quiet variants, noon only); Studio says "13:20" while the shell says 13:51 | vibekit `greeting()` has different copy | **(a)** `READOUT` constants per §3 for all phases; Studio uses the live clock (**c**: 13:20 is a mockup inconsistency, the fixture shows 13:51). |
| D-12 | Appearance PNG shows the old Studio description | n/a | Source and reference HTML win: Studio = Annual report text (§3). |
| D-13 | Move "then" sentence "error-eric picks it up to reproduce it." | Not derivable per stage | **(c)** Generic `${name} picks it up.`; the other stage sentences are derived per §4 (the default "Fix" state matches the mockup). |
| D-14 | "Nothing on the board changed while you were away." | The client cannot know this | **(c)** Replaced with "Your place is saved: after you sign in, you come back here." Collapsed by default, so no pixel impact. |
| D-15 | No phone dialogs drawn | n/a | **(a)** Sheet/card rules in §0.4. |
| D-16 | Toast sub "You stay on this card." | n/a | **(a)** "You stay on this page." when no card is open. |
| D-17 | Return box and lead name a card | n/a | **(a)** Non-card routes per §5 ("this page", board/view labels). |
| D-18 | Board order in the palette (mockup data lists Marketing before Production) differs from the switcher | n/a | **(a)** The palette uses the switcher's order (needs first, then last activity). Not visible in the "agent" state. |
| D-19 | Studio = Annual report tokens (`--vk-color-rule`, `--vk-stage-1..7`, Archivo/Azeret/Newsreader) | Vendored vibekit 0.0.1 lacks them | **(b)** Dependency: vibekit tokens release (owned by the tokens/shell work) before the Studio branch can match. |
| D-20 | `vibekit:*` components (§0.1) | Only Face, Sky, StageTrack and `vk-button` classes exist | **(b)** Built in vibekit first (coordinator); until then, app-local equivalents with the same CSS. |
| D-21 | Only the drafted state is drawn; no label picker or board listbox drawn | n/a | **(a)** Pre-draft: button "Draft brief", no note, no tag; drafting: "Drafting…" + "{drafter} is drafting…"; failure text per §1; LabelPicker and BoardPickButton are plain listbox popovers in dialog tokens. |
| D-22 | Error states of Move / New card / location denial not drawn | `app.error` exists | **(a)** Shown inline as a `role=alert` paragraph in the dialog's raised box style (never the signal colour). |
| D-23 | Switcher "Rename" opens nothing drawn | Inline rename exists | **(a)** Inline rename replaces the `.bs-acts` row (§6). |
| D-24 | Palette agent faces all `resting`, although tester-tim is `needs` on the board | n/a | **(a)** Palette faces are identity glyphs: always mood `resting`. |
