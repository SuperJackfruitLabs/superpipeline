<!-- apps/web/src/lib/components/operate/layouts/OperateDaylightSky.svelte -->
<script lang="ts">
  import { viewport } from '$lib/viewport.svelte';
  /** Daylight's greeting, drawn inside the shell's sky (ShellProps.sky). */
  import { Face } from '@superjackfruit/vibekit';
  import { crewOf } from '../operate-data';
  import { greetingLabel } from '../operate-words';
  import { askBoards, CHECKING, inboxCounts, inboxSubline, wantYou } from '$lib/components/inbox/inbox-words';
  import { greetNamed } from '$lib/greet';
  import type { OperateLayoutProps } from './types';
  import './operate-daylight-sky.css';

  let { model }: OperateLayoutProps = $props();
  const crew = $derived(crewOf(model.needs));
</script>

<section class="op-greet" aria-label={greetingLabel(model.phase)}>
  <div class="vk-sky__content">
    <div>
      <svelte:element this={viewport.phone ? 'h2' : 'h1'} class="op-title">{greetNamed(model.phase, model.firstName)}{model.loading || model.failed ? '' : ` ${wantYou(model.needs.length)}`}</svelte:element>
      {#if model.failed}
        <!-- The failure is said once, on the page below; the greeting claims nothing. -->
      {:else if model.loading}
        <!-- The summary's usual room (a few lines, then the faces), so the counted greeting does not push the page down. -->
        <p>{CHECKING}</p><span class="sp-skeleton sp-skeleton--on op-greet__wait" aria-hidden="true"><span class="vk-skeleton" style="width: 92%;"></span><span class="vk-skeleton" style="width: 86%;"></span><span class="vk-skeleton" style="width: 58%;"></span></span>
      {:else}
        <p>{inboxSubline(inboxCounts(model.needs), askBoards(model.needs), model.running.length)}</p>
      {/if}
    </div>
    {#if model.failed}{:else if model.loading}<div class="crew op-greet__crew-wait" aria-hidden="true"></div>{:else if crew.length > 0}
      <div class="crew" aria-label="Waiting on you">
        {#each crew as c (c.name)}<span class="crew__who"><Face id={c.name} label={c.name} mood="needs" size={44} src={c.iconUrl ?? undefined} />{c.name}</span>{/each}
      </div>
    {/if}
  </div>
</section>
