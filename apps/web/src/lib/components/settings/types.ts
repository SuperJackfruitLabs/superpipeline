// apps/web/src/lib/components/settings/types.ts
import type { Vibe } from '@superjackfruit/vibekit';
import type { BoardSnapshot } from '$lib/api';
export interface SettingsLayoutProps { board: BoardSnapshot; vibe: Vibe; onChanged: () => void }
