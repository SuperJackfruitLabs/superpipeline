/**
 * The ONE place a vibe picks a layout or a presentation (spec §3.5). Components below the layout
 * folders never ask which vibe is on; they are handed what this file chose.
 */
import TriggerDaylight from '$lib/components/dialogs/switcher/TriggerDaylight.svelte';
import TriggerPaper from '$lib/components/dialogs/switcher/TriggerPaper.svelte';
import TriggerStudio from '$lib/components/dialogs/switcher/TriggerStudio.svelte';
import TriggerQuiet from '$lib/components/dialogs/switcher/TriggerQuiet.svelte';
import type { TriggerCopyProps } from '$lib/components/dialogs/switcher/types';
import type { Vibe } from '@superjackfruit/vibekit';
import type { Component } from 'svelte';
import BoardQuiet from '$lib/components/board/layouts/BoardQuiet.svelte';
import BoardStudio from '$lib/components/board/layouts/BoardStudio.svelte';
import BoardPaper from '$lib/components/board/layouts/BoardPaper.svelte';
import BoardDaylight from '$lib/components/board/layouts/BoardDaylight.svelte';
import BoardDaylightPhone from '$lib/components/board/layouts/BoardDaylightPhone.svelte';
import BoardPaperPhone from '$lib/components/board/layouts/BoardPaperPhone.svelte';
import BoardStudioPhone from '$lib/components/board/layouts/BoardStudioPhone.svelte';
import BoardQuietPhone from '$lib/components/board/layouts/BoardQuietPhone.svelte';
import type { BoardLayoutProps } from '$lib/components/board/layouts/types';
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
import ShellDaylight from '$lib/components/shell/ShellDaylight.svelte';
import ShellPaper from '$lib/components/shell/ShellPaper.svelte';
import ShellStudio from '$lib/components/shell/ShellStudio.svelte';
import ShellQuiet from '$lib/components/shell/ShellQuiet.svelte';
import PhoneShellDaylight from '$lib/components/shell/phone/PhoneShellDaylight.svelte';
import PhoneShellPaper from '$lib/components/shell/phone/PhoneShellPaper.svelte';
import PhoneShellStudio from '$lib/components/shell/phone/PhoneShellStudio.svelte';
import PhoneShellQuiet from '$lib/components/shell/phone/PhoneShellQuiet.svelte';
import type { ShellProps } from '$lib/components/shell/types';
import OperateDaylight from '$lib/components/operate/layouts/OperateDaylight.svelte';
import OperatePaper from '$lib/components/operate/layouts/OperatePaper.svelte';
import OperateStudio from '$lib/components/operate/layouts/OperateStudio.svelte';
import OperateQuiet from '$lib/components/operate/layouts/OperateQuiet.svelte';
import type { OperateLayoutProps } from '$lib/components/operate/layouts/types';
import ListDaylight from '$lib/components/plan/list/ListDaylight.svelte';
import ListDaylightToolbar from '$lib/components/plan/list/ListDaylightToolbar.svelte';
import ListPaper from '$lib/components/plan/list/ListPaper.svelte';
import ListStudio from '$lib/components/plan/list/ListStudio.svelte';
import ListQuiet from '$lib/components/plan/list/ListQuiet.svelte';
import type { ListLayoutProps } from '$lib/components/plan/list/types';
import ProjectsPage from '$lib/components/plan/projects/ProjectsPage.svelte';
import ProjectsStudio from '$lib/components/plan/projects/ProjectsStudio.svelte';
import type { ProjectsLayoutProps } from '$lib/components/plan/projects/types';
import WorkspaceFrame from '$lib/components/workspace/WorkspaceFrame.svelte';
import WorkspaceFrameStudio from '$lib/components/workspace/WorkspaceFrameStudio.svelte';
import AgentsPage from '$lib/components/workspace/agents/AgentsPage.svelte';
import AgentsStudio from '$lib/components/workspace/agents/AgentsStudio.svelte';
import NeedsYouTab from '$lib/components/workspace/NeedsYouTab.svelte';
import CapabilitiesTab from '$lib/components/workspace/CapabilitiesTab.svelte';
import LabelManager from '$lib/components/workspace/LabelManager.svelte';
import PeopleTab from '$lib/components/workspace/PeopleTab.svelte';
import ConnectionsTab from '$lib/components/workspace/ConnectionsTab.svelte';
import NeedsYouStudio from '$lib/components/workspace/studio/NeedsYouStudio.svelte';
import CapabilitiesStudio from '$lib/components/workspace/studio/CapabilitiesStudio.svelte';
import LabelsStudio from '$lib/components/workspace/studio/LabelsStudio.svelte';
import PeopleStudio from '$lib/components/workspace/studio/PeopleStudio.svelte';
import ConnectionsStudio from '$lib/components/workspace/studio/ConnectionsStudio.svelte';
import WorkspaceReview from '$lib/components/workspace/review/WorkspaceReview.svelte';
import WorkspaceReviewStudio from '$lib/components/workspace/review/WorkspaceReviewStudio.svelte';
import BoardSettings from '$lib/components/BoardSettings.svelte';
import Telemetry from '$lib/components/Telemetry.svelte';
import TelemetryStudio from '$lib/components/operate/TelemetryStudio.svelte';
import BoardLogPage from '$lib/components/operate/BoardLogPage.svelte';
import BoardLogPageStudio from '$lib/components/operate/BoardLogPageStudio.svelte';
import type { BoardLogPageProps, SpendLayoutProps } from '$lib/components/operate/spend-types';
import BoardSettingsStudio from '$lib/components/settings/BoardSettingsStudio.svelte';
import type { SettingsLayoutProps } from '$lib/components/settings/types';
import type { WorkspaceFrameProps, WorkspaceTabProps } from '$lib/components/workspace/types';
import type { WorkspaceTab } from '$lib/components/workspace/workspace-counts.svelte';

