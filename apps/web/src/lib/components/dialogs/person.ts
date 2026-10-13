// apps/web/src/lib/components/dialogs/person.ts
import type { Member, User } from '$lib/api';

/** The signed-in person's display name: the workspace member row, else the session's name, else the login (D-4). */
export function personName(user: User | null, members: Member[]): string {
  if (!user) return '';
  const m = members.find((x) => x.userId === user.userId);
  return m?.name?.trim() || user.name?.trim() || user.login || m?.email || '';
}
/** The name the card layouts carry as `personName`: the member row first, so a letter reads "Dear Rakesh," even when the session has no name. */
export function cardPersonName(user: User | null, members: Member[]): string {
  return personName(user, members) || 'there';
}
/**
 * Who a greeting addresses: the first name of the member row, else the session's name, else nobody.
 * Never the login or the email: those are how the person signs in, not what they are called.
 */
export function greetingName(user: User | null, members: Member[]): string {
  if (!user) return '';
  const m = members.find((x) => x.userId === user.userId);
  const name = m?.name?.trim() || user.name?.trim() || '';
  return name.includes('@') ? '' : (name.split(/\s+/)[0] ?? '');
}
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? '';
export function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? '') + (w.length > 1 ? w[w.length - 1]![0] : '')).toUpperCase();
}
