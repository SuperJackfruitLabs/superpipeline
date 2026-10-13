<!-- apps/web/src/lib/components/operate/layouts/OperateDaylightSky.svelte -->
<script lang="ts">
  import { viewport } from '$lib/viewport.svelte';
  /** Daylight's greeting, drawn inside the shell's sky (ShellProps.sky). */
  import { Face } from '@superjackfruit/vibekit';
  import { crewOf } from '../operate-data';
  import { daylightGreeting, greetingLabel, needCounts, summarySentenceDaylight } from '../operate-words';
  import type { OperateLayoutProps } from './types';
  import './operate-daylight-sky.css';

  let { model }: OperateLayoutProps = $props();
  const crew = $derived(crewOf(model.needs));
</script>

<section class="op-greet" aria-label={greetingLabel(model.phase)}>
  <div class="vk-sky__content">
    <div>
      <svelte:element this={viewport.phone ? 'h2' : 'h1'} class="op-title">{daylightGreeting(model.phase, model.firstName, model.needs.length)}</svelte:element>
      <p>{summarySentenceDaylight(needCounts(model.needs), model.running.length)}</p>
    </div>
    {#if crew.length > 0}
      <div class="crew" aria-label="Waiting on you">
        {#each crew as c (c.name)}<span class="crew__who"><Face id={c.name} label={c.name} mood="needs" size={44} src={c.iconUrl ?? undefined} />{c.name}</span>{/each}
      </div>
    {/if}
  </div>
</section>
