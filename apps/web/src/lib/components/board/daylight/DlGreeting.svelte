<!-- apps/web/src/lib/components/board/daylight/DlGreeting.svelte -->
<script lang="ts">
  /** The greeting band, inside the shell's sky (PlanView passes it as `sky`). Not drawn on an empty board (O-13). */
  import './daylight.css';
  import { Face, type Phase } from '@superjackfruit/vibekit';
  import type { BoardModel } from '../board-model';
  import { greetingLine } from '../board-words';

  let { model, phase, firstName }: { model: BoardModel; phase: Phase; firstName: string } = $props();

  function jump(e: MouseEvent): void {
    e.preventDefault();
    const t = document.getElementById('first-needs');
    t?.scrollIntoView({ block: 'center' });
    t?.focus();
  }
</script>

<section class="dl-scope dl-band" aria-label="Greeting">
  <p class="dl-greet">{greetingLine(phase, firstName, model.counts.needs)}</p>
  {#if model.holders.length > 0}
    <div class="dl-crew">
      <span>Holding cards</span>
      <ul>
        {#each model.holders as a (a.id)}
          <li><Face id={a.name} label={a.name} mood="needs" size={28} src={a.iconUrl ?? undefined} />{a.name}</li>
        {/each}
      </ul>
    </div>
  {/if}
  {#if model.counts.needs > 0}<a class="dl-jump" href="#first-needs" onclick={jump}>Show me the first one</a>{/if}
</section>
