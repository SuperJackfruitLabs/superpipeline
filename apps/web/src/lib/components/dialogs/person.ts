// apps/web/src/lib/components/dialogs/person.ts
import type { Member, User } from '$lib/api';

/** The signed-in person's display name: the workspace member row, else the session's name, else the login (D-4). */
export function personName(user: User | null, members: Member[]): string {
  if (!user) return '';
  const m = members.find((x) => x.userId === user.userId);
  return m?.name?.trim() || user.name?.trim() || user.login || m?.email || '';
}
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? '';
export function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? '') + (w.length > 1 ? w[w.length - 1]![0] : '')).toUpperCase();
}
