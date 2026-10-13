<!-- apps/web/src/lib/components/board/daylight/DlLane.svelte -->
<script lang="ts">
  import type { Stage } from '$lib/api';
  import { app } from '$lib/stores/app.svelte';
  import { columnDropTarget } from '$lib/dnd';
  import { IconButton } from '@superjackfruit/vibekit';
  import Icon from '$lib/components/parts/Icon.svelte';
  import type { BoardStage } from '../board-model';
  import type { CardSummary } from '../card-summary';
  import type { PeekController } from './peek-controller';
  import DlTile from './DlTile.svelte';

  let { stage, cards, stages, peekId, firstNeedsId, peek, style, onCollapse }: {
    stage: BoardStage; cards: CardSummary[]; stages: Stage[]; peekId: string | null; firstNeedsId: string | null;
    peek: PeekController; style?: string; onCollapse?: () => void;
  } = $props();
  let over = $state(false);
</script>

<section
  class="dl-lane"
  aria-label={stage.name}
  data-lane={stage.key}
  data-over={over || undefined}
  {style}
  use:columnDropTarget={{ stageKey: stage.key, onDrop: (cardId) => app.moveCard(cardId, stage.key), onOver: (o) => (over = o) }}
>
  <div class="dl-lanehead">
    <h2>
      <span>{stage.name}</span><span class="dl-count" aria-label="{stage.count} cards">{stage.count}</span>
      {#if stage.blocked > 0}<span class="dl-blocked" title="Blocked cards are skipped when agents claim work"><Icon name="blocked" size={14} strokeWidth={1.8} />{stage.blocked} blocked</span>{/if}
    </h2>
    <span class="dl-owner">{stage.ownerLong}</span>
    {#if onCollapse}<IconButton class="dl-collapse" icon="chevron-down" label="Collapse stage" onclick={onCollapse} />{/if}
  </div>
  {#if cards.length === 0}<p class="dl-owner">No cards in this stage.</p>{/if}
  {#each cards as s (s.id)}
    <DlTile {s} {stages} peekOpen={peekId === s.id} firstNeeds={s.id === firstNeedsId} {peek} />
  {/each}
</section>
