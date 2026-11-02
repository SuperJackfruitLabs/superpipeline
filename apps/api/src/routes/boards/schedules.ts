// Recurring cards.
import type { JsonValue } from '../../board/board-do';
import { statusForCode } from '../errors';
import type { BoardRequest } from './request';

// GET/POST /v1/boards/:id/schedules · PATCH/DELETE /v1/boards/:id/schedules/:scheduleId
// (Task 10 — the reachable half of Task 8's rule grammar and Task 9's `createSchedule` /
// `updateSchedule` / `deleteSchedule` / `listSchedules` on the DO. Neither had a route until
// this block; a whole-branch review is what found labels shipped exactly this gap twice
// (`labels: "urgent"` and `dueAt: 12345`), so the type guards below are deliberate, not
// decoration.
//
// `createSchedule`/`updateSchedule` validate the RULE TEXT, the timezone STRING, `stageKey`,
// `overlap` and `createdBy` — but they trust the JSON SHAPE that reaches them, because the DO
// cannot reach D1 on a hot path to check it itself. A non-string `rule` reaches `parseRule`'s
// `s.trim()` and throws (a 500), not a graceful `INVALID_RULE`. That is refused here, before
// the DO ever sees it — the same class of hole `dueAt: 12345` opened on `POST /cards`.
//
// `createdBy` is never read from the body: the route supplies the authenticated user, exactly
// as `createCard`'s `ownerUserId` defaults to it — Principle 3, every card (and here, every
// schedule that mints one) has a human owner recorded at the moment of the act, not asked of
// the caller.
export async function schedules({ request, user, stub }: BoardRequest, schedulesMatch: RegExpMatchArray): Promise<Response> {
  const scheduleId = schedulesMatch[1];

  if (request.method === 'GET' && !scheduleId) {
    return Response.json({ schedules: await stub.listSchedules() });
  }

  if (request.method === 'POST' && !scheduleId) {
    const body = (await request.json().catch(() => null)) as {
      title?: unknown;
      rule?: unknown;
      timezone?: unknown;
      overlap?: unknown;
      stageKey?: unknown;
      priority?: unknown;
      labels?: unknown;
      spec?: JsonValue;
      enabled?: unknown;
    } | null;
    if (!body || typeof body !== 'object') {
      return Response.json({ error: { message: 'Expected a JSON object.' } }, { status: 400 });
    }
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      return Response.json(
        { error: { code: 'INVALID_SCHEDULE', message: '`title` is required and must be a non-empty string.' } },
        { status: 400 },
      );
    }
    // Shape only: whether the TEXT reads as a rule is `parseRule`'s job, and its message —
    // returned verbatim below — is the only sentence that tells the author what to type
    // instead. This just keeps a non-string off the path that would crash on it.
    if (typeof body.rule !== 'string' || body.rule.trim() === '') {
      return Response.json(
        { error: { code: 'INVALID_RULE', message: '`rule` is required and must be a string.' } },
        { status: 400 },
      );
    }
    if (typeof body.timezone !== 'string' || body.timezone.trim() === '') {
      return Response.json(
        { error: { code: 'INVALID_TIMEZONE', message: '`timezone` is required and must be a string.' } },
        { status: 400 },
      );
    }
    if (body.overlap !== undefined && body.overlap !== 'skip' && body.overlap !== 'allow') {
      return Response.json(
        { error: { code: 'INVALID_SCHEDULE', message: `overlap must be "skip" or "allow", not ${JSON.stringify(body.overlap)}` } },
        { status: 400 },
      );
    }
    if (body.stageKey !== undefined && body.stageKey !== null && typeof body.stageKey !== 'string') {
      return Response.json(
        { error: { code: 'INVALID_SCHEDULE', message: '`stageKey` must be a string or null.' } },
        { status: 400 },
      );
    }
    if (body.priority !== undefined && typeof body.priority !== 'number') {
      return Response.json(
        { error: { code: 'INVALID_SCHEDULE', message: '`priority` must be a number.' } },
        { status: 400 },
      );
    }
    if (body.labels !== undefined && (!Array.isArray(body.labels) || body.labels.some((l) => typeof l !== 'string'))) {
      return Response.json(
        { error: { code: 'INVALID_SCHEDULE', message: '`labels` must be an array of strings.' } },
        { status: 400 },
      );
    }
    if (body.enabled !== undefined && typeof body.enabled !== 'boolean') {
      return Response.json(
        { error: { code: 'INVALID_SCHEDULE', message: '`enabled` must be a boolean.' } },
        { status: 400 },
      );
    }
    // `spec` was the one field here with no shape guard, which reopens exactly the bug the
    // guards above exist for: `board-do.ts` spreads the parsed spec as
    // `{ ...JSON.parse(row.spec_json), scheduleId: id }`, and a string is iterable, so
    // `spec: "urgent"` would spread into `{0:'u',1:'r',...,scheduleId:'sch_…'}` instead of
    // being rejected. Reject a non-object (or null, or an array) here, before it ever reaches
    // that spread.
    if (body.spec !== undefined && (typeof body.spec !== 'object' || body.spec === null || Array.isArray(body.spec))) {
      return Response.json(
        { error: { code: 'INVALID_SCHEDULE', message: '`spec` must be a JSON object.' } },
        { status: 400 },
      );
    }

    const result = await stub.createSchedule({
      title: body.title,
      rule: body.rule,
      // Stored exactly as typed — never `resolvedOptions().timeZone`. See the DO's own note:
      // ICU canonicalises "Asia/Kolkata" to "Asia/Calcutta", so the operator's own spelling is
      // what is kept.
      timezone: body.timezone,
      overlap: (body.overlap as 'skip' | 'allow' | undefined) ?? 'skip',
      createdBy: user!.userId,
      // Same reasoning as `POST /v1/boards/:id/triggers`' `queuedGrant`: creating a schedule
      // IS the act of authorising unattended dispatch, and this is the only moment there is a
      // caller present to record it from. Without it, every card this schedule ever mints
      // falls back to the board's GitHub-webhook grant — which most boards never set — and
      // parks unclaimable under enforcement (whole-branch review, Important 1).
      queuedGrant: user?.mayDispatch ?? null,
      ...(body.stageKey !== undefined ? { stageKey: body.stageKey as string | null } : {}),
      ...(body.priority !== undefined ? { priority: body.priority as number } : {}),
      ...(body.labels !== undefined ? { labels: body.labels as string[] } : {}),
      ...(body.spec !== undefined ? { spec: body.spec } : {}),
      ...(body.enabled !== undefined ? { enabled: body.enabled as boolean } : {}),
    });
    if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
    return Response.json({ schedule: result.value }, { status: 201 });
  }

  if (scheduleId && request.method === 'PATCH') {
    const body = (await request.json().catch(() => null)) as {
      title?: unknown;
      rule?: unknown;
      timezone?: unknown;
      overlap?: unknown;
      stageKey?: unknown;
      priority?: unknown;
      labels?: unknown;
      spec?: JsonValue;
      enabled?: unknown;
    } | null;
    if (!body || typeof body !== 'object') {
      return Response.json({ error: { message: 'Expected a JSON object.' } }, { status: 400 });
    }
    if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim() === '')) {
      return Response.json(
        { error: { code: 'INVALID_SCHEDULE', message: '`title` must be a non-empty string.' } },
        { status: 400 },
      );
    }
    if (body.rule !== undefined && (typeof body.rule !== 'string' || body.rule.trim() === '')) {
      return Response.json(
        { error: { code: 'INVALID_RULE', message: '`rule` must be a string.' } },
        { status: 400 },
      );
    }
    if (body.timezone !== undefined && (typeof body.timezone !== 'string' || body.timezone.trim() === '')) {
      return Response.json(
        { error: { code: 'INVALID_TIMEZONE', message: '`timezone` must be a string.' } },
        { status: 400 },
      );
    }
    if (body.overlap !== undefined && body.overlap !== 'skip' && body.overlap !== 'allow') {
      return Response.json(
        { error: { code: 'INVALID_SCHEDULE', message: `overlap must be "skip" or "allow", not ${JSON.stringify(body.overlap)}` } },
        { status: 400 },
      );
    }
    if (body.stageKey !== undefined && body.stageKey !== null && typeof body.stageKey !== 'string') {
      return Response.json(
        { error: { code: 'INVALID_SCHEDULE', message: '`stageKey` must be a string or null.' } },
        { status: 400 },
      );
    }
    if (body.priority !== undefined && typeof body.priority !== 'number') {
      return Response.json(
        { error: { code: 'INVALID_SCHEDULE', message: '`priority` must be a number.' } },
        { status: 400 },
      );
    }
    if (body.labels !== undefined && (!Array.isArray(body.labels) || body.labels.some((l) => typeof l !== 'string'))) {
      return Response.json(
        { error: { code: 'INVALID_SCHEDULE', message: '`labels` must be an array of strings.' } },
        { status: 400 },
      );
    }
    if (body.enabled !== undefined && typeof body.enabled !== 'boolean') {
      return Response.json(
        { error: { code: 'INVALID_SCHEDULE', message: '`enabled` must be a boolean.' } },
        { status: 400 },
      );
    }
    // Same shape guard as the create route — see its comment.
    if (body.spec !== undefined && (typeof body.spec !== 'object' || body.spec === null || Array.isArray(body.spec))) {
      return Response.json(
        { error: { code: 'INVALID_SCHEDULE', message: '`spec` must be a JSON object.' } },
        { status: 400 },
      );
    }

    const result = await stub.updateSchedule(scheduleId, {
      ...(body.title !== undefined ? { title: body.title as string } : {}),
      ...(body.rule !== undefined ? { rule: body.rule as string } : {}),
      ...(body.timezone !== undefined ? { timezone: body.timezone as string } : {}),
      ...(body.overlap !== undefined ? { overlap: body.overlap as 'skip' | 'allow' } : {}),
      ...(body.stageKey !== undefined ? { stageKey: body.stageKey as string | null } : {}),
      ...(body.priority !== undefined ? { priority: body.priority as number } : {}),
      ...(body.labels !== undefined ? { labels: body.labels as string[] } : {}),
      ...(body.spec !== undefined ? { spec: body.spec } : {}),
      ...(body.enabled !== undefined ? { enabled: body.enabled as boolean } : {}),
    });
    if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
    return Response.json({ schedule: result.value });
  }

  if (scheduleId && request.method === 'DELETE') {
    const result = await stub.deleteSchedule(scheduleId);
    if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
    return new Response(null, { status: 204 });
  }

  return Response.json({ error: 'method not allowed' }, { status: 405 });
}
