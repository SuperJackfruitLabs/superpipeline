<!-- apps/web/src/lib/components/workspace/AgentsTable.svelte -->
<script lang="ts">
  /**
   * Crew's Agents tab: one table (who, works, from, last seen, actions), ten rows then "Show N more",
   * and the footer line. Tokens, links, edit and delete live under each row's actions menu; Edit opens
   * its form above the table. The token a mint returns shows once, above the table.
   */
  import { AgentName, Button, DataTable, LoadMore, Menu, type Column, type MenuItem } from '@superjackfruitlabs/vibekit-ui';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import type { AgentSummary } from '$lib/api';
  import { agentFrom, agentMood, agentSeen, agentState, agentWorks, bannerTitle, tokensInUse } from './agent-status';
  import { AgentsModel } from './agents-model.svelte';
  import { CREW_NEW_LABEL, onCrewNew, requestCrewNew } from './crew-new';
  import { CREW_EMPTY, CREW_FAILED, CREW_LOADING, crewFooter } from './workspace-words';
  import AgentEditForm from './AgentEditForm.svelte';
  import CrewLoad from './CrewLoad.svelte';
  import NewAgentDialog from './dialogs/NewAgentDialog.svelte';

  const PAGE = 10;
  const ORDER = { needs: 0, working: 1, resting: 2 } as const;
  const model = new AgentsModel();
  // Loaded during init (ssr is off), so the busy mark is held before the first paint, never after it.
  void model.refresh();
  let creating = $state(false);
  let limit = $state(PAGE);
  function openNew(): void { model.resetNew(); creating = true; }
  $effect(() => onCrewNew('agents', openNew));
  // A new agent is the one the person wants to see: a mint shows every row.
  $effect(() => { if (model.minted) limit = Infinity; });

  /** Those that need you first, then those at work, then the rest, each in the order the API gives. */
  const rows = $derived((model.agents ?? []).toSorted((a, b) => ORDER[agentState(a)] - ORDER[agentState(b)]));
  const shown = $derived(rows.slice(0, limit));
  const editing = $derived(model.agents?.find((a) => a.id === model.editingId) ?? null);

  function items(a: AgentSummary): MenuItem[] {
    return [
      { label: 'Edit agent', onselect: () => void model.startEdit(a) },
      { label: 'Issue a token', onselect: () => void model.onIssue(a) },
      { label: 'Issue a run-only token', onselect: () => void model.onIssue(a, ['run']) },
      ...(a.externalId ? [{ label: 'Unlink from AgentPod', onselect: () => void model.onUnlink(a) }] : []),
      { heading: tokensInUse(a.tokenIds.length) },
      ...a.tokenIds.map((t, i) => ({ label: `Revoke token ${i + 1}`, danger: true, onselect: () => void model.onRevoke(a, t) })),
      { separator: true },
      { label: 'Delete agent…', danger: true, onselect: () => void model.onDelete(a) },
    ];
  }

  const columns: Column<AgentSummary>[] = [
    { key: 'who', label: 'Agent', cell: who },
    { key: 'works', label: 'Works', cell: works },
    { key: 'from', label: 'From', cell: from },
    { key: 'seen', label: 'Last seen', cell: seen },
    { key: 'actions', label: 'Actions', align: 'end', cell: actions },
  ];
</script>

{#snippet who(a: AgentSummary)}<AgentName id={a.name} name={a.name} mood={agentMood(a)} src={a.iconUrl ?? undefined} size={32} />{/snippet}
{#snippet works(a: AgentSummary)}<span class="crew-works">{agentWorks(a)}</span>{/snippet}
{#snippet from(a: AgentSummary)}{agentFrom(a)}{/snippet}
{#snippet seen(a: AgentSummary)}<span class="crew-seen">{agentSeen(a)}</span>{/snippet}
{#snippet actions(a: AgentSummary)}
  <Menu label="Actions for {a.name}" items={items(a)} width={300}>
    {#snippet trigger(props)}<button {...props} type="button" class="vk-button vk-button--quiet crew-act" aria-label="Actions for {a.name}"><LineIcon name="dots" size={20} /></button>{/snippet}
  </Menu>
{/snippet}
{#snippet empty()}
  <div class="crew-empty"><p>{CREW_EMPTY.agents}</p><Button onclick={() => requestCrewNew('agents')}>{CREW_NEW_LABEL.agents}</Button></div>
{/snippet}
{#snippet copyIcon()}<LineIcon name="copy" size={18} />{/snippet}

{#if model.minted}
  <div class="crew-banner" role="status">
    <p><strong>{bannerTitle(model.minted.agentName, model.minted.scopes)}</strong> Copy it now — it won't be shown again.</p>
    <code class="crew-token" aria-label="New token for {model.minted.agentName}">{model.minted.token}</code>
    <Button variant="secondary" icon={copyIcon} onclick={() => void model.copyToken()}>{model.copied ? 'Copied' : 'Copy token'}</Button>
    <Button variant="quiet" onclick={() => (model.minted = null)}>Done</Button>
  </div>
{/if}

<CrewLoad phase={model.load.phase} loading={CREW_LOADING.agents} failed={CREW_FAILED.agents} onRetry={() => model.retry()}>
  {#if editing}<AgentEditForm agent={editing} {model} />{/if}
  {#if model.error && model.editingId === null}<p class="crew-error" role="alert">{model.error}</p>{/if}
  <DataTable label="Agents" {columns} rows={shown} rowKey={(a) => a.id} needs={(a) => agentState(a) === 'needs'} {empty} />
  {#if rows.length > PAGE}
    <LoadMore shown={shown.length} total={rows.length} label="Show {Math.min(PAGE, rows.length - shown.length)} more" onmore={() => { limit += PAGE; }} />
  {/if}
  {#if rows.length > 0}<p class="crew-foot">{crewFooter(rows)}</p>{/if}
</CrewLoad>

<NewAgentDialog bind:open={creating} {model} />
