// apps/web/src/lib/components/workspace/workspace-words.test.ts
import { describe, expect, it } from 'vitest';
import type { Member } from '$lib/api';
import { FORGE_HOST_ERROR, initials, labelsHeading, lastOwner, peopleHeading, roleHelpTitle, roleHint, similarText } from './workspace-words';

const M = (userId: string, role: Member['role']): Member => ({ userId, email: `${userId}@example.com`, name: null, role, createdAt: '2026-09-01T00:00:00Z' });

describe('workspace words', () => {
  it('heads the panels', () => {
    expect([labelsHeading(3), labelsHeading(1), labelsHeading(0)]).toEqual(['3 labels', '1 label', 'No labels yet']);
    expect([peopleHeading(1), peopleHeading(2)]).toEqual(['1 person', '2 people']);
  });
  it('makes initials', () => {
    expect(initials('Ira Mehta')).toBe('IM');
    expect(initials('Ira Kumar Mehta')).toBe('IM');
    expect(initials('ira')).toBe('IR');
  });
  it('explains roles', () => {
    expect(roleHelpTitle('owner')).toBe('Owner: everything, including people and deleting boards');
    expect(roleHint('member')).toBe('Member: creates, moves and decides cards. No email is sent — they sign in and find this workspace waiting.');
  });
  it('protects the last owner', () => {
    const owner = M('usr_b19776fac3c94df4', 'owner');
    expect(lastOwner(owner, [owner])).toBe(true);
    expect(lastOwner(owner, [owner, M('usr_2', 'owner')])).toBe(false);
    expect(lastOwner(M('usr_3', 'member'), [owner])).toBe(false);
  });
  it('words the similar-name hint and the forge refusal', () => {
    expect(similarText(['code', 'coder'])).toBe('Similar to code, coder. Routing matches names exactly, so two spellings are two capabilities; remove the new one if you meant an existing one.');
    expect(FORGE_HOST_ERROR).toBe('That is a host, not a URL — forge.example.com.');
  });
});
