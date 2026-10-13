<!-- apps/web/src/lib/components/board/daylight/PdHello.svelte -->
<script lang="ts">
  /** The Daylight phone greeting, drawn in the shell's sky (shell-and-board §3.3 phone crew, §3.6). PhoneHeader owns the h1, so this heading is an h2. */
  import './pd-hello.css';
  import { Face, type Mood, type Phase } from '@superjackfruit/vibekit';
  import type { BoardModel } from '../board-model';
  import { needsCounts, phoneHello, phoneHelloP } from '../phone/phone-words';
  import { joinAnd } from '$lib/words';

  let { model, phase, firstName }: { model: BoardModel; phase: Phase; firstName: string } = $props();

  const counts = $derived(needsCounts(model.ordered));
  const line = $derived(phoneHelloP(counts));
  /** Agents of needs cards (needs), then of working cards (working), then queuers (resting on phones, O-2). */
  const crew = $derived.by(() => {
    const seen = new Map<string, { id: string; name: string; iconUrl: string | null; mood: Mood }>();
    for (const s of model.ordered) if (s.urgency === 'needs' && s.lastAgent && !seen.has(s.lastAgent.id)) seen.set(s.lastAgent.id, { ...s.lastAgent, mood: 'needs' });
    for (const s of model.ordered) if (s.urgency === 'working' && s.lastAgent && !seen.has(s.lastAgent.id)) seen.set(s.lastAgent.id, { ...s.lastAgent, mood: 'working' });
    for (const s of model.ordered) {
      const q = s.queuedBy?.agent;
      if (q && s.urgency !== 'done' && s.urgency !== 'closed' && !seen.has(q.id)) seen.set(q.id, { id: q.id, name: s.queuedBy!.name, iconUrl: q.iconUrl, mood: 'resting' });
    }
    return [...seen.values()];
  });
  const needNames = $derived(crew.filter((c) => c.mood === 'needs').map((c) => c.name));
  const workNames = $derived(crew.filter((c) => c.mood === 'working').map((c) => c.name));
  const small = $derived(
    needNames.length
      ? `${joinAnd(needNames)} ${needNames.length === 1 ? 'needs' : 'need'} you`
      : workNames.length ? `${joinAnd(workNames)} ${workNames.length === 1 ? 'is' : 'are'} at work` : '',
  );
</script>

<section class="pd-hello" aria-label="Greeting">
  <h2>{phoneHello(phase, firstName)}</h2>
  <p><strong>{line.strong}</strong>{line.rest ? ` ${line.rest}` : ''}</p>
  {#if crew.length}
    <div class="crew">
      <ul aria-label="Agents on this board">
        {#each crew as c (c.id)}<li><Face id={c.name} label={c.name} mood={c.mood} size={32} src={c.iconUrl ?? undefined} /></li>{/each}
      </ul>
      {#if small}<small>{small}</small>{/if}
    </div>
  {/if}
</section>
