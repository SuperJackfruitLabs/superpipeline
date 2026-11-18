// apps/web/src/lib/components/settings/types.ts
import type { BoardSnapshot } from '$lib/api';
import type { BoardSettingsTab } from './settings-words';
/** Board settings: the board, a hook for a saved change, the tab to open and a hook for a tab change. */
export interface BoardSettingsViewProps { board: BoardSnapshot; onChanged: () => void; initial?: BoardSettingsTab; ontab?: (t: BoardSettingsTab) => void }
