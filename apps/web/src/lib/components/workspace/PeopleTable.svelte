<!-- apps/web/src/lib/components/workspace/PeopleTable.svelte -->
<script lang="ts">
  /**
   * Crew's People tab: one table (person, email, role, actions). The role and Remove live under each
   * row's actions menu; the last owner can be neither demoted nor removed.
   */
  import { AgentName, Button, DataTable, LoadMore, Menu, type Column, type MenuItem } from '@superjackfruitlabs/vibekit-ui';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import type { Member, Role } from '$lib/api';
  import { PeopleModel } from './people-model.svelte';
  import { CREW_NEW_LABEL, onCrewNew, requestCrewNew } from './crew-new';
  import { CREW_EMPTY, CREW_FAILED, CREW_LOADING, initials, lastOwner, ROLE_LABEL, ROLE_ORDER, roleHelpTitle } from './workspace-words';
  import CrewLoad from './CrewLoad.svelte';
  import NewPersonDialog from './dialogs/NewPersonDialog.svelte';
  import { rowFocus } from '$lib/focus-row';

  const PAGE = 10;
  const model = new PeopleModel();
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
  let creating = $state(false);
  let limit = $state(PAGE);
  function openNew(): void { model.resetNew(); creating = true; }
  // What the New dialog just made is what the person wants to see: show every row.
  $effect(() => { if (model.lastAdded) limit = Infinity; });
  $effect(() => onCrewNew('people', openNew));

  const rows = $derived(model.members ?? []);
  const shown = $derived(rows.slice(0, limit));
  const nameOf = (m: Member) => m.name ?? m.email;

  function items(m: Member): MenuItem[] {
    const locked = lastOwner(m, rows);
    return [
      { heading: 'Role' },
      {
        radio: `Role of ${nameOf(m)}`, value: m.role,
        options: ROLE_ORDER.map((r) => ({ value: r, label: ROLE_LABEL[r], disabled: locked && r !== 'owner' })),
        onvaluechange: (v) => { if (v !== m.role) void model.change(m, v as Role); },
      },
      { separator: true },
      { label: 'Remove from workspace…', danger: true, disabled: locked, onselect: () => void model.remove(m) },
    ];
  }

  const columns: Column<Member>[] = [
    { key: 'who', label: 'Person', cell: who },
    { key: 'email', label: 'Email', cell: email },
    { key: 'role', label: 'Role', cell: role },
    { key: 'actions', label: 'Actions', align: 'end', cell: actions },
  ];
  /** The rows, for focus after "Show N more" (the first new row). */
  let rowsEl = $state<HTMLElement | null>(null);
</script>

{#snippet who(m: Member)}<span class="crew-who"><AgentName id={m.userId} name={nameOf(m)} initials={initials(nameOf(m))} size={32} />{#if model.isMe(m)}<span class="crew-you">you</span>{/if}</span>{/snippet}
{#snippet email(m: Member)}<span class="crew-email">{m.email}</span>{/snippet}
{#snippet role(m: Member)}<span title={roleHelpTitle(m.role)}>{ROLE_LABEL[m.role]}</span>{/snippet}
{#snippet actions(m: Member)}
  <Menu label="Actions for {nameOf(m)}" items={items(m)} width={260}>
    {#snippet trigger(props)}<button {...props} type="button" class="vk-button vk-button--quiet crew-act" aria-label="Actions for {nameOf(m)}"><LineIcon name="dots" size={20} /></button>{/snippet}
  </Menu>
{/snippet}
{#snippet empty()}
  <div class="crew-empty"><p>{CREW_EMPTY.people}</p><Button onclick={() => requestCrewNew('people')}>{CREW_NEW_LABEL.people}</Button></div>
{/snippet}

<CrewLoad phase={model.load.phase} loading={CREW_LOADING.people} failed={CREW_FAILED.people} onRetry={() => model.retry()}>
  {#if model.error && !creating}<p class="crew-error" role="alert">{model.error}</p>{/if}
  <div bind:this={rowsEl}><DataTable label="People" {columns} rows={shown} rowKey={(m) => m.userId} {empty} /></div>
  {#if rows.length > PAGE}
    <LoadMore shown={shown.length} total={rows.length} label="Show {Math.min(PAGE, rows.length - shown.length)} more" onmore={() => { limit += PAGE; }} focusTarget={(i) => rowFocus(rowsEl, i)} />
  {/if}
</CrewLoad>

<NewPersonDialog bind:open={creating} {model} />
