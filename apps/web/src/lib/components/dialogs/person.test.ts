// apps/web/src/lib/components/dialogs/person.test.ts
import { describe, expect, it } from 'vitest';
import { firstName, greetingName, initials, personName } from './person';

describe('the signed-in person, by name', () => {
  it('prefers the workspace member name, then the session name, then the login', () => {
    const user = { userId: 'usr_b19776fac3c94df4', tenantId: 'tnt_vibes' };
    const members = [{ userId: 'usr_b19776fac3c94df4', email: 'ira@vibes-fixture.invalid', name: 'Ira Mehta', role: 'owner', createdAt: '' }] as never;
    expect(personName(user, members)).toBe('Ira Mehta');
    expect(personName({ ...user, name: 'Session Name' }, [])).toBe('Session Name');
    expect(personName({ ...user, login: 'ira' }, [])).toBe('ira');
    expect(personName(null, members)).toBe('');
  });
  it('greets by first name and never by email or login', () => {
    const user = { userId: 'usr_1', tenantId: 't', login: 'ira@vibes-fixture.invalid' };
    const members = [{ userId: 'usr_1', email: 'ira@vibes-fixture.invalid', name: 'Ira Mehta', role: 'owner', createdAt: '' }] as never;
    expect(greetingName(user, members)).toBe('Ira');
    expect(greetingName({ ...user, name: 'Ira Mehta' }, [])).toBe('Ira');
    expect(greetingName(user, [])).toBe('');
    expect(greetingName({ ...user, name: 'ira@vibes-fixture.invalid' }, [])).toBe('');
    expect(greetingName(null, members)).toBe('');
  });
  it('takes a first name and two initials', () => {
    expect(firstName('Ira Mehta')).toBe('Ira');
    expect(initials('Ira Mehta')).toBe('IM');
    expect(initials('ira')).toBe('I');
  });
});
