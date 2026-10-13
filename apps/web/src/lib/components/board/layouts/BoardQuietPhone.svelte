<!-- apps/web/src/lib/components/board/layouts/BoardQuietPhone.svelte -->
<script lang="ts">
  /** SP-Phone-Board-Quiet: a header, five groups, the stages table. Plain text throughout. PhoneHeader owns the h1, so the board name is an h2. */
  import '../quiet/qb-phone.css';
  import { Button } from '@superjackfruit/vibekit';
  import type { BoardLayoutProps } from './types';
  import QuietItemPhone from '../quiet/QuietItemPhone.svelte';
  import { quietCount, quietPhoneHeader, wantsOrder } from '../phone/phone-words';

  let { model, onCompose }: BoardLayoutProps = $props();
  const groups = $derived([
    { id: 'g1', label: 'Needs your decision', cards: wantsOrder(model.ordered).filter((s) => s.urgency === 'needs') },
    { id: 'g2', label: 'In progress', cards: model.working },
    { id: 'g3', label: 'Waiting to start', cards: model.queued },
    { id: 'g4', label: 'Done', cards: model.done },
    { id: 'g5', label: 'Closed', cards: model.closed },
  ]);
</script>

<div class="qb-board">
  <header class="hd">
    <h2>{model.boardName}</h2>
    <p class="muted">{quietPhoneHeader(model.counts.all, model.counts.needs)}</p>
    <div class="lkw"><Button variant="text" onclick={onCompose}>Write a new card</Button></div>
  </header>
  {#each groups as g (g.id)}
    <section class="grp" aria-labelledby={g.id}>
      <h2 id={g.id}>{g.label} ({g.cards.length})</h2>
      {#each g.cards as s (s.id)}<QuietItemPhone {s} boardId={model.boardId} stages={model.stageDefs} />{:else}<p class="nn">None.</p>{/each}
    </section>
  {/each}
  <section class="grp" style="padding-bottom: 24px;" aria-label="Stages">
    <table class="tbl">
      <caption>Stages</caption>
      <thead><tr><th scope="col">Stage</th><th scope="col">Cards</th><th scope="col">Who works it</th></tr></thead>
      <tbody>
        {#each model.stages as st, i (st.key)}
          <tr><th scope="row">{i + 1}. {st.name}</th><td class="n">{quietCount(st)}</td><td>{st.ownerShort.replace(' · ', ': ')}</td></tr>
        {/each}
      </tbody>
    </table>
  </section>
</div>
