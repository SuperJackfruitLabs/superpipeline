<!-- apps/web/src/lib/components/inbox/InboxGroup.svelte -->
<script lang="ts">
  /**
   * One group of what the person must do (rule 4): its header and count, the one line that says
   * what the group is for, the group's actions where one applies (Move all…, Staff an agent), the
   * rows with one verb each, and "Show N more" past a page (rule 7). Rows enter, leave and move with
   * vibekit's motion (rule 9); the count ticks and bumps when it changes.
   */
  import { Button, LoadMore, Menu, SectionHeader } from '@superjackfruitlabs/vibekit-ui';
  import { bumpOnChange, countUp, fade, flip, rise } from '@superjackfruitlabs/vibekit-ui/motion';
  import type { NeedRow } from '../operate/operate-types';
  import { moveOptionLabel, RESUME_LABEL, resumeOptions } from '../operate/operate-words';
  import type { InboxGroup } from './inbox-groups';
  import type { InboxStore } from './inbox-model.svelte';
  import { commonTargets, rowMoves, type InboxUi } from './inbox-ui.svelte';
  import InboxRow from './InboxRow.svelte';
  import { GROUP_PAGE, moveAllLabel, RESUME_AT, SEND_BACK, showMore, STAFF_LABEL } from './inbox-words';

  let { group, n, rows, store, ui }: { group: InboxGroup; n: number; rows: Map<string, NeedRow>; store: InboxStore; ui: InboxUi } = $props();

  let shown = $state(GROUP_PAGE);
  const total = $derived(group.items.length);
  const page = $derived(group.items.slice(0, shown));
  const need = (cardId: string) => rows.get(cardId);
  const groupRows = $derived(group.items.map((i) => need(i.cardId)).filter((r): r is NeedRow => !!r));
  const targets = $derived(group.groupActions.includes('move-all') ? commonTargets(groupRows) : []);
  const cards = (k: number) => `${k} ${k === 1 ? 'card' : 'cards'}`;
  /** A row's facts without its age (which moves every minute): the flash follows real changes. */
  const version = (r: NeedRow | undefined) => (r ? `${r.card.currentStageKey}|${r.card.state}|${r.card.stateSince ?? ''}|${r.item.headline}|${r.item.detail ?? ''}` : '');
  let root = $state<HTMLElement | null>(null);
</script>

{#snippet count()}<span class="ib-count" use:countUp={{ value: total, format: cards }} use:bumpOnChange={total}></span>{/snippet}

{#snippet resumeForm(row: NeedRow)}
  {@const id = row.item.cardId}
  <form class="ib-resume" aria-label="Resume {row.agentName ?? 'this card'}" onsubmit={(e) => { e.preventDefault(); void ui.send(row); }}>
    <label class="ib-field">{RESUME_AT}<select class="ib-select" id="resume-at-{id}" bind:value={ui.resumeAt}>{#each resumeOptions(row.stages, row.item.stageKey) as o (o.key)}<option value={o.key}>{o.label}</option>{/each}</select></label>
    <label class="ib-field">{RESUME_LABEL}<textarea class="ib-textarea" bind:value={ui.text}></textarea></label>
    <div class="ib-resume__acts">
      <Button type="submit" aria-disabled={ui.canSend ? 'false' : 'true'}>{SEND_BACK}</Button>
      <Button variant="quiet" onclick={() => ui.cancel()}>Cancel</Button>
    </div>
  </form>
{/snippet}

<section class="ib-group" id="ib-g-{group.key}" aria-labelledby="ib-g-{group.key}-h" bind:this={root}>
  <div class="ib-group__h" id="ib-g-{group.key}-h"><SectionHeader {n} level={3} title={group.title} meta={count} /></div>
  <p class="ib-why">{group.explanation}</p>
  {#if group.groupActions.length > 0}
    <div class="ib-groupact">
      {#if targets.length > 0}
        <Menu label={moveAllLabel(total)} items={targets.map((name) => ({ label: name, onselect: () => void ui.moveAll(groupRows, name) }))} width={280} align="start">
          {#snippet trigger(props)}<button {...props} type="button" class="vk-button vk-button--secondary">{moveAllLabel(total)}</button>{/snippet}
        </Menu>
      {/if}
      {#if group.groupActions.includes('staff')}<Button variant="quiet" href="/crew/capabilities">{STAFF_LABEL}</Button>{/if}
    </div>
    {#if ui.moveAllNote}<p class="ib-row__refused" role="alert">{ui.moveAllNote}</p>{/if}
  {/if}
  <ul class="ib-rows">
    {#each page as item (item.id)}
      {@const row = need(item.cardId)}
      <li class="ib-li" in:rise out:fade animate:flip>
        <InboxRow
          {item} {group}
          who={row?.agentName ? { name: row.agentName, iconUrl: row.iconUrl } : null}
          href={store.cardHref(item.cardId, item.boardId)}
          version={version(row)}
          onopen={() => store.open(item.cardId, item.boardId)}
          onverb={() => { if (group.key === 'resume') { if (row) void ui.openResume(row); } else store.open(item.cardId, item.boardId); }}
          moves={row ? rowMoves(row).map((s) => ({ key: s.key, label: moveOptionLabel('daylight', s, store.agents) })) : []}
          onmove={(key) => { if (row) void ui.move(row, key); }}
          refusal={ui.refusals[item.cardId] ?? null}
          resuming={ui.resuming === item.cardId}
          selected={ui.selected === item.id}
          moveOpen={ui.moveOpen === item.id}
          onmoveopen={(o) => (ui.moveOpen = o ? item.id : ui.moveOpen === item.id ? null : ui.moveOpen)}
        >{#if row && ui.resuming === item.cardId}{@render resumeForm(row)}{/if}</InboxRow>
      </li>
    {/each}
  </ul>
  {#if total > GROUP_PAGE}
    <LoadMore {shown} {total} label={showMore(Math.min(GROUP_PAGE * 4, total - shown))} onmore={() => { shown = Math.min(total, shown + GROUP_PAGE * 4); }} focusTarget={(i) => root?.querySelectorAll<HTMLElement>('.ib-row__t a')[i]} />
  {/if}
</section>
