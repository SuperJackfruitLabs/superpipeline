/**
 * What a gate option means to a client, independent of its id (charter: gate.v2 §2). `choose` is
 * what an ordinary question's option means; a gate's `optionMeaning` never returns it today.
 */
export type GateOptionMeaning = 'approve' | 'reject' | 'revise' | 'choose' | 'defer';

/** How far an approving or rejecting answer reaches (charter: strict decisions bind their subject §2). */
export type OptionScope = 'once' | 'run' | 'always';

/**
 * A choice presented to a human — at an approval gate, or on an agent's elicitation (HumanLayer-style
 * options, docs/08 §6). A gate is an elicitation with a `select` signal, so both use one shape.
 */
export interface GateOption {
  name: string;
  title: string;
  promptFill?: string;
  interactive?: boolean;
  /** One line saying what choosing this option does; printed under the option by some vibes. */
  description?: string;
  /** Who may choose it: a workspace owner or admin only (strict "Always allow", 2026-10-28). The
   * board hides it from everyone else and refuses their answer. */
  requires?: 'workspace-admin';
  /** What choosing it means, when the poster said so (charter: strict decisions bind their
   * subject §7). Absent, an ordinary question's option is a choice. */
  meaning?: GateOptionMeaning;
  /** How far it reaches, when the poster said so. */
  scope?: OptionScope;
}
