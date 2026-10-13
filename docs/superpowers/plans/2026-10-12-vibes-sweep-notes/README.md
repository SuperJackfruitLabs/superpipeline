# Vibes sweep — implementation notes

Distilled from the binding inputs in `docs/superpowers/specs/vibes-sweep/` with `mockup-corrections.md`
applied ("corrected:" marks a screen-spec value the corrections overrule). They gather, per screen group,
every exact string, formula, fixture value and API ruling the plan's tasks test against. Where a note and
a reference HTML disagree, the reference wins; where a note and the plan's "Coordinator rulings" disagree,
the plan wins.

| Note | Covers | Plan tasks |
|---|---|---|
| `vibekit.md` | vibekit 0.1.0 components, props, tokens, breaking changes | 1, all UI tasks |
| `accent-tokens.md` | the eight accents × four vibes × two themes, Studio ramps | 1, 36 |
| `shell-and-board.md` | shells, desktop and phone boards, empty board | 11–18, 25 |
| `card-shared-daylight.md` | card model, Daylight drawer/page/states/phone | 19–21, 26 |
| `card-paper-quiet.md`, `card-studio.md` | the other vibes' drawer/page/states/phone | 21–24, 26 |
| `operate-list.md` | Operate and List | 27–28 |
| `pages.md` | Projects, Workspace, Settings, Spend | 29–33 |
| `dialogs.md` | the six dialogs and the reconnect flow | 34–37 |
