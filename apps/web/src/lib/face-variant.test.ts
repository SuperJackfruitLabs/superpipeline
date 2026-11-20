// apps/web/src/lib/face-variant.test.ts
import { VIBES } from '@superjackfruitlabs/vibekit-ui';
import { describe, expect, it } from 'vitest';
import { FACE_VARIANT } from './face-variant';

describe('face variants', () => {
  it('has a face for every vibe', () => {
    for (const v of VIBES) expect(FACE_VARIANT[v], v).toBeTruthy();
  });
  it('each vibe has its own face variant', () => {
    expect(FACE_VARIANT).toEqual({ daylight: 'mood', paper: 'portrait', studio: 'light', quiet: 'name' });
  });
});

