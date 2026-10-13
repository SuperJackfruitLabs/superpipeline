<!-- apps/web/src/lib/components/board/layouts/BoardPaperPhone.svelte -->
<script lang="ts">
  /** SP-Phone-Board-Paper: letters waiting on you, in progress, coming up, shipped, the pipeline, the write box. */
  import '../paper/pp-phone.css';
  import { Button } from '@superjackfruit/vibekit';
  import type { BoardLayoutProps } from './types';
  import PaperLetterPhone from '../paper/PaperLetterPhone.svelte';
  import PaperEntryPhone from '../paper/PaperEntryPhone.svelte';
  import { paperWaitingHeading, pipelineRest, wantsOrder } from '../phone/phone-words';

  let { model, onCompose }: BoardLayoutProps = $props();
  const letters = $derived(wantsOrder(model.ordered).filter((s) => s.urgency === 'needs'));
  const firstStage = $derived(model.stages[0]?.name ?? '');
</script>

<div class="pp-board">
  <section class="col" aria-labelledby="h-wait">
    <h2 class="eh" class:sig={letters.length > 0} id="h-wait">{paperWaitingHeading(letters.length)}</h2>
    {#each letters as s (s.id)}<PaperLetterPhone {s} stages={model.stageDefs} />{:else}<p class="none">Nothing waits on you.</p>{/each}
  </section>
  <section class="col" aria-labelledby="h-prog">
    <h2 class="eh" id="h-prog">In progress{model.working.length ? ` · ${model.working.length}` : ''}</h2>
    {#each model.working as s (s.id)}<PaperEntryPhone {s} stages={model.stageDefs} />{:else}<p class="none">Nobody is working on a card right now.</p>{/each}
  </section>
  <section class="col" aria-labelledby="h-up">
    <h2 class="eh" id="h-up">Coming up{model.queued.length ? ` · ${model.queued.length}` : ''}</h2>
    {#each model.queued as s (s.id)}<PaperEntryPhone {s} stages={model.stageDefs} />{:else}<p class="none">Nothing is queued.</p>{/each}
  </section>
  <section class="col" aria-labelledby="h-ship">
    <h2 class="eh" id="h-ship">Shipped{model.done.length ? ` · ${model.done.length}` : ''}</h2>
    {#each model.done as s (s.id)}<PaperEntryPhone {s} stages={model.stageDefs} />{/each}
    {#each model.closed as s (s.id)}<PaperEntryPhone {s} stages={model.stageDefs} />{:else}<p class="none">Nothing closed.</p>{/each}
  </section>
  <section class="col" aria-labelledby="h-pipe">
    <h2 class="eh" id="h-pipe">The pipeline</h2>
    <ol class="pipe">
      {#each model.stages as st, i (st.key)}
        <li><span class="ar" aria-hidden="true">{i === 0 ? '1' : '→'}</span><span><b>{st.name}</b>{pipelineRest(st, st.ownerShort)}</span></li>
      {/each}
    </ol>
  </section>
  <section class="write" aria-labelledby="h-write">
    <h2 id="h-write">Write a new card</h2>
    <p class="muted" style="font-size: 15px;">It starts in {firstStage}, with you.</p>
    <div style="align-self: flex-start;"><Button variant="secondary" onclick={onCompose}>Write a new card</Button></div>
  </section>
</div>
