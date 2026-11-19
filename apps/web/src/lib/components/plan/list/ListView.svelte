<!-- apps/web/src/lib/components/plan/list/ListView.svelte -->
<script lang="ts">
  /**
   * Plan · Boards, the List: one composition in every vibe (composition contract, Board's row and
   * rule 7). The board's top row (Board | List, Filter, what is shown, the attention line) carries
   * the List's two controls, Group by and Sort by, in every vibe; then one vibekit DataTable grouped
   * as chosen, "Show N more", the keyboard line and the footer. Each row has one action, Move.
   * J / K pick a row, ↵ opens it, M moves it, S cycles the sort, R the grouping (G is the shell's
   * G I / G P / G C chord, so the List leaves it alone). The vibe reaches the
   * table through vibekit's forms; no words differ between vibes.
   */
  import './list.css';
  import { DataTable, Face, LoadMore, StateLabel, type Column, type State } from '@superjackfruitlabs/vibekit-ui';
  import { untrack } from 'svelte';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import BoardTopRow from '$lib/components/board/BoardTopRow.svelte';
  import { attentionLine } from '$lib/components/board/board-words';
  import type { ListGroupBy } from './list-keys';
  import { GROUP_CYCLE, GROUPS, listCaption, nextInCycle, SORT_CYCLE, sortOptions, stateText } from './list-model';
  import { LIST_KEYS, keysText } from '$lib/keys';
  import KeysLine from '$lib/components/shell/KeysLine.svelte';
  import { groupLabel, listFoot, NO_MATCH, rowFacts } from './list-words';
  import { LIST_PAGE, ListUi } from './list-ui.svelte';
  import RowMoveMenu from './RowMoveMenu.svelte';
  import type { ListRow, ListSortKey, ListTone, ListViewProps } from './types';

  let p: ListViewProps = $props();
  const ui = untrack(() => p.ui) ?? new ListUi();
  const STATE: Record<ListTone, State> = { needs: 'needs', working: 'working', queued: 'resting', done: 'done', closed: 'resting' };
  let root = $state<HTMLElement | null>(null);

  /** The groups cut to the page: whole groups first, the last one partly, then "Show N more". */
  const total = $derived(p.groups.reduce((n, g) => n + g.rows.length, 0));
  const paged = $derived.by(() => {
    let left = ui.limit;
    return p.groups.flatMap((g) => {
      if (left <= 0) return [];
      const rows = g.rows.slice(0, left);
      left -= rows.length;
      return [{ label: groupLabel(g), count: g.rows.length, rows }];
    });
  });
  const flat = $derived(paged.flatMap((g) => g.rows));
  const shown = $derived(flat.length);
  const sorts = $derived(sortOptions(p.sort));

  // A regroup, a new sort or new filters start at the first page again.
  $effect.pre(() => { ui.pageFor(JSON.stringify([p.groupBy, p.sort, p.filters])); });

  $effect(() => {
    if (ui.selected !== null && !flat.some((r) => r.s.id === ui.selected)) ui.selected = null;
  });

  const columns: Column<ListRow>[] = [
    { key: 'priority', label: 'Priority', sortable: true, cell: priority },
    { key: 'title', label: 'Card', sortable: true, cell: title },
    { key: 'state', label: 'State', sortable: true, cell: state },
    { key: 'agent', label: 'Agent', sortable: true, cell: agent },
    { key: 'due', label: 'Due', sortable: true, cell: due },
    { key: 'cost', label: 'Cost', sortable: true, numeric: true, cell: cost },
    { key: 'move', label: 'Move', align: 'end', cell: move },
  ];

  function setSort(value: string): void {
    const o = sorts.find((x) => x.value === value);
    if (o) p.onSetSort(o.sort);
  }

  /** "Show the first": the first row that wants you, focused and in view. */
  function showFirst(): void {
    const first = flat.find((r) => r.state.needsYou);
    const link = first && root?.querySelector<HTMLElement>(`[data-card-open="${first.s.id}"]`);
    if (!link || !first) return;
    ui.selected = first.s.id;
    link.scrollIntoView?.({ block: 'center' });
    link.focus({ preventScroll: true });
  }

  /** Focus in a row (Tab, or the table's own J / K) selects it, so ↵ and M act on what has focus. */
  function onfocusin(e: FocusEvent): void {
    const id = (e.target as Element | null)?.closest('[data-row]')?.querySelector('[data-card-open]')?.getAttribute('data-card-open');
    if (id) ui.selected = id;
  }

  function select(step: 1 | -1): void {
    if (!shown) return;
    const i = flat.findIndex((r) => r.s.id === ui.selected);
    const next = flat[i === -1 ? 0 : Math.max(0, Math.min(shown - 1, i + step))];
    if (next) ui.selected = next.s.id;
    queueMicrotask(() => root?.querySelector('tr[aria-current="true"]')?.scrollIntoView?.({ block: 'nearest' }));
  }

  // The table is described by vibekit's own keys sentence (same words as the footer's keys line); the footer
  // line is the one people see, so the sentence takes vibekit's visually-hidden class and stays in the description.
  $effect(() => {
    if (!root) return;
    const hide = () => root?.querySelector('.vk-datatable__keys')?.classList.add('vk-visually-hidden');
    hide();
    const mo = new MutationObserver(hide);
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  });

  function onkeydown(e: KeyboardEvent): void {
    const t = e.target;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"]')) return;
    const row = flat.find((r) => r.s.id === ui.selected);
    switch (e.key) {
      case 'j': case 'J': if (!shown) return; select(1); break;
      case 'k': case 'K': if (!shown) return; select(-1); break;
      case 'Enter': if (!row || (t instanceof Element && t.closest('a, button'))) return; p.onOpen(row.s.id); break;
      case 'm': case 'M': if (!row) return; p.onOpenMoveDialog(row.s.id); break;
      case 's': case 'S': p.onSort(nextInCycle(SORT_CYCLE, p.sort.key)); break;
      case 'r': case 'R': p.onGroupBy(nextInCycle(GROUP_CYCLE, p.groupBy)); break;
      default: return;
    }
    e.preventDefault();
  }
