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
}
