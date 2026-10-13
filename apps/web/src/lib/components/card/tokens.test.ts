// apps/web/src/lib/components/card/tokens.test.ts
import { describe, expect, it } from 'vitest';
import { QUIET_TOKEN_RE, sessionIdOf, splitTokens } from './tokens';
import { DETAIL_4605 } from './testing/card-4605';

describe('splitTokens', () => {
  it('finds exactly the four id-like tokens in 4605’s detail and never changes the text', () => {
    const parts = splitTokens(DETAIL_4605);
    expect(parts.filter((p) => p.token).map((p) => p.text)).toEqual([
      'acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023',
      'event_id/room_id/timestamp',
      'matrix-inbound/control-pair/ACP/matrix-outbound',
      'matrix_rooms',
    ]);
    expect(parts.map((p) => p.text).join('')).toBe(DETAIL_4605);
  });
  it('the Quiet rule styles only the session id', () => {
    expect(splitTokens(DETAIL_4605, QUIET_TOKEN_RE).filter((p) => p.token).map((p) => p.text)).toEqual(['acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023']);
  });
  it('plain text is one plain part', () => expect(splitTokens('All done, ready for your review.')).toEqual([{ text: 'All done, ready for your review.', token: false }]));
});

describe('sessionIdOf', () => {
  it('finds the ACP session id', () => expect(sessionIdOf(DETAIL_4605)).toBe('acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023'));
  it('is null when there is none', () => {
    expect(sessionIdOf('All done, ready for your review.')).toBeNull();
    expect(sessionIdOf(null)).toBeNull();
  });
});
