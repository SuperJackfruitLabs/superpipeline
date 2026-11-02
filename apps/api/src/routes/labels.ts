// The workspace's label catalogue.
import { listLabels, createLabel, updateLabel, deleteLabel, isLabelNameCollision } from '../db/labels';
import { resolveWorkspaceCaller } from './callers';
import { unexpected } from './errors';
import type { WorkerRequest } from './router';

// /v1/labels[/:id] — the tenant's label catalogue (migration 0010).
//
// `Card.labels` has named this since the contract's Card schema existed, with no table and no
// route behind it (docs/01). The catalogue is tenant-scoped, not board-scoped, because a label
// that means one thing on one board and another on a second is not a label. What a card carries
// is validated and stored separately, on the `PATCH /v1/boards/:id/cards/:cardId` route below.
export async function labels({ request, env }: WorkerRequest, labelsMatch: RegExpMatchArray): Promise<Response> {
  try {
    // The CLI's `supi label list|add|rm` send a hub JWT (Authorization: Bearer), never a
    // session cookie — `resolveUser` alone can't read it. Unconditional on method, unlike the
    // GET-only fallback on `/v1/capabilities`: those verbs are CLI-reachable too, and
    // `refuseByRole(u, 'manage')` below is what actually gates the writes, exactly as it
    // already gates a session-authenticated write.
    // A person, or an agent READING the catalogue — a card's labels are ids until something resolves
    // them, and an agent that cannot read them cannot report what a card is. Writing the
    // catalogue stays a person's.
    const caller = await resolveWorkspaceCaller(request, env, {
      human: request.method === 'GET' ? 'read' : 'manage',
      agentScope: request.method === 'GET' ? 'read' : null,
    });
    if (caller instanceof Response) return caller;
    const { tenantId: wsTenantId } = caller;
    const labelId = labelsMatch[1];

    if (request.method === 'GET' && !labelId) {
      return Response.json({ labels: await listLabels(env.DB, wsTenantId) });
    }

    // Defining the workspace's labels is the same class of act as managing its capabilities.

    if (request.method === 'POST' && !labelId) {
      const body = (await request.json()) as { name?: string; colour?: string };
      const name = body.name?.trim() ?? '';
      if (name === '') {
        return Response.json({ error: 'name is required' }, { status: 400 });
      }
      if (!body.colour || body.colour.trim() === '') {
        return Response.json({ error: 'colour is required' }, { status: 400 });
      }
      try {
        const made = await createLabel(env.DB, wsTenantId, { name, colour: body.colour });
        return Response.json({ label: made }, { status: 201 });
      } catch (err) {
        // Narrowed to the exact UNIQUE(tenant_id, name) collision — anything else (a transient
        // D1 error, whatever) rethrows to the outer `unexpected(err)` handler rather than being
        // mislabelled as a name collision and having the real error discarded.
        if (!isLabelNameCollision(err)) throw err;
        // Read as a sentence rather than a raw SQLite constraint error, and against the
        // trimmed name actually attempted — the same treatment `/v1/capabilities` gives its
        // own collision.
        return Response.json({ error: `a label named "${name}" already exists in this workspace` }, { status: 409 });
      }
    }

    if (labelId && request.method === 'PATCH') {
      const body = (await request.json()) as { name?: string; colour?: string };
      // Same type guard as POST: a non-string or empty `name` must not reach `.trim()` in
      // `db/labels.ts` (a bare throw there, caught by neither branch below) or `updateLabel`'s
      // own `throw` on an empty trimmed name — both currently 500 instead of 400.
      if (body.name !== undefined) {
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (name === '') {
          return Response.json({ error: 'name is required' }, { status: 400 });
        }
      }
      try {
        // Built from named fields rather than forwarding `body` whole, same as the capability
        // PATCH above: the cast strips nothing at runtime.
        const updated = await updateLabel(env.DB, wsTenantId, labelId, { name: body.name, colour: body.colour });
        if (!updated) return Response.json({ error: 'label not found' }, { status: 404 });
        return Response.json({ label: updated });
      } catch (err) {
        // Same narrowed collision catch as POST — renaming onto an existing name (including a
        // case variant, which migration 0011's index makes collide) is a clean 409, not a raw
        // constraint failure surfaced as a 500.
        if (!isLabelNameCollision(err)) throw err;
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        return Response.json({ error: `a label named "${name}" already exists in this workspace` }, { status: 409 });
      }
    }

    if (labelId && request.method === 'DELETE') {
      if (!(await deleteLabel(env.DB, wsTenantId, labelId))) {
        return Response.json({ error: 'label not found' }, { status: 404 });
      }
      return new Response(null, { status: 204 });
    }

    return Response.json({ error: 'method not allowed' }, { status: 405 });
  } catch (err) {
    return unexpected(err);
  }
}
