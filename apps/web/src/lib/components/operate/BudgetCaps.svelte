<!-- apps/web/src/lib/components/operate/BudgetCaps.svelte -->
<script lang="ts">
  import { Button } from '@superjackfruit/vibekit';
  import { BudgetCapsModel } from './budget-caps.svelte';
  let { suffix = '1' }: { suffix?: string } = $props();
  const model = new BudgetCapsModel();
</script>

<section class="panel" id="caps{suffix}" aria-labelledby="cap-h{suffix}">
  <div class="panel-head"><h2 class="t-h2" id="cap-h{suffix}">Budget caps</h2><span class={model.savedFlash ? 'saved' : 'unsaved'} style="margin-left: auto;">{model.status}</span></div>
  <div class="panel-body" style="display: flex; flex-direction: column; gap: var(--vk-space-3);">
    <form class="capform" aria-label="Budget caps" aria-busy={model.busy} onsubmit={(e) => { e.preventDefault(); void model.save(); }}>
      <div class="field">
        <label for="cap-b{suffix}">Board cap</label>
        <div class="money-in"><span>$</span><input class="input t-num" id="cap-b{suffix}" placeholder="none" inputmode="decimal" bind:value={model.boardCap} /></div>
        {#if model.boardError}<p class="hint" role="alert" style="color: var(--vk-color-signal-text);">{model.boardError}</p>{/if}
      </div>
      <div class="field">
        <label for="cap-c{suffix}">Card cap</label>
        <div class="money-in"><span>$</span><input class="input t-num" id="cap-c{suffix}" placeholder="none" inputmode="decimal" bind:value={model.cardCap} /></div>
        {#if model.cardError}<p class="hint" role="alert" style="color: var(--vk-color-signal-text);">{model.cardError}</p>{/if}
      </div>
      <Button variant="primary" class="btn-sm"  type="submit" aria-disabled={model.busy ? 'true' : undefined} data-busy={model.busy ? 'true' : undefined}>{model.busy ? 'Saving…' : 'Save caps'}</Button>
    </form>
  <span class="sr" role="status">{model.busy ? 'Saving the caps…' : ''}</span>
    {#if model.error}<p class="note" role="alert">{model.error}</p>{/if}
    <p class="hint">The card cap draws the cost bar on each card. A card over its cap shows in Needs you. The same caps are editable from Operate → Spend.</p>
  </div>
</section>
