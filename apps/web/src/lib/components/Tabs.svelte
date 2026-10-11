<script lang="ts">
  /**
   * The WAI-ARIA tabs pattern: a labelled tablist, roving tabindex, Left/Right/Home/End. Every
   * panel is rendered, from its own snippet, and the inactive ones are `hidden`: nothing leaves
   * the DOM, so a layout can put each card section in exactly one panel without a conditional.
   */
  import type { Snippet } from 'svelte';

  let { label, tabs, active = $bindable() }: {
    label: string;
    tabs: Array<{ id: string; label: string; panel: Snippet }>;
    active: string;
  } = $props();

  const uid = $props.id();
  const tabId = (id: string) => `${uid}-tab-${id}`;
  const panelId = (id: string) => `${uid}-panel-${id}`;
  const buttons: Record<string, HTMLButtonElement | undefined> = {};

  function go(i: number) {
    const t = tabs[(i + tabs.length) % tabs.length];
    active = t.id;
    buttons[t.id]?.focus();
  }
  function key(e: KeyboardEvent, i: number) {
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    go(to);
  }
</script>

<div role="tablist" aria-label={label} class="border-border flex flex-wrap gap-x-1 border-b">
  {#each tabs as t, i (t.id)}
    <button type="button" role="tab" id={tabId(t.id)} aria-selected={active === t.id} aria-controls={panelId(t.id)} tabindex={active === t.id ? 0 : -1}
      bind:this={buttons[t.id]} onclick={() => (active = t.id)} onkeydown={(e) => key(e, i)}
      class="tap -mb-px border-b-2 px-3 text-sm {active === t.id ? 'border-foreground font-semibold' : 'text-muted-foreground border-transparent'}">{t.label}</button>
  {/each}
</div>
{#each tabs as t (t.id)}
  <div role="tabpanel" id={panelId(t.id)} aria-labelledby={tabId(t.id)} hidden={active !== t.id} class="space-y-5 pt-4">
    {@render t.panel()}
  </div>
{/each}
