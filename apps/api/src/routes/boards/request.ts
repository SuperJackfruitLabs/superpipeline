// What a board route sees: the request, and the caller the board door resolved for it.
import type { AgentPrincipal, UserPrincipal } from '../../auth/resolve';
import type { BoardStub } from '../../board/board-do';
import type { Env } from '../../env';

/** The resolved caller on `/v1/boards[/...]`: a person, an agent, or (a webhook) neither. */
export interface BoardCaller {
  request: Request;
  env: Env;
  url: URL;
  tenantId: string;
  user: UserPrincipal | null;
  agent: AgentPrincipal | null;
}

/** A request on one board, `/v1/boards/:id/<rest>`. */
export interface BoardRequest extends BoardCaller {
  boardId: string;
  /** What follows `/v1/boards/:id/`, which the board patterns are matched against. */
  rest: string;
  stub: BoardStub;
}
