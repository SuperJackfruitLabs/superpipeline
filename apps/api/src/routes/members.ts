// Who is in a workspace, and what they may do.
import { resolveUser } from '../auth/resolve';
import { listMembers, addMember, setMemberRole, removeMember, ownerCount, asRole } from '../db/members';
import { refuseByRole } from './callers';
import { unexpected } from './errors';
import type { WorkerRequest } from './router';

// /v1/members[/:userId] — who is in this workspace, and what they may do.
//
// `memberships.role` has been CHECK-constrained to owner/admin/member/viewer since migration
// 0001, written exactly once as 'owner' by `ensurePersonalWorkspace`, and read by zero
// queries — so a workspace was permanently one person and the four roles described nothing.
// These are the routes that make it a real model.
//
// No mail is sent and none is needed: `users` is keyed on the email GitHub gives at sign-in,
// so recording the membership first means the invitee signs in and finds the workspace
// waiting (`primaryTenant` orders by `created_at`, so a membership made before their personal
// workspace exists is the one they land in).
export async function memberRoster({ request, env }: WorkerRequest, membersMatch: RegExpMatchArray): Promise<Response> {
  try {
    const u = await resolveUser(request, env);
    if (!u) return Response.json({ error: 'sign in to continue' }, { status: 401 });
    const targetUserId = membersMatch[1];

    if (request.method === 'GET' && !targetUserId) {
      // Reading the roster is not an administrative act — a member needs to know who else can
      // see their board, and who to ask when they cannot do something.
      const refused = refuseByRole(u, 'read');
      if (refused) return refused;
      return Response.json({ members: await listMembers(env.DB, u.tenantId) });
    }

    // Everything below changes who may act in this workspace, which is an owner's decision.
    const refused = refuseByRole(u, 'own');
    if (refused) return refused;

    if (request.method === 'POST' && !targetUserId) {
      const body = (await request.json()) as { email?: string; role?: string; name?: string };
      const email = (body.email ?? '').trim();
      // Validated here so a typo is a sentence rather than a membership nobody can ever use:
      // the row is keyed on this address matching what GitHub returns at sign-in.
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return Response.json({ error: 'a valid email address is required' }, { status: 400 });
      }
      const role = asRole(body.role ?? 'member');
      if (!role) return Response.json({ error: 'role must be one of owner, admin, member, viewer' }, { status: 400 });
      return Response.json({ member: await addMember(env.DB, u.tenantId, { email, role, name: body.name ?? null }) }, { status: 201 });
    }

    if (targetUserId && request.method === 'PATCH') {
      const body = (await request.json()) as { role?: string };
      const role = asRole(body.role);
      if (!role) return Response.json({ error: 'role must be one of owner, admin, member, viewer' }, { status: 400 });
      // A workspace with no owner cannot be administered by anyone, including to appoint a
      // new one — it is unrecoverable through the product. So the last owner cannot step
      // down; they appoint a second owner first.
      if (role !== 'owner' && (await isLastOwner(env.DB, u.tenantId, targetUserId))) {
        return Response.json({ error: 'this is the workspace\'s only owner — appoint another before changing this' }, { status: 409 });
      }
      if (!(await setMemberRole(env.DB, u.tenantId, targetUserId, role))) {
        return Response.json({ error: 'not a member of this workspace' }, { status: 404 });
      }
      return Response.json({ ok: true });
    }

    if (targetUserId && request.method === 'DELETE') {
      if (await isLastOwner(env.DB, u.tenantId, targetUserId)) {
        return Response.json({ error: 'this is the workspace\'s only owner — appoint another before removing this one' }, { status: 409 });
      }
      if (!(await removeMember(env.DB, u.tenantId, targetUserId))) {
        return Response.json({ error: 'not a member of this workspace' }, { status: 404 });
      }
      return new Response(null, { status: 204 });
    }

    return Response.json({ error: 'method not allowed' }, { status: 405 });
  } catch (err) {
    return unexpected(err);
  }
}

/** Would changing or removing this member leave the workspace with no owner at all? */
async function isLastOwner(db: D1Database, tenantId: string, userId: string): Promise<boolean> {
  const members = await listMembers(db, tenantId);
  const target = members.find((m) => m.userId === userId);
  if (!target || target.role !== 'owner') return false;
  return (await ownerCount(db, tenantId)) <= 1;
}
