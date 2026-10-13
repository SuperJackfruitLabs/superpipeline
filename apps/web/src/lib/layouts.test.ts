import { BOARD_EMPTY_FORMS, OPERATE_LAYOUTS } from './layouts';
import OperateDaylight from '$lib/components/operate/layouts/OperateDaylight.svelte';
import OperatePaper from '$lib/components/operate/layouts/OperatePaper.svelte';
import OperateStudio from '$lib/components/operate/layouts/OperateStudio.svelte';
import OperateQuiet from '$lib/components/operate/layouts/OperateQuiet.svelte';
import { VIBES } from '@superjackfruit/vibekit';
import { describe, expect, it } from 'vitest';
import { BOARD_LAYOUTS, CARD_LAYOUTS, CARD_PAGE_LAYOUTS, CARD_STATES_LAYOUTS, FACE_VARIANT, SHELL_LAYOUTS } from './layouts';
import CardDaylight from '$lib/components/card/layouts/CardDaylight.svelte';
import CardPageDaylight from '$lib/components/card/page/CardPageDaylight.svelte';
import CardStatesDaylight from '$lib/components/card/states/CardStatesDaylight.svelte';
import ShellDaylight from '$lib/components/shell/ShellDaylight.svelte';
import ShellPaper from '$lib/components/shell/ShellPaper.svelte';
import ShellStudio from '$lib/components/shell/ShellStudio.svelte';
import ShellQuiet from '$lib/components/shell/ShellQuiet.svelte';
import PhoneShellDaylight from '$lib/components/shell/phone/PhoneShellDaylight.svelte';
import PhoneShellPaper from '$lib/components/shell/phone/PhoneShellPaper.svelte';
import PhoneShellStudio from '$lib/components/shell/phone/PhoneShellStudio.svelte';
import PhoneShellQuiet from '$lib/components/shell/phone/PhoneShellQuiet.svelte';
import BoardQuiet from '$lib/components/board/layouts/BoardQuiet.svelte';
import BoardStudio from '$lib/components/board/layouts/BoardStudio.svelte';
import BoardPaper from '$lib/components/board/layouts/BoardPaper.svelte';
import BoardDaylight from '$lib/components/board/layouts/BoardDaylight.svelte';
import BoardDaylightPhone from '$lib/components/board/layouts/BoardDaylightPhone.svelte';
import BoardPaperPhone from '$lib/components/board/layouts/BoardPaperPhone.svelte';
import BoardStudioPhone from '$lib/components/board/layouts/BoardStudioPhone.svelte';
import BoardQuietPhone from '$lib/components/board/layouts/BoardQuietPhone.svelte';

