<!-- apps/web/src/lib/components/card/phone/PhoneRuns.svelte -->
<script lang="ts">
  /** Session activity: the grant line, one disclosure per run (newest open), the tool-call toggle. */
  import type { CardModel } from '../card-model.svelte';
  import type { PhoneCardView } from './phone-card-words';
  import HandoffView from '../HandoffView.svelte';
  let { view, model }: { view: PhoneCardView; model: CardModel } = $props();
  /** What the run handed on, when it is a document (drawn as the drawer draws it). */
  const handedOn = (runId: string): Record<string, unknown> | null => {
    const h = model.stageByRun?.get(runId)?.handoff;
    return h && typeof h === 'object' && Object.keys(h).length ? (h as Record<string, unknown>) : null;
  };
</script>

{#if view.grantLine}<p class="muted small">{view.grantLine}</p>{/if}
<div class="runs">
  {#each view.runs as r (r.key)}
    <details class="run" open={r.open}>
      <summary><span class="rt">{r.title}</span><span class="rm">{r.meta}</span></summary>
      <ol class="ev">{#each r.rows as e (e.key)}<li><span class="evt">{e.verb}</span><span>{e.body}</span><span class="tm">{e.time}</span></li>{/each}</ol>
      {#if handedOn(r.key)}<HandoffView handoff={handedOn(r.key)} testid="handed-on-{r.key}" />{/if}
    </details>
  {/each}
</div>
<button class="lnk" type="button" aria-pressed={model.showToolCalls} onclick={() => (model.showToolCalls = !model.showToolCalls)}>{model.showToolCalls ? 'Hide tool calls' : 'Show tool calls'}</button>
