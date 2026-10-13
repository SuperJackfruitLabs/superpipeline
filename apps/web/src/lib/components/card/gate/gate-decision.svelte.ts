/**
 * One decision on an approval gate, the same in every vibe (spec §5.3). The note is always on
 * screen while the gate is pending and travels with whichever decision is taken; Request changes
 * needs one, because it is the rework instruction the next run reads.
 */
import { resolveGate, type Gate, type GateDecision, type GateOption } from '$lib/api';
import { gateDecisionForOption } from '$lib/gate-delivery';
import { GATE_NOTE_MAX, noteToComment } from '$lib/gate-note';

export const DEFAULT_GATE_OPTIONS: readonly GateOption[] = [
  { name: 'approve', title: 'Approve', interactive: false },
  { name: 'request_changes', title: 'Request changes', interactive: true },
  { name: 'reject', title: 'Reject', interactive: false },
];
export { GATE_NOTE_MAX };

export type OptionRole = 'approve' | 'changes' | 'reject';
export function roleOf(name: string): OptionRole | null {
  if (name === 'approve' || name === 'approve_manual' || name === 'approve_automatic') return 'approve';
  if (name === 'request_changes') return 'changes';
  if (name === 'reject') return 'reject';
  return null;
}
export function decisionFor(name: string): GateDecision {
  const role = roleOf(name);
  if (role === 'changes') return 'request_changes';
  if (role === 'reject') return 'reject';
  return gateDecisionForOption(name);
}
/** The first eight hex characters of the hash, after any algorithm prefix (`sha256:`). */
export const sealOf = (digest: string): string => {
  const hex = digest.slice(digest.indexOf(':') + 1);
  return `${hex.slice(0, 4)}·${hex.slice(4, 8)}`;
};

export interface GateContext {
  boardId: string;
  gate: Gate;
  onResponse: (decision: GateDecision, res: Response) => Promise<boolean>;
}

export class GateDecisionModel {
  note = $state('');
  needNote = $state(false);
  needPick = $state(false);
  busy = $state(false);
  selected = $state<string | null>(null);
  noteEl = $state<HTMLTextAreaElement | undefined>();
  #ctx: () => GateContext;
  #last: string | null = null;

  constructor(ctx: () => GateContext) {
    this.#ctx = ctx;
  }

  get options(): GateOption[] {
    const g = this.#ctx().gate;
    return (g.options.length > 0 ? g.options : DEFAULT_GATE_OPTIONS).filter((o) => roleOf(o.name) !== null);
  }

  follow(id: string): void {
    if (id === this.#last) return;
    this.#last = id;
    this.note = '';
    this.needNote = false;
    this.needPick = false;
    this.selected = null;
  }

  async decide(name: string): Promise<void> {
    if (this.busy) return;
    const decision = decisionFor(name);
    const comment = noteToComment(this.note);
    if (decision === 'request_changes' && comment === undefined) {
      this.needNote = true;
      this.noteEl?.focus();
      return;
    }
    // A Request-changes note was written (or this is not a Request changes): only then is the
    // needs-a-note error answered. An Approve after it leaves the error standing — the server's
    // refusal and the local validation are two facts, shown together (Card-States E).
    if (comment !== undefined) this.needNote = false;
    this.needPick = false;
    this.busy = true;
    try {
      const { boardId, gate, onResponse } = this.#ctx();
      const res = await resolveGate(boardId, gate.id, decision, comment, gate.approvalSubject);
      if (await onResponse(decision, res)) {
        this.note = '';
        this.selected = null;
      }
    } finally {
      this.busy = false;
    }
  }

  async submit(): Promise<void> {
    if (!this.selected) {
      this.needPick = true;
      return;
    }
    await this.decide(this.selected);
  }
}
