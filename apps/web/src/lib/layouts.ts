/**
 * The ONE place a vibe picks a layout or a presentation (spec §3.5). Components below the layout
 * folders never ask which vibe is on; they are handed what this file chose.
 */
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
