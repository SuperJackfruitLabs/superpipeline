import { describe, expect, it } from 'vitest';
import { serviceExpiry } from '../src/auth/service-expiry';

describe('verified service expiry metadata', () => {
  it('retains issuer seconds as milliseconds, rounding fractional milliseconds down', () => {
    expect(serviceExpiry(1_700_000_000)).toEqual({ expiresAt: 1_700_000_000_000 });
    expect(serviceExpiry(1_700_000_000.125)).toEqual({ expiresAt: 1_700_000_000_125 });
    expect(serviceExpiry(1.0009)).toEqual({ expiresAt: 1000 });
  });

  it.each([undefined, null, '1700000000', {}, [], NaN, Infinity, -Infinity, -1, 0, Number.MAX_SAFE_INTEGER])(
    'never invents safely representable expiry for %s', (exp) => {
      expect(serviceExpiry(exp)).toEqual({});
    },
  );
});