export { FACE_VARIANT, type FaceVariant } from './face-variant';

/** Every vibe has its own board, on a desktop and on a phone (switch at `viewport.phone`). */
export interface BoardLayout { desktop: Component<BoardLayoutProps>; phone: Component<BoardLayoutProps> }
export const BOARD_LAYOUTS: Readonly<Record<Vibe, BoardLayout>> = {
  daylight: { desktop: BoardDaylight, phone: BoardDaylightPhone },
  paper: { desktop: BoardPaper, phone: BoardPaperPhone },
  studio: { desktop: BoardStudio, phone: BoardStudioPhone },
  quiet: { desktop: BoardQuiet, phone: BoardQuietPhone },
};

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
  daylight: { drawer: CardDaylight, phone: CardPhoneDaylight, width: 'min(680px, 100%)', align: 'end', placement: 'overlay', framed: true },
  paper: { drawer: CardPaper, phone: CardPhonePaper, width: 'min(780px, calc(100% - 32px))', align: 'center', placement: 'overlay', framed: true },
  studio: { drawer: CardStudio, phone: CardPhoneStudio, width: 'min(940px, 100%)', align: 'end', placement: 'overlay', framed: true },
  quiet: { drawer: CardQuiet, phone: CardPhoneQuiet, width: 'min(1120px, 100%)', align: 'end', placement: 'overlay', framed: true },
};

/** The card on its own page, per vibe. Tasks 22–24 replace Paper, Studio and Quiet. */
export const CARD_PAGE_LAYOUTS: Readonly<Record<Vibe, Component<CardPageProps>>> = {
  daylight: CardPageDaylight, paper: CardPagePaper, studio: CardPageStudio, quiet: CardPageQuiet,
};

/** The card-states gallery per vibe. Tasks 25–27 replace Paper, Studio and Quiet. */
export const CARD_STATES_LAYOUTS: Readonly<Record<Vibe, Component<CardStatesProps>>> = {
  daylight: CardStatesDaylight, paper: CardStatesPaper, studio: CardStatesStudio, quiet: CardStatesQuiet,
};

/** The app frame per vibe, desktop (≥900px) and phone. */
export const SHELL_LAYOUTS: Readonly<Record<Vibe, { desktop: Component<ShellProps>; phone: Component<ShellProps> }>> = {
  daylight: { desktop: ShellDaylight, phone: PhoneShellDaylight },
  paper: { desktop: ShellPaper, phone: PhoneShellPaper },
  studio: { desktop: ShellStudio, phone: PhoneShellStudio },
  quiet: { desktop: ShellQuiet, phone: PhoneShellQuiet },
};

/**
 * What differs between the four empty boards besides CSS (SP-Board-Empty-*). The shell owns the
 * page's one main and one h1, so the heading is always an h2 and the skip link needs no form here.
 */
export interface EmptyForm {
  /** A product pill, or Studio's kicker line. */
  eyebrow: 'pill' | 'kick';
  /** `vk-button vk-button--primary`, or Studio's `.ar-btn`. */
  button: 'vk' | 'ar';
}
export const BOARD_EMPTY_FORMS: Readonly<Record<Vibe, EmptyForm>> = {
  daylight: { eyebrow: 'pill', button: 'vk' },
  paper: { eyebrow: 'pill', button: 'vk' },
  studio: { eyebrow: 'kick', button: 'ar' },
  quiet: { eyebrow: 'pill', button: 'vk' },
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

/** The workspace frame (back link, title, tabs) per vibe; Daylight, Paper and Quiet share one DOM. */
export const WORKSPACE_LAYOUTS: Readonly<Record<Vibe, Component<WorkspaceFrameProps>>> = {
  daylight: WorkspaceFrame, paper: WorkspaceFrame, studio: WorkspaceFrameStudio, quiet: WorkspaceFrame,
};
/** Until Task 34 the five other tabs keep their current component in every vibe. */
// The old tab components take no props; the cast goes away with them in Task 34.
const PAGE_TABS: Record<WorkspaceTab, Component<WorkspaceTabProps>> = {
  'needs-you': NeedsYouTab, agents: AgentsPage, capabilities: CapabilitiesTab, labels: LabelManager, people: PeopleTab, connections: ConnectionsTab,
};
const STUDIO_TABS: Record<WorkspaceTab, Component<WorkspaceTabProps>> = {
  'needs-you': NeedsYouStudio, agents: AgentsStudio, capabilities: CapabilitiesStudio, labels: LabelsStudio, people: PeopleStudio, connections: ConnectionsStudio,
};
export const WORKSPACE_TABS: Readonly<Record<Vibe, Record<WorkspaceTab, Component<WorkspaceTabProps>>>> = {
  daylight: PAGE_TABS, paper: PAGE_TABS, studio: STUDIO_TABS, quiet: PAGE_TABS,
};
/** The dev review route's body: D/P/Q two columns with capabilities across; Studio needs, capabilities, then a split. */
export const WORKSPACE_REVIEW_LAYOUTS: Readonly<Record<Vibe, Component<{ initial: WorkspaceTabProps['initial'] }>>> = {
  daylight: WorkspaceReview, paper: WorkspaceReview, studio: WorkspaceReviewStudio, quiet: WorkspaceReview,
};

/** Board settings: Daylight, Paper and Quiet share one DOM; Studio numbers its sections. */
export const SETTINGS_LAYOUTS: Readonly<Record<Vibe, Component<SettingsLayoutProps>>> = {
  daylight: BoardSettings, paper: BoardSettings, studio: BoardSettingsStudio, quiet: BoardSettings,
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
