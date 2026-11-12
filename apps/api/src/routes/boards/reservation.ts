// DELETE /v1/boards/:id/cards/:cardId/reservation — a person clears the hold on a card.
import { clearReservationResponse } from '../../card-reservation';
import type { BoardRequest } from './request';

// A board admin (`manage`, checked at the door): a person may release a card a placement service is
// holding. Making a hold is a service's alone, on `dispatch:reserve` (service-routes.ts).
export async function cardReservationClear({ user, stub }: BoardRequest, match: RegExpMatchArray): Promise<Response> {
  return clearReservationResponse(stub, match[1], user?.userId ?? 'usr_dev');
}
