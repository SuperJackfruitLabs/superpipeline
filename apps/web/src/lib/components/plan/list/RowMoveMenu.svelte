<!-- apps/web/src/lib/components/plan/list/RowMoveMenu.svelte -->
<script lang="ts">
  /** Daylight's row "Move": a menu under the button, every stage, the card's own marked "here". */
  import { Button } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import MoveMenu from '$lib/components/parts/MoveMenu.svelte';

  let { card, stages, onMove, open = false, onOpen }: {
    open?: boolean;
    onOpen?: (open: boolean) => void;
    card: { id: string; title: string; currentStageKey: string };
    stages: Array<{ key: string; name: string }>;
    onMove: (cardId: string, stageKey: string) => Promise<void>;
  } = $props();

  let trigger: HTMLButtonElement | undefined = $state();

  function close(): void { onOpen?.(false); trigger?.focus(); }
  async function pick(key: string): Promise<void> {
    onOpen?.(false);
    await onMove(card.id, key);
    trigger?.focus();
  }
</script>

<Button variant="quiet" aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'} onclick={(e: MouseEvent) => { trigger = e.currentTarget as HTMLButtonElement; if (open) close(); else onOpen?.(true); }}>{#snippet icon()}<LineIcon name="move" />{/snippet}Move</Button>
{#if open}<MoveMenu {trigger} items={stages.map((s) => ({ key: s.key, name: s.name, here: s.key === card.currentStageKey }))} onpick={pick} onclose={close} />{/if}

