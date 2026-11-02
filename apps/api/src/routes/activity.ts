// A board's last activity, noted once a card write is known to have succeeded.

/** Requests whose success should move a board's `updated_at`, set where the tenant is known. */
export const touchOnSuccess = new WeakMap<Request, { tenantId: string; boardId: string }>();
