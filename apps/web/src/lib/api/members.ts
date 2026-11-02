/** The workspace's members and their roles. */
import { ApiError } from '../loading';
import { fetch, headers } from './client';

/**
 * Who is in this workspace, and what they may do.
 *
 * `memberships.role` was CHECK-constrained, written once as 'owner' and read by zero queries, so
 * a workspace was permanently one person. These are the calls that make it a real model.
 */
export type Role = 'viewer' | 'member' | 'admin' | 'owner';

export interface Member {
  userId: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: string;
}

/** Everyone in the workspace, oldest membership first — the founding owner at the top. */
export async function getMembers(): Promise<Member[]> {
  const res = await fetch('/v1/members', { headers });
  if (!res.ok) throw new ApiError('getMembers', res.status);
  return ((await res.json()) as { members: Member[] }).members;
}

/**
 * Add someone by email. No mail is sent: `users` is keyed on the address GitHub gives at sign-in,
 * so recording the membership first means the invitee signs in and finds the workspace waiting.
 */
export function addMember(email: string, role: Role, name?: string): Promise<Response> {
  const body = name ? { email, role, name } : { email, role };
  return fetch('/v1/members', { method: 'POST', headers, body: JSON.stringify(body) });
}

export function setMemberRole(userId: string, role: Role): Promise<Response> {
  return fetch(`/v1/members/${userId}`, { method: 'PATCH', headers, body: JSON.stringify({ role }) });
}

export function removeMember(userId: string): Promise<Response> {
  return fetch(`/v1/members/${userId}`, { method: 'DELETE', headers });
}
