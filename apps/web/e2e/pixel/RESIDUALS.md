# Pixel residuals

The allow-listed keys of `expected-failures.ts`: screens that do not match their mockup yet. The deploy bar (operator ruling, 2026-10-13) is that every screen is within 1% of its mockup; `deploy-bar.ts` fails the run for a listed key over 1%. These keys are polished after deploy, and the list only shrinks.

Ratios are from the full pixel run on vibekit 0.0.10 (Node 22). A screen compared in parts (the dialogs, the shell checks) shows its worst part: the ratio the gate tests. The cause is the one recorded on the key in `expected-failures.ts`; the causes were isolated by probing the element under each diff cluster in both pages.

115 keys; 0 over the bar.

## Within the bar

| Key | Ratio | Cause |
|---|---|---|
| SP-Card-Paper·dark | 0.031% | the derived dark now casts the reference's sheet shadow as vibekit's dark shadow (fix round 2); left: the Resume note placeholder (vibekit Field textarea), the same 5 broken blocks as light |
| SP-Phone-Board-Daylight#shell·dark | 0.818% | vibekit PhoneHeader: Live sits above the hello where the reference draws it in a row; sub-pixel sky residue |
| SP-Workspace-Agents-Studio·light | 0.634% | Needs you 7 vs 4, vibekit Button; page content otherwise in place |
| SP-Workspace-Agents-Studio·dark | 0.625% | Needs you 7 vs 4, vibekit Button; page content otherwise in place |
| SP-Projects-Studio·light | 0.606% | vibekit Button (Create, Cancel, Add, the Project pill) and the shell (rail icons, status line) |
| SP-Projects-Studio·dark | 0.597% | vibekit Button (Create, Cancel, Add, the Project pill) and the shell (rail icons, status line) |
| SP-Dlg-BoardSwitcher-Studio·light | 0.515% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Dlg-BoardSwitcher-Studio·dark | 0.502% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Dlg-Palette-Studio·light | 0.500% | vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render |
| SP-Dlg-Palette-Studio·dark | 0.485% | vibekit CommandPalette rows (filter={false} since 0.0.9): Face tiles and keycaps rasterise differently from the reference's render |
| SP-Card-States-Studio·dark | 0.483% | vibekit: StageTrack's cell form cuts a long current name to one line ('Messaging…') where the reference wraps it to two, which shifts what follows by 13px |
| SP-Dlg-BoardSwitcher-Paper·light | 0.483% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Dlg-BoardSwitcher-Daylight·light | 0.476% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Card-States-Studio·light | 0.472% | vibekit: StageTrack's cell form cuts a long current name to one line ('Messaging…') where the reference wraps it to two, which shifts what follows by 13px |
| SP-Phone-Board-Daylight·dark | 0.467% | the Read the rest omission is fixed (merge 3); left: the sky and greeting (vibekit PhoneHeader, see #shell) move the tiles under it |
| SP-Dlg-BoardSwitcher-Paper·dark | 0.462% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Dlg-BoardSwitcher-Daylight·dark | 0.442% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Dlg-Move-Studio·light | 0.426% | vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off |
| SP-Dlg-Move-Studio·dark | 0.414% | vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off |
| SP-Dlg-Move-Daylight·light | 0.412% | vibekit Choice stage rows and Dialog object title: sub-pixel text and Face drawing against the reference's hand-drawn rows; the description sits 2px off |
| SP-Dlg-BoardSwitcher-Quiet·light | 0.410% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Dlg-BoardSwitcher-Quiet·dark | 0.403% | vibekit CommandPalette switcher form: row text and keycaps rasterise a pixel off the reference's hand-drawn rows (every box matches; the trigger copy is 0.000%) |
| SP-Workspace-Other-Studio·dark | 0.395% | the Studio cascade (five rules the reference's base overrides) and the tab row are fixed; left: the shell (rail icons; vibekit StatusLine pinned to the foot) |
| SP-Workspace-Other-Studio·light | 0.394% | the Studio cascade (five rules the reference's base overrides) and the tab row are fixed; left: the shell (rail icons; vibekit StatusLine pinned to the foot) |
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
| SP-Phone-Board-Daylight·light | 0.349% | the Read the rest omission is fixed (merge 3); left: the sky and greeting (vibekit PhoneHeader, see #shell) move the tiles under it |
| SP-Operate-Studio·light | 0.336% | the status line sits 52px lower than in the reference (vibekit AppShell pins it to the foot) and the rail icons differ |
| SP-Operate-Studio·dark | 0.335% | the status line sits 52px lower than in the reference (vibekit AppShell pins it to the foot) and the rail icons differ |
| SP-List-Studio·light | 0.317% | shell only (status line 18px lower, rail icons) |
| SP-List-Studio·dark | 0.316% | shell only (status line 18px lower, rail icons) |
| SP-Phone-Card-Daylight·light | 0.313% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Phone-Card-Quiet·light | 0.295% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Phone-Board-Quiet·dark | 0.294% | the reference's Move and Write a new card are vibekit text Buttons (Task 28 ruling); left: the tab bar sits 13px lower (vibekit phone frame pins it to the foot) |
| SP-Phone-Board-Quiet·light | 0.293% | the reference's Move and Write a new card are vibekit text Buttons (Task 28 ruling); left: the tab bar sits 13px lower (vibekit phone frame pins it to the foot) |
| SP-Phone-Card-Daylight·dark | 0.292% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Phone-Card-Quiet·dark | 0.284% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Settings-Studio·light | 0.282% | the Studio cascade (rule field type, Remove stage outline) and the GitHub glyph are fixed; left: the shell (vibekit StatusLine pinned to the foot, rail icons) |
| SP-Settings-Studio·dark | 0.278% | the Studio cascade (rule field type, Remove stage outline) and the GitHub glyph are fixed; left: the shell (vibekit StatusLine pinned to the foot, rail icons) |
| SP-Dlg-Appearance-Studio·dark | 0.256% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Dlg-Appearance-Studio·light | 0.235% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Card-Daylight·light | 0.219% | the capped drawer runs to 3120px over the reference's 2832px page, so its ground shows below; the drawer bar's Open in new window is vibekit's 44px tool Button where the reference draws a 21px text link; Copy is 76px against 72px (vibekit Button's icon slot) |
| SP-Dlg-Appearance-Daylight·light | 0.215% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Projects-Daylight·dark | 0.195% | vibekit Daylight shell: the Masthead's Sky draws no sun at x≈830–910 where the reference's .dy-sky does, and the AppNav foot sets the account (IM) 6–16px and the theme button 5px lower than the reference's rail foot |
| SP-Dlg-Appearance-Daylight·dark | 0.162% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Phone-Card-Paper·light | 0.135% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Spend-Daylight·dark | 0.134% | vibekit Daylight shell: the Masthead's Sky draws no sun at x≈830–910 where the reference's .dy-sky does, and the AppNav foot sets the account (IM) 6–16px and the theme button 5px lower than the reference's rail foot |
| SP-Card-Paper·light | 0.131% | the Resume note placeholder (vibekit Field textarea) |
| SP-Dlg-Appearance-Quiet·light | 0.130% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Phone-Card-Paper·dark | 0.126% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Dlg-Appearance-Paper·light | 0.123% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Card-Studio·light | 0.122% | vibekit: the Drawer bar (crumb row, Open tool) |
| SP-Card-Studio·dark | 0.116% | vibekit: the Drawer bar (crumb row, Open tool) |
| SP-Settings-Daylight·dark | 0.114% | vibekit Daylight shell: the Masthead's Sky draws no sun at x≈830–910 where the reference's .dy-sky does, and the AppNav foot sets the account (IM) 6–16px and the theme button 5px lower than the reference's rail foot; dark: the Skip this one select's text (same box and font) rasterises differently |
| SP-Dlg-Reconnect-Daylight·light | 0.108% | broken blocks only: vibekit Button (Sign in again) rasterises differently from the reference's render |
| SP-Phone-Card-Studio·light | 0.104% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Phone-Card-Studio·dark | 0.100% | vibekit Button text and icons rasterise differently from the reference's render, and the Resume note's Field placeholder |
| SP-Dlg-Appearance-Quiet·dark | 0.084% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Workspace-Agents-Daylight·dark | 0.079% | vibekit Daylight shell: the Masthead's Sky draws no sun at x≈830–910 where the reference's .dy-sky does, and the AppNav foot sets the account (IM) 6–16px and the theme button 5px lower than the reference's rail foot; the Tokens legend's t-meta line (same box and font) rasterises differently |
| SP-Dlg-Appearance-Paper·dark | 0.074% | within the bar since vibekit 0.0.10 and the picker's 1.45 type: the reference's 'See every accent's contrast' link is not drawn (its target is a mockup page the app does not have); the Paper preview's IN PROGRESS heading wraps in vibekit's preview frame; the Studio card's five swatches are vibekit's (bg, surface, primary, accent, signal) where the reference shows bg, primary, stage 5, accent, signal; Studio's readout Sky draws a smaller sun; the swatch wash strips and the foot's line rasterise a pixel off |
| SP-Phone-Board-Studio·dark | 0.073% | the reference's buttons are vibekit's (Task 28 ruling) and the artboard is the page's height; left: the tab bar (vibekit) |
| SP-Projects-Daylight·light | 0.072% | vibekit Daylight shell: the Masthead's Sky draws no sun at x≈830–910 where the reference's .dy-sky does, and the AppNav foot sets the account (IM) 6–16px and the theme button 5px lower than the reference's rail foot |
| SP-Board-Paper·light | 0.069% | vibekit 0.0.3 Button: padding, border and the ghost Move differ (0.44%) |
| SP-Phone-Board-Studio·light | 0.067% | the reference's buttons are vibekit's (Task 28 ruling) and the artboard is the page's height; left: the tab bar (vibekit) |
| SP-Card-Quiet·light | 0.061% | vibekit: the Drawer bar's back link and Open tool, and the Field select text |
| SP-Card-Quiet·dark | 0.059% | vibekit: the Drawer bar's back link and Open tool, and the Field select text |
| SP-Workspace-Other-Daylight·dark | 0.059% | vibekit Daylight shell: the Masthead's Sky draws no sun at x≈830–910 where the reference's .dy-sky does, and the AppNav foot sets the account (IM) 6–16px and the theme button 5px lower than the reference's rail foot; Refresh is 131.8px against the reference's 133.8px (vibekit Button's icon gap) and the row icon buttons draw a 16px glyph where the reference draws 18px |
| SP-Board-Daylight·light | 0.057% | first screen of the run: the peek's eyebrow row (PEEK · FAILING TEST · 33H IN THIS STAGE, y 100–120) draws 1px lower in the full run only; run alone the screen is 0.000%, so the cause is the run order, not a style |
| SP-Card-Daylight·dark | 0.056% | the drawer bar's Open in new window is vibekit's 44px tool Button at x 1132 where the reference draws a 21px text link at x 1221; Copy is 76px (vibekit Button's icon slot) against the reference's 72px; the section twisties are vibekit's 18px chevron where the reference draws a 9×4.5px path |
| SP-Board-Paper·dark | 0.054% | vibekit 0.0.3 Button: padding, border and the ghost Move differ (0.44%) |
| SP-Board-Daylight·dark | 0.053% | first screen of the run: the peek's eyebrow row (PEEK · FAILING TEST · 33H IN THIS STAGE, y 100–120) draws 1px lower in the full run only; run alone the screen is 0.000%, so the cause is the run order, not a style |
| SP-Settings-Daylight·light | 0.053% | vibekit Daylight shell: the Masthead's Sky draws no sun at x≈830–910 where the reference's .dy-sky does, and the AppNav foot sets the account (IM) 6–16px and the theme button 5px lower than the reference's rail foot; dark: the Skip this one select's text (same box and font) rasterises differently |
| SP-List-Daylight·dark | 0.050% | vibekit Daylight AppNav foot: the account (IM) sits 11px and the theme button 5px lower than the reference's rail foot |
| SP-Projects-Paper·light | 0.049% | the Paper sub-bar note (span.ps-note) is 16px/1.5 (24px) at y 209 where the reference's .mh-showing is 16px/1.45 (23.2px) at y 209.4; Write a new card (vibekit Button) rasterises a few pixels off |
| SP-Dlg-Reconnect-Daylight·dark | 0.048% | broken blocks only: vibekit Button (Sign in again) rasterises differently from the reference's render |
| SP-Spend-Daylight·light | 0.047% | vibekit Daylight shell: the Masthead's Sky draws no sun at x≈830–910 where the reference's .dy-sky does, and the AppNav foot sets the account (IM) 6–16px and the theme button 5px lower than the reference's rail foot |
| SP-CardPage-Studio·light | 0.043% | vibekit 0.0.4: its copy/link/edit/archive/send glyphs differ from the reference's Studio set, the 18px search glyph sits 2px off, Field select text rasterises differently (0.043%, 14 blocks) |
| SP-Projects-Paper·dark | 0.042% | the Paper sub-bar note (span.ps-note) is 16px/1.5 (24px) at y 209 where the reference's .mh-showing is 16px/1.45 (23.2px) at y 209.4; Write a new card (vibekit Button) rasterises a few pixels off |
| SP-Card-States-Paper·dark | 0.041% | vibekit: the gate note's Field textarea placeholder |
| SP-Card-States-Paper·light | 0.041% | vibekit: the gate note's Field textarea placeholder |
| SP-CardPage-Studio·dark | 0.041% | the light causes; the light band is gone (harness fix) |
| SP-Operate-Daylight·dark | 0.041% | vibekit Daylight AppNav foot: the account (IM) sits 11px and the theme button 5px lower than the reference's rail foot |
| SP-Dlg-NewCard-Daylight·light | 0.036% | vibekit Button and Field select rasterising (broken blocks only); Segmented sm on both sides since 0.0.9 |
| SP-Workspace-Other-Daylight·light | 0.030% | vibekit Daylight shell: the Masthead's Sky draws no sun at x≈830–910 where the reference's .dy-sky does, and the AppNav foot sets the account (IM) 6–16px and the theme button 5px lower than the reference's rail foot; Refresh is 131.8px against the reference's 133.8px (vibekit Button's icon gap) and the row icon buttons draw a 16px glyph where the reference draws 18px |
| SP-Dlg-NewCard-Quiet·light | 0.029% | vibekit Button and Field select rasterising (broken blocks only); Segmented sm on both sides since 0.0.9 |
| SP-Workspace-Agents-Daylight·light | 0.029% | vibekit Daylight shell: the Masthead's Sky draws no sun at x≈830–910 where the reference's .dy-sky does, and the AppNav foot sets the account (IM) 6–16px and the theme button 5px lower than the reference's rail foot; the Tokens legend's t-meta line (same box and font) rasterises differently |
| SP-Spend-Studio·light | 0.029% | vibekit Studio StatusLine items are 12px/1.4 (16.8px) where the reference's are 12px/normal (14px), so they sit 1.4px higher, and the ⌘K keycap 1px lower |
| SP-List-Quiet·light | 0.027% | shell only (vibekit Button 17px/700 New card, rail links) |
| SP-List-Quiet·dark | 0.026% | shell only (vibekit Button 17px/700 New card, rail links) |
| SP-Spend-Studio·dark | 0.026% | vibekit Studio StatusLine items are 12px/1.4 (16.8px) where the reference's are 12px/normal (14px), so they sit 1.4px higher, and the ⌘K keycap 1px lower |
| SP-Dlg-NewCard-Quiet·dark | 0.025% | vibekit Button and Field select rasterising (broken blocks only); Segmented sm on both sides since 0.0.9 |
| SP-List-Daylight·light | 0.021% | vibekit Daylight AppNav foot: the account (IM) sits 11px and the theme button 5px lower than the reference's rail foot |
| SP-Workspace-Agents-Paper·dark | 0.019% | the Tokens legend's t-meta line (same box and font) rasterises differently; Copy token is 152px (the app's min-width, so Copied does not resize it) against the reference's 139.9px |
| SP-Operate-Quiet·light | 0.018% | vibekit Quiet AppNav draws the Operate count “(4 need you)” at 400 in ink where the reference sets it 700 in the signal colour |
| SP-Operate-Quiet·dark | 0.017% | vibekit Quiet AppNav draws the Operate count “(4 need you)” at 400 in ink where the reference sets it 700 in the signal colour |
| SP-Workspace-Other-Quiet·light | 0.017% | Refresh is 2px narrower than the reference's (vibekit Button's icon gap); the row icon buttons draw a 16px glyph where the reference draws 12–18px; the member select's text (same box) rasterises differently |
| SP-Workspace-Other-Quiet·dark | 0.016% | Refresh is 2px narrower than the reference's (vibekit Button's icon gap); the row icon buttons draw a 16px glyph where the reference draws 12–18px; the member select's text (same box) rasterises differently |
| SP-List-Paper·light | 0.015% | vibekit Paper Tabs set the tab words at 17px/1.45 (24.65px) where the reference's .mh-tab is 17px/1.5 (25.5px), so they sit 0.4px higher; the masthead's Filter icon and Write a new card (vibekit Button) rasterise a few pixels off |
| SP-Workspace-Other-Paper·light | 0.015% | Refresh is 2px narrower than the reference's (vibekit Button's icon gap); the row icon buttons draw a 16px glyph where the reference draws 12–18px; the member select's text (same box) rasterises differently |
| SP-List-Paper·dark | 0.014% | vibekit Paper Tabs set the tab words at 17px/1.45 (24.65px) where the reference's .mh-tab is 17px/1.5 (25.5px), so they sit 0.4px higher; the masthead's Filter icon and Write a new card (vibekit Button) rasterise a few pixels off |
| SP-Workspace-Agents-Quiet·dark | 0.014% | the Tokens legend's t-meta line (same box and font) rasterises differently; the edit row's input text |
| SP-Operate-Daylight·light | 0.013% | vibekit Daylight AppNav foot: the account (IM) sits 11px and the theme button 5px lower than the reference's rail foot |
| SP-Workspace-Agents-Paper·light | 0.013% | the Tokens legend's t-meta line (same box and font) rasterises differently; Copy token is 152px (the app's min-width, so Copied does not resize it) against the reference's 139.9px |
| SP-Workspace-Agents-Quiet·light | 0.009% | the Tokens legend's t-meta line (same box and font) rasterises differently; the edit row's input text |

## Per platform

`PLATFORM_OVERRIDES` in `expected-failures.ts`: verdicts that differ from the darwin list above, keyed `${process.platform}-${process.arch}`. CI's linux-x64 runner is authoritative for deploys. Ratios are from CI's linux-x64 pixel run of 2026-10-13. Each is a logged exception: text rasterises differently under Linux FreeType than under macOS CoreText. SP-Board-Quiet#shell (1.266% / 1.264%, over the bar) is not listed: its cause, the ⌘ fallback width in Search ⌘K (the row after it shifts 6px), is fixed by the ⌘ pin in fonts.ts.

| Platform | Key | Verdict | Ratio | Cause |
|---|---|---|---|---|
| linux-x64 | SP-Dlg-NewCard-Daylight·dark | fails | 0.030% | one broken block: the Add label chip's words and the label chips' × glyphs draw 1px higher than the reference's under Linux FreeType hinting |
| linux-x64 | SP-CardPage-Paper·light | fails | 0.043% | one broken block on the links and list markers the app's reset dropped (Change project and the crumbs drew no underline, Things to prove no decimals; restored in card-page-paper.css, so this may now pass) |
| linux-x64 | SP-Phone-Board-Studio#shell·dark | fails | 0.503% | header part: vibekit Button: New card's label, Live and the switcher chevron draw 1px higher than the reference's under Linux FreeType hinting; tab-bar part: the first two tab glyphs rasterise 1px off |
| linux-x64 | SP-Phone-Board-Studio#shell·light | fails | 0.488% | header part: vibekit Button: New card's label, Live and the switcher chevron draw 1px higher than the reference's under Linux FreeType hinting; tab-bar part: the first two tab glyphs rasterise 1px off |
| linux-x64 | SP-Board-Quiet#shell·dark | fails | 0.129% | the board row's last view link, Projects, rasterises about 1px to one side under Linux FreeType once the row's widths accumulate sub-pixel offsets; everything else in the board and nav rows matches (CI linux-x64 part diff) |
| linux-x64 | SP-Board-Quiet#shell·light | fails | 0.131% | the board row's last view link, Projects, rasterises about 1px to one side under Linux FreeType once the row's widths accumulate sub-pixel offsets; everything else in the board and nav rows matches (CI linux-x64 part diff) |
| linux-x64 | SP-Phone-Board-Quiet#shell·dark | fails | 0.523% | header part: vibekit PhoneHeader switcher: the Change board link's words draw 1px higher than the reference's under Linux FreeType hinting; tab-bar part: one pixel row of the Operate count |
| linux-x64 | SP-Phone-Board-Quiet#shell·light | fails | 0.530% | header part: vibekit PhoneHeader switcher: the Change board link's words draw 1px higher than the reference's under Linux FreeType hinting; tab-bar part: one pixel row of the Operate count |
| linux-x64 | SP-Dlg-Reconnect-Daylight·dark | either | 0.030% | flips between 0.000% and 0.030% (one broken block on vibekit's Sign in again Button) from run to run on linux-x64; focus, hover, transitions and font loading are ruled out on macOS, and the Linux run could not be reproduced locally |
| linux-x64 | SP-Workspace-Agents-Quiet·dark | passes | 0.000% | passes on linux-x64; the darwin residual (t-meta line rasterising) does not occur under FreeType |
| linux-x64 | SP-Workspace-Agents-Quiet·light | passes | 0.000% | passes on linux-x64; the darwin residual (t-meta line rasterising) does not occur under FreeType |
| linux-x64 | SP-Workspace-Other-Paper·light | passes | 0.000% | passes on linux-x64; the darwin residual (sub-pixel icon and button rasterising) does not occur under FreeType |
