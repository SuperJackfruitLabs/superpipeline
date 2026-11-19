<script lang="ts">
  /**
   * "on Developer Experience ⌄": the one board control form. In the composer it picks the board the
   * card goes to from a plain listbox (D-21) and does not navigate; given `onopen` (the board
   * switcher's raised copy of the shell's control), a click calls that instead of opening its list.
   */
  import { tick } from 'svelte';
  import { app } from '$lib/stores/app.svelte';
  import Icon from '$lib/components/parts/Icon.svelte';

  let { boardId, boardName, onpick, onopen, lead = 'on', class: extra = '' }: {
    boardId: string | null;
    boardName: string;
    onpick?: (id: string) => void;
    onopen?: () => void;
    /** The word before the name; '' for none. */
    lead?: string;
    class?: string;
  } = $props();
  let open = $state(false);
  let list = $state<HTMLDivElement | null>(null);
  let trigger = $state<HTMLButtonElement | null>(null);

  async function show(): Promise<void> {
    open = !open;
    await tick();
    list?.focus();
  }
  function choose(id: string): void {
    open = false;
    trigger?.focus();
    if (id !== boardId) onpick?.(id);
  }
  function onkey(e: KeyboardEvent): void {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); open = false; trigger?.focus(); }
  }
</script>

<button class="nc-board {extra}" type="button" bind:this={trigger} aria-haspopup="listbox" aria-label="Board: {boardName}. Change board" onclick={() => (onopen ? onopen() : void show())}>{lead ? `${lead} ` : ''}<span class="nc-board__name">{boardName}</span> <Icon name="chev" size={16} /></button>
{#if open}
  <div class="nc-picker" role="listbox" aria-label="Boards" tabindex="-1" bind:this={list} onkeydown={onkey}>
    {#each app.boards as b (b.id)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div role="option" aria-selected={b.id === boardId} tabindex="-1" onclick={() => choose(b.id)}>{b.name}</div>
    {/each}
  </div>
{/if}
