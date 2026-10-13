// apps/web/src/lib/components/operate/budget-caps.svelte.ts
import { setBudget } from '$lib/api';
import { app } from '$lib/stores/app.svelte';
import { CAP_HINT_INVALID, capsStatus, parseCap } from './spend-format';

const asField = (n: number | null | undefined) => (n == null ? '' : n.toFixed(2));

export class BudgetCapsModel {
  boardCap = $state(asField(app.board?.usage.budgetUsd));
  cardCap = $state(asField(app.board?.usage.cardUsdCap));
  boardError = $state<string | null>(null);
  cardError = $state<string | null>(null);
  error = $state<string | null>(null);
  busy = $state(false);
  savedFlash = $state(false);

  status = $derived(this.savedFlash ? 'Caps saved' : capsStatus(app.board?.usage.budgetUsd ?? null, app.board?.usage.cardUsdCap ?? null));

  async save(): Promise<void> {
    if (this.busy) return;
    const b = parseCap(this.boardCap);
    const c = parseCap(this.cardCap);
    this.boardError = b === 'invalid' ? CAP_HINT_INVALID : null;
    this.cardError = c === 'invalid' ? CAP_HINT_INVALID : null;
    if (b === 'invalid' || c === 'invalid' || !app.boardId) return;
    this.busy = true;
    this.error = null;
    try {
      const res = await setBudget(app.boardId, { boardUsdCap: b, cardUsdCap: c });
      if (!res.ok) { this.error = `Could not save the caps (${res.status}). Nothing changed.`; return; }
      this.savedFlash = true;
      setTimeout(() => (this.savedFlash = false), 4000);
      await app.refresh();
    } finally { this.busy = false; }
  }
}
