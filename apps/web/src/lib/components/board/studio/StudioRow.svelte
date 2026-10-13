<!-- apps/web/src/lib/components/board/studio/StudioRow.svelte -->
<script lang="ts">
  import type { Stage } from '$lib/api';
  import { app } from '$lib/stores/app.svelte';
  import Icon from '$lib/components/parts/Icon.svelte';
  import FaceSvg from '$lib/components/parts/FaceSvg.svelte';
  import CardMoveMenu from '../CardMoveMenu.svelte';
  import { cardKeys, openLabel } from '../open-label';
  import { dueShort, moreLabelsTitle } from '../board-words';
  import type { CardSummary } from '../card-summary';
  import { pad2, rampAria, rowAgent, rowState } from './studio-prose';

  let { s, stages, stageNames, selected, anchor, onSelect }: {
    s: CardSummary; stages: Stage[]; stageNames: string[]; selected: boolean; anchor: string | undefined; onSelect: () => void;
  } = $props();
  let moveOpen = $state(false);
  let menu = $state<ReturnType<typeof CardMoveMenu>>();
  const agent = $derived(rowAgent(s));
  const st = $derived(rowState(s));
  const chip = $derived(Math.min(s.stageIndex + 1, 7));
</script>

<tr class:sel={selected} aria-selected={selected ? 'true' : undefined} id={anchor} data-card-id={s.id}>
  <td><span class="ix">{pad2(s.ix)}</span></td>
  <td><button class="ttl" type="button" aria-label={openLabel({ title: s.title, stageName: s.stageName })} onfocus={onSelect} onclick={() => app.openCard(s.id)} onkeydown={(e) => cardKeys(e, { open: () => app.openCard(s.id), toggleMove: () => (moveOpen = !moveOpen), step: (d) => menu?.step(d) })}>{s.title}</button>{#if s.fnNumber}<sup class="fn">{s.fnNumber}</sup>{/if}{#if s.priority > 0 || s.labelsAll > 0 || s.firstRef || s.blocked || s.queuedBy}<div class="ar-facts">{#if s.priority > 0}<span class="p">P{s.priority}</span>{/if}{#each s.labels as l (l.id)}<span>{l.name}</span>{/each}{#if s.moreLabels > 0}<span title={moreLabelsTitle(s.moreLabels)}>+{s.moreLabels}</span>{/if}{#if s.firstRef}<span>{s.firstRef.title ?? s.firstRef.url}</span>{/if}{#if s.blocked}<span title="Blocked by another card. This card will not be claimed"><Icon name="lock" size={12} strokeWidth={1.75} />Blocked</span>{/if}{#if s.queuedBy}<span><FaceSvg name={s.queuedBy.name} mood="working" size={14} />asked by {s.queuedBy.name}</span>{/if}</div>{/if}</td>
  <td><span class="stg"><span class="chip c{chip}"></span>{s.stageName}</span><div style="margin-top: 6px;"><span class="ar-ramp" role="img" aria-label={rampAria(s, stageNames)}>{#each stageNames as _, k (k)}<i class="c{Math.min(k + 1, 7)}" class:on={k <= s.stageIndex}></i>{/each}</span></div></td>
  <td>{#if agent.kind === 'person'}<span class="ag"><span class="ar-ini" aria-hidden="true" style="width: 20px; height: 20px; font-size: 8px;">{agent.initials}</span><span>{#if agent.me}<span class="sr">{agent.name}, </span>{/if}{agent.text}</span></span>{:else if agent.kind === 'agent'}<span class="ag"><FaceSvg name={agent.name} mood={agent.mood} size={20} />{agent.name}</span>{:else}<span class="m">{agent.text}</span>{/if}</td>
  <td>{#if s.urgency === 'needs' && s.attemptCount > 1}<span class="m"><span class="m sig">{s.attemptCount}</span></span>{:else}<span class="m">{s.attemptCount}</span>{/if}</td>
  <td><span class="m">{s.urgency === 'done' ? '—' : s.ageShort}</span></td>
  <td>{#if s.dueAt && s.overdue}<span class="m sig">Overdue · {dueShort(s.dueAt)}</span>{:else if s.dueAt}<span class="m">{dueShort(s.dueAt)}</span>{:else}<span class="m">—</span>{/if}</td>
  <td><span class="ar-st" class:needs={st.needs}><span class="u {st.unit}"></span>{st.label}</span></td>
  <td class="mv"><button class="bd-move h44" type="button" aria-haspopup="menu" aria-expanded={moveOpen} aria-label="Move {s.title} to another stage" onclick={() => (moveOpen = !moveOpen)}><Icon name="move" size={14} strokeWidth={1.75} />Move</button><CardMoveMenu bind:this={menu} bind:open={moveOpen} card={s.card} {stages} bare /></td>
</tr>
