<!-- apps/web/src/lib/components/operate/BudgetCapsStudio.svelte -->
<script lang="ts">
  import { BudgetCapsModel } from './budget-caps.svelte';
  let { suffix = '1', no = '07' }: { suffix?: string; no?: string } = $props();
  const model = new BudgetCapsModel();
</script>

<section class="ar-sec" id="caps{suffix}" aria-labelledby="sp-cap{suffix}">
  <div class="hd"><span class="no">{no}</span><h2 id="sp-cap{suffix}">Budget caps</h2><span class="r">{model.status}</span></div>
  <form class="sp-cap" aria-label="Budget caps" aria-busy={model.busy} onsubmit={(e) => { e.preventDefault(); void model.save(); }}>
    <div class="ar-field"><label for="cap-b{suffix}">Board cap</label><div class="sp-money"><span aria-hidden="true">$</span><input class="ar-in" id="cap-b{suffix}" type="text" placeholder="none" inputmode="decimal" bind:value={model.boardCap} /></div>{#if model.boardError}<p class="ar-hint" role="alert">{model.boardError}</p>{/if}</div>
    <div class="ar-field"><label for="cap-c{suffix}">Card cap</label><div class="sp-money"><span aria-hidden="true">$</span><input class="ar-in" id="cap-c{suffix}" type="text" placeholder="none" inputmode="decimal" bind:value={model.cardCap} /></div>{#if model.cardError}<p class="ar-hint" role="alert">{model.cardError}</p>{/if}</div>
    <div class="row"><button class="ar-btn" type="submit" aria-disabled={model.busy ? 'true' : undefined}>{model.busy ? 'Saving…' : 'Save caps'}</button></div>
  </form>
  <span class="sr" role="status">{model.busy ? 'Saving the caps…' : ''}</span>
  {#if model.error}<p class="ar-hint" role="alert">{model.error}</p>{/if}
  <p class="sp-note">The card cap draws the cost bar on each card. A card over its cap shows in Needs you. The same caps are editable from Operate → Spend.</p>
</section>
