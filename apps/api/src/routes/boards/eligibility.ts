// GET /v1/boards/:id/cards/:cardId/eligibility — who could claim a card now, and why not.
import { eligibilityResponse } from '../../card-eligibility';
import type { BoardRequest } from './request';

// A person who may read the board. A service reads the same body on `dispatch:read` (service-routes.ts).
export async function cardEligibilityRead({ env, tenantId, stub }: BoardRequest, match: RegExpMatchArray): Promise<Response> {
  return eligibilityResponse(env, tenantId, stub, match[1]);
}
