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
  it('has no List, Projects, Spend, board log or switcher trigger per vibe: each is one composition (composition contract)', () => {
    for (const k of ['LIST_LAYOUTS', 'PROJECTS_LAYOUTS', 'SPEND_LAYOUTS', 'BOARD_LOG_LAYOUTS', 'SWITCHER_TRIGGERS']) expect(k in registry, `${k} is gone`).toBe(false);
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
