<!-- apps/web/src/lib/components/workspace/agents/AgentsStudio.svelte -->
<script lang="ts">
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';
  import { crewNewInPage, onCrewNew } from '../crew-new';
  import './agents-studio.css';
  import { Button, Face } from '@superjackfruit/vibekit';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { agentsHeading, agentsPanelMeta, agentStatus, bannerTitle, tokensLabel } from '../agent-status';
  import { AgentsModel } from '../agents-model.svelte';
  import { MenuState } from '../menu-state.svelte';
  import type { WorkspaceTabProps } from '../types';
  import AgentMenu from './AgentMenu.svelte';
  import CapabilityChips from './CapabilityChips.svelte';
  import NewAgentDialog from '../dialogs/NewAgentDialog.svelte';

  const _props: WorkspaceTabProps = $props();
  const model = new AgentsModel();
  const menus = new MenuState();
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
  let creating = $state(false);
  function openNew(): void { model.resetNew(); creating = true; }
  $effect(() => onCrewNew('agents', openNew));
</script>

{#snippet copyIcon()}<LineIcon name="copy" size={18} stroke={1.75} />{/snippet}
{#snippet plusIcon()}<LineIcon name="plus" size={18} stroke={1.75} />{/snippet}

<svelte:document onclick={(e) => menus.onDocumentClick(e)} />

{#if model.minted}
  <div class="wa-tok" role="status">
    <span class="ico"><LineIcon name="key" size={22} stroke={1.75} /></span>
    <p class="msg"><strong>{bannerTitle(model.minted.agentName, model.minted.scopes)}</strong> Copy it now — it won't be shown again.</p>
    <code class="box" aria-label="New token for {model.minted.agentName}">{model.minted.token}</code>
    <Button variant="secondary" icon={copyIcon} onclick={() => void model.copyToken()}>{model.copied ? 'Copied' : 'Copy token'}</Button>
    <Button variant="text" onclick={() => (model.minted = null)}>Done</Button>
  </div>
{/if}

<section class="ar-sec" aria-labelledby="agents-h">
  <div class="hd">
    <span class="no">01</span>
    <h2 id="agents-h">{model.agents === null ? 'Agents' : agentsHeading(model.agents.length)}</h2>
    <span class="r">{#if model.agents}<span>{agentsPanelMeta(model.agents)}</span>{:else}<!-- The meta line's room, held while the agents load: on a phone the line wraps the head, and arriving late it would push the page. --><span class="sp-meta-pending" aria-hidden="true"></span>{/if}{#if crewNewInPage()}<Button type="button" icon={plusIcon} onclick={openNew}>New agent</Button>{/if}</span>
  </div>
  <ul class="ar-notes wa-notes">
    <li><span class="k"><LineIcon name="check" size={18} stroke={1.75} /></span><span><b>Linked to AgentPod</b> — this agent has an AgentPod identity, so it signs in as itself and its work shows under its own name.</span></li>
    <li><span class="k"><LineIcon name="key" size={18} stroke={1.75} /></span><span><b>Tokens</b> — access keys it uses to reach this workspace. Revoke one from <em>Actions</em> if a station is retired.</span></li>
    <li><span class="k"><LineIcon name="dots" size={18} stroke={1.75} /></span><span><b>Actions</b> — edit, issue or revoke tokens, unlink, delete.</span></li>
  </ul>
  {#if model.agents === null && model.loadError}
    <LoadFailed message="Couldn't load the agents." onRetry={() => model.refresh()} />
  {:else if model.agents === null}
    <SkeletonRows label="Loading agents…" rows={4} rowHeight={56} />
  {:else if model.agents.length === 0}
    <p class="ar-hint">No agents yet. Create one with New agent — you'll get a token to point an AI agent at this workspace.</p>
  {:else}
    <table class="ar-tbl wa-tbl">
      <caption class="sr">{agentsHeading(model.agents.length)} in this workspace</caption>
      <thead><tr>
        <th style="width: 44px;" scope="col"><span class="sr">Face</span></th>
        <th style="width: 23%;" scope="col">Agent</th>
        <th scope="col">Capabilities</th>
        <th style="width: 200px;" scope="col">AgentPod</th>
        <th style="width: 96px;" scope="col">Tokens</th>
        <th style="width: 132px;" scope="col"><span class="sr">Actions</span></th>
      </tr></thead>
      <tbody>
        {#each model.agents as a (a.id)}
          {@const s = agentStatus(a)}
          {#if model.editingId === a.id}
            <tr class="sel">
              <td class="wa-f"><Face id={a.name} label={a.name} mood={s.mood} size={32} src={a.iconUrl ?? undefined} /></td>
              <td colspan="5">
                <form class="wa-edit" aria-label="Edit {a.name}" aria-busy={model.saving} onsubmit={(e) => { e.preventDefault(); void model.saveEdit(); }}>
                  <p class="wa-nm" style="grid-column: 1 / -1;">Editing {a.name}</p>
                  <div class="ar-field"><label for="ed-name">Name</label><input class="ar-in" id="ed-name" bind:value={model.editName} /></div>
                  <div class="ar-field"><label for="ed-conc">Cards at once</label><input class="ar-in" id="ed-conc" type="number" min="1" bind:value={model.editConcurrency} /><p class="ar-hint">How many cards it may hold at the same time.</p></div>
                  <div class="ar-field" style="grid-column: 1 / -1;">
                    <span class="lab" id="ed-caps">Capabilities</span>
                    <CapabilityChips bind:selected={model.editCaps} bind:typed={model.editNewCap} registry={model.capabilities} labelledBy="ed-caps" inputId="ed-newcap" form="studio" wrapInput />
                    <p class="ar-hint">Faint chips: no board stage asks for this yet, so an agent holding only it can claim nothing.</p>
                  </div>
                  <div class="ar-field" style="grid-column: 1 / -1;"><label for="ed-av">Picture (optional)</label><input class="ar-in" id="ed-av" type="url" placeholder="https://… leave empty to keep the generated face" bind:value={model.editIcon} /></div>
                  <div style="grid-column: 1 / -1; display: flex; gap: var(--vk-space-2);">
                    <Button type="submit" disabled={model.saving || model.editName.trim() === ''}>{model.saving ? 'Saving…' : 'Save'}</Button>
                    <Button variant="text" onclick={() => (model.editingId = null)}>Cancel</Button>
                  </div>
                  {#if model.error}<p class="ar-hint" role="alert" style="grid-column: 1 / -1;">{model.error}</p>{/if}
                </form>
              </td>
            </tr>
          {:else}
            <tr>
              <td class="wa-f"><Face id={a.name} label={a.name} mood={s.mood} size={32} src={a.iconUrl ?? undefined} /></td>
              <td><div><p class="wa-nm">{a.name}</p><p class="wa-meta">{s.line}</p></div></td>
              <td><div class="wa-caps">{#each a.capabilities as c (c)}<span class="wa-cap">{c}</span>{:else}<span class="wa-meta">No capabilities — this agent can claim nothing</span>{/each}</div></td>
              <td>{#if a.externalId}<p class="wa-linked"><LineIcon name="check" size={16} stroke={1.75} /><span>Linked to AgentPod</span></p>{:else}<p class="wa-meta">Not linked</p>{/if}</td>
              <td><p class="m wa-n">{tokensLabel(a.tokenIds.length)}</p></td>
              <td class="wa-act">
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -- Escape closes the menu and returns focus to its summary -->
                <details class="menu" open={menus.open === a.id} ontoggle={(e) => menus.toggle(a.id, e.currentTarget.open)} onkeydown={(e) => menus.onKeydown(e)}>
                  <summary class="vk-button vk-button--secondary" aria-label="Actions for {a.name}">Actions <span class="disc-ico"><LineIcon name="chev-down" size={16} stroke={1.75} /></span></summary>
                  <AgentMenu agent={a} form="studio" showAll={model.allTokens.includes(a.id)}
                    onEdit={() => { menus.close(); void model.startEdit(a); }} onIssue={(sc) => { menus.close(); void model.onIssue(a, sc); }}
                    onUnlink={() => { menus.close(); void model.onUnlink(a); }} onRevoke={(t) => void model.onRevoke(a, t)}
                    onDelete={() => { menus.close(); void model.onDelete(a); }} onShowAll={() => (model.allTokens = [...model.allTokens, a.id])} />
                </details>
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<NewAgentDialog bind:open={creating} {model} />
