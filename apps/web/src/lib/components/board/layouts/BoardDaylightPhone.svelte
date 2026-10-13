<!-- apps/web/src/lib/components/board/layouts/BoardDaylightPhone.svelte -->
<script lang="ts">
  /** SP-Phone-Board-Daylight: stage chips, the wants lane, one lane per stage with cards, the empty stages. */
  import '../daylight/pd-phone.css';
  import type { BoardLayoutProps } from './types';
  import PdTile from '../daylight/PdTile.svelte';
  import PhoneIcon from '$lib/components/parts/PhoneIcon.svelte';
  import { blockedChip, laneNote, wantsIntro, wantsOrder } from '../phone/phone-words';

  let { model }: BoardLayoutProps = $props();

  const wants = $derived(wantsOrder(model.ordered).filter((s) => s.urgency === 'needs'));
  const wantStages = $derived(new Set(wants.map((s) => s.stageKey)).size);
  const lanes = $derived(model.stages.filter((st) => st.count > 0));
  const empties = $derived(model.stages.filter((st) => st.count === 0));
  let current = $state('wants');
</script>

<div class="pd-board">
  <nav class="step" aria-label="Stages">
    {#if wants.length}
      <a href="#wants" class="needs" aria-current={current === 'wants' ? 'true' : undefined} onclick={() => (current = 'wants')}>Needs you <b>{wants.length}</b></a>
    {/if}
    {#each model.stages as st (st.key)}
      <a href={st.count ? `#stage-${st.key}` : '#empty'} class:empty={st.count === 0} aria-current={current === st.key ? 'true' : undefined} onclick={() => (current = st.key)}>{st.name} <b>{st.count}</b></a>
    {/each}
  </nav>

  {#if wants.length}
    <section class="lane wants" id="wants" aria-labelledby="h-wants">
      <div class="lh">
        <h2 id="h-wants">Needs you <span class="n">{wants.length}</span></h2>
        <p>{wantsIntro(wantStages)}</p>
      </div>
      {#each wants as s (s.id)}<PdTile {s} stages={model.stageDefs} />{/each}
    </section>
  {/if}

  {#each lanes as st, i (st.key)}
    {@const here = model.ordered.filter((s) => s.stageKey === st.key)}
    {@const note = laneNote(here.filter((s) => s.urgency === 'needs').length, here.filter((s) => s.urgency === 'queued').length)}
    {@const chip = st.blocked ? blockedChip(st.blocked) : null}
    {#if i > 0}<div class="sep"></div>{/if}
    <section class="lane" id="stage-{st.key}" aria-labelledby="h-{st.key}">
      <div class="lh">
        <h2 id="h-{st.key}">{st.name} <span class="n">{st.count}</span>{#if chip} <span class="chip blk" title={chip.title}><PhoneIcon name="blocked" />{chip.text}</span>{/if}</h2>
        <p>{st.ownerShort}</p>
      </div>
      {#if note}<p class="note">{note}</p>{/if}
      {#each here.filter((s) => s.urgency !== 'needs') as s (s.id)}<PdTile {s} stages={model.stageDefs} />{/each}
    </section>
  {/each}

  {#if empties.length}
    <section class="empties" id="empty" aria-labelledby="h-empty">
      <h2 id="h-empty">Empty stages · {empties.length}</h2>
      <ul>
        {#each empties as st (st.key)}<li><b>{st.name}</b> · {st.ownerShort}</li>{/each}
      </ul>
    </section>
  {/if}
</div>
