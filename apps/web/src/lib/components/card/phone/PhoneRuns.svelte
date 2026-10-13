<!-- apps/web/src/lib/components/card/phone/PhoneRuns.svelte -->
<script lang="ts">
  /** Session activity: the grant line, one expander per run (newest open), each with its own tool-call toggle and per-call Details. */
  import type { CardModel } from '../card-model.svelte';
  import { eventRows, type PhoneCardView } from './phone-card-words';
  import HandoffView from '../HandoffView.svelte';
  import ToolCallDetails from '../ToolCallDetails.svelte';
  let { view, model }: { view: PhoneCardView; model: CardModel } = $props();
  const uid = $props.id();
  /** Per run, like the drawers (X1–X3): which runs are open, which show their tool calls. */
  let open = $state<Record<string, boolean>>({});
  let tools = $state<Record<string, boolean>>({});
  const acts = (runId: string) => model.activityGroups.find((g) => g.runId === runId);
  /** What the run handed on, when it is a document (drawn as the drawer draws it). */
  const handedOn = (runId: string): Record<string, unknown> | null => {
    const h = model.stageByRun?.get(runId)?.handoff;
    return h && typeof h === 'object' && Object.keys(h).length ? (h as Record<string, unknown>) : null;
  };
</script>

{#if view.grantLine}<p class="muted small">{view.grantLine}</p>{/if}
<div class="runs">
  {#each view.runs as r (r.key)}
    {@const isOpen = open[r.key] ?? r.open}
    {@const shown = tools[r.key] ?? false}
    {@const g = acts(r.key)}
    <div class="run">
      <button class="runhead" type="button" data-attempt-head={r.key} aria-expanded={isOpen} aria-controls={isOpen ? `${uid}-${r.key}` : undefined} onclick={() => (open = { ...open, [r.key]: !isOpen })}><span class="rt">{r.title}</span><span class="rm">{r.meta}</span></button>
      {#if isOpen}
        <div id="{uid}-{r.key}">
          <ol class="ev">{#each eventRows(g?.activities ?? [], model.lead?.sentence ?? null, shown) as e (e.key)}<li><span class="evt">{e.verb}</span><span>{e.body}<ToolCallDetails parameter={e.parameter} result={e.result} cls="pdet" /></span><span class="tm">{e.time}</span></li>{/each}</ol>
          {#if (g?.counts.action ?? 0) > 0}<button class="lnk" type="button" data-attempt-tools={r.key} aria-pressed={shown} onclick={() => (tools = { ...tools, [r.key]: !shown })}>{shown ? 'Hide tool calls' : 'Show tool calls'}</button>{/if}
          {#if handedOn(r.key)}<HandoffView handoff={handedOn(r.key)} testid="handed-on-{r.key}" />{/if}
        </div>
      {/if}
    </div>
  {/each}
</div>