</script>

<svelte:window {onkeydown} />

{#snippet tools()}
  <label class="lv-pick">Group by<select class="lv-select" value={p.groupBy} onchange={(e) => p.onGroupBy(e.currentTarget.value as ListGroupBy)}>{#each GROUPS as g (g.id)}<option value={g.id}>{g.label}</option>{/each}</select></label>
  <label class="lv-pick">Sort by<select class="lv-select" value={sorts.find((o) => o.selected)?.value} onchange={(e) => setSort(e.currentTarget.value)}>{#each sorts as o (o.value)}<option value={o.value}>{o.label}</option>{/each}</select></label>
{/snippet}

{#snippet priority(r: ListRow)}{#if r.priorityText}<span class={r.prioritySignal ? 'lv-pri lv-over' : 'lv-pri'}>{r.priorityText}</span>{:else}<span class="lv-muted" aria-label="No priority">—</span>{/if}{/snippet}
{#snippet title(r: ListRow)}
  {@const facts = rowFacts(r)}
  <a class="lv-title" href={r.href} data-card-open={r.s.id}>{r.s.title}</a>
  {#if facts.length || r.askedBy}
    <span class="lv-facts">{#each facts as f (f)}<span class="lv-fact">{f}</span>{/each}{#if r.askedBy}<span class="lv-asked"><Face id={r.askedBy.name} label={r.askedBy.name} mood="working" size={16} src={r.askedBy.iconUrl ?? undefined} />asked by {r.askedBy.name}</span>{/if}</span>
  {/if}
{/snippet}
{#snippet state(r: ListRow)}<StateLabel state={STATE[r.state.tone]} label={stateText(r.state)} />{/snippet}
{#snippet agent(r: ListRow)}{#if r.agent}<span class="lv-who"><Face id={r.agent.name} label={r.agent.name} mood={r.agent.mood} size={24} src={r.agent.iconUrl ?? undefined} />{r.agent.name}</span>{:else}<span class="lv-who lv-muted"><span class="lv-noface" aria-hidden="true"></span>{r.unclaimedWord}</span>{/if}{/snippet}
{#snippet due(r: ListRow)}{#if r.overdue}<span class={r.dueSignal ? 'lv-late lv-over' : 'lv-late'}><LineIcon name="overdue" size={14} />Overdue · {r.dueHuman}</span>{:else if r.dueHuman}{r.dueHuman}{:else}<span class="lv-muted" aria-label="No due date">—</span>{/if}{/snippet}
{#snippet cost(r: ListRow)}{#if r.costText}<span class:lv-over={r.costSignal}>{r.costText}</span>{:else}<span class="lv-muted" aria-label="No cost yet">—</span>{/if}{/snippet}
{#snippet move(r: ListRow)}<span class="lv-acts"><RowMoveMenu card={{ id: r.s.id, title: r.s.title, currentStageKey: r.s.stageKey }} stages={p.stages} onMove={p.onMove} open={ui.moveOpen === r.s.id} onOpen={(o) => (ui.moveOpen = o ? r.s.id : null)} /></span>{/snippet}
<!-- A board with no card at all: the top row's line says so; the table adds nothing. -->
{#snippet empty()}{#if p.hasCards}<p class="lv-empty">{NO_MATCH}</p>{/if}{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="lv" bind:this={root} {onfocusin}>
  <BoardTopRow filters={p.filters} attention={{ text: attentionLine(p.needsCount), needs: p.needsCount, onfirst: showFirst }} {tools} />
  <div class="lv-table">
    <DataTable label={listCaption(p.boardName, p.groupBy, p.sort)} {columns} rows={flat} groups={paged} rowKey={(r) => r.s.id} titleKey="title"
      selected={ui.selected ?? undefined} needs={(r) => r.state.needsYou} sort={{ key: p.sort.key, dir: p.sort.ascending ? 'asc' : 'desc' }}
      onsort={(k) => p.onSort(k as ListSortKey)} keys={keysText(LIST_KEYS)} {empty} />
  </div>
  {#if total > shown}
    <LoadMore {shown} {total} label="Show {Math.min(LIST_PAGE, total - shown)} more" onmore={() => { ui.limit += LIST_PAGE; }} />
  {/if}
  <p class="lv-foot">{#if total > 0}{listFoot(p.sort, p.emptyStages)} {/if}<KeysLine keys={LIST_KEYS} /></p>
</div>
