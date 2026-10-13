<!-- apps/web/src/lib/components/parts/MoveMenu.svelte -->
<script lang="ts">
  /**
   * "Move to…": every stage, the current one marked "here" and not choosable. Opens with focus on
   * the first choosable stage; arrows move, Escape or a click elsewhere closes. The caller owns the
   * trigger button and puts focus back on it.
   */
  import { onMount } from 'svelte';

  let {
    items, onpick, onclose, trigger, label = 'Move to', heading = 'Move to…', class: klass = 'menu',
  }: {
    items: Array<{ key: string; name: string; here: boolean }>;
    onpick: (key: string) => void;
    onclose: () => void;
    trigger?: HTMLElement;
    label?: string;
    heading?: string;
    class?: string;
  } = $props();

  let root: HTMLDivElement | undefined = $state();
  const buttons = (): HTMLButtonElement[] => [...(root?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];

  onMount(() => {
    buttons().find((b) => b.getAttribute('aria-disabled') !== 'true')?.focus();
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (root && !root.contains(t) && !trigger?.contains(t)) onclose();
    };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  });

  function onkeydown(e: KeyboardEvent): void {
    const list = buttons();
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onclose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus(); }
  }
</script>

<div bind:this={root} class={klass} role="menu" aria-label={label} tabindex="-1" {onkeydown}>
  <p class="menu__h">{heading}</p>
  {#each items as it (it.key)}
    <button type="button" role="menuitem" aria-disabled={it.here ? 'true' : undefined} onclick={() => { if (!it.here) onpick(it.key); }}>{it.name}<small>{it.here ? 'here' : ''}</small></button>
  {/each}
</div>
