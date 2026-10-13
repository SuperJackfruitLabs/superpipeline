// apps/web/src/lib/face-variant.ts
import type { Vibe } from '@superjackfruit/vibekit';
export type FaceVariant = 'mood' | 'portrait' | 'light' | 'name';
export const FACE_VARIANT: Readonly<Record<Vibe, FaceVariant>> = { daylight: 'mood', paper: 'portrait', studio: 'light', quiet: 'name' };
