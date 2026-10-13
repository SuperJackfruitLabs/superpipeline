<script lang="ts">
  /**
   * "Add label": a plain listbox popover (D-21). It stays open while you pick several and closes
   * on Escape. That Escape stops here, so it never reaches the dialog and closes only the picker.
   */
  import { tick } from 'svelte';
  import type { Label } from '$lib/api';
  import Icon from '$lib/components/parts/Icon.svelte';

  let { labels, chosen, onadd }: { labels: Label[]; chosen: string[]; onadd: (id: string) => void } = $props();
  let open = $state(false);
  let active = $state(0);
  let list = $state<HTMLDivElement | null>(null);
  let trigger = $state<HTMLButtonElement | null>(null);
  /** Where the list hangs (#2): fixed to the viewport under its trigger, or over it when there is more room above; never past an edge. */
  let place = $state('');
  const EDGE = 8;
  function measure(): void {
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 4 - EDGE;
    const above = r.top - 4 - EDGE;
    const want = Math.min(280, list?.scrollHeight ?? 280);
    const down = below >= want || below >= above;
    const h = Math.max(88, Math.min(280, down ? below : above));
    const x = Math.max(EDGE, Math.min(r.left, window.innerWidth - 240 - EDGE));
    const y = down ? r.bottom + 4 : r.top - 4 - Math.min(h, want);
    place = `--_pk-x: ${Math.round(x)}px; --_pk-y: ${Math.round(y)}px; --_pk-h: ${Math.round(h)}px`;
  }
  $effect(() => {
    if (!open) return;
    const again = () => measure();
    window.addEventListener('resize', again);
    window.addEventListener('scroll', again, true);
    return () => { window.removeEventListener('resize', again); window.removeEventListener('scroll', again, true); };
  });
  const options = $derived(labels.filter((l) => !chosen.includes(l.id)).sort((a, b) => a.name.localeCompare(b.name)));

  async function show(): Promise<void> {
    measure();
    open = true;
    active = 0;
    await tick();
    measure();
    list?.focus({ preventScroll: true });
  }
  async function pick(id: string): Promise<void> {
    onadd(id);
    active = 0;
    await tick();
    list?.focus({ preventScroll: true }); // the picked option is gone; keep focus (and Escape) inside the picker
  }
  function onkey(e: KeyboardEvent): void {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); open = false; trigger?.focus(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, options.length - 1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); return; }
    if (e.key === 'Enter' && options[active]) { e.preventDefault(); e.stopPropagation(); void pick(options[active]!.id); }
  }
</script>

<button class="nc-addlabel" type="button" bind:this={trigger} aria-haspopup="listbox" aria-expanded={open} onclick={() => void show()}><Icon name="plus" size={14} /> Add label</button>
{#if open}
  <div class="nc-picker" role="listbox" aria-label="Labels" tabindex="-1" bind:this={list} onkeydown={onkey} style={place}
    aria-activedescendant={options[active] ? `nc-lbl-${options[active]!.id}` : undefined}>
    {#each options as l, i (l.id)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div id="nc-lbl-{l.id}" role="option" aria-selected={i === active} tabindex="-1" onclick={() => void pick(l.id)}>{l.name}</div>
    {:else}
      <p class="nc-picker__empty">No more labels.</p>
    {/each}
  </div>
{/if}
