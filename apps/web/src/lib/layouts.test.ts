import { OPERATE_LAYOUTS } from './layouts';
import OperateDaylight from '$lib/components/operate/layouts/OperateDaylight.svelte';
import OperatePaper from '$lib/components/operate/layouts/OperatePaper.svelte';
import OperateStudio from '$lib/components/operate/layouts/OperateStudio.svelte';
import OperateQuiet from '$lib/components/operate/layouts/OperateQuiet.svelte';
import { VIBES } from '@superjackfruitlabs/vibekit-ui';
import { describe, expect, it } from 'vitest';
import { CARD_LAYOUTS, CARD_PAGE_LAYOUTS, CARD_STATES_LAYOUTS, FACE_VARIANT } from './layouts';
import * as registry from './layouts';
import CardDaylight from '$lib/components/card/layouts/CardDaylight.svelte';
import CardPageDaylight from '$lib/components/card/page/CardPageDaylight.svelte';
import CardStatesDaylight from '$lib/components/card/states/CardStatesDaylight.svelte';

describe('the layout registry', () => {
  it('has a face for every vibe', () => {
    for (const v of VIBES) expect(FACE_VARIANT[v], v).toBeTruthy();
  });
  it('has no board per vibe: one BoardView draws every vibe, desktop and phone, and one empty board', () => {
    expect('BOARD_LAYOUTS' in registry).toBe(false);
    expect('BOARD_EMPTY_FORMS' in registry).toBe(false);
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
  it('has no shell per vibe: one shell draws every vibe, desktop and phone (shell/ShellView.svelte)', () => {
    expect('SHELL_LAYOUTS' in registry).toBe(false);
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
