/**
 * The ONE place a vibe picks a layout or a presentation (spec §3.5). Components below the layout
 * folders never ask which vibe is on; they are handed what this file chose.
 */
import TriggerDaylight from '$lib/components/dialogs/switcher/TriggerDaylight.svelte';
import TriggerPaper from '$lib/components/dialogs/switcher/TriggerPaper.svelte';
import TriggerStudio from '$lib/components/dialogs/switcher/TriggerStudio.svelte';
import TriggerQuiet from '$lib/components/dialogs/switcher/TriggerQuiet.svelte';
import type { TriggerCopyProps } from '$lib/components/dialogs/switcher/types';
import type { Vibe } from '@superjackfruitlabs/vibekit-ui';
import type { Component } from 'svelte';
import CardDaylight from '$lib/components/card/layouts/CardDaylight.svelte';
import CardQuiet from '$lib/components/card/layouts/CardQuiet.svelte';
import CardStudio from '$lib/components/card/layouts/CardStudio.svelte';
import CardPaper from '$lib/components/card/layouts/CardPaper.svelte';
import CardPhoneDaylight from '$lib/components/card/layouts/CardPhoneDaylight.svelte';
import CardPhonePaper from '$lib/components/card/layouts/CardPhonePaper.svelte';
import CardPhoneStudio from '$lib/components/card/layouts/CardPhoneStudio.svelte';
import CardPhoneQuiet from '$lib/components/card/layouts/CardPhoneQuiet.svelte';
import CardPageDaylight from '$lib/components/card/page/CardPageDaylight.svelte';
import CardPageQuiet from '$lib/components/card/page/CardPageQuiet.svelte';
import CardPageStudio from '$lib/components/card/page/CardPageStudio.svelte';
import CardPagePaper from '$lib/components/card/page/CardPagePaper.svelte';
import CardStatesDaylight from '$lib/components/card/states/CardStatesDaylight.svelte';
import CardStatesQuiet from '$lib/components/card/states/CardStatesQuiet.svelte';
import CardStatesStudio from '$lib/components/card/states/CardStatesStudio.svelte';
import CardStatesPaper from '$lib/components/card/states/CardStatesPaper.svelte';
import type { CardLayoutProps, CardPageProps, CardStatesProps } from '$lib/components/card/layouts/types';
import { CARD_DRAWER_WIDTH } from '$lib/components/card/layouts/widths';
import OperateDaylight from '$lib/components/operate/layouts/OperateDaylight.svelte';
import OperatePaper from '$lib/components/operate/layouts/OperatePaper.svelte';
import OperateStudio from '$lib/components/operate/layouts/OperateStudio.svelte';
import OperateQuiet from '$lib/components/operate/layouts/OperateQuiet.svelte';
import type { OperateLayoutProps } from '$lib/components/operate/layouts/props';
import ListDaylight from '$lib/components/plan/list/ListDaylight.svelte';
import ListDaylightToolbar from '$lib/components/plan/list/ListDaylightToolbar.svelte';
import ListPaper from '$lib/components/plan/list/ListPaper.svelte';
import ListStudio from '$lib/components/plan/list/ListStudio.svelte';
import ListQuiet from '$lib/components/plan/list/ListQuiet.svelte';
import type { ListLayoutProps } from '$lib/components/plan/list/types';
import ProjectsPage from '$lib/components/plan/projects/ProjectsPage.svelte';
import ProjectsStudio from '$lib/components/plan/projects/ProjectsStudio.svelte';
import type { ProjectsLayoutProps } from '$lib/components/plan/projects/types';
import Telemetry from '$lib/components/Telemetry.svelte';
import TelemetryStudio from '$lib/components/operate/TelemetryStudio.svelte';
import BoardLogPage from '$lib/components/operate/BoardLogPage.svelte';
import BoardLogPageStudio from '$lib/components/operate/BoardLogPageStudio.svelte';
import type { BoardLogPageProps, SpendLayoutProps } from '$lib/components/operate/spend-types';

export { FACE_VARIANT, type FaceVariant } from './face-variant';

/**
 * A vibe's card: the drawer layout, the phone layout (below 640px), the panel width and where it
 * sits (amendments §7.3). Every desktop card is modal over a scrim (SP-Card-Daylight draws `.dl-scrim`),
 * so none reserves room on the board behind it.
 */
