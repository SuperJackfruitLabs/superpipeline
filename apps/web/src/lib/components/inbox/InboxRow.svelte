<!-- apps/web/src/lib/components/inbox/InboxRow.svelte -->
<script lang="ts">
  /**
   * One card that needs you (rule 3): the agent's face, the title (opens the card), one meta line
   * (state, board, who did what where, how long), the agent's own words behind "What it said", and
   * the group's one verb: Review / Answer open the card, Resume opens the note form under the row,
   * Raise the cap opens the board's spend, Move is a quiet menu of the stages an agent works. A row
   * whose facts change flashes once (`version`).
   */
  import type { Snippet } from 'svelte';
  import { Button, Face, Menu, StateLabel } from '@superjackfruitlabs/vibekit-ui';
  import { flashOnChange } from '@superjackfruitlabs/vibekit-ui/motion';
  import type { AttentionItem } from '$lib/components/attention/attention';
  import BoardChip from './BoardChip.svelte';
  import type { InboxGroup } from './inbox-groups';
  import { ROW_STATE, rowMeta, SAID_LABEL } from './inbox-words';

  let { item, group, who, href, version, onverb, onopen, moves = [], onmove, refusal = null, resuming = false, children }: {
    item: AttentionItem;
    group: InboxGroup;
    /** The agent that last worked the card; null for a card nobody holds. */
    who: { name: string; iconUrl: string | null } | null;
    /** The card's address. */
    href: string;
    /** Changes when the row's facts do: the row flashes once. */
    version: string;
    /** The group's verb on this row. */
    onverb(): void;
    /** The title: open the card. */
    onopen(): void;
    /** Unclaimed: the stages it can move to. */
    moves?: { key: string; label: string }[];
    onmove?(key: string): void;
    refusal?: string | null;
    /** Resume's form is open under this row. */
    resuming?: boolean;
    /** What opens under the row: Resume's note form. */
    children?: Snippet;
  } = $props();

  const state = $derived(ROW_STATE[group.key]);
  const go = (e: MouseEvent, f: () => void) => { e.preventDefault(); f(); };
</script>

<article class="ib-row" data-row={item.id} data-attention-row={item.kind} aria-labelledby="ib-t-{item.id}" use:flashOnChange={version}>
  <span class="ib-row__face" aria-hidden="true">{#if who}<Face id={who.name} label={who.name} mood="needs" size={32} src={who.iconUrl ?? undefined} />{/if}</span>
  <div class="ib-row__body">
    <h4 class="ib-row__t" id="ib-t-{item.id}"><a {href} onclick={(e) => go(e, onopen)}>{item.title}</a></h4>
    <p class="ib-row__meta"><StateLabel state={state.state} label={state.label} /> <BoardChip name={item.boardName ?? ''} /> {rowMeta(item, who?.name ?? null)}</p>
    {#if item.detail}
      <details class="ib-said"><summary class="ib-said__s">{SAID_LABEL}</summary><p class="ib-said__p">{item.detail}</p></details>
    {/if}
    {#if refusal}<p class="ib-row__refused" role="alert">{refusal}</p>{/if}
    {@render children?.()}
  </div>
  <div class="ib-row__act">
    {#if group.key === 'review' || group.key === 'answer'}
      <Button {href} onclick={(e: MouseEvent) => go(e, onverb)}>{group.verb}</Button>
    {:else if group.key === 'resume'}
      <!-- While the note form is open its Send back to work is the row's one primary (rule 3); Cancel closes it. -->
      {#if !resuming}<Button aria-expanded="false" onclick={onverb}>{group.verb}</Button>{/if}
    {:else if group.key === 'budget'}
      <Button href="/b/{item.boardId}/operate/telemetry">{group.verb}</Button>
    {:else if moves.length > 0}
      <Menu label="Move {item.title}" items={moves.map((m) => ({ label: m.label, onselect: () => onmove?.(m.key) }))} width={300}>
        {#snippet trigger(props)}<button {...props} type="button" class="vk-button vk-button--quiet">{group.verb}</button>{/snippet}
      </Menu>
    {/if}
  </div>
</article>
