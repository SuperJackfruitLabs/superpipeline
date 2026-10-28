/**
 * What a viewer may choose on a question (operator ruling 2026-10-28). An option marked
 * `requires: 'workspace-admin'` (strict "Always allow") is shown only to a workspace owner or admin;
 * the server refuses anyone else's answer, so hiding it here is the courtesy, not the guard.
 */
import type { BoardSnapshot, Role } from '$lib/api';

export function canChoose(role: Role | null | undefined, requires: 'workspace-admin' | undefined): boolean {
  return requires === undefined || role === 'owner' || role === 'admin';
}

export function forViewer<B extends Pick<BoardSnapshot, 'elicitations'>>(board: B, role: Role | null | undefined): B {
  return {
    ...board,
    elicitations: board.elicitations.map((e) => ({
      ...e,
      options: e.options.filter((o) => canChoose(role, o.requires)),
    })),
  };
}
