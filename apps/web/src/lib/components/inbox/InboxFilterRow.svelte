<!-- apps/web/src/lib/components/inbox/InboxFilterRow.svelte -->
<script lang="ts">
  /**
   * The Inbox's filter row (rule 8), revealed under the tabs by the Filter control and inert while
   * shut: find, one chip per group (pressed narrows to it), Agent, Label and Priority menus and the
   * sort. Every field is `InboxFilters`; the Filter control counts the ones that differ from default.
   */
  import { Button, Menu, type MenuItem } from '@superjackfruitlabs/vibekit-ui';
  import type { InboxFilters, InboxSort } from './inbox-filters.svelte';
  import type { InboxGroup, InboxGroupKey } from './inbox-groups';
  import { GROUP_CHIP } from './inbox-words';

  let { filters, groups, choices, id }: {
    filters: InboxFilters;
    /** The groups before filtering: one chip each, with its count. */
    groups: InboxGroup[];
    choices: { agents: { id: string; name: string }[]; labels: { id: string; name: string }[]; priorities: number[] };
    id: string;
  } = $props();

  const ANY = 'any';
  const SORTS: { value: InboxSort; label: string }[] = [
    { value: 'oldest', label: 'Oldest first' }, { value: 'newest', label: 'Newest first' }, { value: 'priority', label: 'Highest priority first' },
  ];
  const pick = (radio: string, value: string | null, options: { value: string; label: string }[], set: (v: string | null) => void): MenuItem[] => [
    { radio, value: value ?? ANY, options: [{ value: ANY, label: 'Any' }, ...options], onvaluechange: (v) => set(v === ANY ? null : v) },
  ];
  const nameOf = (list: { id: string; name: string }[], v: string | null) => (v === null ? 'any' : (list.find((x) => x.id === v)?.name ?? 'any'));
  const toggle = (key: InboxGroupKey) => { filters.group = filters.group === key ? null : key; };
</script>

{#snippet menu(label: string, shown: string, items: MenuItem[])}
  <Menu {label} {items} width={260} align="start">
    {#snippet trigger(props)}<button {...props} type="button" class="vk-button vk-button--ghost vk-button--sm ib-menu">{shown}</button>{/snippet}
  </Menu>
{/snippet}

<div class="vk-reveal ib-filters" data-open={filters.open ? 'true' : 'false'} {id}>
  <div inert={!filters.open}>
    <div class="ib-filters__row" role="group" aria-label="Filter the cards that need you">
      <label class="ib-find"><span class="vk-visually-hidden">Find a card in your inbox</span><input type="search" class="ib-find__input" placeholder="Find a card in your inbox" bind:value={filters.find} /></label>
      {#each groups as g (g.key)}
        <Button variant="ghost" size="sm" pressed={filters.group === g.key} onclick={() => toggle(g.key)}>{GROUP_CHIP[g.key]} <span class="vk-tabs__count">{g.items.length}</span></Button>
      {/each}
      <span class="ib-filters__break" aria-hidden="true"></span>
      {@render menu('Agent', `Agent · ${nameOf(choices.agents, filters.agent)}`, pick('Agent', filters.agent, choices.agents.map((a) => ({ value: a.id, label: a.name })), (v) => (filters.agent = v)))}
      {@render menu('Label', `Label · ${nameOf(choices.labels, filters.label)}`, pick('Label', filters.label, choices.labels.map((l) => ({ value: l.id, label: l.name })), (v) => (filters.label = v)))}
      {@render menu('Priority', `Priority · ${filters.priority === null ? 'any' : `P${filters.priority}`}`, pick('Priority', filters.priority === null ? null : String(filters.priority), choices.priorities.map((p) => ({ value: String(p), label: `P${p}` })), (v) => (filters.priority = v === null ? null : Number(v))))}
      <span class="ib-filters__sort">
        {@render menu('Sort', SORTS.find((x) => x.value === filters.sort)?.label ?? 'Oldest first', [{ radio: 'Sort', value: filters.sort, options: SORTS, onvaluechange: (v) => (filters.sort = v as InboxSort) }])}
      </span>
      {#if filters.active > 0}<Button variant="text" size="sm" onclick={() => filters.clear()}>Clear filters</Button>{/if}
    </div>
  </div>
</div>
