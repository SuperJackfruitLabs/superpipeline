# Pixel residuals

The allow-listed keys of `expected-failures.ts`: screens that do not match their mockup yet. The deploy bar (operator ruling, 2026-10-13) is that every screen is within 1% of its mockup; `deploy-bar.ts` fails the run for a listed key over 1%. These keys are polished after deploy, and the list only shrinks.

Ratios are from the full pixel run on vibekit 0.0.10 (Node 22). A screen compared in parts (the dialogs, the shell checks) shows its worst part: the ratio the gate tests. The cause is the one recorded on the key in `expected-failures.ts`; the causes were isolated by probing the element under each diff cluster in both pages.

115 keys; 0 over the bar.

## Within the bar

| Key | Ratio | Cause |
|---|---|---|
| SP-Card-Paper·dark | 0.031% | the derived dark now casts the reference's sheet shadow as vibekit's dark shadow (fix round 2); left: the Resume note placeholder (vibekit Field textarea), the same 5 broken blocks as light |
| SP-Dlg-BoardSwitcher-Studio·light | 0.515% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Dlg-BoardSwitcher-Studio·dark | 0.502% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Dlg-Palette-Studio·light | 0.500% | vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render |
| SP-Dlg-Palette-Studio·dark | 0.485% | vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render |
| SP-Card-States-Studio·dark | 0.483% | vibekit: StageTrack's cell form cuts a long current name to one line ('Messaging…') where the reference wraps it to two, which shifts what follows by 13px |
| SP-Dlg-BoardSwitcher-Paper·light | 0.483% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Dlg-BoardSwitcher-Daylight·light | 0.476% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Card-States-Studio·light | 0.472% | vibekit: StageTrack's cell form cuts a long current name to one line ('Messaging…') where the reference wraps it to two, which shifts what follows by 13px |
| SP-Dlg-BoardSwitcher-Paper·dark | 0.462% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Dlg-BoardSwitcher-Daylight·dark | 0.442% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Dlg-Move-Studio·light | 0.426% | vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off |
| SP-Dlg-Move-Studio·dark | 0.414% | vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off |
| SP-Dlg-Move-Daylight·light | 0.412% | vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off |
| SP-Dlg-BoardSwitcher-Quiet·light | 0.410% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Dlg-BoardSwitcher-Quiet·dark | 0.403% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Dlg-Move-Paper·light | 0.390% | vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off |
| SP-Dlg-Palette-Daylight·light | 0.386% | vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render |
| SP-Dlg-Palette-Quiet·light | 0.386% | vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render |
| SP-Dlg-Palette-Paper·light | 0.384% | vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render |
| SP-Dlg-Palette-Quiet·dark | 0.379% | vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render |
| SP-Dlg-Palette-Daylight·dark | 0.378% | vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render |
| SP-Dlg-Palette-Paper·dark | 0.374% | vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render |
| SP-Dlg-Move-Paper·dark | 0.369% | vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off |
| SP-Dlg-Move-Daylight·dark | 0.363% | vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off |
| SP-Dlg-Move-Quiet·light | 0.360% | vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off |
| SP-Dlg-Move-Quiet·dark | 0.359% | vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off |
| SP-Operate-Studio·light | 0.336% | the status line sits 52px lower than in the reference (vibekit AppShell pins it to the foot) and the rail icons differ |
| SP-Operate-Studio·dark | 0.335% | the status line sits 52px lower than in the reference (vibekit AppShell pins it to the foot) and the rail icons differ |
| SP-Phone-Card-Daylight·light | 0.313% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Phone-Card-Quiet·light | 0.295% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Phone-Card-Daylight·dark | 0.292% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Phone-Card-Quiet·dark | 0.284% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Dlg-Appearance-Studio·dark | 0.256% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Dlg-Appearance-Studio·light | 0.235% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Card-Daylight·light | 0.219% | the capped drawer runs to 3120px over the reference's 2832px page, so its ground shows below; the drawer bar's Open in new window is vibekit's 44px tool Button where the reference draws a 21px text link; Copy is 76px against 72px (vibekit Button's icon slot) |
| SP-Dlg-Appearance-Daylight·light | 0.215% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Dlg-Appearance-Daylight·dark | 0.162% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Phone-Card-Paper·light | 0.135% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Card-Paper·light | 0.131% | the Resume note placeholder (vibekit Field textarea) |
| SP-Dlg-Appearance-Quiet·light | 0.130% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Phone-Card-Paper·dark | 0.126% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Dlg-Appearance-Paper·light | 0.123% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Card-Studio·light | 0.122% | vibekit: the Drawer bar (crumb row, Open tool) |
| SP-Card-Studio·dark | 0.116% | vibekit: the Drawer bar (crumb row, Open tool) |
| SP-Dlg-Reconnect-Daylight·light | 0.108% | broken blocks only: vibekit Button (Sign in again) rasterises differently from the reference's render |
| SP-Phone-Card-Studio·light | 0.104% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Phone-Card-Studio·dark | 0.100% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Dlg-Appearance-Quiet·dark | 0.084% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Dlg-Appearance-Paper·dark | 0.074% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Card-Quiet·light | 0.061% | vibekit: the Drawer bar's back link and Open tool, and the Field select text |
| SP-Card-Quiet·dark | 0.059% | vibekit: the Drawer bar's back link and Open tool, and the Field select text |
| SP-Card-Daylight·dark | 0.056% | the drawer bar's Open in new window is vibekit's 44px tool Button at x 1132 where the reference draws a 21px text link at x 1221; Copy is 76px (vibekit Button's icon slot) against the reference's 72px; the section twisties are vibekit's 18px chevron where the reference draws a 9×4.5px path |
| SP-Dlg-Reconnect-Daylight·dark | 0.048% | broken blocks only: vibekit Button (Sign in again) rasterises differently from the reference's render |
| SP-CardPage-Studio·light | 0.043% | vibekit 0.0.4: its copy/link/edit/archive/send glyphs differ from the reference's Studio set, the 18px search glyph sits 2px off, Field select text rasterises differently (0.043%, 14 blocks) |
| SP-Card-States-Paper·dark | 0.041% | vibekit: the gate note's Field textarea placeholder |
| SP-Card-States-Paper·light | 0.041% | vibekit: the gate note's Field textarea placeholder |
| SP-CardPage-Studio·dark | 0.041% | the light causes; the light band is gone (harness fix) |
| SP-Operate-Daylight·dark | 0.041% | vibekit Daylight AppNav foot: the account (IM) sits 11px and the theme button 5px lower than the reference's rail foot |
| SP-Dlg-NewCard-Daylight·light | 0.036% | vibekit Button and Field select rasterising (broken blocks only); Segmented sm on both sides since 0.0.9 |
| SP-Dlg-NewCard-Quiet·light | 0.029% | vibekit Button and Field select rasterising (broken blocks only); Segmented sm on both sides since 0.0.9 |
| SP-Dlg-NewCard-Quiet·dark | 0.025% | vibekit Button and Field select rasterising (broken blocks only); Segmented sm on both sides since 0.0.9 |
| SP-Operate-Quiet·light | 0.018% | vibekit Quiet AppNav draws the Operate count “(4 need you)” at 400 in ink where the reference sets it 700 in the signal colour |
| SP-Operate-Quiet·dark | 0.017% | vibekit Quiet AppNav draws the Operate count “(4 need you)” at 400 in ink where the reference sets it 700 in the signal colour |
| SP-Operate-Daylight·light | 0.013% | vibekit Daylight AppNav foot: the account (IM) sits 11px and the theme button 5px lower than the reference's rail foot |

## Per platform

`PLATFORM_OVERRIDES` in `expected-failures.ts`: verdicts that differ from the darwin list above, keyed `${process.platform}-${process.arch}`. CI's linux-x64 runner is authoritative for deploys. Ratios are from CI's linux-x64 pixel run of 2026-10-13. Each is a logged exception: text rasterises differently under Linux FreeType than under macOS CoreText. SP-Board-Quiet#shell (1.266% / 1.264%, over the bar) is not listed: its cause, the ⌘ fallback width in Search ⌘K (the row after it shifts 6px), is fixed by the ⌘ pin in fonts.ts.

| Platform | Key | Verdict | Ratio | Cause |
|---|---|---|---|---|
| linux-x64 | SP-Dlg-NewCard-Daylight·dark | fails | 0.030% | one broken block: the Add label chip's words and the label chips' × glyphs draw 1px higher than the reference's under Linux FreeType hinting |
| linux-x64 | SP-CardPage-Paper·light | fails | 0.043% | one broken block on the links and list markers the app's reset dropped (Change project and the crumbs drew no underline, Things to prove no decimals; restored in card-page-paper.css, so this may now pass) |
| linux-x64 | SP-Dlg-Reconnect-Daylight·dark | either | 0.030% | flips between 0.000% and 0.030% (one broken block on vibekit's Sign in again Button) from run to run on linux-x64; focus, hover, transitions and font loading are ruled out on macOS, and the Linux run could not be reproduced locally |
