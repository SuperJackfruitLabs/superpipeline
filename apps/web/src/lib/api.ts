/**
 * Thin client for the Superpipeline API (apps/api). The deployed app authenticates with a session cookie
 * (sent automatically, same-origin); the `X-Tenant-Id` header is a no-op there and only enables the
 * local dev workspace (when the server runs with DEV_AUTH on).
 *
 * One module per resource under `api/`, all through the one `fetch` in `api/client.ts`. This file
 * is the door every component imports (`$lib/api`): it re-exports exactly what it always exported.
 */
export { ApiError } from './loading';
export { setUnauthorizedHandler, noteAuth } from './api/client';
export * from './api/session';
export * from './api/boards';
export * from './api/cards';
export * from './api/links';
export * from './api/comments';
export * from './api/gates';
export * from './api/notifications';
export * from './api/usage';
export * from './api/schedules';
export * from './api/agents';
export * from './api/members';
export * from './api/capabilities';
export * from './api/labels';
export * from './api/projects';
export * from './api/workspace';