describe('the layout registry', () => {
  it('has a desktop and a phone board and a face for every vibe', () => {
    for (const v of VIBES) {
      expect(BOARD_LAYOUTS[v].desktop, v).toBeTruthy();
      expect(BOARD_LAYOUTS[v].phone, v).toBeTruthy();
      expect(FACE_VARIANT[v], v).toBeTruthy();
    }
  });
  it('every vibe has its own desktop board and its own phone board', () => {
    expect(BOARD_LAYOUTS.daylight.desktop).toBe(BoardDaylight);
    expect(BOARD_LAYOUTS.paper.desktop).toBe(BoardPaper);
    expect(BOARD_LAYOUTS.studio.desktop).toBe(BoardStudio);
    expect(BOARD_LAYOUTS.quiet.desktop).toBe(BoardQuiet);
    expect(BOARD_LAYOUTS.daylight.phone).toBe(BoardDaylightPhone);
    expect(BOARD_LAYOUTS.paper.phone).toBe(BoardPaperPhone);
    expect(BOARD_LAYOUTS.studio.phone).toBe(BoardStudioPhone);
    expect(BOARD_LAYOUTS.quiet.phone).toBe(BoardQuietPhone);
  });
  it('each vibe has its own face variant', () => {
    expect(FACE_VARIANT).toEqual({ daylight: 'mood', paper: 'portrait', studio: 'light', quiet: 'name' });
  });
  it('every vibe has a drawer and a phone card, a width and a place', () => {
    for (const v of VIBES) {
      const L = CARD_LAYOUTS[v];
      expect(L.drawer, v).toBeTruthy();
      expect(L.phone, v).toBeTruthy();
      expect(L.width, v).toMatch(/^min\(/);
      expect(['end', 'center'], v).toContain(L.align);
      expect(['overlay', 'sheet'], v).toContain(L.placement);
    }
  });
  it('every vibe has a card page; Daylight draws its own', () => {
    for (const v of VIBES) expect(CARD_PAGE_LAYOUTS[v], v).toBeTruthy();
    expect(CARD_PAGE_LAYOUTS.daylight).toBe(CardPageDaylight);
  });
  it('Paper’s card is centred; the others sit against the right edge', () => {
    expect(CARD_LAYOUTS.paper.align).toBe('center');
    for (const v of ['daylight', 'studio', 'quiet'] as const) expect(CARD_LAYOUTS[v].align).toBe('end');
  });
  it('Daylight’s card is its own drawer, 680 wide, beside the board', () => {
    expect(CARD_LAYOUTS.daylight).toMatchObject({ drawer: CardDaylight, width: 'min(680px, 100%)', align: 'end', placement: 'overlay', framed: true });
    expect(CARD_STATES_LAYOUTS.daylight).toBe(CardStatesDaylight);
  });
});

describe('the shell registry', () => {
  it('has a desktop and a phone frame for every vibe', () => {
    for (const v of VIBES) {
      expect(SHELL_LAYOUTS[v].desktop, v).toBeTruthy();
      expect(SHELL_LAYOUTS[v].phone, v).toBeTruthy();
    }
  });
  it('Daylight has its own desktop shell', () => expect(SHELL_LAYOUTS.daylight.desktop).toBe(ShellDaylight));
  it('Paper, Studio and Quiet have their own desktop shells', () => {
    expect(SHELL_LAYOUTS.paper.desktop).toBe(ShellPaper);
    expect(SHELL_LAYOUTS.studio.desktop).toBe(ShellStudio);
    expect(SHELL_LAYOUTS.quiet.desktop).toBe(ShellQuiet);
  });
  it('each vibe has its own phone shell', () => {
    expect([SHELL_LAYOUTS.daylight.phone, SHELL_LAYOUTS.paper.phone, SHELL_LAYOUTS.studio.phone, SHELL_LAYOUTS.quiet.phone])
      .toEqual([PhoneShellDaylight, PhoneShellPaper, PhoneShellStudio, PhoneShellQuiet]);
  });
  it('the empty board differs per vibe only in two forms (the shell owns main and h1)', () => {
    expect(BOARD_EMPTY_FORMS).toEqual({
      daylight: { eyebrow: 'pill', button: 'vk' },
      paper: { eyebrow: 'pill', button: 'vk' },
      studio: { eyebrow: 'kick', button: 'ar' },
      quiet: { eyebrow: 'pill', button: 'vk' },
    });
  });
});

describe('OPERATE_LAYOUTS', () => {
  it('one Operate layout per vibe', () => {
    expect(OPERATE_LAYOUTS).toEqual({ daylight: OperateDaylight, paper: OperatePaper, studio: OperateStudio, quiet: OperateQuiet });
  });
});

import { LIST_LAYOUTS } from './layouts';
import ListDaylight from '$lib/components/plan/list/ListDaylight.svelte';
import ListDaylightToolbar from '$lib/components/plan/list/ListDaylightToolbar.svelte';
import ListPaper from '$lib/components/plan/list/ListPaper.svelte';
import ListStudio from '$lib/components/plan/list/ListStudio.svelte';
import ListQuiet from '$lib/components/plan/list/ListQuiet.svelte';

describe('LIST_LAYOUTS', () => {
  it('one List per vibe; only Daylight has a sub-bar toolbar', () => {
    expect(LIST_LAYOUTS).toEqual({
      daylight: { body: ListDaylight, toolbar: ListDaylightToolbar },
      paper: { body: ListPaper, toolbar: null },
      studio: { body: ListStudio, toolbar: null },
      quiet: { body: ListQuiet, toolbar: null },
    });
  });
});

import { PROJECTS_LAYOUTS } from './layouts';
import ProjectsPage from '$lib/components/plan/projects/ProjectsPage.svelte';
import ProjectsStudio from '$lib/components/plan/projects/ProjectsStudio.svelte';

describe('PROJECTS_LAYOUTS', () => {
  it('Daylight, Paper and Quiet share one page; Studio draws its own', () => {
    expect(PROJECTS_LAYOUTS).toEqual({ daylight: ProjectsPage, paper: ProjectsPage, studio: ProjectsStudio, quiet: ProjectsPage });
  });
});
