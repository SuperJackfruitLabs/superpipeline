import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { withIssuer } from './helpers/hub-issuer';

const ISSUER = 'https://issuer-helper.test';
const JWKS = JSON.stringify({ keys: [] });
const vars = env as unknown as Record<string, unknown>;

describe('withIssuer', () => {
  // A timed-out test's body keeps running after vitest moves on. Its exit must not tear down the
  // issuer the next test installed (run-evidence.test.ts on Forge run 531: the test after a
  // timeout read `{ error }` instead of evidence, because HUB_ISSUER had been deleted under it).
  it('an outer call that finishes late does not remove the issuer a later call installed', async () => {
    let releaseStale!: () => void;
    const staleDone = withIssuer(ISSUER, JWKS, () => new Promise<void>((r) => { releaseStale = r; }));
    await withIssuer(ISSUER, JWKS, async () => {
      releaseStale();
      await staleDone;
      expect(vars.HUB_ISSUER).toBe(ISSUER);
      const res = await fetch(`${ISSUER}/api/auth/jwks`);
      expect(await res.text()).toBe(JWKS);
    });
    expect(vars.HUB_ISSUER).toBeUndefined();
  });
});