export interface CardLayout {
  drawer: Component<CardLayoutProps>;
  phone: Component<CardLayoutProps>;
  width: string;
  align: 'end' | 'center';
  placement: 'overlay' | 'sheet';
  /** The layout draws its own vibekit Drawer (frame, scrim, focus trap); the shell only mounts it. */
  framed?: boolean;
}
/** Widths stay what each vibe drew before the sweep until its own card task replaces the entry. */
export const CARD_LAYOUTS: Readonly<Record<Vibe, CardLayout>> = {
  daylight: { drawer: CardDaylight, phone: CardPhoneDaylight, width: CARD_DRAWER_WIDTH.daylight, align: 'end', placement: 'overlay', framed: true },
  paper: { drawer: CardPaper, phone: CardPhonePaper, width: CARD_DRAWER_WIDTH.paper, align: 'center', placement: 'overlay', framed: true },
  studio: { drawer: CardStudio, phone: CardPhoneStudio, width: CARD_DRAWER_WIDTH.studio, align: 'end', placement: 'overlay', framed: true },
  quiet: { drawer: CardQuiet, phone: CardPhoneQuiet, width: CARD_DRAWER_WIDTH.quiet, align: 'end', placement: 'overlay', framed: true },
};

/** The card on its own page, per vibe. Tasks 22–24 replace Paper, Studio and Quiet. */
export const CARD_PAGE_LAYOUTS: Readonly<Record<Vibe, Component<CardPageProps>>> = {
  daylight: CardPageDaylight, paper: CardPagePaper, studio: CardPageStudio, quiet: CardPageQuiet,
};

/** The card-states gallery per vibe. Tasks 25–27 replace Paper, Studio and Quiet. */
export const CARD_STATES_LAYOUTS: Readonly<Record<Vibe, Component<CardStatesProps>>> = {
  daylight: CardStatesDaylight, paper: CardStatesPaper, studio: CardStatesStudio, quiet: CardStatesQuiet,
};

/** Operate draws different markup in each vibe (four references, four DOMs). */
export const OPERATE_LAYOUTS: Readonly<Record<Vibe, Component<OperateLayoutProps>>> = {
  daylight: OperateDaylight,
  paper: OperatePaper,
  studio: OperateStudio,
  quiet: OperateQuiet,
};

/** The List per vibe. Only Daylight puts controls in the shell's sub-bar (its `toolbar`). */
export interface ListLayout { body: Component<ListLayoutProps>; toolbar: Component<ListLayoutProps> | null }
export const LIST_LAYOUTS: Readonly<Record<Vibe, ListLayout>> = {
  daylight: { body: ListDaylight, toolbar: ListDaylightToolbar },
  paper: { body: ListPaper, toolbar: null },
  studio: { body: ListStudio, toolbar: null },
  quiet: { body: ListQuiet, toolbar: null },
};

/** Daylight, Paper and Quiet draw the same Projects DOM; Studio is an annual-report list. */
export const PROJECTS_LAYOUTS: Readonly<Record<Vibe, Component<ProjectsLayoutProps>>> = {
  daylight: ProjectsPage,
  paper: ProjectsPage,
  studio: ProjectsStudio,
  quiet: ProjectsPage,
};

/** Spend in detail and the full board log: Daylight, Paper and Quiet share one DOM; Studio is an annual-report page. */
export const SPEND_LAYOUTS: Readonly<Record<Vibe, Component<SpendLayoutProps>>> = { daylight: Telemetry, paper: Telemetry, studio: TelemetryStudio, quiet: Telemetry };
export const BOARD_LOG_LAYOUTS: Readonly<Record<Vibe, Component<BoardLogPageProps>>> = { daylight: BoardLogPage, paper: BoardLogPage, studio: BoardLogPageStudio, quiet: BoardLogPage };

/** The board switcher's raised trigger, as each vibe's shell draws its board control (SP-Dlg-BoardSwitcher). */
export const SWITCHER_TRIGGERS: Record<Vibe, { component: Component<TriggerCopyProps>; anchorClass: string }> = {
  daylight: { component: TriggerDaylight, anchorClass: '' },
  paper: { component: TriggerPaper, anchorClass: 'bs-anchor--ed' },
  studio: { component: TriggerStudio, anchorClass: 'ar-board' },
  quiet: { component: TriggerQuiet, anchorClass: 'qn-board' },
};
