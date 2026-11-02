/**
 * What an Operate layout is handed: the model, and the page's transient UI state. Apart from
 * `types.ts` because the UI state's own module reads those types.
 */
import type { CapsUi, OperateUi } from '../operate-ui.svelte';
import type { OperateModel } from './types';

/**
 * `ui` and `caps` are what the reader is in the middle of (an open resume form, an expanded quote).
 * OperateView owns them so a layout that is mounted again (the shell swapping frames) keeps them;
 * a layout rendered on its own makes its own.
 */
export interface OperateLayoutProps { model: OperateModel; ui?: OperateUi; caps?: CapsUi }
