<!-- apps/web/src/lib/components/workspace/studio/CapabilitiesStudio.svelte -->
<script lang="ts">
  import SkeletonRows from '$lib/components/parts/SkeletonRows.svelte';
  import LoadFailed from '$lib/components/parts/LoadFailed.svelte';
  import { crewNewInPage, onCrewNew } from '../crew-new';
  import { autogrow } from '$lib/autogrow';
  import { Button, Face } from '@superjackfruit/vibekit';
  import NewCapabilityDialog from '../dialogs/NewCapabilityDialog.svelte';
  import LineIcon from '$lib/components/parts/LineIcon.svelte';
  import { CapabilitiesModel } from '../capabilities-model.svelte';
  import { agentCountText, capsHeading, holdersOf, INFERRED_TITLE } from '../capability-notes';
  import { similarText } from '../workspace-words';
  import type { WorkspaceTabProps } from '../types';

  let { review }: WorkspaceTabProps = $props();
  const model = new CapabilitiesModel();
  // Loaded during init (ssr is off): the busy mark is held before the first paint.
  void model.refresh();
  let creating = $state(false);
  function openNew(): void { model.resetNew(); creating = true; }
  $effect(() => onCrewNew('capabilities', openNew));
</script>

{#snippet plusIcon()}<LineIcon name="plus" size={18} stroke={1.75} />{/snippet}

<section class="ar-sec" aria-labelledby="ct-h">
  <div class="hd"><span class="no">{review?.no ?? '01'}</span>{#if review}<span class="kick">{review.tag}</span>{/if}<h2 id="ct-h">{model.capabilities === null ? 'Capabilities' : capsHeading(model.rows.length)}</h2><span class="r">{#if crewNewInPage()}<Button type="button" icon={plusIcon} onclick={openNew}>New capability</Button>{/if}</span></div>
  <p class="wo-lede">What agents can do. A board stage asks for one; an agent holding it claims the card.</p>
  {#if model.similar.length > 0}<p class="ar-hint" role="status">{similarText(model.similar)}</p>{/if}
  {#if model.error}<p class="ar-hint" role="alert">{model.error}</p>{/if}
  {#if model.capabilities === null && model.failed}
    <LoadFailed message="Couldn't load capabilities." onRetry={() => model.refresh()} />
  {:else if model.capabilities === null}
    <SkeletonRows label="Loading capabilities…" rows={3} rowHeight={48} />
  {:else}
    {#if model.notes.length > 0 || review?.note}
      <div class="wo-note">
        {#each model.notes as n (n.key)}<p><strong>{n.key}</strong> {n.text} <a class="ar-lk" href={n.link.href}>{n.link.label}</a>{n.tail}</p>{/each}
        {#if review?.note}<p class="ar-hint">{review.note}</p>{/if}
      </div>
    {/if}
    <table class="ar-tbl wo-tbl">
      <caption class="sr">Capabilities, A to Z</caption>
      <thead><tr><th style="width: 26%;" scope="col">Capability · held by</th><th style="width: 36%;" scope="col">Description</th><th scope="col">Implies</th><th style="width: 54px;" scope="col"><span class="sr">Remove</span></th></tr></thead>
      <tbody>
        {#each model.rows as c (c.id)}
          <tr>
            <td><p class="wo-cap">{c.key}</p><p class="wo-who"><span class="wo-stack">{#each holdersOf(c, model.agents) as a (a.id)}<Face id={a.name} label={a.name} mood="resting" size={20} src={a.iconUrl ?? undefined} />{/each}</span>{agentCountText(c.agentCount)}</p></td>
            <td><label class="sr" for="cd-{c.key}">Description of {c.key}</label><textarea class="ar-in grow" id="cd-{c.key}" rows="1" placeholder="Add a description" use:autogrow={c.description} value={c.description ?? ''} onblur={(e) => void model.describe(c, e.currentTarget.value)} onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}></textarea></td>
            <td><div class="wo-caps">
              {#each c.implies ?? [] as to (to)}<span class="wo-tag">implies {to}<button class="wo-x h44" aria-label="Remove implies {to}" type="button" onclick={() => void model.unimply(c.key, to)}><LineIcon name="close" size={14} stroke={1.75} /></button></span>{/each}
              {#if c.boardCount === 0}<span class="wo-tag">no board asks</span>{/if}
              {#if c.origin === 'inferred'}<span class="wo-tag" title={INFERRED_TITLE}>inferred</span>{/if}
              {#if model.implyingFor === c.key}
                <form style="display: inline-flex; gap: 6px;" onsubmit={(e) => { e.preventDefault(); void model.imply(c.key); }}><label class="sr" for="im-{c.key}">{c.key} implies</label><input class="ar-in" id="im-{c.key}" placeholder="e.g. analysis" bind:value={model.implyTo} /><button class="ar-btn2" type="submit">Add</button></form>
              {:else}
                <button class="ar-lk" aria-label="Add an implied capability to {c.key}" type="button" onclick={() => model.startImply(c.key)}><LineIcon name="plus" size={14} stroke={1.75} />Implies…</button>
              {/if}
            </div></td>
            <td><button class="ar-ib wo-del" aria-label="Remove {c.key}" type="button" onclick={() => void model.remove(c)}><LineIcon name="trash" stroke={1.75} /></button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<NewCapabilityDialog bind:open={creating} {model} />
