import { describe, expect, it } from 'vitest';
import { ownerLabel, stateLabel } from './filter-words';

const members = [
  { userId: 'usr_1', email: 'ira@vibes-fixture.invalid', name: 'Ira Mehta', role: 'owner', createdAt: '' },
  { userId: 'usr_2', email: 'noor@vibes-fixture.invalid', name: null, role: 'member', createdAt: '' },
] as never;

describe('filter words', () => {
  it('says a state in plain language', () => {
    expect(stateLabel('submitted')).toBe('Queued');
    expect(stateLabel('input-required')).toBe('Waiting on you');
    expect(stateLabel('completed')).toBe('Done');
    expect(stateLabel('on-hold')).toBe('on hold');
  });
  it('names an owner, and never prints an id', () => {
    expect(ownerLabel('usr_1', members, [])).toBe('Ira Mehta');
    expect(ownerLabel('usr_2', members, [])).toBe('noor@vibes-fixture.invalid');
    expect(ownerLabel('usr_b19776fac3c94df4', members, [])).toBe('someone');
    expect(ownerLabel('prn_agent', members, [{ externalId: 'prn_agent', name: 'Kai' }] as never)).toBe('Kai');
  });
});
